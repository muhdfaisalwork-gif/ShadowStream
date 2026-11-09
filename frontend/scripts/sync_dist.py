import shutil
from pathlib import Path

HERE = Path(__file__).parent.parent
PUBLIC_DIR = HERE / "public"
DIST_DIR = HERE / "dist"

def sync_assets():
    if not PUBLIC_DIR.exists() or not DIST_DIR.exists():
        print(f"Skipping sync: PUBLIC_DIR({PUBLIC_DIR.exists()}) or DIST_DIR({DIST_DIR.exists()}) missing")
        return

    patterns = [
        "robots.txt",
        "llms.txt",
        "sitemap*.xml",
        "sw.js",
        "manifest.webmanifest",
        "offline.html",
        "*.json",
    ]

    count = 0
    for pat in patterns:
        for src in PUBLIC_DIR.glob(pat):
            if src.is_file():
                dest = DIST_DIR / src.name
                shutil.copy2(src, dest)
                count += 1

    # Also sync all blogs if present
    blogs_src = PUBLIC_DIR / "blogs"
    blogs_dist = DIST_DIR / "blogs"
    if blogs_src.exists():
        blogs_dist.mkdir(parents=True, exist_ok=True)
        for b in blogs_src.glob("*.json"):
            shutil.copy2(b, blogs_dist / b.name)
            count += 1

    print(f"[Sync] Copied {count} public assets into dist/")

if __name__ == "__main__":
    sync_assets()
