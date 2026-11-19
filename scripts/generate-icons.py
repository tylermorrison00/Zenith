import os
import sys

try:
    from PIL import Image
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

logo_path = "public/zenith-logo.png"
if not os.path.exists(logo_path):
    print(f"Error: {logo_path} not found")
    sys.exit(1)

base_img = Image.open(logo_path).convert("RGBA")

# 1. Update background color XML
bg_xml_dir = "android/app/src/main/res/values"
os.makedirs(bg_xml_dir, exist_ok=True)
with open(os.path.join(bg_xml_dir, "ic_launcher_background.xml"), "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#070606</color>\n</resources>\n')

# Density mappings: (standard_size, adaptive_canvas_size, adaptive_inner_size)
densities = {
    "mdpi": (48, 108, 72),
    "hdpi": (72, 162, 108),
    "xhdpi": (96, 216, 144),
    "xxhdpi": (144, 324, 216),
    "xxxhdpi": (192, 432, 288),
}

for density, (size, canvas_size, inner_size) in densities.items():
    dir_path = f"android/app/src/main/res/mipmap-{density}"
    os.makedirs(dir_path, exist_ok=True)
    
    # Standard & Round icon: dark background #070606 + centered logo
    icon_bg = Image.new("RGBA", (size, size), (7, 6, 6, 255))
    logo_resized = base_img.copy()
    inner_dim = int(size * 0.8)
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

print("All Android launcher icons generated successfully!")
