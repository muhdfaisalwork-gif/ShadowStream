import os
import sys
import subprocess
import glob

# Ensure UTF-8 console output
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

def upload_all():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    export_dir = os.path.join(base_dir, "worker_export")
    blogs_dir = os.path.join(export_dir, "blogs")
    worker_cwd = os.path.abspath(os.path.join(base_dir, "..", "downloads", "streamapp-worker"))

    # 1. Master blogs.json
    master_file = os.path.join(export_dir, "blogs.json")
    if os.path.exists(master_file):
        print("Uploading blogs.json ...", flush=True)
        cmd = f'npx wrangler r2 object put "streamapp-catalog/blogs.json" --file="{os.path.abspath(master_file)}" --remote'
        res = subprocess.run(cmd, cwd=worker_cwd, shell=True, capture_output=True, encoding="utf-8", errors="replace")
        print("  Master blogs.json result:", "SUCCESS" if res.returncode == 0 else res.stderr[:100], flush=True)

    # 2. Individual blogs
    for full_path in glob.glob(os.path.join(blogs_dir, "*.json")):
        fname = os.path.basename(full_path)
        r2_key = f"blogs/{fname}"
        print(f"Uploading {r2_key} ...", flush=True)
        cmd = f'npx wrangler r2 object put "streamapp-catalog/{r2_key}" --file="{os.path.abspath(full_path)}" --remote'
        res = subprocess.run(cmd, cwd=worker_cwd, shell=True, capture_output=True, encoding="utf-8", errors="replace")
        print(f"  {fname}:", "SUCCESS" if res.returncode == 0 else res.stderr[:100], flush=True)

if __name__ == "__main__":
    upload_all()
