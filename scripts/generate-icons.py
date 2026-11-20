import os
import sys
import site
import shutil

sys.path.append(site.getusersitepackages())

try:
    from PIL import Image
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    sys.path.append(site.getusersitepackages())
    from PIL import Image

logo_path = "public/zenith-logo.png"
if not os.path.exists(logo_path):
    print(f"Error: {logo_path} not found")
    sys.exit(1)

base_img = Image.open(logo_path).convert("RGBA")

# 1. Update background color XML to transparent
bg_xml_dir = "android/app/src/main/res/values"
os.makedirs(bg_xml_dir, exist_ok=True)
with open(os.path.join(bg_xml_dir, "ic_launcher_background.xml"), "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">@android:color/transparent</color>\n</resources>\n')

# Density mappings: (standard_size, adaptive_canvas_size, adaptive_inner_size)
densities = {
    "mdpi": (48, 108, 96),
    "hdpi": (72, 162, 144),
    "xhdpi": (96, 216, 192),
    "xxhdpi": (144, 324, 288),
    "xxxhdpi": (192, 432, 384),
}

for density, (size, canvas_size, inner_size) in densities.items():
    dir_path = f"android/app/src/main/res/mipmap-{density}"
    os.makedirs(dir_path, exist_ok=True)
    
    # Standard & Round icon: 100% TRANSPARENT background + centered green logo (NO white or black box!)
    icon_bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    logo_resized = base_img.copy()
    inner_dim = int(size * 0.92)
    logo_resized.thumbnail((inner_dim, inner_dim), Image.Resampling.LANCZOS)
    offset = ((size - logo_resized.width) // 2, (size - logo_resized.height) // 2)
    icon_bg.paste(logo_resized, offset, logo_resized)
    icon_bg.save(os.path.join(dir_path, "ic_launcher.png"), "PNG")
    icon_bg.save(os.path.join(dir_path, "ic_launcher_round.png"), "PNG")
    
    # Adaptive Foreground icon: transparent background + centered logo
    fg_canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    fg_logo = base_img.copy()
    fg_logo.thumbnail((inner_size, inner_size), Image.Resampling.LANCZOS)
    fg_offset = ((canvas_size - fg_logo.width) // 2, (canvas_size - fg_logo.height) // 2)
    fg_canvas.paste(fg_logo, fg_offset, fg_logo)
    fg_canvas.save(os.path.join(dir_path, "ic_launcher_foreground.png"), "PNG")

# 3. Configure mipmap-anydpi-v26 with transparent background
anydpi_dir = "android/app/src/main/res/mipmap-anydpi-v26"
os.makedirs(anydpi_dir, exist_ok=True)
adaptive_xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
'''
with open(os.path.join(anydpi_dir, "ic_launcher.xml"), "w", encoding="utf-8") as f:
    f.write(adaptive_xml)
with open(os.path.join(anydpi_dir, "ic_launcher_round.xml"), "w", encoding="utf-8") as f:
    f.write(adaptive_xml)
print("Configured mipmap-anydpi-v26 with transparent background")

print("All Android launcher icons generated successfully (transparent background)!")
