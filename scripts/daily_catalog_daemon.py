"""
daily_catalog_daemon.py — 24/7 background scheduler daemon for ShadowStream.

Monitors elapsed time and triggers auto_daily_sync.py once every 24 hours.
Also supports immediate run on launch if more than 24 hours have elapsed since the last sync.
"""
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).parent
PROJECT_ROOT = HERE.parent
SCRAPER_DIR = PROJECT_ROOT / "scraper"
LOGS_DIR = PROJECT_ROOT / "reports" / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)
STATE_FILE = SCRAPER_DIR / "daily_sync_state.json"
LOG_FILE = LOGS_DIR / "daily_sync.log"
PYTHON_EXE = sys.executable

SYNC_INTERVAL_SECONDS = 24 * 3600  # 24 hours
CHECK_INTERVAL_SECONDS = 300       # Check every 5 minutes


def log(msg: str) -> None:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{now}] [DailySyncDaemon] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def get_last_sync_time() -> float:
    if STATE_FILE.exists():
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return float(data.get("last_run_timestamp", 0))
        except Exception as e:
            log(f"Error reading state file: {e}")
    return 0.0


def save_sync_state(status: str, duration: float) -> None:
    try:
        data = {
            "last_run_timestamp": time.time(),
            "last_run_iso": datetime.now().isoformat(),
            "last_status": status,
            "duration_seconds": round(duration, 1),
        }
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        log(f"Error saving sync state: {e}")


def run_sync() -> bool:
    log("Triggering auto_daily_sync.py...")
    start = time.time()
    cmd = [PYTHON_EXE, str(SCRAPER_DIR / "auto_daily_sync.py")]
    try:
        proc = subprocess.run(cmd, cwd=str(SCRAPER_DIR), capture_output=True, text=True, timeout=1800)
        duration = time.time() - start
        if proc.returncode == 0:
            log(f"auto_daily_sync.py completed successfully in {duration:.1f}s.")
            save_sync_state("success", duration)
            return True
        else:
            log(f"auto_daily_sync.py returned non-zero code {proc.returncode}.")
            for l in (proc.stderr or proc.stdout).splitlines()[-10:]:
                log(f"  {l}")
            save_sync_state("failed", duration)
            return False
    except Exception as e:
        duration = time.time() - start
        log(f"Exception during sync execution: {e}")
        save_sync_state("exception", duration)
        return False


def main():
    log("==================================================================")
    log("ShadowStream 24/7 Daily Catalog Sync Daemon Starting...")
    log(f"Sync interval: {SYNC_INTERVAL_SECONDS / 3600:.1f} hours | Check interval: {CHECK_INTERVAL_SECONDS}s")
    log("==================================================================")

    while True:
        try:
            last_run = get_last_sync_time()
            elapsed = time.time() - last_run
            hours_since = elapsed / 3600.0

            if elapsed >= SYNC_INTERVAL_SECONDS or last_run == 0:
                log(f"Time for scheduled daily sync (hours since last: {hours_since:.2f}). Starting sync...")
                run_sync()
            else:
                remaining_hours = (SYNC_INTERVAL_SECONDS - elapsed) / 3600.0
                log(f"Next sync scheduled in ~{remaining_hours:.2f} hours. Sleeping...")

            time.sleep(CHECK_INTERVAL_SECONDS)
        except KeyboardInterrupt:
            log("Daemon interrupted by user. Shutting down gracefully.")
            break
        except Exception as e:
            log(f"Unexpected loop exception: {e}")
            time.sleep(60)


if __name__ == "__main__":
    main()
