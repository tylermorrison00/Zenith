#!/usr/bin/env python3
"""Stamp Zenith.exe (Electron binary) with the Zenith icon + version info.

Why this exists: electron-builder normally does this with rcedit.exe under
Wine, but Wine cannot launch any Windows process on this Linux VM (wineboot
init wedges), so rcedit can never run here. This script does the same job
natively and SAFELY: every edit is in-place inside an existing allocation,
so the file size, section table and all RVAs stay byte-identical.

  * RT_ICON 1/2/3 (16/32/48px BMP) <- matching images from build/icon.ico
  * RT_ICON 4 (256px PNG)          <- palette-quantised 256px PNG (7 KB,
    visually identical, mean channel diff 2.9/255) — the full RGBA PNG
    (50 KB) does not fit the 18,963-byte allocation.
  * RT_GROUP_ICON entries updated to the new image sizes (same 4 images).
  * Version strings: Electron -> Zenith, 33.4.11 -> 1.0.0.0,
    electron.exe -> Zenith.exe, copyright -> Copyright (C) 2026 Zenith.
  * VS_FIXEDFILEINFO FileVersion/ProductVersion -> 1.0.0.0.

Usage: python3 build/stamp-exe.py <path-to-Zenith.exe>
Writes <exe>.stamped next to it; never modifies the input in place.
"""
import json
import os
import struct
import sys

import pefile

ICO_PATH = 'build/icon.ico'


def _app_version():
    """App version from package.json -> ([major, minor, patch, build], 'x.y.z.w')."""
    pkg_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'package.json')
    with open(pkg_path, encoding='utf-8') as fh:
        version = str(json.load(fh)['version'])
    parts = [int(x) for x in version.split('.')]
    while len(parts) < 4:
        parts.append(0)
    return parts[:4], '.'.join(str(p) for p in parts[:4])


_VER_PARTS, _VER4 = _app_version()

# (old, new) version-string pairs; each new value must fit the old allocation.
VERSION_STRINGS = [
    ('Electron', 'Zenith'),
    ('33.4.11', _VER4),
    ('electron.exe', 'Zenith.exe'),
    ('Copyright (C) 2015 GitHub, Inc. All rights reserved.',
     'Copyright \u00a9 2026 Zenith'),
]


def read_ico_images(ico_path):
    data = open(ico_path, 'rb').read()
    _res, _typ, count = struct.unpack_from('<HHH', data, 0)
    images = {}
    for i in range(count):
        w, h, _cc, _r, planes, bitcount, size, off = struct.unpack_from(
            '<BBBBHHII', data, 6 + 16 * i)
        images[w or 256] = {
            'blob': data[off:off + size],
            'planes': planes,
            'bitcount': bitcount,
        }
    return images


def dib_planes_bitcount(blob):
    # BITMAPINFOHEADER: biPlanes @ +12 (u16), biBitCount @ +14 (u16).
    planes, bitcount = struct.unpack_from('<HH', blob, 12)
    return planes, bitcount


def main(exe_path):
    images = read_ico_images(ICO_PATH)
    new_blobs = {
        1: images[16]['blob'],
        2: images[32]['blob'],
        3: images[48]['blob'],
        4: images[256]['blob'],  # palette PNG, already built by make-icon.py
    }
    new_sizes = {16: 820, 32: 2120, 48: 3687}  # informational only

    pe = pefile.PE(exe_path, fast_load=True)
    pe.parse_data_directories(
        directories=[pefile.DIRECTORY_ENTRY['IMAGE_DIRECTORY_ENTRY_RESOURCE']])
    out = bytearray(open(exe_path, 'rb').read())
    orig_len = len(out)

    icon_entries = {}   # id -> (file_offset, size)
    group_off = group_size = None
    version_off = version_size = None
    for e in pe.DIRECTORY_ENTRY_RESOURCE.entries:
        tid = e.struct.Id
        for name in e.directory.entries:
            for lang in name.directory.entries:
                d = lang.data.struct
                off = pe.get_offset_from_rva(d.OffsetToData)
                if tid == 3:  # RT_ICON
                    icon_entries[name.struct.Id] = (off, d.Size)
                elif tid == 14:  # RT_GROUP_ICON
                    group_off, group_size = off, d.Size
                elif tid == 16:  # RT_VERSION
                    version_off, version_size = off, d.Size
    assert len(icon_entries) == 4, f'expected 4 icons, got {icon_entries}'
    assert group_off is not None and group_size == 62, 'group icon not found'
    assert version_off is not None, 'version resource not found'

    # --- icons: in-place, zero-pad the tail of each allocation. ---
    group = bytearray(out[group_off:group_off + group_size])
    _res, _typ, count = struct.unpack_from('<HHH', group, 0)
    assert count == 4
    for idx, icon_id in enumerate((1, 2, 3, 4)):
        off, alloc = icon_entries[icon_id]
        blob = new_blobs[icon_id]
        assert len(blob) <= alloc, (
            f'icon {icon_id}: {len(blob)} bytes > allocation {alloc}')
        out[off:off + len(blob)] = blob
        out[off + len(blob):off + alloc] = b'\x00' * (alloc - len(blob))
        # group entry: 14 bytes at 6 + 14*idx
        g = 6 + 14 * idx
        if icon_id == 4:
            width, height, planes, bitcount = 0, 0, 1, 32
        else:
            width = height = {1: 16, 2: 32, 3: 48}[icon_id]
            planes, bitcount = dib_planes_bitcount(blob)
        struct.pack_into('<BBBBHHIH', group, g, width, height, 0, 0,
                         planes, bitcount, len(blob), icon_id)
        print(f'icon id={icon_id}: {len(blob)} bytes into {alloc}-byte slot')
    out[group_off:group_off + group_size] = group

    # --- version strings: in-place UTF-16LE replace, NUL-padded. ---
    blob = out[version_off:version_off + version_size]
    for old, new in VERSION_STRINGS:
        old_b = old.encode('utf-16-le')
        new_b = new.encode('utf-16-le')
        assert len(new_b) <= len(old_b), f'{new!r} longer than {old!r}'
        padded = new_b + b'\x00' * (len(old_b) - len(new_b))
        n = blob.count(old_b)
        assert n >= 1, f'{old!r} not found in version resource'
        blob = blob.replace(old_b, padded)
        print(f'version string {old!r} x{n} -> {new!r}')

    # --- fixed file info: version from package.json (MS=major.minor, LS=patch.build). ---
    sig = blob.find(b'\xbd\x04\xef\xfe')
    assert sig != -1, 'VS_FIXEDFILEINFO signature not found'
    ms = (_VER_PARTS[0] << 16) | _VER_PARTS[1]
    ls = (_VER_PARTS[2] << 16) | _VER_PARTS[3]
    struct.pack_into('<IIII', blob, sig + 8, ms, ls, ms, ls)
    out[version_off:version_off + version_size] = blob

    assert len(out) == orig_len, 'file size changed!'
    stamped = exe_path + '.stamped'
    open(stamped, 'wb').write(out)
    print(f'wrote {stamped} ({len(out)} bytes, size unchanged)')


if __name__ == '__main__':
    main(sys.argv[1])
