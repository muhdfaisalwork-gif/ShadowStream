"""
populate_studio_hubs.py — Ingest and map studio & platform collections for
Paramount+, Peacock, Universal Pictures, and Sony Pictures into catalog.db.
"""
import sqlite3
from pathlib import Path

HERE = Path(__file__).parent
DB = HERE / "catalog.db"

STUDIO_COLLECTIONS = [
    {
        "slug": "paramount-plus",
        "name": "Paramount+ & Paramount Pictures",
        "type": "studio",
        "overview": "Flagship originals, the Star Trek universe, Taylor Sheridan's Yellowstone saga, and iconic Paramount Pictures blockbusters.",
        "poster": "https://image.tmdb.org/t/p/w500/fi83B1oztoS47xumemnx9reJSuP.jpg",
        "backdrop": "https://image.tmdb.org/t/p/original/8YFL5QQVPy3AgrEQxNYvsgiPEbe.jpg"
    },
    {
        "slug": "peacock",
        "name": "Peacock & NBCUniversal",
        "type": "studio",
        "overview": "Peacock Originals, legendary NBC sitcoms, gripping crime procedurals, and premier television dramas.",
        "poster": "https://image.tmdb.org/t/p/w500/8VCSp0nL2z5vDk158oJea8bT05m.jpg",
        "backdrop": "https://image.tmdb.org/t/p/original/m9m5A3d1a49K1yXQp4G3i8r8g1l.jpg"
    },
    {
        "slug": "universal-pictures",
        "name": "Universal Pictures Showcase",
        "type": "studio",
        "overview": "Over a century of cinematic landmarks: Jurassic World, Fast & Furious, Oppenheimer, Illumination animation, and classic thrillers.",
        "poster": "https://image.tmdb.org/t/p/w500/837VMM4wOkOD2swfgstuqeClFeR.jpg",
        "backdrop": "https://image.tmdb.org/t/p/original/fm6K9vY92vWJ2IrBpSO806hU9ba.jpg"
    },
    {
        "slug": "sony-pictures",
        "name": "Sony Pictures & Columbia",
        "type": "studio",
        "overview": "The definitive Sony Pictures and Columbia Pictures library: Spider-Man universe, Ghostbusters, Jumanji, action franchises, and auteur classics.",
        "poster": "https://image.tmdb.org/t/p/w500/GagSvqWlyPdkKYTaqTIRth54m.jpg",
        "backdrop": "https://image.tmdb.org/t/p/original/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg"
    }
]

# Patterns and keywords for each studio
PARAMOUNT_PATTERNS = [
    "Star Trek%", "Yellowstone%", "1883%", "1923%", "Tulsa King%", "Mayor of Kingstown%",
    "Top Gun%", "Mission: Impossible%", "Halo%", "South Park%", "SpongeBob%", "Sonic the Hedgehog%",
    "Transformers%", "A Quiet Place%", "Scream %", "Lawmen: Bass Reeves%", "Special Ops: Lioness%",
    "Landman%", "The Offer%", "Criminal Minds%", "NCIS%", "SEAL Team%", "Your Honor%",
    "Billions%", "Dexter%", "Twin Peaks%", "The Godfather%", "Chinatown%", "Interstellar%",
    "Titanic%", "Shutter Island%", "Wolf of Wall Street%", "Forrest Gump%", "Cast Away%",
    "Gladiator II%", "Dungeons & Dragons: Honor Among Thieves%"
]

PEACOCK_PATTERNS = [
    "The Office%", "Parks and Recreation%", "Brooklyn Nine-Nine%", "Law & Order%",
    "Monk%", "Psych%", "Poker Face%", "Ted %", "Bel-Air%", "Suits%", "House %",
    "30 Rock%", "Community%", "Battlestar Galactica%", "Downton Abbey%", "Twisted Metal%",
    "Dr. Death%", "Apples Never Fall%", "The Tonight Show%", "Late Night with Seth Meyers%",
    "Saturday Night Live%", "Supernatural%", "Bates Motel%", "Friday Night Lights%",
    "Parenthood%", "Heroes%", "Grimm%", "Columbo%", "Murder, She Wrote%", "Magnum, P.I.%"
]

UNIVERSAL_PATTERNS = [
    "Oppenheimer%", "Fast & Furious%", "Fast X%", "The Fast and the Furious%", "Furious 7%", "Fate of the Furious%",
    "Jurassic Park%", "Jurassic World%", "Despicable Me%", "Minions%", "The Super Mario Bros. Movie%",
    "Back to the Future%", "Jaws%", "Gladiator %", "Schindler's List%", "The Wolf Man%",
    "Dracula %", "Frankenstein%", "The Mummy%", "Pitch Perfect%", "The Bourne %", "Bourne Identity%",
    "Bourne Supremacy%", "Bourne Ultimatum%", "Get Out%", "Us (20%", "Nope %", "Twisters%",
    "Wicked %", "M3GAN%", "Five Nights at Freddy's%", "The Purge%", "Halloween Kills%", "Halloween Ends%",
    "King Kong%", "E.T. the Extra-Terrestrial%", "Apollo 13%", "Scarface%", "Casino %",
    "Inglourious Basterds%", "1917%", "Knives Out%", "Glass Onion%", "The Big Lebowski%"
]

SONY_PATTERNS = [
    "Spider-Man%", "The Amazing Spider-Man%", "Venom%", "Ghostbusters%", "Jumanji%",
    "Bad Boys%", "The Karate Kid%", "Cobra Kai%", "Uncharted%", "Gran Turismo%",
    "Men in Black%", "Resident Evil%", "Underworld%", "Once Upon a Time in Hollywood%",
    "The Social Network%", "Taxi Driver%", "Whiplash%", "Blade Runner 2049%", "Equalizer%",
    "The Equalizer%", "Morbius%", "Madame Web%", "Kraven the Hunter%", "Zombieland%",
    "Hotel Transylvania%", "Cloudy with a Chance of Meatballs%", "The Smurfs%",
    "District 9%", "Elysium%", "Chappie%", "21 Jump Street%", "22 Jump Street%",
    "Baby Driver%", "Snatch%", "Stand by Me%", "A Few Good Men%", "Jerry Maguire%"
]


def setup_hubs():
    conn = sqlite3.connect(str(DB))
    conn.execute("PRAGMA journal_mode = WAL")

    print("Step 1: Inserting/updating Studio Collections...")
    col_ids = {}
    for col in STUDIO_COLLECTIONS:
        existing = conn.execute("SELECT id FROM collections WHERE slug=?", (col["slug"],)).fetchone()
        if existing:
            col_id = existing[0]
            conn.execute("""
                UPDATE collections 
                SET name=?, type=?, overview=?, poster=COALESCE(?, poster), backdrop=COALESCE(?, backdrop)
                WHERE id=?
            """, (col["name"], col["type"], col["overview"], col["poster"], col["backdrop"], col_id))
            print(f"  Updated collection: {col['slug']} (ID: {col_id})")
        else:
            cur = conn.execute("""
                INSERT INTO collections (slug, name, type, overview, poster, backdrop)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (col["slug"], col["name"], col["type"], col["overview"], col["poster"], col["backdrop"]))
            col_id = cur.lastrowid
            print(f"  Inserted collection: {col['slug']} (ID: {col_id})")
        col_ids[col["slug"]] = col_id

    # Ensure studios table has sony-pictures and paramount-pictures
    existing_sony = conn.execute("SELECT id FROM studios WHERE slug='sony-pictures'").fetchone()
    if not existing_sony:
        cur = conn.execute("INSERT INTO studios (slug, name) VALUES ('sony-pictures', 'Sony Pictures')")
        sony_studio_id = cur.lastrowid
    else:
        sony_studio_id = existing_sony[0]

    existing_paramount = conn.execute("SELECT id FROM studios WHERE slug='paramount-pictures'").fetchone()
    if not existing_paramount:
        cur = conn.execute("INSERT INTO studios (slug, name) VALUES ('paramount-pictures', 'Paramount Pictures')")
        paramount_studio_id = cur.lastrowid
    else:
        paramount_studio_id = existing_paramount[0]

    # Get streaming provider IDs
    p_provider = conn.execute("SELECT id FROM streaming_providers WHERE slug='paramount-plus'").fetchone()
    p_provider_id = p_provider[0] if p_provider else 7
    peacock_provider = conn.execute("SELECT id FROM streaming_providers WHERE slug='peacock'").fetchone()
    peacock_provider_id = peacock_provider[0] if peacock_provider else 8

    # Universal studio ID
    univ_studio = conn.execute("SELECT id FROM studios WHERE slug='universal-pictures'").fetchone()
    univ_studio_id = univ_studio[0] if univ_studio else 5

    print("\nStep 2: Mapping Titles to Collections & Providers...")

    # Helper to map titles by patterns
    def map_patterns(patterns, col_slug, provider_id=None, studio_id=None):
        col_id = col_ids[col_slug]
        mapped_col = 0
        mapped_prov = 0
        mapped_stud = 0

        for pattern in patterns:
            rows = conn.execute("SELECT id, title, year FROM titles WHERE title LIKE ?", (pattern,)).fetchall()
            for tid, title, year in rows:
                # Add to title_collections
                res = conn.execute(
                    "INSERT OR IGNORE INTO title_collections (title_id, collection_id) VALUES (?, ?)",
                    (tid, col_id)
                )
                if res.rowcount > 0:
                    mapped_col += 1

                # Add to title_streaming_providers if provider_id
                if provider_id:
                    res_p = conn.execute("""
                        INSERT OR IGNORE INTO title_streaming_providers 
                        (title_id, provider_id, region, availability_type)
                        VALUES (?, ?, 'US', 'flatrate')
                    """, (tid, provider_id))
                    if res_p.rowcount > 0:
                        mapped_prov += 1

                # Add to title_studios if studio_id
                if studio_id:
                    res_s = conn.execute(
                        "INSERT OR IGNORE INTO title_studios (title_id, studio_id) VALUES (?, ?)",
                        (tid, studio_id)
                    )
                    if res_s.rowcount > 0:
                        mapped_stud += 1

        # Also search overview for studio name if count is low
        overview_match = conn.execute(
            f"SELECT id FROM titles WHERE overview LIKE '%{col_slug.replace('-', ' ').title()}%' LIMIT 150"
        ).fetchall()
        for (tid,) in overview_match:
            res = conn.execute(
                "INSERT OR IGNORE INTO title_collections (title_id, collection_id) VALUES (?, ?)",
                (tid, col_id)
            )
            if res.rowcount > 0:
                mapped_col += 1

        print(f"  [{col_slug}] mapped: {mapped_col} new collection links, {mapped_prov} provider links, {mapped_stud} studio links")

    # Map Paramount+
    map_patterns(PARAMOUNT_PATTERNS, "paramount-plus", provider_id=p_provider_id, studio_id=paramount_studio_id)

    # Map Peacock (also include existing titles in title_streaming_providers for peacock)
    peacock_existing = conn.execute(
        "SELECT title_id FROM title_streaming_providers WHERE provider_id = ?",
        (peacock_provider_id,)
    ).fetchall()
    peacock_col_id = col_ids["peacock"]
    for (tid,) in peacock_existing:
        conn.execute("INSERT OR IGNORE INTO title_collections (title_id, collection_id) VALUES (?, ?)", (tid, peacock_col_id))
    map_patterns(PEACOCK_PATTERNS, "peacock", provider_id=peacock_provider_id)

    # Map Universal Pictures (also include existing titles in title_studios for universal-pictures)
    univ_existing = conn.execute(
        "SELECT title_id FROM title_studios WHERE studio_id = ?",
        (univ_studio_id,)
    ).fetchall()
    univ_col_id = col_ids["universal-pictures"]
    for (tid,) in univ_existing:
        conn.execute("INSERT OR IGNORE INTO title_collections (title_id, collection_id) VALUES (?, ?)", (tid, univ_col_id))
    map_patterns(UNIVERSAL_PATTERNS, "universal-pictures", studio_id=univ_studio_id)

    # Map Sony Pictures
    map_patterns(SONY_PATTERNS, "sony-pictures", studio_id=sony_studio_id)

    conn.commit()

    print("\nStep 3: Verification of Final Counts...")
    for col_slug, cid in col_ids.items():
        cnt = conn.execute("SELECT COUNT(*) FROM title_collections WHERE collection_id=?", (cid,)).fetchone()[0]
        print(f"  Collection '{col_slug}': {cnt} titles mapped")

    p_cnt = conn.execute("SELECT COUNT(*) FROM title_streaming_providers WHERE provider_id=?", (p_provider_id,)).fetchone()[0]
    peacock_cnt = conn.execute("SELECT COUNT(*) FROM title_streaming_providers WHERE provider_id=?", (peacock_provider_id,)).fetchone()[0]
    print(f"  Streaming Provider 'paramount-plus': {p_cnt} titles linked")
    print(f"  Streaming Provider 'peacock': {peacock_cnt} titles linked")

    u_cnt = conn.execute("SELECT COUNT(*) FROM title_studios WHERE studio_id=?", (univ_studio_id,)).fetchone()[0]
    s_cnt = conn.execute("SELECT COUNT(*) FROM title_studios WHERE studio_id=?", (sony_studio_id,)).fetchone()[0]
    print(f"  Studio 'universal-pictures': {u_cnt} titles linked")
    print(f"  Studio 'sony-pictures': {s_cnt} titles linked")

    conn.close()
    print("\nStudio Hubs Population Completed Successfully!")


if __name__ == "__main__":
    setup_hubs()
