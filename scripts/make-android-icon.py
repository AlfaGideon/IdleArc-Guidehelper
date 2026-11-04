"""Create the Android launcher icon from the bundled IdleArc logo (requires Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
src = Image.open(root / 'hub/brand/logo.png').convert('RGBA').resize((512, 512), Image.Resampling.LANCZOS)
base = Image.new('RGBA', (512, 512), (8, 11, 19, 255))
base.alpha_composite(src)
overlay = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)
draw.rounded_rectangle((42, 382, 470, 481), radius=24, fill=(8, 16, 30, 228), outline=(135, 206, 248, 180), width=3)
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 67)
draw.text((256, 426), 'ГАЙД', font=font, anchor='mm', fill=(250, 251, 255), stroke_width=1, stroke_fill=(38, 118, 167))
base = Image.alpha_composite(base, overlay).convert('RGB')
resources = root / 'android/app/src/main/res'
for folder, size in [('mipmap-mdpi', 48), ('mipmap-hdpi', 72), ('mipmap-xhdpi', 96), ('mipmap-xxhdpi', 144), ('mipmap-xxxhdpi', 192)]:
    path = resources / folder
    path.mkdir(parents=True, exist_ok=True)
    base.resize((size, size), Image.Resampling.LANCZOS).save(path / 'ic_launcher.png', optimize=True)
path = resources / 'drawable'
path.mkdir(parents=True, exist_ok=True)
base.save(path / 'guide_logo.png', optimize=True)
