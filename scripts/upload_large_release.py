"""
Upload large release artifacts (exe, zip) to Cloudflare R2 via Worker multipart streaming.
Each chunk is 10 MB, preventing network timeouts and supporting automatic per-part retries.
"""

from __future__ import annotations

import json
import math
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ENDPOINT = "https://streamapp-catalog.muhd-faisal-work.workers.dev"
ADMIN_KEY = "shadowstream-upload-key-2026"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ShadowStream/2.4.27"
CHUNK_SIZE = 10 * 1024 * 1024  # 10 MB

FILES_TO_UPLOAD = [
    (
        "ShadowStream-Setup-x64.exe",
        Path(r"G:\streaming app\packaging\windows\ShadowStream-Setup-x64.exe"),
        "application/vnd.microsoft.portable-executable",
    ),
    (
        "ShadowStream-win-x64.zip",
        Path(r"G:\streaming app\packaging\windows\ShadowStream-win-x64.zip"),
        "application/zip",
    ),
]


def get_published() -> dict[str, int]:
    url = f"{ENDPOINT}/downloads"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode())
        return {item["key"]: item["size"] for item in data}


def upload_file(key: str, file_path: Path, content_type: str) -> bool:
    size = file_path.stat().st_size
    num_parts = math.ceil(size / CHUNK_SIZE)
    print(f"\n[START] Uploading {key} ({size:,} bytes) in {num_parts} parts of {CHUNK_SIZE // (1024*1024)} MB...")

    # 1. Initialize
    init_url = f"{ENDPOINT}/admin/upload/init"
    init_payload = json.dumps({"key": key, "contentType": content_type}).encode("utf-8")
    init_req = urllib.request.Request(
        init_url,
        data=init_payload,
        headers={
            "User-Agent": USER_AGENT,
            "Content-Type": "application/json",
            "x-admin-key": ADMIN_KEY,
        },
        method="POST"
    )
    with urllib.request.urlopen(init_req, timeout=30) as r:
        init_res = json.loads(r.read().decode())
    upload_id = init_res["uploadId"]
    print(f"  Initialized upload ID: {upload_id[:20]}...")

    parts = []
    with open(file_path, "rb") as f:
        for part_number in range(1, num_parts + 1):
            chunk = f.read(CHUNK_SIZE)
            chunk_len = len(chunk)
            part_url = f"{ENDPOINT}/admin/upload/part?key={urllib.parse.quote(key)}&uploadId={urllib.parse.quote(upload_id)}&partNumber={part_number}"

            uploaded = False
            for attempt in range(1, 6):
                try:
                    part_req = urllib.request.Request(
                        part_url,
                        data=chunk,
                        headers={
                            "User-Agent": USER_AGENT,
                            "Content-Type": "application/octet-stream",
                            "x-admin-key": ADMIN_KEY,
                        },
                        method="PUT"
                    )
                    t0 = time.time()
                    with urllib.request.urlopen(part_req, timeout=120) as r:
                        part_res = json.loads(r.read().decode())
                    dt = time.time() - t0
                    speed = (chunk_len / 1024 / 1024) / max(dt, 0.001)
                    print(f"  Part {part_number:02d}/{num_parts:02d} ({chunk_len:,} bytes) uploaded in {dt:.2f}s ({speed:.2f} MB/s) [etag: {part_res.get('etag', '')[:8]}...]", flush=True)
                    parts.append({"partNumber": part_number, "etag": part_res["etag"]})
                    uploaded = True
                    break
                except Exception as e:
                    print(f"  Part {part_number}/{num_parts} attempt {attempt} failed: {e}. Retrying in 3s...", flush=True)
                    time.sleep(3)

            if not uploaded:
                print(f"  Failed to upload part {part_number}. Aborting multipart upload...", flush=True)
                abort_url = f"{ENDPOINT}/admin/upload/abort"
                abort_payload = json.dumps({"key": key, "uploadId": upload_id}).encode("utf-8")
                urllib.request.urlopen(urllib.request.Request(abort_url, data=abort_payload, headers={"User-Agent": USER_AGENT, "Content-Type": "application/json", "x-admin-key": ADMIN_KEY}, method="POST"))
                return False

    # 3. Complete
    print(f"  Completing multipart upload for {key} with {len(parts)} parts...", flush=True)
    complete_url = f"{ENDPOINT}/admin/upload/complete"
    complete_payload = json.dumps({"key": key, "uploadId": upload_id, "parts": parts}).encode("utf-8")
    comp_req = urllib.request.Request(
        complete_url,
        data=complete_payload,
        headers={
            "User-Agent": USER_AGENT,
            "Content-Type": "application/json",
            "x-admin-key": ADMIN_KEY,
        },
        method="POST"
    )
    with urllib.request.urlopen(comp_req, timeout=60) as r:
        comp_res = json.loads(r.read().decode())
    print(f"  Completed successfully! Server size: {comp_res.get('size')} bytes", flush=True)
    return True


def main():
    pub = get_published()
    print("Current R2 state:")
    for k, p, _ in FILES_TO_UPLOAD:
        print(f"  {k}: {pub.get(k)} bytes in R2 (local: {p.stat().st_size} bytes)")

    for key, path, ctype in FILES_TO_UPLOAD:
        if not path.is_file():
            print(f"Error: {path} not found")
            return 1
        expected_size = path.stat().st_size
        print(f"\nProcessing {key} (target: {expected_size:,} bytes)...")

        success = upload_file(key, path, ctype)
        if not success:
            print(f"FAILED to upload {key}")
            return 1

    # Final verification
    time.sleep(2)
    final_pub = get_published()
    print("\n=== Final R2 Verification ===")
    all_ok = True
    for key, path, _ in FILES_TO_UPLOAD:
        expected = path.stat().st_size
        actual = final_pub.get(key)
        status = "OK" if actual == expected else "MISMATCH"
        print(f"  {key}: expected {expected}, actual {actual} -> {status}")
        if actual != expected:
            all_ok = False

    if all_ok:
        print("\nAll files successfully uploaded and verified in R2!")
        return 0
    else:
        print("\nVerification failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())
