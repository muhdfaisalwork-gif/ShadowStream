"""
generate_all_icons.py — Professional Multi-Platform Icon & Branding Generator for ShadowStream.

Generates:
1. Master Icons:
   - icon.png (1024x1024 transparent)
   - icon-appstore.png (1024x1024 with premium dark-slate #0b0f19 background)
   - logo-banner.png (horizontal wordmark)
2. Web & PWA:
   - frontend/public/favicon.ico (multi-resolution: 16x16, 32x32, 48x48)
   - frontend/public/favicon.png (32x32)
   - frontend/public/apple-touch-icon.png (180x180)
   - frontend/public/icons/icon-192.png
   - frontend/public/icons/icon-512.png
   - frontend/public/icons/icon-maskable-512.png
3. Expo / React Native:
   - frontend/assets/icon.png (1024x1024)
   - frontend/assets/adaptive-icon.png (1024x1024)
   - frontend/assets/android-icon-foreground.png (1024x1024)
   - frontend/assets/android-icon-background.png (1024x1024, #0b0f19)
   - frontend/assets/android-icon-monochrome.png (1024x1024)
   - frontend/assets/splash-icon.png (512x512)
   - frontend/assets/favicon.png (48x48)
4. Apple iOS & macOS (xcassets):
   - packaging/ios/StreamApp/Assets.xcassets/AppIcon.appiconset/ (all sizes)
   - packaging/ios/ShadowStream-xtool/Resources/AppIcon.png (1024x1024)
5. Linux Desktop Icons:
   - packaging/linux/icons/hicolor/{16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256, 512x512}/shadowstream.png
6. Windows:
   - packaging/windows/app/build-res/icon.png (256x256)
   - packaging/windows/icon.ico
"""

import os
import sys
import json
import shutil
import numpy as np
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter

REPO = Path(__file__).resolve().parent.parent
MASTER_SRC = REPO / "frontend" / "public" / "icons" / "decoded_master.png"
USER_SRC = Path(r"C:\Users\Lucifer\.gemini\antigravity\brain\6a0f053c-5dd5-4fb3-99aa-170a2370ef20\.user_uploaded\media_1791642271349_76746f6a.png")

DARK_BG = (11, 15, 25, 255)  # #0b0f19 premium streaming dark

def load_master():
    if MASTER_SRC.exists():
        print(f"Loading master source from {MASTER_SRC}")
        return Image.open(MASTER_SRC).convert("RGBA")
    elif USER_SRC.exists():
        print(f"Loading user upload from {USER_SRC}")
        return Image.open(USER_SRC).convert("RGBA")
    else:
        raise FileNotFoundError("No source image found")

def extract_badge(img):
    """Cuts out the circular wave-S badge with purple play button."""
    arr = np.array(img)
    alpha = arr[:, :, 3]
    
    # The badge is in the left third of the image
    split_x = int(img.width * 0.45)
    mark_pixels = np.where(alpha[:, :split_x] > 10)
    
    min_y, max_y = int(np.min(mark_pixels[0])), int(np.max(mark_pixels[0]))
    min_x, max_x = int(np.min(mark_pixels[1])), int(np.max(mark_pixels[1]))
    
    badge = img.crop((min_x, min_y, max_x + 1, max_y + 1))
    print(f"Extracted badge: {badge.size[0]}x{badge.size[1]} px")
    return badge

def extract_wordmark(img):
    """Cuts out the entire banner (badge + typography)."""
    arr = np.array(img)
    alpha = arr[:, :, 3]
    pixels = np.where(alpha > 10)
    min_y, max_y = int(np.min(pixels[0])), int(np.max(pixels[0]))
    min_x, max_x = int(np.min(pixels[1])), int(np.max(pixels[1]))
    banner = img.crop((min_x, min_y, max_x + 1, max_y + 1))
    print(f"Extracted wordmark banner: {banner.size[0]}x{banner.size[1]} px")
    return banner

def create_square_icon(badge, size=1024, padding_ratio=0.15, bg_color=None):
    """Creates a perfectly square canvas with the badge centered."""
    canvas = Image.new("RGBA", (size, size), bg_color if bg_color else (0, 0, 0, 0))
    
    # Calculate target dimensions
    target_inner = int(size * (1.0 - (2 * padding_ratio)))
    bw, bh = badge.size
    scale = min(target_inner / bw, target_inner / bh)
    new_w, new_h = int(bw * scale), int(bh * scale)
    
    resized_badge = badge.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    offset_x = (size - new_w) // 2
    offset_y = (size - new_h) // 2
    canvas.paste(resized_badge, (offset_x, offset_y), resized_badge)
    return canvas

def main():
    print("=" * 60)
    print(" ShadowStream Multi-Platform Brand & Icon Asset Generator")
    print("=" * 60)
    
    img = load_master()
    badge = extract_badge(img)
    banner = extract_wordmark(img)
    
    # 1. Master 1024x1024 icons
    master_transparent = create_square_icon(badge, size=1024, padding_ratio=0.10, bg_color=None)
    master_dark = create_square_icon(badge, size=1024, padding_ratio=0.14, bg_color=DARK_BG)
    
    # Save master exports
    os.makedirs(REPO / "frontend" / "public" / "icons", exist_ok=True)
    master_transparent.save(REPO / "frontend" / "public" / "icons" / "icon-1024-transparent.png")
    master_dark.save(REPO / "frontend" / "public" / "icons" / "icon-1024-dark.png")
    banner.save(REPO / "frontend" / "public" / "icons" / "shadowstream-banner.png")
    print("  [OK] Master 1024x1024 icons generated.")
    
    # 2. Frontend Assets (Expo & React Native)
    frontend_assets = REPO / "frontend" / "assets"
    os.makedirs(frontend_assets, exist_ok=True)
    
    master_dark.save(frontend_assets / "icon.png")
    master_transparent.save(frontend_assets / "adaptive-icon.png")
    master_transparent.save(frontend_assets / "android-icon-foreground.png")
    
    # Background for Android adaptive icon
    bg_img = Image.new("RGBA", (1024, 1024), DARK_BG)
    bg_img.save(frontend_assets / "android-icon-background.png")
    
    # Monochrome icon (for Android 13+ themed icons)
    # Convert badge alpha to white silhouette
    mono_arr = np.array(master_transparent)
    mono_arr[:, :, 0] = 255
    mono_arr[:, :, 1] = 255
    mono_arr[:, :, 2] = 255
    Image.fromarray(mono_arr).save(frontend_assets / "android-icon-monochrome.png")
    
    # Splash & Favicon
    splash = create_square_icon(badge, size=512, padding_ratio=0.15, bg_color=None)
    splash.save(frontend_assets / "splash-icon.png")
    
    fav_48 = create_square_icon(badge, size=48, padding_ratio=0.05, bg_color=None)
    fav_48.save(frontend_assets / "favicon.png")
    print("  [OK] Frontend Expo assets updated.")
    
    # 3. Web & PWA (frontend/public & frontend/public/icons)
    public_dir = REPO / "frontend" / "public"
    public_icons = public_dir / "icons"
    os.makedirs(public_icons, exist_ok=True)
    
    # Favicon.ico multi-resolution
    fav_sizes = [(16, 16), (32, 32), (48, 48)]
    fav_frames = [create_square_icon(badge, size=s[0], padding_ratio=0.05, bg_color=None) for s in fav_sizes]
    fav_frames[0].save(public_dir / "favicon.ico", format="ICO", sizes=fav_sizes, append_images=fav_frames[1:])
    fav_frames[1].save(public_dir / "favicon.png")
    
    # Apple touch icon (180x180, dark bg per Apple HIG)
    apple_touch = create_square_icon(badge, size=180, padding_ratio=0.12, bg_color=DARK_BG)
    apple_touch.save(public_dir / "apple-touch-icon.png")
    
    # PWA icons
    pwa_192 = create_square_icon(badge, size=192, padding_ratio=0.12, bg_color=DARK_BG)
    pwa_192.save(public_icons / "icon-192.png")
    
    pwa_512 = create_square_icon(badge, size=512, padding_ratio=0.12, bg_color=DARK_BG)
    pwa_512.save(public_icons / "icon-512.png")
    
    # Maskable PWA icon (requires extra padding per W3C spec)
    maskable_512 = create_square_icon(badge, size=512, padding_ratio=0.22, bg_color=DARK_BG)
    maskable_512.save(public_icons / "icon-maskable-512.png")
    print("  [OK] Web & PWA icons generated.")
    
    # 4. Apple iOS & macOS AppIcon catalog
    ios_iconset = REPO / "packaging" / "ios" / "StreamApp" / "Assets.xcassets" / "AppIcon.appiconset"
    os.makedirs(ios_iconset, exist_ok=True)
    
    ios_sizes = [
        ("icon-20@2x.png", 40),
        ("icon-20@3x.png", 60),
        ("icon-29.png", 29),
        ("icon-29@2x.png", 58),
        ("icon-29@3x.png", 87),
        ("icon-40@2x.png", 80),
        ("icon-40@3x.png", 120),
        ("icon-60@2x.png", 120),
        ("icon-60@3x.png", 180),
        ("icon-76.png", 76),
        ("icon-76@2x.png", 152),
        ("icon-83.5@2x.png", 167),
        ("icon-1024.png", 1024),
    ]
    for fname, sz in ios_sizes:
        icon_img = create_square_icon(badge, size=sz, padding_ratio=0.12, bg_color=DARK_BG)
        icon_img.save(ios_iconset / fname)
        
    # Write Xcode Contents.json
    contents = {
        "images": [
            {"size": "20x20", "idiom": "iphone", "filename": "icon-20@2x.png", "scale": "2x"},
            {"size": "20x20", "idiom": "iphone", "filename": "icon-20@3x.png", "scale": "3x"},
            {"size": "29x29", "idiom": "iphone", "filename": "icon-29@2x.png", "scale": "2x"},
            {"size": "29x29", "idiom": "iphone", "filename": "icon-29@3x.png", "scale": "3x"},
            {"size": "40x40", "idiom": "iphone", "filename": "icon-40@2x.png", "scale": "2x"},
            {"size": "40x40", "idiom": "iphone", "filename": "icon-40@3x.png", "scale": "3x"},
            {"size": "60x60", "idiom": "iphone", "filename": "icon-60@2x.png", "scale": "2x"},
            {"size": "60x60", "idiom": "iphone", "filename": "icon-60@3x.png", "scale": "3x"},
            {"size": "20x20", "idiom": "ipad", "filename": "icon-20@2x.png", "scale": "2x"},
            {"size": "29x29", "idiom": "ipad", "filename": "icon-29.png", "scale": "1x"},
            {"size": "29x29", "idiom": "ipad", "filename": "icon-29@2x.png", "scale": "2x"},
            {"size": "40x40", "idiom": "ipad", "filename": "icon-40@2x.png", "scale": "2x"},
            {"size": "76x76", "idiom": "ipad", "filename": "icon-76.png", "scale": "1x"},
            {"size": "76x76", "idiom": "ipad", "filename": "icon-76@2x.png", "scale": "2x"},
            {"size": "83.5x83.5", "idiom": "ipad", "filename": "icon-83.5@2x.png", "scale": "2x"},
            {"size": "1024x1024", "idiom": "ios-marketing", "filename": "icon-1024.png", "scale": "1x"}
        ],
        "info": {"version": 1, "author": "xcode"}
    }
    with open(ios_iconset / "Contents.json", "w", encoding="utf-8") as f:
        json.dump(contents, f, indent=2)
    print("  [OK] Apple iOS AppIcon.appiconset generated.")
    
    # Copy master to xtool project resources
    xtool_res = REPO / "packaging" / "ios" / "ShadowStream-xtool" / "Resources"
    os.makedirs(xtool_res, exist_ok=True)
    master_dark.save(xtool_res / "AppIcon.png")
    master_transparent.save(xtool_res / "AppIcon-transparent.png")
    banner.save(xtool_res / "BrandBanner.png")
    print("  [OK] xtool Resources AppIcon deployed.")
    
    # 5. Linux Desktop Icons (hicolor theme)
    linux_icon_base = REPO / "packaging" / "linux" / "icons" / "hicolor"
    for sz in [16, 24, 32, 48, 64, 128, 256, 512]:
        sz_dir = linux_icon_base / f"{sz}x{sz}" / "apps"
        os.makedirs(sz_dir, exist_ok=True)
        linux_icon = create_square_icon(badge, size=sz, padding_ratio=0.08, bg_color=None)
        linux_icon.save(sz_dir / "shadowstream.png")
    print("  [OK] Linux hicolor icon suite (16x16 -> 512x512) generated.")
    
    # 6. Windows Icons
    win_res = REPO / "packaging" / "windows" / "app" / "build-res"
    os.makedirs(win_res, exist_ok=True)
    win_256 = create_square_icon(badge, size=256, padding_ratio=0.10, bg_color=DARK_BG)
    win_256.save(win_res / "icon.png")
    
    # Generate multi-size .ico from high-res dark master
    win_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    master_dark.save(win_res / "icon.ico", format="ICO", sizes=win_sizes)
    master_dark.save(REPO / "packaging" / "windows" / "icon.ico", format="ICO", sizes=win_sizes)
    print("  [OK] Windows multi-res icon.ico generated.")
    
    print("\n" + "=" * 60)
    print(" ALL BRAND & ICON ASSETS SUCCESSFULLY GENERATED!")
    print("=" * 60)

if __name__ == "__main__":
    main()
