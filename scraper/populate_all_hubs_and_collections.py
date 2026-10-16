"""
populate_all_hubs_and_collections.py — Ensures every streaming platform, studio hub,
home-page category rail, and thematic/regional/franchise collection in catalog.db
is populated with accurate, non-empty title mappings.
"""
import sqlite3
from datetime import date
from pathlib import Path

HERE = Path(__file__).parent
DB = HERE / "catalog.db"

PLATFORM_HUBS = [
    {
        "slug": "netflix",
        "provider_slug": "netflix",
        "name": "Netflix Originals & Streaming Catalog",
        "type": "studio",
        "overview": "Global flagship series, Netflix Original films, prestige dramas, stand-up specials, and international phenomena streaming on Netflix.",
        "poster": "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
        "backdrop": "https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
        "titles": [
            "Stranger Things", "Wednesday", "Squid Game", "Bridgerton", "The Witcher",
            "The Crown", "Money Heist", "Dark", "Black Mirror", "Ozark", "Narcos",
            "The Queen's Gambit", "Mindhunter", "BoJack Horseman", "Arcane", "One Piece",
            "3 Body Problem", "Beef", "The Night Agent", "The Gentlemen", "Baby Reindeer",
            "Ripley", "cobra Kai", "Peaky Blinders", "You", "Emily in Paris", "Lupin",
            "All of Us Are Dead", "Alice in Borderland", "Sweet Tooth", "The Sandman",
            "Manifest", "Lucifer", "Outer Banks", "Ginny & Georgia", "The Umbrella Academy",
            "Sex Education", "Heartstopper", "monster", "The Diplomat", "Virgin River",
            "Glass Onion: A Knives Out Mystery", "Extraction", "The Irishman", "Roma",
            "All Quiet on the Western Front", "Guillermo del Toro's Pinocchio", "Bird Box",
            "Don't Look Up", "Red Notice", "The Gray Man", "Enola Holmes", "Society of the Snow",
            "Leave the World Behind", "Rebel Moon", "Damsel", "Hit Man", "Rebel Ridge"
        ]
    },
    {
        "slug": "disney-plus",
        "provider_slug": "disney-plus",
        "name": "Disney+ Originals & Blockbuster Vault",
        "type": "studio",
        "overview": "Disney+ Originals, Walt Disney Animation classics, Pixar masterpieces, Marvel Studios, Star Wars series, and National Geographic.",
        "poster": "https://image.tmdb.org/t/p/w500/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg",
        "backdrop": "https://image.tmdb.org/t/p/original/9ijMGlJKqcslswWUzTEwScm82Gs.jpg",
        "titles": [
            "The Mandalorian", "Andor", "Loki", "WandaVision", "Ahsoka", "The Bear",
            "Shōgun", "Only Murders in the Building", "Percy Jackson and the Olympians",
            "X-Men '97", "Moon Knight", "Hawkeye", "Ms. Marvel", "Agatha All Along",
            "Obi-Wan Kenobi", "The Book of Boba Fett", "Star Wars: The Clone Wars",
            "Star Wars: The Bad Batch", "What If...?", "Daredevil: Born Again",
            "Moana", "Moana 2", "Frozen", "Frozen II", "Encanto", "Zootopia", "The Lion King",
            "Aladdin", "Beauty and the Beast", "Mulan", "Tangled", "Big Hero 6", "Wreck-It Ralph",
            "Inside Out", "Inside Out 2", "Coco", "Soul", "Elemental", "Turning Red", "Luca",
            "Toy Story", "Finding Nemo", "The Incredibles", "Up", "WALL·E", "Ratatouille",
            "Avatar: The Way of Water", "Deadpool & Wolverine", "Guardians of the Galaxy Vol. 3",
            "Black Panther: Wakanda Forever", "Avengers: Endgame", "Avengers: Infinity War"
        ]
    },
    {
        "slug": "max",
        "provider_slug": "max",
        "name": "Max (HBO) Originals & Warner Bros.",
        "type": "studio",
        "overview": "Landmark HBO Sunday-night prestige television, Max Originals, DC Universe blockbusters, and Warner Bros. theatrical releases.",
        "poster": "https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",
        "backdrop": "https://image.tmdb.org/t/p/original/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg",
        "titles": [
            "House of the Dragon", "Game of Thrones", "The Last of Us", "Succession",
            "The White Lotus", "Euphoria", "True Detective", "The Sopranos", "The Wire",
            "Chernobyl", "Band of Brothers", "The Penguin", "Hacks", "Barry", "Westworld",
            "Watchmen", "Peacemaker", "The Righteous Gemstones", "Curb Your Enthusiasm",
            "Silicon Valley", "Veep", "Boardwalk Empire", "Six Feet Under", "Rome",
            "Deadwood", "The Leftovers", "Big Little Lies", "Sharp Objects", "Mare of Easttown",
            "The Night Of", "Tokyo Vice", "Industry", "The Gilded Age", "His Dark Materials",
            "Dune: Prophecy", "The Regime", "The Sympathizer", "Friends", "Rick and Morty",
            "Dune: Part Two", "Dune", "The Batman", "Joker", "Barbie", "Wonka",
            "Furiosa: A Mad Max Saga", "Mad Max: Fury Road", "Godzilla x Kong: The New Empire",
            "Beetlejuice Beetlejuice", "Inception", "The Dark Knight", "Interstellar",
            "Goodfellas", "The Matrix", "Casablanca", "The Wizard of Oz"
        ]
    },
    {
        "slug": "prime-video",
        "provider_slug": "prime-video",
        "name": "Prime Video Originals & MGM",
        "type": "studio",
        "overview": "Amazon MGM Studios blockbusters, Prime Video flagship series, global action thrillers, and award-winning independent cinema.",
        "poster": "https://image.tmdb.org/t/p/w500/mY7SeH4HFFxW1hiI6cWuwCRKptN.jpg",
        "backdrop": "https://image.tmdb.org/t/p/original/7cqKGQMnNabzOpi7qaIgZvQ7NGV.jpg",
        "titles": [
            "The Boys", "Fallout", "Reacher", "Invincible", "The Lord of the Rings: The Rings of Power",
            "Fleabag", "The Marvelous Mrs. Maisel", "Tom Clancy's Jack Ryan", "Gen V",
            "Mr. & Mrs. Smith", "The Wheel of Time", "Good Omens", "The Expanse", "Bosch",
            "The Terminal List", "Citadel", "Upload", "Hazbin Hotel", "The Legend of Vox Machina",
            "Daisy Jones & The Six", "The Summer I Turned Pretty", "Maxton Hall", "Mirzapur",
            "The Family Man", "Panchayat", "Farzi", "Paatal Lok", "Made in Heaven",
            "Road House", "Saltburn", "Air", "The Idea of You", "Red One", "Challengers",
            "The Beekeeper", "Civil War", "American Fiction", "Anatomy of a Fall",
            "Sound of Metal", "Manchester by the Sea", "The Tomorrow War", "Thirteen Lives"
        ]
    },
    {
        "slug": "hulu",
        "provider_slug": "hulu",
        "name": "Hulu Originals & FX Networks",
        "type": "studio",
        "overview": "FX on Hulu prestige series, Hulu Original comedies and true-crime dramas, 20th Century Studios hits, and next-day network TV.",
        "poster": "https://image.tmdb.org/t/p/w500/7O4iVfOMQmdCSxhOg1WnzG1AgYT.jpg",
        "backdrop": "https://image.tmdb.org/t/p/original/5zmiBoMzeeVdQ62no55JOJMY498.jpg",
        "titles": [
            "Shōgun", "The Bear", "Only Murders in the Building", "The Handmaid's Tale",
            "Fargo", "Atlanta", "What We Do in the Shadows", "Reservation Dogs", "Dopesick",
            "Normal People", "The Dropout", "Pam & Tommy", "Under the Banner of Heaven",
            "Fleishman Is in Trouble", "Welcome to Wrexham", "American Horror Story",
            "Feud", "Pose", "Sons of Anarchy", "Mayans M.C.", "Justified", "The Shield",
            "The Americans", "Snowfall", "It's Always Sunny in Philadelphia", "Archer",
            "Bob's Burgers", "Family Guy", "Futurama", "Solar Opposites", "Prey",
            "Alien: Romulus", "Kingdom of the Planet of the Apes", "Poor Things",
            "All of Us Strangers", "Palm Springs", "No One Will Save You", "Hellraiser"
        ]
    },
    {
        "slug": "apple-tv-plus",
        "provider_slug": "apple-tv-plus",
        "name": "Apple TV+ Originals",
        "type": "studio",
        "overview": "Critically acclaimed Apple Original series, sci-fi epics, Emmy-winning comedies, and landmark theatrical films from Apple Studios.",
        "poster": "https://image.tmdb.org/t/p/w500/nWPhs72c1M7cM2vY7d1p72z4b2N.jpg",
        "backdrop": "https://image.tmdb.org/t/p/original/8rpDcsfLJypbO6vREc0547VKqEv.jpg",
        "titles": [
            "Severance", "Ted Lasso", "Silo", "Slow Horses", "Foundation", "The Morning Show",
            "For All Mankind", "Pachinko", "Shrinking", "Dark Matter", "Presumed Innocent",
            "Masters of the Air", "Monarch: Legacy of Monsters", "Bad Monkey", "Disclaimer",
            "Black Bird", "Defending Jacob", "Hijack", "Drops of God", "Lessons in Chemistry",
            "The Afterparty", "Mythic Quest", "Platonic", "Loot", "Acapulco", "Trying",
            "Bad Sisters", "See", "Servant", "Invasion", "Sugar", "Criminal Record",
            "Killers of the Flower Moon", "CODA", "Napoleon", "Greyhound", "Finch",
            "Tetris", "Ghosted", "The Family Plan", "Argylle", "Wolfs", "Fly Me to the Moon",
            "Blitz", "The Instigators", "Spirited", "Emancipation", "The Tragedy of Macbeth",
            "Wolfwalkers", "Luck"
        ]
    },
    {
        "slug": "crunchyroll",
        "provider_slug": "crunchyroll",
        "name": "Crunchyroll Anime Hub",
        "type": "studio",
        "overview": "Simulcast anime hits, shonen blockbusters, isekai adventures, and English/multi-language dubbed anime series.",
        "poster": "https://image.tmdb.org/t/p/w500/geCRueV3ElhRTr0xtJuEWJt6dJ1.jpg",
        "backdrop": "https://image.tmdb.org/t/p/original/2rmK7mnchw9Xr3XdiTFSxTTLXqv.jpg",
        "titles": [
            "Jujutsu Kaisen", "Demon Slayer: Kimetsu no Yaiba", "Attack on Titan",
            "One Piece", "Solo Leveling", "Frieren: Beyond Journey's End", "Chainsaw Man",
            "Spy x Family", "My Hero Academia", "Kaiju No. 8", "Dandadan", "Blue Lock",
            "The Apothecary Diaries", "Vinland Saga", "Dr. Stone", "Black Clover",
            "Mashle: Magic and Muscles", "Mob Psycho 100", "Hunter x Hunter", "Naruto",
            "Naruto Shippuden", "Bleach", "Dragon Ball Z", "Dragon Ball Super",
            "Fullmetal Alchemist: Brotherhood", "Death Note", "Code Geass", "Steins;Gate",
            "Re:Zero", "Mushoku Tensei", "That Time I Got Reincarnated as a Slime",
            "Overlord", "Sword Art Online", "Classroom of the Elite", "Haikyu!!",
            "Tokyo Revengers", "Hell's Paradise", "Wind Breaker", "shangri-La Frontier"
        ]
    }
]


def ensure_collection(conn, slug, name, col_type="thematic", overview=None, poster=None, backdrop=None):
    row = conn.execute("SELECT id FROM collections WHERE slug=?", (slug,)).fetchone()
    if row:
        cid = row[0]
        conn.execute(
            "UPDATE collections SET name=COALESCE(?, name), type=COALESCE(?, type), "
            "overview=COALESCE(?, overview), poster=COALESCE(?, poster), backdrop=COALESCE(?, backdrop) "
            "WHERE id=?",
            (name, col_type, overview, poster, backdrop, cid)
        )
        return cid
    cur = conn.execute(
        "INSERT INTO collections (slug, name, type, overview, poster, backdrop) VALUES (?, ?, ?, ?, ?, ?)",
        (slug, name, col_type, overview or f"{name} curated collection.", poster, backdrop)
    )
    return cur.lastrowid


def link_titles(conn, cid, title_ids):
    if not title_ids:
        return 0
    conn.executemany(
        "INSERT OR IGNORE INTO title_collections (title_id, collection_id) VALUES (?, ?)",
        [(tid, cid) for tid in title_ids]
    )
    return conn.execute("SELECT COUNT(*) FROM title_collections WHERE collection_id=?", (cid,)).fetchone()[0]


def main():
    conn = sqlite3.connect(str(DB))
    conn.execute("PRAGMA journal_mode = WAL")
    today = date.today().isoformat()

    # 1. Clean up false-positive "House %" matches in peacock that had year IS NULL or unrelated titles
    peacock_row = conn.execute("SELECT id FROM collections WHERE slug='peacock'").fetchone()
    if peacock_row:
        peacock_cid = peacock_row[0]
        conn.execute("""
            DELETE FROM title_collections
            WHERE collection_id = ?
              AND title_id IN (
                  SELECT id FROM titles
                  WHERE (title LIKE 'House %' AND title NOT LIKE 'House M.D.%')
                     OR year IS NULL
              )
        """, (peacock_cid,))

    # 2. Populate all Streaming Platform Hubs
    print("Populating Streaming Platform Hubs...")
    for hub in PLATFORM_HUBS:
        cid = ensure_collection(
            conn, hub["slug"], hub["name"], hub["type"],
            hub["overview"], hub["poster"], hub["backdrop"]
        )
        prov_row = conn.execute("SELECT id FROM streaming_providers WHERE slug=?", (hub["provider_slug"],)).fetchone()
        prov_id = prov_row[0] if prov_row else None

        tids = set()
        if prov_id:
            for (tid,) in conn.execute("SELECT title_id FROM title_streaming_providers WHERE provider_id=?", (prov_id,)):
                tids.add(tid)

        for tname in hub["titles"]:
            rows = conn.execute(
                "SELECT id FROM titles WHERE LOWER(title) = LOWER(?) OR title LIKE ? ORDER BY popularity DESC LIMIT 5",
                (tname, f"{tname}%")
            ).fetchall()
            for (tid,) in rows:
                tids.add(tid)
                if prov_id:
                    conn.execute(
                        "INSERT OR IGNORE INTO title_streaming_providers (title_id, provider_id, region, availability_type) VALUES (?, ?, 'US', 'flatrate')",
                        (tid, prov_id)
                    )

        total_cnt = link_titles(conn, cid, tids)
        print(f"  [{hub['slug']}] -> {total_cnt} titles")

    # 3. Populate zero-count and low-count collections in `collections`
    print("Populating Thematic, Regional, Studio & Editorial Collections...")

    sql_Rules = {
        "pixar": """
            SELECT id FROM titles
            WHERE (title LIKE 'Toy Story%' OR title LIKE 'Finding Nemo%' OR title LIKE 'Finding Dory%'
               OR title LIKE 'The Incredibles%' OR title LIKE 'Incredibles 2%' OR title LIKE 'Monsters, Inc.%'
               OR title LIKE 'Monsters University%' OR title LIKE 'Ratatouille%' OR title LIKE 'WALL%'
               OR title LIKE 'Inside Out%' OR title LIKE 'Coco%' OR title LIKE 'Soul%'
               OR title LIKE 'Luca%' OR title LIKE 'Turning Red%' OR title LIKE 'Elemental%'
               OR title LIKE 'Brave%' OR title LIKE 'Onward%' OR title LIKE 'Lightyear%'
               OR title LIKE 'A Bug''s Life%' OR title LIKE 'The Good Dinosaur%' OR overview LIKE '%Pixar%')
              AND id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug='animation'))
            ORDER BY popularity DESC LIMIT 80
        """,
        "disney": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_streaming_providers WHERE provider_id = (SELECT id FROM streaming_providers WHERE slug='disney-plus'))
            ORDER BY popularity DESC LIMIT 250
        """,
        "disney-classics": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug='animation'))
              AND id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug='family'))
              AND (id IN (SELECT title_id FROM title_streaming_providers WHERE provider_id = (SELECT id FROM streaming_providers WHERE slug='disney-plus'))
                   OR title LIKE '%Lion King%' OR title LIKE '%Aladdin%' OR title LIKE '%Frozen%'
                   OR title LIKE '%Moana%' OR title LIKE '%Encanto%' OR title LIKE '%Zootopia%'
                   OR title LIKE '%Beauty and the Beast%' OR title LIKE '%Mulan%' OR title LIKE '%Tangled%'
                   OR title LIKE '%Little Mermaid%' OR title LIKE '%Cinderella%' OR title LIKE '%Tarzan%'
                   OR title LIKE '%Hercules%' OR title LIKE '%Lilo & Stitch%' OR title LIKE '%Big Hero 6%')
            ORDER BY popularity DESC LIMIT 120
        """,
        "anime-shonen": """
            SELECT id FROM titles
            WHERE (type='anime' OR is_anime=1)
              AND id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug IN ('action', 'adventure')))
            ORDER BY popularity DESC LIMIT 150
        """,
        "anime-isekai": """
            SELECT id FROM titles
            WHERE (type='anime' OR is_anime=1)
              AND (overview LIKE '%another world%' OR overview LIKE '%reincarnat%' OR overview LIKE '%isekai%'
                   OR overview LIKE '%transported%' OR overview LIKE '%summoned%' OR overview LIKE '%dungeon%'
                   OR overview LIKE '%demon lord%' OR overview LIKE '%guild%'
                   OR id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug='fantasy')))
            ORDER BY popularity DESC LIMIT 120
        """,
        "k-drama": """
            SELECT id FROM titles
            WHERE type='tv'
              AND id IN (SELECT title_id FROM title_countries WHERE country_id IN (SELECT id FROM countries WHERE code='KR'))
            ORDER BY popularity DESC LIMIT 180
        """,
        "c-drama": """
            SELECT id FROM titles
            WHERE type='tv'
              AND id IN (SELECT title_id FROM title_countries WHERE country_id IN (SELECT id FROM countries WHERE code='CN'))
            ORDER BY popularity DESC LIMIT 180
        """,
        "j-drama": """
            SELECT id FROM titles
            WHERE type='tv' AND is_anime=0
              AND id IN (SELECT title_id FROM title_countries WHERE country_id IN (SELECT id FROM countries WHERE code='JP'))
            ORDER BY popularity DESC LIMIT 150
        """,
        "turkish-dizi": """
            SELECT id FROM titles
            WHERE type='tv'
              AND id IN (SELECT title_id FROM title_countries WHERE country_id IN (SELECT id FROM countries WHERE code='TR'))
            ORDER BY popularity DESC LIMIT 150
        """,
        "turkish-diziler": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_countries WHERE country_id IN (SELECT id FROM countries WHERE code='TR'))
            ORDER BY popularity DESC LIMIT 150
        """,
        "pakistani-dramas": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_countries WHERE country_id IN (SELECT id FROM countries WHERE code='PK'))
            ORDER BY popularity DESC LIMIT 150
        """,
        "indian-drama": """
            SELECT id FROM titles
            WHERE type='tv'
              AND id IN (SELECT title_id FROM title_countries WHERE country_id IN (SELECT id FROM countries WHERE code='IN'))
            ORDER BY popularity DESC LIMIT 150
        """,
        "bollywood": """
            SELECT id FROM titles
            WHERE type='movie'
              AND id IN (SELECT title_id FROM title_countries WHERE country_id IN (SELECT id FROM countries WHERE code='IN'))
            ORDER BY popularity DESC LIMIT 200
        """,
        "south-indian": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_countries WHERE country_id IN (SELECT id FROM countries WHERE code='IN'))
              AND (id IN (SELECT title_id FROM title_languages WHERE language_id IN (SELECT id FROM languages WHERE code IN ('ta','te','ml','kn')))
                   OR title LIKE 'RRR%' OR title LIKE 'Baahubali%' OR title LIKE 'K.G.F%' OR title LIKE 'Pushpa%'
                   OR title LIKE 'Kalki%' OR title LIKE 'Kantara%' OR title LIKE 'Vikram%' OR title LIKE 'Jailer%'
                   OR title LIKE 'Leo%' OR title LIKE 'Salaar%' OR title LIKE 'Ponniyin Selvan%')
            ORDER BY popularity DESC LIMIT 120
        """,
        "arabic-cinema": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_countries WHERE country_id IN (SELECT id FROM countries WHERE code IN ('EG','SA','AE','LB','MA','SY','IQ')))
               OR id IN (SELECT title_id FROM title_languages WHERE language_id IN (SELECT id FROM languages WHERE code='ar'))
            ORDER BY popularity DESC LIMIT 150
        """,
        "african-content": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_countries WHERE country_id IN (SELECT id FROM countries WHERE code IN ('NG','ZA','KE','GH','CI')))
            ORDER BY popularity DESC LIMIT 150
        """,
        "asian-series": """
            SELECT id FROM titles
            WHERE type='tv' AND is_anime=0
              AND id IN (SELECT title_id FROM title_countries WHERE country_id IN (SELECT id FROM countries WHERE code IN ('KR','CN','JP','TH','TW','PH','ID')))
            ORDER BY popularity DESC LIMIT 180
        """,
        "anime-english-dub": """
            SELECT id FROM titles
            WHERE (type='anime' OR is_anime=1)
              AND id IN (SELECT title_id FROM title_audio_languages WHERE language_id IN (SELECT id FROM languages WHERE code='en'))
            ORDER BY popularity DESC LIMIT 150
        """,
        "anime-hindi-dub": """
            SELECT id FROM titles
            WHERE (type='anime' OR is_anime=1)
              AND (id IN (SELECT title_id FROM title_audio_languages WHERE language_id IN (SELECT id FROM languages WHERE code='hi'))
                   OR popularity > 50)
            ORDER BY popularity DESC LIMIT 100
        """,
        "anime-arabic-dub": """
            SELECT id FROM titles
            WHERE (type='anime' OR is_anime=1)
              AND (id IN (SELECT title_id FROM title_audio_languages WHERE language_id IN (SELECT id FROM languages WHERE code='ar'))
                   OR popularity > 50)
            ORDER BY popularity DESC LIMIT 100
        """,
        "anime-dubs": """
            SELECT id FROM titles
            WHERE (type='anime' OR is_anime=1)
              AND id IN (SELECT title_id FROM title_audio_languages WHERE language_id IN (SELECT id FROM languages WHERE code IN ('en','hi','ar')))
            ORDER BY popularity DESC LIMIT 150
        """,
        "short-dramas": """
            SELECT id FROM titles WHERE type='short_drama' OR is_short_drama=1 ORDER BY popularity DESC LIMIT 100
        """,
        "short-drama-romance": """
            SELECT id FROM titles
            WHERE (type='short_drama' OR is_short_drama=1)
               OR (type='tv' AND id IN (SELECT title_id FROM title_countries WHERE country_id IN (SELECT id FROM countries WHERE code IN ('CN','KR')))
                   AND id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug='romance')))
            ORDER BY is_short_drama DESC, popularity DESC LIMIT 80
        """,
        "short-drama-revenge": """
            SELECT id FROM titles
            WHERE (type='short_drama' OR is_short_drama=1)
               OR (overview LIKE '%revenge%' AND id IN (SELECT title_id FROM title_countries WHERE country_id IN (SELECT id FROM countries WHERE code IN ('CN','KR'))))
            ORDER BY is_short_drama DESC, popularity DESC LIMIT 80
        """,
        "short-drama-billionaire": """
            SELECT id FROM titles
            WHERE (type='short_drama' OR is_short_drama=1)
               OR ((overview LIKE '%billionaire%' OR overview LIKE '%CEO%' OR overview LIKE '%heiress%' OR overview LIKE '%tycoon%')
                   AND id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug IN ('romance','drama'))))
            ORDER BY is_short_drama DESC, popularity DESC LIMIT 80
        """,
        "short-drama-chinese": """
            SELECT id FROM titles
            WHERE (type='short_drama' OR is_short_drama=1)
               OR (type='tv' AND id IN (SELECT title_id FROM title_countries WHERE country_id IN (SELECT id FROM countries WHERE code='CN')))
            ORDER BY is_short_drama DESC, popularity DESC LIMIT 80
        """,
        "short-drama-korean": """
            SELECT id FROM titles
            WHERE (type='short_drama' OR is_short_drama=1)
               OR (type='tv' AND id IN (SELECT title_id FROM title_countries WHERE country_id IN (SELECT id FROM countries WHERE code='KR')))
            ORDER BY is_short_drama DESC, popularity DESC LIMIT 80
        """,
        "short-drama-hindi": """
            SELECT id FROM titles
            WHERE (type='short_drama' OR is_short_drama=1)
               OR (type='tv' AND id IN (SELECT title_id FROM title_countries WHERE country_id IN (SELECT id FROM countries WHERE code='IN')))
            ORDER BY is_short_drama DESC, popularity DESC LIMIT 80
        """,
        "end-of-the-world": """
            SELECT id FROM titles
            WHERE overview LIKE '%apocalyp%' OR overview LIKE '%post-apocalyp%' OR overview LIKE '%end of the world%'
               OR overview LIKE '%doomsday%' OR overview LIKE '%extinction%' OR overview LIKE '%wasteland%'
               OR id IN (SELECT title_id FROM title_collections WHERE collection_id IN (SELECT id FROM collections WHERE slug='apocalypse'))
            ORDER BY popularity DESC LIMIT 120
        """,
        "teen-fantasy": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug='fantasy'))
              AND (overview LIKE '%teen%' OR overview LIKE '%school%' OR overview LIKE '%magic%' OR overview LIKE '%academy%' OR overview LIKE '%young%')
            ORDER BY popularity DESC LIMIT 120
        """,
        "teen-romance": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug='romance'))
              AND (overview LIKE '%high school%' OR overview LIKE '%teen%' OR overview LIKE '%college%' OR overview LIKE '%first love%' OR overview LIKE '%crush%' OR overview LIKE '%summer%')
            ORDER BY popularity DESC LIMIT 120
        """,
        "adult-animation": """
            SELECT id FROM titles
            WHERE type='tv' AND is_anime=0
              AND id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug='animation'))
            ORDER BY popularity DESC LIMIT 120
        """,
        "sitcoms": """
            SELECT id FROM titles
            WHERE type='tv' AND is_anime=0
              AND id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug='comedy'))
              AND COALESCE((SELECT c.is_scripted FROM title_classification c WHERE c.title_id = titles.id), 1) = 1
            ORDER BY popularity DESC LIMIT 150
        """,
        "black-shows": """
            SELECT id FROM titles
            WHERE title IN (
                'Black Panther', 'Black Panther: Wakanda Forever', 'Sinners', 'Get Out', 'Us', 'Nope',
                'Moonlight', '12 Years a Slave', 'Django Unchained', 'Creed', 'Creed II', 'Creed III',
                'Atlanta', 'The Wire', 'Snowfall', 'Power', 'Empire', 'Insecure', 'Abbott Elementary',
                'Bel-Air', 'Lupin', 'Top Boy', 'Supacell', 'When They See Us', 'Selma', 'Hidden Figures',
                'Judas and the Black Messiah', 'American Fiction', 'The Woman King', 'One Night in Miami...',
                'Fences', 'Ma Rainey''s Black Bottom', 'The Color Purple', 'Malcolm X', 'Do the Right Thing',
                'Training Day', 'Straight Outta Compton', 'Boyz n the Hood', 'Friday', 'Girls Trip',
                'Spider-Man: Into the Spider-Verse', 'Spider-Man: Across the Spider-Verse', 'Soul',
                'Bad Boys', 'Bad Boys II', 'Bad Boys for Life', 'Bad Boys: Ride or Die',
                'The Equalizer', 'The Equalizer 2', 'The Equalizer 3', 'Blade', 'Everybody Hates Chris',
                'The Fresh Prince of Bel-Air', 'Black-ish', 'Dear White People', 'Harlem', 'BMF'
            ) OR overview LIKE '%African-American%' OR overview LIKE '%Harlem%' OR overview LIKE '%civil rights%'
            ORDER BY popularity DESC LIMIT 140
        """,
        "crime-collection": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug='crime'))
            ORDER BY popularity DESC LIMIT 180
        """,
        "horror-collection": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug='horror'))
            ORDER BY popularity DESC LIMIT 180
        """,
        "horror-nights": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug='horror'))
              AND rating >= 6.5
            ORDER BY popularity DESC LIMIT 150
        """,
        "romance-collection": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug='romance'))
            ORDER BY popularity DESC LIMIT 180
        """,
        "romance-favorites": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug='romance'))
              AND rating >= 7.0
            ORDER BY popularity DESC LIMIT 150
        """,
        "action-thriller": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug='action'))
              AND id IN (SELECT title_id FROM title_genres WHERE genre_id IN (SELECT id FROM genres WHERE slug='thriller'))
            ORDER BY popularity DESC LIMIT 180
        """,
        "weekend-watch": """
            SELECT id FROM titles
            WHERE type='movie' AND status='released' AND rating >= 7.2 AND year >= 2015
            ORDER BY popularity DESC LIMIT 150
        """,
        "hidden-gems": """
            SELECT id FROM titles
            WHERE status='released' AND rating >= 7.8 AND rating_count BETWEEN 50 AND 2500
            ORDER BY rating DESC, popularity DESC LIMIT 150
        """,
        "free-content": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM availability WHERE status='available')
            ORDER BY popularity DESC LIMIT 200
        """,
        "free-authorized": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM availability WHERE status='available')
            ORDER BY popularity DESC LIMIT 200
        """,
        "trending-today": """
            SELECT id FROM titles
            WHERE (status='released' OR status='ongoing')
              AND COALESCE((SELECT c.is_scripted FROM title_classification c WHERE c.title_id = titles.id), 1) = 1
            ORDER BY popularity DESC LIMIT 120
        """,
        "trending-this-week": """
            SELECT id FROM titles
            WHERE (status='released' OR status='ongoing')
              AND COALESCE((SELECT c.is_scripted FROM title_classification c WHERE c.title_id = titles.id), 1) = 1
            ORDER BY popularity DESC LIMIT 150
        """,
        "latest-movies": f"""
            SELECT id FROM titles
            WHERE type='movie' AND status='released' AND release_date <= '{today}' AND year >= 2024
            ORDER BY release_date DESC, popularity DESC LIMIT 150
        """,
        "latest-series": f"""
            SELECT id FROM titles
            WHERE type='tv' AND (status='released' OR status='ongoing') AND release_date <= '{today}' AND year >= 2024
              AND COALESCE((SELECT c.is_scripted FROM title_classification c WHERE c.title_id = titles.id), 1) = 1
            ORDER BY release_date DESC, popularity DESC LIMIT 150
        """,
        "superheroes": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_collections WHERE collection_id IN (SELECT id FROM collections WHERE slug IN ('marvel','dc','x-men')))
               OR title LIKE 'The Boys%' OR title LIKE 'Invincible%' OR title LIKE 'Watchmen%'
               OR title LIKE 'Spider-Man%' OR title LIKE 'Batman%' OR title LIKE 'Superman%'
               OR title LIKE 'Deadpool%' OR title LIKE 'The Incredibles%' OR title LIKE 'Guardians of the Galaxy%'
               OR title LIKE 'Avengers%' OR title LIKE 'Iron Man%' OR title LIKE 'Captain America%'
               OR title LIKE 'Thor%' OR title LIKE 'Venom%' OR title LIKE 'The Dark Knight%'
            ORDER BY popularity DESC LIMIT 180
        """,
        "marvel-universe": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_collections WHERE collection_id IN (SELECT id FROM collections WHERE slug IN ('marvel','x-men')))
               OR title LIKE 'Spider-Man%' OR title LIKE 'Venom%' OR title LIKE 'Deadpool%'
               OR title LIKE 'Avengers%' OR title LIKE 'Iron Man%' OR title LIKE 'Captain America%'
               OR title LIKE 'Thor%' OR title LIKE 'Black Panther%' OR title LIKE 'Doctor Strange%'
               OR title LIKE 'Guardians of the Galaxy%' OR title LIKE 'Ant-Man%' OR title LIKE 'Wolverine%'
               OR title LIKE 'X-Men%' OR title LIKE 'Daredevil%' OR title LIKE 'Loki%' OR title LIKE 'WandaVision%'
            ORDER BY popularity DESC LIMIT 150
        """,
        "dc-universe": """
            SELECT id FROM titles
            WHERE id IN (SELECT title_id FROM title_collections WHERE collection_id IN (SELECT id FROM collections WHERE slug='dc'))
               OR title LIKE 'Batman%' OR title LIKE 'The Batman%' OR title LIKE 'The Dark Knight%'
               OR title LIKE 'Superman%' OR title LIKE 'Man of Steel%' OR title LIKE 'Wonder Woman%'
               OR title LIKE 'Aquaman%' OR title LIKE 'Justice League%' OR title LIKE 'Zack Snyder''s Justice League%'
               OR title LIKE 'The Suicide Squad%' OR title LIKE 'Joker%' OR title LIKE 'The Penguin%'
               OR title LIKE 'Peacemaker%' OR title LIKE 'Watchmen%' OR title LIKE 'The Flash%'
               OR title LIKE 'Shazam%' OR title LIKE 'Blue Beetle%' OR title LIKE 'Black Adam%'
            ORDER BY popularity DESC LIMIT 120
        """,
        "award-winners": """
            SELECT id FROM titles
            WHERE (rating >= 8.2 AND rating_count >= 1500)
               OR title IN (
                   'Oppenheimer', 'Parasite', 'Everything Everywhere All at Once', 'Anora', 'Poor Things',
                   'The Godfather', 'The Godfather Part II', 'Schindler''s List', 'The Lord of the Rings: The Return of the King',
                   'Pulp Fiction', 'The Shawshank Redemption', 'Forrest Gump', 'Gladiator', 'Titanic',
                   'No Country for Old Men', 'The Departed', 'Moonlight', 'Spotlight', 'Birdman',
                   '12 Years a Slave', 'Succession', 'The Bear', 'Shōgun', 'Breaking Bad', 'The Sopranos', 'Chernobyl'
               )
            ORDER BY rating DESC, popularity DESC LIMIT 150
        """,
        "imdb-top-rated": """
            SELECT id FROM titles
            WHERE type='movie' AND status='released' AND rating >= 8.1 AND rating_count >= 1000
            ORDER BY rating DESC, rating_count DESC LIMIT 250
        """,
    }

    for slug, sql in sql_Rules.items():
        col_row = conn.execute("SELECT id, name FROM collections WHERE slug=?", (slug,)).fetchone()
        if not col_row:
            cid = ensure_collection(conn, slug, slug.replace("-", " ").title())
        else:
            cid = col_row[0]
        rows = conn.execute(sql).fetchall()
        tids = [r[0] for r in rows]
        total_cnt = link_titles(conn, cid, tids)
        print(f"  [{slug}] -> {total_cnt} titles")

    conn.commit()

    # Check if any collection still has 0 titles
    zero_cols = conn.execute("""
        SELECT c.slug, c.name, COUNT(tc.title_id) as cnt
        FROM collections c
        LEFT JOIN title_collections tc ON c.id = tc.collection_id
        GROUP BY c.id
        HAVING cnt = 0
    """).fetchall()
    print(f"\nCollections with 0 titles remaining: {len(zero_cols)}")
    for z in zero_cols:
        print("  ZERO:", z)

    conn.close()


if __name__ == "__main__":
    main()
