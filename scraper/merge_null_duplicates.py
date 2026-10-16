"""
merge_null_duplicates.py — Merges canonical titles that have null tmdb_id
with their valid suffixed duplicates, copying tmdb_id, imdb_id, and streaming availability.
"""
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).parent
DB = HERE / "catalog.db"

def main():
    conn = sqlite3.connect(str(DB))
    cur = conn.cursor()

    null_titles = cur.execute('SELECT id, slug, title, year, type FROM titles WHERE tmdb_id IS NULL').fetchall()
    print(f"Total null TMDB titles: {len(null_titles)}")

    valid_lookup = {}
    for row in cur.execute('SELECT id, slug, title, year, type, tmdb_id, imdb_id FROM titles WHERE tmdb_id IS NOT NULL'):
        key = (row[2].lower().strip(), row[3], row[4])
        if key not in valid_lookup:
            valid_lookup[key] = row

    matches = []
    for nt in null_titles:
        key = (nt[2].lower().strip(), nt[3], nt[4])
        if key in valid_lookup:
            matches.append((nt, valid_lookup[key]))

    print(f"Found {len(matches)} duplicates to merge.")
    merged = 0

    for nt, vt in matches:
        canon_id, canon_slug, canon_title, canon_year, canon_type = nt
        dup_id, dup_slug, _, _, _, tmdb_id, imdb_id = vt

        if canon_id == dup_id:
            continue

        # 1. Update canonical title with TMDB/IMDb IDs
        cur.execute(
            "UPDATE titles SET tmdb_id = ?, imdb_id = COALESCE(imdb_id, ?) WHERE id = ?",
            (tmdb_id, imdb_id, canon_id)
        )

        # 2. Copy availability rows from duplicate to canonical
        cur.execute("""
            INSERT OR IGNORE INTO availability (title_id, source_id, kind, status, external_url, playback_url, is_legal_verified)
            SELECT ?, source_id, kind, status, external_url, playback_url, is_legal_verified
            FROM availability WHERE title_id = ?
        """, (canon_id, dup_id))

        # 3. Copy seasons and episodes if canonical has none
        c_seasons = cur.execute("SELECT count(*) FROM seasons WHERE title_id = ?", (canon_id,)).fetchone()[0]
        d_seasons = cur.execute("SELECT count(*) FROM seasons WHERE title_id = ?", (dup_id,)).fetchone()[0]
        if c_seasons == 0 and d_seasons > 0:
            cur.execute("UPDATE seasons SET title_id = ? WHERE title_id = ?", (canon_id, dup_id))
        else:
            # Delete duplicate seasons
            cur.execute("DELETE FROM episodes WHERE season_id IN (SELECT id FROM seasons WHERE title_id = ?)", (dup_id,))
            cur.execute("DELETE FROM seasons WHERE title_id = ?", (dup_id,))

        # 4. Remove duplicate availability & title
        cur.execute("DELETE FROM availability WHERE title_id = ?", (dup_id,))
        cur.execute("DELETE FROM titles WHERE id = ?", (dup_id,))
        merged += 1

    conn.commit()
    conn.close()
    print(f"Successfully merged {merged} duplicate titles into clean canonical slugs.")

if __name__ == "__main__":
    main()
