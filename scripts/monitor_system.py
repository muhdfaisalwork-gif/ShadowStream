"""
monitor_system.py — Continuous Monitoring, Anomaly Detection & Self-Healing Engine
Monitors:
  - Backend API (:3000/health)
  - Catalog Microservice (:7801/health)
  - Collections & Spiritual Catalog (:3000/api/v1/collections/prophets-and-history)
  - Dub Audio Download Pipeline (:3000/api/v1/dub/download)
  - Native App Downloads (:3000/downloads/ShadowStream.apk)
  - Cloudflare Deployed Worker (https://streamapp.muhd-faisal-work.workers.dev/)
"""
from __future__ import annotations
import json
import logging
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

LOG_FILE = Path(__file__).parent.parent / "monitor.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(str(LOG_FILE), encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)
log = logging.getLogger("SystemMonitor")

ENDPOINTS = [
    {
        "name": "Backend Health",
        "url": "http://127.0.0.1:3000/health",
        "expected_status": 200,
        "critical": True,
        "service": "backend",
    },
    {
        "name": "Catalog Microservice",
        "url": "http://127.0.0.1:7801/health",
        "expected_status": 200,
        "critical": True,
        "service": "catalog",
    },
    {
        "name": "Prophets & Spiritual Catalog",
        "url": "http://127.0.0.1:3000/api/v1/collections/prophets-and-history",
        "expected_status": 200,
        "critical": True,
        "service": "backend",
    },
    {
        "name": "Dub Audio Download Endpoint",
        "url": "http://127.0.0.1:3000/api/v1/dub/download?title=The%20Message&lang=ar",
        "expected_status": 200,
        "critical": True,
        "service": "catalog",
    },
    {
        "name": "Native APK Download",
        "url": "http://127.0.0.1:3000/downloads/ShadowStream.apk",
        "expected_status": 200,
        "method": "HEAD",
        "critical": False,
        "service": "backend",
    },
    {
        "name": "Local Web Frontend",
        "url": "http://127.0.0.1:3000/",
        "expected_status": 200,
        "critical": True,
        "service": "backend",
    },
    {
        "name": "Live Search API (ssmoviestvs.site)",
        "url": "https://ssmoviestvs.site/api/v1/search?q=The%20Office",
        "expected_status": 200,
        "critical": False,
        "service": "cloudflare_custom_domain",
    },
    {
        "name": "Live Custom Domain (ssmoviestvs.site)",
        "url": "https://ssmoviestvs.site/",
        "expected_status": 200,
        "critical": False,
        "service": "cloudflare_custom_domain",
    },
    {
        "name": "Live Scraper Microservice",
        "url": "http://127.0.0.1:7800/stats",
        "expected_status": 200,
        "critical": False,
        "service": "live_scraper",
    },
    {
        "name": "Studio Hubs Endpoint (Paramount+)",
        "url": "https://ssmoviestvs.site/api/v1/collections/paramount-plus",
        "expected_status": 200,
        "critical": False,
        "service": "cloudflare_custom_domain",
    },
    {
        "name": "Live Categories Rails API",
        "url": "https://ssmoviestvs.site/api/v1/categories",
        "expected_status": 200,
        "critical": False,
        "service": "cloudflare_custom_domain",
    },
    {
        "name": "SEO & Editorial Blogs Endpoint",
        "url": "http://127.0.0.1:3000/api/v1/blogs",
        "expected_status": 200,
        "critical": True,
        "service": "backend",
    },
    {
        "name": "Live Production Blogs API",
        "url": "https://ssmoviestvs.site/api/v1/blogs",
        "expected_status": 200,
        "critical": False,
        "service": "cloudflare_custom_domain",
    },
    {
        "name": "Live Prophets & Epics Collection",
        "url": "https://ssmoviestvs.site/api/v1/collections/prophets-and-history",
        "expected_status": 200,
        "critical": False,
        "service": "cloudflare_custom_domain",
    },
    {
        "name": "Live Title Resolution (The Office)",
        "url": "https://ssmoviestvs.site/api/v1/title/the-office-2005",
        "expected_status": 200,
        "critical": False,
        "service": "cloudflare_custom_domain",
    },
    {
        "name": "Live Title Resolution (Spider-Man)",
        "url": "https://ssmoviestvs.site/api/v1/title/spider-man-no-way-home-2021",
        "expected_status": 200,
        "critical": False,
        "service": "cloudflare_custom_domain",
    },
]

def check_endpoint(ep: dict) -> dict:
    url = ep["url"]
    name = ep["name"]
    method = ep.get("method", "GET")
    start = time.perf_counter()
    try:
        req = urllib.request.Request(url, method=method, headers={"User-Agent": "StreamAppMonitor/1.0"})
        with urllib.request.urlopen(req, timeout=8) as res:
            latency = (time.perf_counter() - start) * 1000
            status = res.status
            ok = (status == ep["expected_status"])
            return {
                "name": name,
                "url": url,
                "status": status,
                "latency_ms": round(latency, 2),
                "ok": ok,
                "error": None,
                "service": ep["service"],
                "critical": ep.get("critical", False),
            }
    except urllib.error.HTTPError as e:
        latency = (time.perf_counter() - start) * 1000
        return {
            "name": name,
            "url": url,
            "status": e.code,
            "latency_ms": round(latency, 2),
            "ok": (e.code == ep["expected_status"]),
            "error": f"HTTP {e.code}: {e.reason}",
            "service": ep["service"],
            "critical": ep.get("critical", False),
        }
    except Exception as e:
        latency = (time.perf_counter() - start) * 1000
        return {
            "name": name,
            "url": url,
            "status": 0,
            "latency_ms": round(latency, 2),
            "ok": False,
            "error": str(e),
            "service": ep["service"],
            "critical": ep.get("critical", False),
        }

def restart_service(svc_name: str):
    root_dir = Path(__file__).parent.parent
    log.warning("Attempting automated self-healing restart of %s...", svc_name)
    if svc_name == "catalog":
        cmd = f'powershell -Command "Start-Process python -ArgumentList \'scraper/catalog_service.py\' -WorkingDirectory \'{root_dir}\' -WindowStyle Hidden"'
        subprocess.Popen(cmd, shell=True)
        time.sleep(3)
    elif svc_name == "backend":
        backend_dir = root_dir / "backend"
        cmd = f'powershell -Command "Start-Process node -ArgumentList \'src/index.js\' -WorkingDirectory \'{backend_dir}\' -WindowStyle Hidden"'
        subprocess.Popen(cmd, shell=True)
        time.sleep(3)

def run_health_cycle(auto_heal: bool = True) -> list[dict]:
    results = []
    failed_services = set()
    for ep in ENDPOINTS:
        res = check_endpoint(ep)
        results.append(res)
        if res["ok"]:
            log.info("[OK] [%s] %s -> %d (%.1f ms)", res["name"], res["url"], res["status"], res["latency_ms"])
        else:
            log.error("[FAIL] [%s] %s -> %s (%.1f ms)", res["name"], res["url"], res["error"], res["latency_ms"])
            if res["critical"]:
                failed_services.add(res["service"])

    if auto_heal and failed_services:
        for svc in failed_services:
            restart_service(svc)

    return results

if __name__ == "__main__":
    auto_heal = "--no-heal" not in sys.argv
    run_once = "--once" in sys.argv
    log.info("Starting StreamApp System Monitor (auto_heal=%s, once=%s)", auto_heal, run_once)
    if run_once:
        run_health_cycle(auto_heal=auto_heal)
    else:
        interval = 30
        while True:
            run_health_cycle(auto_heal=auto_heal)
            time.sleep(interval)
