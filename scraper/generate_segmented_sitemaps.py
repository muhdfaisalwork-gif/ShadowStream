"""
generate_segmented_sitemaps.py — Automated Segmented XML Sitemaps Generator
Splits the 104,261+ ShadowStream catalog into 25,000-URL chunks per sitemap protocol specification:
  - sitemap-static.xml: Homepage, Category Hubs, Live Sports Guide, Collections, Blogs, Genres, Countries
  - sitemap-movies-1.xml: Top 25,000 Movies ordered by popularity
  - sitemap-movies-2.xml: Next 25,000 Movies
  - sitemap-series-1.xml: Top 25,000 TV Series ordered by popularity
  - sitemap-anime-1.xml: Anime Series & Films
  - sitemap_index.xml: Master index referencing all sub-sitemaps
"""
import sqlite3
import os
import sys
import json
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).parent
DB_PATH = HERE / "catalog.db"
OUTPUT_DIRS = [
    HERE / "worker_export",
    HERE.parent / "frontend" / "public",
    HERE.parent / "frontend" / "dist",
]

BASE_URL = "https://www.ssmoviestvs.site"

def format_date(dt_str=None):
    if not dt_str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        if "T" in dt_str:
            return dt_str.split("T")[0]
        if " " in dt_str:
            return dt_str.split(" ")[0]
        return dt_str[:10]
    except Exception:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

def escape_xml(s):
    if not s:
        return ""
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&apos;")

def write_urlset(filepath, url_entries):
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for loc, lastmod, changefreq, priority in url_entries:
        lines.append(
            f'  <url><loc>{escape_xml(loc)}</loc><lastmod>{lastmod}</lastmod><changefreq>{changefreq}</changefreq><priority>{priority}</priority></url>'
        )
    lines.append('</urlset>\n')
    content = "\n".join(lines)
    for out_dir in OUTPUT_DIRS:
        out_dir.mkdir(parents=True, exist_ok=True)
        dest = out_dir / filepath.name
        with open(dest, "w", encoding="utf-8") as f:
            f.write(content)
    print(f"[Sitemap] Wrote {len(url_entries)} entries to {filepath.name}")

def write_sitemap_index(filepath, sub_sitemaps):
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for sitemap_url in sub_sitemaps:
        lines.append(f'  <sitemap><loc>{escape_xml(sitemap_url)}</loc><lastmod>{now_str}</lastmod></sitemap>')
    lines.append('</sitemapindex>\n')
    content = "\n".join(lines)
    for out_dir in OUTPUT_DIRS:
        out_dir.mkdir(parents=True, exist_ok=True)
        dest = out_dir / filepath.name
        with open(dest, "w", encoding="utf-8") as f:
            f.write(content)
    print(f"[Sitemap] Wrote index with {len(sub_sitemaps)} sub-sitemaps to {filepath.name}")

def generate_sitemaps():
    print(f"[Sitemap] Connecting to {DB_PATH}...")
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # 1. sitemap-static.xml
    static_entries = [
        (f"{BASE_URL}/", today, "daily", "1.0"),
        (f"{BASE_URL}/movies", today, "daily", "0.9"),
        (f"{BASE_URL}/series", today, "daily", "0.9"),
        (f"{BASE_URL}/tv", today, "daily", "0.9"),
        (f"{BASE_URL}/anime", today, "daily", "0.9"),
        (f"{BASE_URL}/short-dramas", today, "daily", "0.8"),
        (f"{BASE_URL}/live", today, "hourly", "0.9"),
        (f"{BASE_URL}/sports", today, "hourly", "0.9"),
        (f"{BASE_URL}/dubs", today, "weekly", "0.85"),
        (f"{BASE_URL}/dubs/hindi-dubbed", today, "weekly", "0.85"),
        (f"{BASE_URL}/regional/pakistani-turkish-dramas", today, "weekly", "0.85"),
        (f"{BASE_URL}/collections", today, "weekly", "0.85"),
        (f"{BASE_URL}/blogs", today, "daily", "0.85"),
        (f"{BASE_URL}/genres", today, "weekly", "0.7"),
        (f"{BASE_URL}/countries", today, "weekly", "0.7"),
        (f"{BASE_URL}/languages", today, "weekly", "0.7"),
        (f"{BASE_URL}/apps", today, "monthly", "0.8"),
    ]

    # Add collections
    collections_file = HERE / "worker_export" / "collections.json"
    if collections_file.exists():
        try:
            colls_data = json.load(open(collections_file, encoding="utf-8"))
            colls = colls_data if isinstance(colls_data, list) else colls_data.get("collections", [])
            for c in colls:
                slug = c.get("slug")
                if slug:
                    static_entries.append((f"{BASE_URL}/collection/{slug}", today, "weekly", "0.8"))
        except Exception as e:
            print(f"[Sitemap] Warning loading collections: {e}")

    # Add blogs
    blogs_file = HERE / "worker_export" / "blogs.json"
    if blogs_file.exists():
        try:
            blogs_data = json.load(open(blogs_file, encoding="utf-8"))
            blogs = blogs_data if isinstance(blogs_data, list) else blogs_data.get("blogs", [])
            for b in blogs:
                slug = b.get("slug")
                pub_date = format_date(b.get("published_at") or b.get("date"))
                if slug:
                    static_entries.append((f"{BASE_URL}/blog/{slug}", pub_date, "weekly", "0.85"))
        except Exception as e:
            print(f"[Sitemap] Warning loading blogs: {e}")

    write_urlset(Path("sitemap-static.xml"), static_entries)

    # 2. sitemap-movies-1.xml (Top 25,000 movies)
    cur.execute("""
        SELECT slug, updated_at 
        FROM titles 
        WHERE type = 'movie' AND (is_anime IS NULL OR is_anime = 0)
        ORDER BY popularity DESC, rating DESC 
        LIMIT 25000 OFFSET 0
    """)
    movie1_entries = [
        (f"{BASE_URL}/watch/movie/{row[0]}", format_date(row[1]), "weekly", "0.75")
        for row in cur.fetchall() if row[0]
    ]
    write_urlset(Path("sitemap-movies-1.xml"), movie1_entries)

    # 3. sitemap-movies-2.xml (Next 25,000 movies)
    cur.execute("""
        SELECT slug, updated_at 
        FROM titles 
        WHERE type = 'movie' AND (is_anime IS NULL OR is_anime = 0)
        ORDER BY popularity DESC, rating DESC 
        LIMIT 25000 OFFSET 25000
    """)
    movie2_entries = [
        (f"{BASE_URL}/watch/movie/{row[0]}", format_date(row[1]), "monthly", "0.65")
        for row in cur.fetchall() if row[0]
    ]
    write_urlset(Path("sitemap-movies-2.xml"), movie2_entries)

    # 4. sitemap-series-1.xml (Top 25,000 TV Series)
    cur.execute("""
        SELECT slug, updated_at 
        FROM titles 
        WHERE type = 'tv' AND (is_anime IS NULL OR is_anime = 0)
        ORDER BY popularity DESC, rating DESC 
        LIMIT 25000 OFFSET 0
    """)
    series_entries = [
        (f"{BASE_URL}/watch/tv/{row[0]}", format_date(row[1]), "weekly", "0.8")
        for row in cur.fetchall() if row[0]
    ]
    write_urlset(Path("sitemap-series-1.xml"), series_entries)

    # 5. sitemap-anime-1.xml (Anime series & movies)
    cur.execute("""
        SELECT slug, updated_at, type 
        FROM titles 
        WHERE is_anime = 1 OR type = 'anime'
        ORDER BY popularity DESC, rating DESC 
        LIMIT 25000
    """)
    anime_entries = [
        (f"{BASE_URL}/watch/anime/{row[0]}", format_date(row[1]), "weekly", "0.8")
        for row in cur.fetchall() if row[0]
    ]
    write_urlset(Path("sitemap-anime-1.xml"), anime_entries)

    # 6. sitemap_index.xml & legacy sitemap.xml
    sub_sitemaps = [
        f"{BASE_URL}/sitemap-static.xml",
        f"{BASE_URL}/sitemap-movies-1.xml",
        f"{BASE_URL}/sitemap-movies-2.xml",
        f"{BASE_URL}/sitemap-series-1.xml",
        f"{BASE_URL}/sitemap-anime-1.xml",
    ]
    write_sitemap_index(Path("sitemap_index.xml"), sub_sitemaps)
    # Also write legacy sitemap.xml as a pointer to the index for backwards compatibility
    write_sitemap_index(Path("sitemap.xml"), sub_sitemaps)

    conn.close()
    print("[Sitemap] All segmented sitemaps generated successfully!")

if __name__ == "__main__":
    generate_sitemaps()
