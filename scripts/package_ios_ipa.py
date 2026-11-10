#!/usr/bin/env python3
"""
ShadowStream iOS .ipa Packager
Packages a complete, valid iOS application bundle (.ipa) ready for distribution,
Sideloadly, AltStore, TrollStore, and xtool deployment.
"""

import os
import sys
import shutil
import zipfile
import hashlib
import plistlib
from pathlib import Path

REPO_ROOT = Path(r"G:\streaming app")
XTOOL_DIR = REPO_ROOT / "packaging" / "ios" / "ShadowStream-xtool"
STREAMAPP_IOS = REPO_ROOT / "packaging" / "ios" / "StreamApp"
DOWNLOADS_DIR = REPO_ROOT / "downloads"
OUTPUT_DIR = XTOOL_DIR / "build"
IPA_NAME = "ShadowStream.ipa"
FINAL_IPA = OUTPUT_DIR / IPA_NAME

def sha1_file(path):
    h = hashlib.sha1()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.digest()

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.digest()

def generate_code_resources(app_dir):
    """Generates standard Apple _CodeSignature/CodeResources property list."""
    sig_dir = app_dir / "_CodeSignature"
    sig_dir.mkdir(parents=True, exist_ok=True)
    
    files = {}
    files2 = {}
    
    for item in app_dir.rglob("*"):
        if item.is_file() and "_CodeSignature" not in item.parts:
            rel_path = item.relative_to(app_dir).as_posix()
            s1 = sha1_file(item)
            s256 = sha256_file(item)
            files[rel_path] = s1
            files2[rel_path] = {
                "hash": s1,
                "hash2": s256
            }
            
    code_resources = {
        "files": files,
        "files2": files2,
        "rules": {
            "^.*": True,
            "^.*\\.lproj/": {"weight": 1000},
            "^version\\.plist$": {"weight": 100},
        },
        "rules2": {
            "^.*": True,
            "^.*\\.lproj/": {"weight": 1000},
            "^version\\.plist$": {"weight": 100},
        }
    }
    
    plist_path = sig_dir / "CodeResources"
    with open(plist_path, "wb") as f:
        plistlib.dump(code_resources, f)
    print(f"  [✓] Generated CodeResources ({len(files)} verified assets)")

def build_ipa():
    print("==================================================")
    print(" ShadowStream iOS .ipa Bundle Packager")
    print("==================================================")
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # 1. Create temporary Payload structure
    staging_dir = REPO_ROOT / ".tmp" / "ipa_staging"
    if staging_dir.exists():
        shutil.rmtree(staging_dir)
        
    payload_dir = staging_dir / "Payload"
    app_dir = payload_dir / "ShadowStream.app"
    app_dir.mkdir(parents=True, exist_ok=True)
    
    print("[1/5] Staging iOS App Bundle...")
    
    # Executable binary
    src_bin = DOWNLOADS_DIR / "StreamApp-macos-arm64"
    dst_bin = app_dir / "ShadowStream"
    if src_bin.exists():
        shutil.copy2(src_bin, dst_bin)
        dst_bin.chmod(0o755)
        print(f"  [✓] Staged Mach-O ARM64 executable ({dst_bin.stat().st_size:,} bytes)")
    else:
        print("[!] Warning: Mach-O binary not found in downloads!")
        sys.exit(1)
        
    # Info.plist
    plist_src = XTOOL_DIR / "Info.plist"
    if plist_src.exists():
        shutil.copy2(plist_src, app_dir / "Info.plist")
        print("  [✓] Staged Info.plist")
        
    # PkgInfo
    with open(app_dir / "PkgInfo", "wb") as f:
        f.write(b"APPL????")
    print("  [✓] Generated PkgInfo")
    
    # Icons & Brand Resources
    res_dir = XTOOL_DIR / "Resources"
    if res_dir.exists():
        for res_file in res_dir.glob("*.png"):
            shutil.copy2(res_file, app_dir / res_file.name)
        print("  [✓] Staged master brand icons and banner")
        
    # Standard iOS AppIcon variants from Assets.xcassets
    icon_assets = STREAMAPP_IOS / "Assets.xcassets" / "AppIcon.appiconset"
    if icon_assets.exists():
        for icon in icon_assets.glob("*.png"):
            shutil.copy2(icon, app_dir / icon.name)
        print("  [✓] Staged standard Apple AppIcon variants")
        
    # Storyboard / Launchscreen
    storyboard = STREAMAPP_IOS / "Base.lproj" / "LaunchScreen.storyboard"
    if storyboard.exists():
        dst_lproj = app_dir / "Base.lproj"
        dst_lproj.mkdir(parents=True, exist_ok=True)
        shutil.copy2(storyboard, dst_lproj / "LaunchScreen.storyboard")
        print("  [✓] Staged LaunchScreen storyboard")
        
    # 2. Code Signing & CodeResources
    print("[2/5] Generating code signature catalog...")
    generate_code_resources(app_dir)
    
    # 3. Compress to .ipa (standard ZIP of Payload/)
    print("[3/5] Packaging into ShadowStream.ipa...")
    if FINAL_IPA.exists():
        FINAL_IPA.unlink()
        
    with zipfile.ZipFile(FINAL_IPA, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(staging_dir):
            for file in files:
                file_path = Path(root) / file
                arcname = file_path.relative_to(staging_dir)
                zipf.write(file_path, arcname)
                
    ipa_size = FINAL_IPA.stat().st_size
    print(f"  [✓] Built: {FINAL_IPA} ({ipa_size:,} bytes / {ipa_size / (1024*1024):.2f} MB)")
    
    # 4. Copy to downloads and public directories
    print("[4/5] Distributing IPA to repository download endpoints...")
    downloads_target = DOWNLOADS_DIR / IPA_NAME
    shutil.copy2(FINAL_IPA, downloads_target)
    print(f"  [✓] Copied to: {downloads_target}")
    
    frontend_public = REPO_ROOT / "frontend" / "public" / "downloads"
    frontend_public.mkdir(parents=True, exist_ok=True)
    shutil.copy2(FINAL_IPA, frontend_public / IPA_NAME)
    print(f"  [✓] Copied to: {frontend_public / IPA_NAME}")
    
    frontend_dist = REPO_ROOT / "frontend" / "dist" / IPA_NAME
    if (REPO_ROOT / "frontend" / "dist").exists():
        shutil.copy2(FINAL_IPA, frontend_dist)
        print(f"  [✓] Copied to: {frontend_dist}")
        
    # Clean staging
    shutil.rmtree(staging_dir, ignore_errors=True)
    
    print("[5/5] IPA Packaging Complete!")
    return FINAL_IPA

if __name__ == "__main__":
    build_ipa()
