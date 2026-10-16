import sqlite3
import os
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DB_PATH = REPO / "scraper" / "catalog.db"
OUTPUT_PUBLIC = REPO / "frontend" / "public" / "sitemap.xml"
OUTPUT_EXPORT = REPO / "scraper" / "worker_export" / "sitemap.xml"

BASE = "https://ssmoviestvs.site"
today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

def generate():
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    # 1. Fetch published blogs
    cur.execute("SELECT slug, published_at FROM blogs")
    blogs = cur.fetchall()

    # 2. Fetch top 300 popular titles
    cur.execute("SELECT slug, id FROM titles WHERE poster LIKE 'http%' ORDER BY popularity DESC LIMIT 300")
    titles = cur.fetchall()

    xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']

    # Static category hubs
    static_routes = [
        ("/", "1.0", "daily"),
        ("/movies", "0.9", "daily"),
        ("/tv", "0.9", "daily"),
        ("/anime", "0.9", "daily"),
        ("/short-dramas", "0.8", "daily"),
        ("/collections", "0.8", "weekly"),
        ("/blogs", "0.9", "daily"),
        ("/genres", "0.7", "weekly"),
        ("/countries", "0.7", "weekly"),
        ("/languages", "0.7", "weekly"),
        ("/apps", "0.8", "weekly")
    ]

    for route, prio, freq in static_routes:
        xml.append(f'  <url><loc>{BASE}{route}</loc><lastmod>{today}</lastmod><changefreq>{freq}</changefreq><priority>{prio}</priority></url>')

    for slug, pub in blogs:
        date_part = pub[:10] if pub else today
        xml.append(f'  <url><loc>{BASE}/blog/{slug}</loc><lastmod>{date_part}</lastmod><changefreq>weekly</changefreq><priority>0.85</priority></url>')

    for slug, id_ in titles:
        url_slug = slug if slug else f"title-{id_}"
        xml.append(f'  <url><loc>{BASE}/title/{url_slug}</loc><lastmod>{today}</lastmod><changefreq>weekly</changefreq><priority>0.75</priority></url>')

    xml.append("</urlset>")
    sitemap_content = "\n".join(xml)

    OUTPUT_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PUBLIC.write_text(sitemap_content, encoding="utf-8")
    
    OUTPUT_EXPORT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_EXPORT.write_text(sitemap_content, encoding="utf-8")

    print(f"Generated sitemap with {len(static_routes)} static routes, {len(blogs)} blogs, and {len(titles)} titles.")

if __name__ == "__main__":
    generate()
