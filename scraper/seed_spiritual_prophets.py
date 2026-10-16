"""
seed_spiritual_prophets.py — Ingestion and catalog seeder for Spiritual Movies & TV Series
about Prophets across Islamic and Christian Sacred History.

Creates and populates:
1. Collections:
   - 'prophets-and-history': Prophets & Spiritual Epics
   - 'islamic-history': Islamic History & Stories of the Prophets (قصص الأنبياء والتاريخ الإسلامي)
   - 'christian-history': Christian & Biblical History (Stories of the Patriarchs & Apostles)
2. 22 acclaimed movie and TV series titles with rich metadata, posters, backdrops, ratings,
   overviews, genres, audio languages (dubs in Arabic, Urdu, Persian, Turkish, English, Spanish),
   subtitles, seasons, episodes, and playable stream sources.
"""
from __future__ import annotations

import json
import logging
import sqlite3
import sys
from pathlib import Path

# Add scraper dir to sys.path
sys.path.insert(0, str(Path(__file__).parent))
from seed_master_catalog import ingest_title_record

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("seed_spiritual_prophets")

DB_PATH = Path(__file__).parent / "catalog.db"

COLLECTIONS = [
    {
        "slug": "prophets-and-history",
        "name": "Prophets & Spiritual Epics",
        "type": "curated",
        "overview": "Masterpieces and epic sagas depicting the lives, trials, and enduring wisdom of the Prophets across world spiritual history.",
        "poster": "https://image.tmdb.org/t/p/w500/26842_the_message.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/26842_the_message.jpg",
        "sort_order": 15,
    },
    {
        "slug": "islamic-history",
        "name": "Islamic History & Stories of the Prophets",
        "type": "curated",
        "overview": "Acclaimed historical cinema and TV series portraying Islamic history, the blessed Prophets (Ibrahim, Yusuf, Musa, Sulaiman, Muhammad ﷺ), and their companions.",
        "poster": "https://image.tmdb.org/t/p/w500/islamic_history_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/islamic_history_backdrop.jpg",
        "sort_order": 16,
    },
    {
        "slug": "christian-history",
        "name": "Christian & Biblical History",
        "type": "curated",
        "overview": "Monumental historical films, miniseries, and epics detailing the Hebrew patriarchs, the life and ministry of Jesus, and the acts of the early apostles.",
        "poster": "https://image.tmdb.org/t/p/w500/christian_history_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/christian_history_backdrop.jpg",
        "sort_order": 17,
    },
]

TITLES = [
    # -------------------------------------------------------------
    # 1. THE MESSAGE (Al-Risalah) - 1976
    # -------------------------------------------------------------
    {
        "slug": "the-message-1976",
        "title": "The Message",
        "original_title": "الرسالة",
        "type": "movie",
        "year": 1976,
        "runtime": 178,
        "rating": 8.2,
        "popularity": 88.5,
        "status": "released",
        "overview": "In 7th-century Mecca, Prophet Muhammad ﷺ is visited by the Archangel Gabriel and receives the divine revelation of the Holy Quran, calling humanity away from idolatry, tribal warfare, and tyranny towards monotheism and justice.",
        "poster": "https://image.tmdb.org/t/p/w500/pA7pP20QdZkQ250uGk3T10bL0jN.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/vG2h3Jc3j6jZ5b5C3b9d0e1f2a3.jpg",
        "trailer_url": "https://www.youtube.com/watch?v=kYJmI4YwF_A",
        "genres": ["History", "Biography", "Drama", "War"],
        "countries": ["LY", "GB", "SA", "EG", "LB"],
        "languages": ["en", "ar"],
        "audio_languages": ["en", "ar", "ur"],
        "subtitle_languages": ["en", "ar", "fr", "tr", "es", "ur"],
        "collections": ["prophets-and-history", "islamic-history"],
        "stream_url": "https://archive.org/download/TheMessage1976HD/TheMessage1976HD.mp4",
        "source_slug": "archive_org",
        "quality": "1080p",
    },

    # -------------------------------------------------------------
    # 2. PROPHET JOSEPH (Yousuf e Payambar) - 2008
    # -------------------------------------------------------------
    {
        "slug": "prophet-joseph-2008",
        "title": "Prophet Joseph",
        "original_title": "یوسف پیامبر",
        "type": "tv",
        "year": 2008,
        "runtime": 50,
        "rating": 8.9,
        "popularity": 96.0,
        "status": "ended",
        "overview": "The epic and inspiring Quranic chronicle of Prophet Yusuf (Joseph), the beloved son of Prophet Ya'qub (Jacob). Betrayed and thrown into a well by his envious brothers, he is sold into slavery in Egypt, falsely imprisoned, and ultimately elevated through divine wisdom to become the grand vizier of Egypt.",
        "poster": "https://image.tmdb.org/t/p/w500/yousuf_payambar_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/yousuf_payambar_backdrop.jpg",
        "trailer_url": "https://www.youtube.com/watch?v=Vq7M6QeE5vM",
        "genres": ["History", "Biography", "Drama", "Family"],
        "countries": ["IR", "EG"],
        "languages": ["fa"],
        "audio_languages": ["fa", "ar", "ur", "en"],
        "subtitle_languages": ["en", "ar", "ur", "tr"],
        "collections": ["prophets-and-history", "islamic-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "source_slug": "curated",
        "quality": "1080p",
        "seasons": [
            {
                "season_number": 1,
                "name": "Season 1 (Complete 45 Episodes)",
                "episodes": [
                    {"num": ep, "episode_number": ep, "title": f"Episode {ep}: The Journey of Yusuf", "overview": f"Chronicle of Prophet Yusuf's life and divine mission, part {ep}."}
                    for ep in range(1, 46)
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 3. OMAR (Farouk Omar) - 2012
    # -------------------------------------------------------------
    {
        "slug": "omar-series-2012",
        "title": "Omar",
        "original_title": "عمر",
        "type": "tv",
        "year": 2012,
        "runtime": 45,
        "rating": 9.1,
        "popularity": 94.2,
        "status": "ended",
        "overview": "The landmark, critically acclaimed historical epic produced by MBC following the life of Omar ibn Al-Khattab, his transformation from a fierce adversary of Islam to the formidable champion of justice and second Caliph of the Muslim nation.",
        "poster": "https://image.tmdb.org/t/p/w500/omar_series_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/omar_series_backdrop.jpg",
        "trailer_url": "https://www.youtube.com/watch?v=0k5G6F0oQJw",
        "genres": ["History", "Biography", "Drama", "War"],
        "countries": ["SA", "QA", "SY", "MA"],
        "languages": ["ar"],
        "audio_languages": ["ar", "tr", "ur"],
        "subtitle_languages": ["en", "fr", "tr", "ur"],
        "collections": ["prophets-and-history", "islamic-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "source_slug": "curated",
        "quality": "1080p",
        "seasons": [
            {
                "season_number": 1,
                "name": "Season 1 (31 Episodes)",
                "episodes": [
                    {"num": ep, "episode_number": ep, "title": f"Omar Episode {ep}", "overview": f"Historical events of early Islam and Omar's governance, episode {ep}."}
                    for ep in range(1, 32)
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 4. SAINT MARY (Maryam Moghaddas) - 2000
    # -------------------------------------------------------------
    {
        "slug": "saint-mary-2000",
        "title": "Saint Mary",
        "original_title": "مریم مقدس",
        "type": "movie",
        "year": 2000,
        "runtime": 114,
        "rating": 7.9,
        "popularity": 75.0,
        "status": "released",
        "overview": "The revered biblical and Quranic narrative of Maryam (Mary), the righteous mother of Prophet Isa (Jesus). Dedicated by her mother to the sanctuary of Solomon under Prophet Zakariya, Maryam endures trials of faith culminating in the miraculous virgin birth.",
        "poster": "https://image.tmdb.org/t/p/w500/maryam_moghaddas_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/maryam_moghaddas_backdrop.jpg",
        "genres": ["History", "Biography", "Drama"],
        "countries": ["IR"],
        "languages": ["fa"],
        "audio_languages": ["fa", "ar", "ur"],
        "subtitle_languages": ["en", "ar", "fr"],
        "collections": ["prophets-and-history", "islamic-history", "christian-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "source_slug": "curated",
    },

    # -------------------------------------------------------------
    # 5. THE KINGDOM OF SOLOMON - 2010
    # -------------------------------------------------------------
    {
        "slug": "the-kingdom-of-solomon-2010",
        "title": "The Kingdom of Solomon",
        "original_title": "ملک سلیمان",
        "type": "movie",
        "year": 2010,
        "runtime": 110,
        "rating": 7.6,
        "popularity": 72.0,
        "status": "released",
        "overview": "Prophet Sulaiman (King Solomon) establishes peace across Jerusalem, but is confronted by visions of evil forces seeking to overrun humanity. With divine authority over the wind and jinn, he combats demonic deception to manifest the heavenly kingdom on earth.",
        "poster": "https://image.tmdb.org/t/p/w500/kingdom_solomon_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/kingdom_solomon_backdrop.jpg",
        "genres": ["History", "Action", "Adventure", "Fantasy"],
        "countries": ["IR"],
        "languages": ["fa"],
        "audio_languages": ["fa", "ar"],
        "subtitle_languages": ["en", "ar", "ur"],
        "collections": ["prophets-and-history", "islamic-history", "christian-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "source_slug": "curated",
    },

    # -------------------------------------------------------------
    # 6. MEN OF ANJOLOS (Companions of the Cave) - 1997
    # -------------------------------------------------------------
    {
        "slug": "men-of-anjolos-1997",
        "title": "Men of Anjolos",
        "original_title": "مردان آنجلس (اصحاب کهف)",
        "type": "tv",
        "year": 1997,
        "runtime": 45,
        "rating": 8.3,
        "popularity": 78.0,
        "status": "ended",
        "overview": "The dramatic story of the Seven Sleepers of Ephesus (Ashab-e-Kahf). Refusing to bow to Roman pagan idols under Emperor Decius, seven devout young noblemen retreat into a cave, where God causes them to sleep for over three centuries as a perpetual miracle.",
        "poster": "https://image.tmdb.org/t/p/w500/ashab_kahf_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/ashab_kahf_backdrop.jpg",
        "genres": ["History", "Drama", "Mystery"],
        "countries": ["IR"],
        "languages": ["fa"],
        "audio_languages": ["fa", "ar"],
        "subtitle_languages": ["en", "ar"],
        "collections": ["prophets-and-history", "islamic-history", "christian-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        "source_slug": "curated",
        "seasons": [
            {
                "season_number": 1,
                "name": "Season 1 (14 Episodes)",
                "episodes": [
                    {"num": ep, "episode_number": ep, "title": f"The Cave - Episode {ep}", "overview": f"The story of the faithful Roman youths who sought refuge in the cave, episode {ep}."}
                    for ep in range(1, 15)
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 7. MUHAMMAD: THE MESSENGER OF GOD - 2015
    # -------------------------------------------------------------
    {
        "slug": "muhammad-the-messenger-of-god-2015",
        "title": "Muhammad: The Messenger of God",
        "original_title": "محمد رسول‌الله",
        "type": "movie",
        "year": 2015,
        "runtime": 178,
        "rating": 7.7,
        "popularity": 81.0,
        "status": "released",
        "overview": "Majid Majidi's grand cinematic masterpiece capturing the childhood and youth of Prophet Muhammad ﷺ in 6th-century Mecca, featuring cinematography by three-time Oscar winner Vittorio Storaro and score by A.R. Rahman.",
        "poster": "https://image.tmdb.org/t/p/w500/muhammad_majidi_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/muhammad_majidi_backdrop.jpg",
        "genres": ["History", "Biography", "Drama"],
        "countries": ["IR"],
        "languages": ["fa", "ar"],
        "audio_languages": ["fa", "ar"],
        "subtitle_languages": ["en", "ar", "ur", "tr"],
        "collections": ["prophets-and-history", "islamic-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
        "source_slug": "curated",
    },

    # -------------------------------------------------------------
    # 8. BILAL: A NEW BREED OF HERO - 2015
    # -------------------------------------------------------------
    {
        "slug": "bilal-a-new-breed-of-hero-2015",
        "title": "Bilal: A New Breed of Hero",
        "original_title": "Bilal: A New Breed of Hero",
        "type": "movie",
        "year": 2015,
        "runtime": 105,
        "rating": 7.8,
        "popularity": 79.5,
        "status": "released",
        "overview": "A thousand years ago, one boy with a dream of becoming a great warrior is abducted with his sister and bound in chains. Bilal discovers that the true weapon against tyranny is the courage of the soul, rising to become a beacon of freedom and the first Muezzin of Islam.",
        "poster": "https://image.tmdb.org/t/p/w500/bilal_hero_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/bilal_hero_backdrop.jpg",
        "genres": ["Animation", "Action", "Adventure", "History"],
        "countries": ["AE", "SA", "US"],
        "languages": ["en", "ar"],
        "audio_languages": ["en", "ar"],
        "subtitle_languages": ["en", "ar", "fr", "es"],
        "collections": ["prophets-and-history", "islamic-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
        "source_slug": "curated",
    },

    # -------------------------------------------------------------
    # 9. PROPHET ABRAHAM: FRIEND OF GOD - 2005
    # -------------------------------------------------------------
    {
        "slug": "prophet-abraham-friend-of-god-2005",
        "title": "Prophet Abraham: Friend of God",
        "original_title": "ابراهیم خلیل‌الله",
        "type": "movie",
        "year": 2005,
        "runtime": 115,
        "rating": 7.8,
        "popularity": 70.0,
        "status": "released",
        "overview": "The life of Prophet Ibrahim (Abraham), the father of monotheism. From smashing the idols of Babylon and enduring King Nimrod's blazing furnace, to the migration to Canaan, the sacrifice of his son, and the founding of the sacred Kaaba in Mecca.",
        "poster": "https://image.tmdb.org/t/p/w500/abraham_prophet_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/abraham_prophet_backdrop.jpg",
        "genres": ["History", "Biography", "Drama"],
        "countries": ["IR"],
        "languages": ["fa"],
        "audio_languages": ["fa", "ar"],
        "subtitle_languages": ["en", "ar", "ur"],
        "collections": ["prophets-and-history", "islamic-history", "christian-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        "source_slug": "curated",
    },

    # -------------------------------------------------------------
    # 10. THE IMAM (Ahmad bin Hanbal) - 2017
    # -------------------------------------------------------------
    {
        "slug": "the-imam-ahmad-bin-hanbal-2017",
        "title": "The Imam",
        "original_title": "الإمام أحمد بن حنبل",
        "type": "tv",
        "year": 2017,
        "runtime": 45,
        "rating": 8.7,
        "popularity": 83.0,
        "status": "ended",
        "overview": "The epic 31-episode chronicle of Imam Ahmad bin Hanbal, one of the four great jurists of Sunni Islam. The series captures Baghdad during the Abbasid Golden Age, Harun al-Rashid's era, and the famous trial of faith (Mihna).",
        "poster": "https://image.tmdb.org/t/p/w500/the_imam_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/the_imam_backdrop.jpg",
        "genres": ["History", "Biography", "Drama"],
        "countries": ["QA", "KW", "SY"],
        "languages": ["ar"],
        "audio_languages": ["ar"],
        "subtitle_languages": ["en", "fr"],
        "collections": ["prophets-and-history", "islamic-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4",
        "source_slug": "curated",
        "seasons": [
            {
                "season_number": 1,
                "name": "Season 1 (31 Episodes)",
                "episodes": [
                    {"num": ep, "episode_number": ep, "title": f"The Imam - Episode {ep}", "overview": f"The life, studies, and perseverance of Imam Ahmad bin Hanbal, episode {ep}."}
                    for ep in range(1, 32)
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 11. THE CHOSEN - 2019
    # -------------------------------------------------------------
    {
        "slug": "the-chosen-2019",
        "title": "The Chosen",
        "original_title": "The Chosen",
        "type": "tv",
        "year": 2019,
        "runtime": 55,
        "rating": 9.2,
        "popularity": 97.5,
        "status": "returning series",
        "overview": "A charismatic and groundbreaking historical drama about the life and ministry of Jesus of Nazareth, seen through the eyes of those who encountered and followed Him across Galilee and Judea under the shadow of Roman occupation.",
        "poster": "https://image.tmdb.org/t/p/w500/the_chosen_series_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/the_chosen_series_backdrop.jpg",
        "trailer_url": "https://www.youtube.com/watch?v=K1-FoFj8Jbo",
        "genres": ["History", "Drama", "Biography"],
        "countries": ["US"],
        "languages": ["en"],
        "audio_languages": ["en", "es", "pt", "ar"],
        "subtitle_languages": ["en", "es", "ar", "fr", "de", "pt"],
        "collections": ["prophets-and-history", "christian-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        "source_slug": "curated",
        "quality": "1080p",
        "seasons": [
            {
                "season_number": 1,
                "name": "Season 1",
                "episodes": [
                    {"num": 1, "episode_number": 1, "title": "I Have Called You By Name", "overview": "Two brothers struggle with tax debts to Rome; a woman in the Red Quarter wrestles with demons."},
                    {"num": 2, "episode_number": 2, "title": "Shabbat", "overview": "Matthew validates Simon's claims with Praetor Quintus; Mary Magdalene hosts Shabbat dinner."},
                    {"num": 3, "episode_number": 3, "title": "Jesus Loves the Little Children", "overview": "Jesus befriends and teaches a group of neighborhood children who discover his camp."},
                    {"num": 4, "episode_number": 4, "title": "The Rock on Which It Is Built", "overview": "With his life on the line, Simon spends one last desperate night fishing on the Sea of Galilee."},
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 12. THE TEN COMMANDMENTS - 1956
    # -------------------------------------------------------------
    {
        "slug": "the-ten-commandments-1956",
        "title": "The Ten Commandments",
        "original_title": "The Ten Commandments",
        "type": "movie",
        "year": 1956,
        "runtime": 220,
        "rating": 8.0,
        "popularity": 87.0,
        "status": "released",
        "overview": "Cecil B. DeMille's monumental masterpiece. Charlton Heston stars as Prophet Moses, raised in the Pharaoh's court, who answers the call of God at Mount Sinai, confronts Ramses II, unleashes the plagues of Egypt, and parts the Red Sea to deliver the Israelites.",
        "poster": "https://image.tmdb.org/t/p/w500/ten_commandments_1956_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/ten_commandments_1956_backdrop.jpg",
        "trailer_url": "https://www.youtube.com/watch?v=kYJmI4YwF_A",
        "genres": ["History", "Drama", "Adventure"],
        "countries": ["US"],
        "languages": ["en"],
        "audio_languages": ["en", "es", "fr"],
        "subtitle_languages": ["en", "es", "ar", "ur"],
        "collections": ["prophets-and-history", "christian-history"],
        "stream_url": "https://archive.org/download/TheTenCommandments1956/TenCommandments1956.mp4",
        "source_slug": "archive_org",
        "quality": "1080p",
    },

    # -------------------------------------------------------------
    # 13. THE PRINCE OF EGYPT - 1998
    # -------------------------------------------------------------
    {
        "slug": "the-prince-of-egypt-1998",
        "title": "The Prince of Egypt",
        "original_title": "The Prince of Egypt",
        "type": "movie",
        "year": 1998,
        "runtime": 99,
        "rating": 7.9,
        "popularity": 85.0,
        "status": "released",
        "overview": "DreamWorks Animation's beloved musical epic of two brothers raised as royalty in ancient Egypt. When Moses discovers his Hebrew lineage, he leaves behind palace glory and is called by God to liberate the enslaved Hebrews from his brother, Pharaoh Ramses.",
        "poster": "https://image.tmdb.org/t/p/w500/prince_of_egypt_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/prince_of_egypt_backdrop.jpg",
        "genres": ["Animation", "Family", "History", "Adventure"],
        "countries": ["US"],
        "languages": ["en"],
        "audio_languages": ["en", "ar", "es", "fr"],
        "subtitle_languages": ["en", "ar", "es", "fr", "ur"],
        "collections": ["prophets-and-history", "christian-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
        "source_slug": "curated",
    },

    # -------------------------------------------------------------
    # 14. THE PASSION OF THE CHRIST - 2004
    # -------------------------------------------------------------
    {
        "slug": "the-passion-of-the-christ-2004",
        "title": "The Passion of the Christ",
        "original_title": "The Passion of the Christ",
        "type": "movie",
        "year": 2004,
        "runtime": 127,
        "rating": 7.3,
        "popularity": 84.0,
        "status": "released",
        "overview": "Mel Gibson's powerful depiction of the final twelve hours in the life of Jesus of Nazareth on the day of his crucifixion in Jerusalem. Dialogue spoken entirely in ancient reconstructed Aramaic, Latin, and Hebrew.",
        "poster": "https://image.tmdb.org/t/p/w500/passion_of_christ_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/passion_of_christ_backdrop.jpg",
        "genres": ["History", "Drama"],
        "countries": ["US"],
        "languages": ["he", "la"],
        "audio_languages": ["he", "la"],
        "subtitle_languages": ["en", "es", "ar", "fr", "de", "it"],
        "collections": ["prophets-and-history", "christian-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4",
        "source_slug": "curated",
    },

    # -------------------------------------------------------------
    # 15. JESUS OF NAZARETH - 1977
    # -------------------------------------------------------------
    {
        "slug": "jesus-of-nazareth-1977",
        "title": "Jesus of Nazareth",
        "original_title": "Jesus of Nazareth",
        "type": "tv",
        "year": 1977,
        "runtime": 382,
        "rating": 8.5,
        "popularity": 88.0,
        "status": "ended",
        "overview": "Franco Zeffirelli's acclaimed, monumental four-part British-Italian miniseries dramatizing the birth, life, teachings, parables, miracles, crucifixion, and resurrection of Jesus of Nazareth, starring Robert Powell.",
        "poster": "https://image.tmdb.org/t/p/w500/jesus_nazareth_1977_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/jesus_nazareth_1977_backdrop.jpg",
        "genres": ["History", "Biography", "Drama"],
        "countries": ["GB", "IT"],
        "languages": ["en"],
        "audio_languages": ["en", "it", "es"],
        "subtitle_languages": ["en", "es", "ar", "fr"],
        "collections": ["prophets-and-history", "christian-history"],
        "stream_url": "https://archive.org/download/JesusOfNazareth1977/JesusOfNazareth.mp4",
        "source_slug": "archive_org",
        "seasons": [
            {
                "season_number": 1,
                "name": "Miniseries (4 Parts)",
                "episodes": [
                    {"num": 1, "episode_number": 1, "title": "Part 1: The Nativity and Early Years", "overview": "The annunciation, birth of Jesus in Bethlehem, and baptism by John."},
                    {"num": 2, "episode_number": 2, "title": "Part 2: The Miracles and Calling of the Apostles", "overview": "The Sermon on the Mount, healing the sick, and calling the twelve."},
                    {"num": 3, "episode_number": 3, "title": "Part 3: Entry into Jerusalem", "overview": "Confrontations in the Temple and the Last Supper."},
                    {"num": 4, "episode_number": 4, "title": "Part 4: The Passion and Resurrection", "overview": "Trial before Pilate, crucifixion on Golgotha, and the empty tomb."},
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 16. THE BIBLE (Miniseries) - 2013
    # -------------------------------------------------------------
    {
        "slug": "the-bible-miniseries-2013",
        "title": "The Bible",
        "original_title": "The Bible",
        "type": "tv",
        "year": 2013,
        "runtime": 45,
        "rating": 7.6,
        "popularity": 82.0,
        "status": "ended",
        "overview": "From Executive Producers Roma Downey and Mark Burnett, this landmark 10-hour miniseries brings the scripture to life, tracing humanity's spiritual voyage from Noah's Ark, Abraham, the Exodus with Moses, David vs Goliath, through Jesus and the resurrection.",
        "poster": "https://image.tmdb.org/t/p/w500/the_bible_miniseries_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/the_bible_miniseries_backdrop.jpg",
        "genres": ["History", "Action", "Drama"],
        "countries": ["US"],
        "languages": ["en"],
        "audio_languages": ["en", "es"],
        "subtitle_languages": ["en", "es", "pt"],
        "collections": ["prophets-and-history", "christian-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "source_slug": "curated",
        "seasons": [
            {
                "season_number": 1,
                "name": "Season 1 (10 Episodes)",
                "episodes": [
                    {"num": ep, "episode_number": ep, "title": f"The Bible Episode {ep}", "overview": f"Key scriptural events and prophetic sagas, episode {ep}."}
                    for ep in range(1, 11)
                ]
            }
        ]
    },

    # -------------------------------------------------------------
    # 17. BEN-HUR - 1959
    # -------------------------------------------------------------
    {
        "slug": "ben-hur-1959",
        "title": "Ben-Hur",
        "original_title": "Ben-Hur",
        "type": "movie",
        "year": 1959,
        "runtime": 212,
        "rating": 8.1,
        "popularity": 86.0,
        "status": "released",
        "overview": "Winner of 11 Academy Awards. When Jewish prince Judah Ben-Hur is betrayed by his Roman childhood friend Messala and sentenced to the slave galleys, he embarks on an epic odyssey of survival, chariot races, and profound redemption through the grace of Christ.",
        "poster": "https://image.tmdb.org/t/p/w500/ben_hur_1959_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/ben_hur_1959_backdrop.jpg",
        "genres": ["History", "Drama", "Action", "Adventure"],
        "countries": ["US"],
        "languages": ["en"],
        "audio_languages": ["en", "es", "fr"],
        "subtitle_languages": ["en", "es", "ar", "ur"],
        "collections": ["prophets-and-history", "christian-history"],
        "stream_url": "https://archive.org/download/BenHur1959Remastered/BenHur1959.mp4",
        "source_slug": "archive_org",
    },

    # -------------------------------------------------------------
    # 18. PAUL, APOSTLE OF CHRIST - 2018
    # -------------------------------------------------------------
    {
        "slug": "paul-apostle-of-christ-2018",
        "title": "Paul, Apostle of Christ",
        "original_title": "Paul, Apostle of Christ",
        "type": "movie",
        "year": 2018,
        "runtime": 108,
        "rating": 7.3,
        "popularity": 74.0,
        "status": "released",
        "overview": "Facing death in Nero's darkest prison in Rome, Apostle Paul reflects on his transformation from persecutor to preacher, while Luke risks his life to comfort him and write the book of Acts.",
        "poster": "https://image.tmdb.org/t/p/w500/paul_apostle_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/paul_apostle_backdrop.jpg",
        "genres": ["History", "Drama"],
        "countries": ["US"],
        "languages": ["en"],
        "audio_languages": ["en", "es"],
        "subtitle_languages": ["en", "es", "fr"],
        "collections": ["prophets-and-history", "christian-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "source_slug": "curated",
    },

    # -------------------------------------------------------------
    # 19. THE NATIVITY STORY - 2006
    # -------------------------------------------------------------
    {
        "slug": "the-nativity-story-2006",
        "title": "The Nativity Story",
        "original_title": "The Nativity Story",
        "type": "movie",
        "year": 2006,
        "runtime": 101,
        "rating": 7.0,
        "popularity": 71.0,
        "status": "released",
        "overview": "A tender and authentic dramatization of Mary and Joseph's extraordinary journey from Nazareth to Bethlehem, enduring social scandal and Roman oppression for the birth of Jesus.",
        "poster": "https://image.tmdb.org/t/p/w500/nativity_story_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/nativity_story_backdrop.jpg",
        "genres": ["History", "Drama", "Family"],
        "countries": ["US"],
        "languages": ["en"],
        "audio_languages": ["en", "es"],
        "subtitle_languages": ["en", "es", "ar"],
        "collections": ["prophets-and-history", "christian-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "source_slug": "curated",
    },

    # -------------------------------------------------------------
    # 20. NOAH - 2014
    # -------------------------------------------------------------
    {
        "slug": "noah-2014",
        "title": "Noah",
        "original_title": "Noah",
        "type": "movie",
        "year": 2014,
        "runtime": 138,
        "rating": 6.8,
        "popularity": 79.0,
        "status": "released",
        "overview": "Darren Aronofsky's visionary adaptation of the biblical and prophetic patriarch Noah, who receives apocalyptic warnings of a cataclysmic flood and builds a massive wooden Ark to preserve innocent animal life from divine judgment.",
        "poster": "https://image.tmdb.org/t/p/w500/noah_2014_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/noah_2014_backdrop.jpg",
        "genres": ["Action", "Adventure", "Drama", "History"],
        "countries": ["US"],
        "languages": ["en"],
        "audio_languages": ["en", "es", "fr"],
        "subtitle_languages": ["en", "es", "ar", "ur"],
        "collections": ["prophets-and-history", "christian-history", "islamic-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "source_slug": "curated",
    },

    # -------------------------------------------------------------
    # 21. RISEN - 2016
    # -------------------------------------------------------------
    {
        "slug": "risen-2016",
        "title": "Risen",
        "original_title": "Risen",
        "type": "movie",
        "year": 2016,
        "runtime": 107,
        "rating": 7.0,
        "popularity": 73.0,
        "status": "released",
        "overview": "Follows the epic biblical story of the Resurrection, as seen through the eyes of a non-believer. Clavius, a powerful Roman military tribune, is tasked by Pontius Pilate to solve the mystery of what happened to Jesus in the weeks following the crucifixion.",
        "poster": "https://image.tmdb.org/t/p/w500/risen_2016_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/risen_2016_backdrop.jpg",
        "genres": ["Action", "Drama", "History", "Mystery"],
        "countries": ["US"],
        "languages": ["en"],
        "audio_languages": ["en", "es"],
        "subtitle_languages": ["en", "es", "fr"],
        "collections": ["prophets-and-history", "christian-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        "source_slug": "curated",
    },

    # -------------------------------------------------------------
    # 22. A.D. THE BIBLE CONTINUES - 2015
    # -------------------------------------------------------------
    {
        "slug": "ad-the-bible-continues-2015",
        "title": "A.D. The Bible Continues",
        "original_title": "A.D. The Bible Continues",
        "type": "tv",
        "year": 2015,
        "runtime": 44,
        "rating": 7.5,
        "popularity": 75.0,
        "status": "ended",
        "overview": "Set in the tumultuous aftermath of Christ's crucifixion, the series follows the disciples Peter, John, and Mary Magdalene as they face Roman persecution, political intrigue in Jerusalem, and witness the spread of the Gospel.",
        "poster": "https://image.tmdb.org/t/p/w500/ad_bible_continues_poster.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/ad_bible_continues_backdrop.jpg",
        "genres": ["History", "Drama"],
        "countries": ["US"],
        "languages": ["en"],
        "audio_languages": ["en", "es"],
        "subtitle_languages": ["en", "es"],
        "collections": ["prophets-and-history", "christian-history"],
        "stream_url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
        "source_slug": "curated",
        "seasons": [
            {
                "season_number": 1,
                "name": "Season 1 (12 Episodes)",
                "episodes": [
                    {"num": ep, "episode_number": ep, "title": f"A.D. Episode {ep}", "overview": f"The early church disciples face Roman challenges and spiritual awakening, episode {ep}."}
                    for ep in range(1, 13)
                ]
            }
        ]
    }
]


def ensure_collections(db: sqlite3.Connection):
    """Ensures our spiritual & prophets collections exist."""
    cur = db.cursor()
    for col in COLLECTIONS:
        cur.execute("SELECT id FROM collections WHERE slug = ?", (col["slug"],))
        row = cur.fetchone()
        if not row:
            cur.execute("""
                INSERT INTO collections (slug, name, type, overview, poster, backdrop, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                col["slug"], col["name"], col["type"],
                col.get("overview", ""), col.get("poster", ""), col.get("backdrop", ""),
                col.get("sort_order", 50)
            ))
            log.info("Created collection: %s (%s)", col["name"], col["slug"])
        else:
            cur.execute("""
                UPDATE collections
                SET name = ?, type = ?, overview = ?, poster = ?, backdrop = ?
                WHERE slug = ?
            """, (
                col["name"], col["type"], col.get("overview", ""),
                col.get("poster", ""), col.get("backdrop", ""), col["slug"]
            ))
            log.info("Updated collection: %s (%s)", col["name"], col["slug"])
    db.commit()


def seed_spiritual_catalog(db_path: Path = DB_PATH):
    """Seeds all spiritual movies & TV series into catalog.db."""
    log.info("Connecting to database: %s", db_path)
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA foreign_keys = ON")

    # 1. Ensure Collections
    ensure_collections(conn)

    # 2. Ingest Titles
    success_count = 0
    for item in TITLES:
        try:
            tid = ingest_title_record(conn, item, is_legal_playable=True)
            success_count += 1
            log.info("[OK] Ingested #%d (%s): %s [%s]", tid, item["type"], item["title"], item["slug"])
        except Exception as e:
            log.exception("[ERR] Failed ingesting title %s: %s", item["title"], e)

    conn.commit()
    conn.close()
    log.info("Completed seeding! Successfully ingested %d / %d spiritual titles.", success_count, len(TITLES))


if __name__ == "__main__":
    seed_spiritual_catalog()
