import urllib.request
import urllib.parse
import json
import time
import os
import subprocess
from pathlib import Path

TMDB_KEYS = [
    "698d10c9649fba62a10117f6dc8e7568",
    "42d807f7358dcea850291d737ac42852",
    "99a5d8450024be69a1238450f6c92cbf"
]
key_idx = 0

def fetch_tmdb(endpoint, params=None):
    global key_idx
    if params is None:
        params = {}
    for attempt in range(len(TMDB_KEYS)):
        k = TMDB_KEYS[(key_idx + attempt) % len(TMDB_KEYS)]
        q = "&".join([f"{k_}={urllib.parse.quote(str(v_))}" for k_, v_ in params.items()])
        url = f"https://api.themoviedb.org/3/{endpoint}?api_key={k}"
        if q:
            url += f"&{q}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ShadowStream-Seeder/1.0"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                key_idx = (key_idx + attempt) % len(TMDB_KEYS)
                return json.loads(resp.read().decode('utf-8'))
        except Exception as e:
            continue
    return None

def slugify(title):
    import re
    s = re.sub(r'[^\w\s-]', '', title.lower())
    return re.sub(r'[-\s]+', '-', s).strip('-')

# 1. CANONICAL TOP 100 MOVIES ON IMDB (Title, Year, TMDB ID, IMDb ID, Rating)
TOP_100_MOVIES = [
    ("The Shawshank Redemption", 1994, 278, "tt0111161", 9.3),
    ("The Godfather", 1972, 238, "tt0068646", 9.2),
    ("The Dark Knight", 2008, 155, "tt0468569", 9.0),
    ("The Godfather Part II", 1974, 240, "tt0071562", 9.0),
    ("12 Angry Men", 1957, 389, "tt0050083", 9.0),
    ("Schindler's List", 1993, 424, "tt0108052", 9.0),
    ("The Lord of the Rings: The Return of the King", 2003, 122, "tt0167260", 9.0),
    ("Pulp Fiction", 1994, 680, "tt0110912", 8.9),
    ("The Lord of the Rings: The Fellowship of the Ring", 2001, 120, "tt0120737", 8.9),
    ("The Good, the Bad and the Ugly", 1966, 429, "tt0060196", 8.8),
    ("Forrest Gump", 1994, 13, "tt0109830", 8.8),
    ("Fight Club", 1999, 550, "tt0137523", 8.8),
    ("The Lord of the Rings: The Two Towers", 2002, 121, "tt0167261", 8.8),
    ("Inception", 2010, 27205, "tt1375666", 8.8),
    ("Star Wars: Episode V - The Empire Strikes Back", 1980, 1891, "tt0080684", 8.7),
    ("The Matrix", 1999, 603, "tt0133093", 8.7),
    ("GoodFellas", 1990, 769, "tt0099685", 8.7),
    ("One Flew Over the Cuckoo's Nest", 1975, 510, "tt0073486", 8.7),
    ("Se7en", 1995, 807, "tt0114369", 8.6),
    ("Interstellar", 2014, 157336, "tt0816692", 8.7),
    ("Seven Samurai", 1954, 346, "tt0047478", 8.6),
    ("It's a Wonderful Life", 1946, 1585, "tt0038650", 8.6),
    ("The Silence of the Lambs", 1991, 274, "tt0102926", 8.6),
    ("Saving Private Ryan", 1998, 857, "tt0120815", 8.6),
    ("City of God", 2002, 598, "tt0317248", 8.6),
    ("Life Is Beautiful", 1997, 637, "tt0118799", 8.6),
    ("The Green Mile", 1999, 497, "tt0120689", 8.6),
    ("Star Wars: Episode IV - A New Hope", 1977, 11, "tt0076759", 8.6),
    ("Terminator 2: Judgment Day", 1991, 280, "tt0103064", 8.6),
    ("Back to the Future", 1985, 105, "tt0088763", 8.5),
    ("Spirited Away", 2001, 129, "tt0245429", 8.6),
    ("The Pianist", 2002, 423, "tt0253474", 8.5),
    ("Psycho", 1960, 539, "tt0054215", 8.5),
    ("Parasite", 2019, 496243, "tt6751668", 8.5),
    ("Léon: The Professional", 1994, 101, "tt0110413", 8.5),
    ("The Lion King", 1994, 8587, "tt0110357", 8.5),
    ("Gladiator", 2000, 98, "tt0172495", 8.5),
    ("American History X", 1998, 73, "tt0120586", 8.5),
    ("The Departed", 2006, 1422, "tt0407887", 8.5),
    ("Whiplash", 2014, 244786, "tt2582802", 8.5),
    ("The Prestige", 2006, 1124, "tt0482571", 8.5),
    ("Casablanca", 1942, 289, "tt0034583", 8.5),
    ("Grave of the Fireflies", 1988, 12477, "tt0095327", 8.5),
    ("Harakiri", 1962, 14537, "tt0056058", 8.6),
    ("The Intouchables", 2011, 77338, "tt1675434", 8.5),
    ("Modern Times", 1936, 3082, "tt0027977", 8.5),
    ("Once Upon a Time in the West", 1968, 185, "tt0064116", 8.5),
    ("Rear Window", 1954, 567, "tt0047396", 8.5),
    ("Cinema Paradiso", 1988, 11216, "tt0095765", 8.5),
    ("Alien", 1979, 348, "tt0078748", 8.5),
    ("City Lights", 1931, 901, "tt0021749", 8.5),
    ("Apocalypse Now", 1979, 28, "tt0078788", 8.4),
    ("Memento", 2000, 77, "tt0209144", 8.4),
    ("Django Unchained", 2012, 68718, "tt1853728", 8.5),
    ("Raiders of the Lost Ark", 1981, 85, "tt0082971", 8.4),
    ("WALL-E", 2008, 10681, "tt0910970", 8.4),
    ("The Lives of Others", 2006, 582, "tt0405094", 8.4),
    ("Sunset Boulevard", 1950, 938, "tt0043014", 8.4),
    ("Paths of Glory", 1957, 975, "tt0050825", 8.4),
    ("The Shining", 1980, 694, "tt0081505", 8.4),
    ("The Great Dictator", 1940, 914, "tt0032553", 8.4),
    ("Avengers: Infinity War", 2018, 299536, "tt4154756", 8.4),
    ("Witness for the Prosecution", 1957, 37257, "tt0051201", 8.4),
    ("Aliens", 1986, 679, "tt0090605", 8.4),
    ("Spider-Man: Into the Spider-Verse", 2018, 324857, "tt4633694", 8.4),
    ("American Beauty", 1999, 14, "tt0169547", 8.3),
    ("Dr. Strangelove", 1964, 935, "tt0057012", 8.4),
    ("The Dark Knight Rises", 2012, 49026, "tt1345836", 8.4),
    ("Oldboy", 2003, 670, "tt0364569", 8.4),
    ("Inglourious Basterds", 2009, 16869, "tt0361748", 8.4),
    ("Amadeus", 1984, 768, "tt0086879", 8.4),
    ("Coco", 2017, 354912, "tt2380307", 8.4),
    ("Toy Story", 1995, 862, "tt0114709", 8.3),
    ("Braveheart", 1995, 197, "tt0112573", 8.3),
    ("Das Boot", 1981, 387, "tt0082096", 8.4),
    ("Avengers: Endgame", 2019, 299534, "tt4154796", 8.4),
    ("Princess Mononoke", 1997, 128, "tt0119698", 8.4),
    ("Once Upon a Time in America", 1984, 311, "tt0087843", 8.3),
    ("Good Will Hunting", 1997, 489, "tt0119217", 8.3),
    ("Your Name.", 2016, 372058, "tt5311514", 8.4),
    ("Requiem for a Dream", 2000, 641, "tt0180093", 8.3),
    ("3 Idiots", 2009, 20453, "tt1187043", 8.4),
    ("Singin' in the Rain", 1952, 872, "tt0045152", 8.3),
    ("Star Wars: Episode VI - Return of the Jedi", 1983, 1892, "tt0086190", 8.3),
    ("Reservoir Dogs", 1992, 500, "tt0105236", 8.3),
    ("Eternal Sunshine of the Spotless Mind", 2004, 38, "tt0338013", 8.3),
    ("2001: A Space Odyssey", 1968, 62, "tt0062622", 8.3),
    ("Citizen Kane", 1941, 15, "tt0033467", 8.3),
    ("Lawrence of Arabia", 1962, 947, "tt0056172", 8.3),
    ("Vertigo", 1958, 426, "tt0052357", 8.3),
    ("North by Northwest", 1959, 213, "tt0053125", 8.3),
    ("M", 1931, 832, "tt0022100", 8.3),
    ("The Hunt", 2012, 103663, "tt2106476", 8.3),
    ("Amélie", 2001, 194, "tt0211915", 8.3),
    ("A Clockwork Orange", 1971, 185, "tt0066921", 8.3),
    ("Full Metal Jacket", 1987, 600, "tt0093058", 8.3),
    ("Double Indemnity", 1944, 996, "tt0036775", 8.3),
    ("Scarface", 1983, 111, "tt0086250", 8.3),
    ("The Apartment", 1960, 284, "tt0053604", 8.3),
    ("Taxi Driver", 1976, 103, "tt0075314", 8.2)
]

# 2. CANONICAL TOP 100 TV SERIES ON IMDB (Title, Year, TMDB ID, IMDb ID, Rating)
TOP_100_TV = [
    ("Breaking Bad", 2008, 1396, "tt0903747", 9.5),
    ("Planet Earth II", 2016, 68507, "tt5491994", 9.5),
    ("Planet Earth", 2006, 1024, "tt0795176", 9.4),
    ("Band of Brothers", 2001, 4613, "tt0185906", 9.4),
    ("Chernobyl", 2019, 87108, "tt8143418", 9.3),
    ("The Wire", 2002, 1438, "tt0306414", 9.3),
    ("Blue Planet II", 2017, 74313, "tt6769208", 9.3),
    ("Avatar: The Last Airbender", 2005, 387, "tt0417299", 9.3),
    ("The Sopranos", 1999, 1398, "tt0141842", 9.2),
    ("Cosmos: A Spacetime Odyssey", 2014, 58474, "tt2395695", 9.3),
    ("Cosmos: A Personal Voyage", 1980, 2012, "tt0081846", 9.3),
    ("Our Planet", 2019, 83880, "tt9253866", 9.3),
    ("Game of Thrones", 2011, 1399, "tt0944947", 9.2),
    ("Rick and Morty", 2013, 60625, "tt2861424", 9.1),
    ("Fullmetal Alchemist: Brotherhood", 2009, 31911, "tt1394142", 9.1),
    ("The Twilight Zone", 1959, 4653, "tt0052520", 9.1),
    ("Sherlock", 2010, 19885, "tt1475582", 9.1),
    ("The Vietnam War", 2017, 73362, "tt1877514", 9.1),
    ("Batman: The Animated Series", 1992, 2098, "tt0103359", 9.0),
    ("Arcane", 2021, 94605, "tt11126994", 9.0),
    ("Attack on Titan", 2013, 1429, "tt2560140", 9.0),
    ("The Blue Planet", 2001, 337, "tt0296310", 9.0),
    ("The Beatles: Get Back", 2021, 135897, "tt9735318", 9.0),
    ("The Office (US)", 2005, 2316, "tt0386676", 9.0),
    ("Better Call Saul", 2015, 60059, "tt3032476", 9.0),
    ("Firefly", 2002, 1437, "tt0303461", 9.0),
    ("Death Note", 2006, 13916, "tt0877057", 9.0),
    ("Human Planet", 2011, 35624, "tt1806234", 9.0),
    ("Hunter x Hunter", 2011, 46298, "tt2098220", 9.0),
    ("Clarkson's Farm", 2021, 126847, "tt10541088", 9.0),
    ("Frozen Planet", 2011, 39522, "tt2092588", 9.0),
    ("Fargo", 2014, 57243, "tt2802850", 8.9),
    ("True Detective", 2014, 46648, "tt2356777", 8.9),
    ("Succession", 2018, 76331, "tt7660850", 8.9),
    ("Seinfeld", 1989, 1908, "tt0098904", 8.9),
    ("Dekalog", 1989, 5979, "tt0092337", 8.9),
    ("The Last Dance", 2020, 101269, "tt8420184", 9.1),
    ("Cowboy Bebop", 1998, 30991, "tt0213338", 8.9),
    ("Nathan for You", 2013, 59654, "tt2297757", 8.9),
    ("When They See Us", 2019, 82455, "tt7137906", 8.9),
    ("Gravity Falls", 2012, 40075, "tt1865718", 8.9),
    ("Friends", 1994, 1668, "tt0108778", 8.9),
    ("Ted Lasso", 2020, 97546, "tt10986410", 8.8),
    ("Peaky Blinders", 2013, 60574, "tt2442560", 8.8),
    ("Steins;Gate", 2011, 44006, "tt1910272", 8.8),
    ("Vinland Saga", 2019, 86423, "tt10233444", 8.8),
    ("One Punch Man", 2015, 63926, "tt4508902", 8.8),
    ("Narcos", 2015, 63351, "tt2707408", 8.8),
    ("Twin Peaks", 1990, 1920, "tt0098936", 8.8),
    ("Black Mirror", 2011, 42009, "tt2085059", 8.7),
    ("Fleabag", 2016, 67070, "tt5687612", 8.7),
    ("Dark", 2017, 70523, "tt5753856", 8.7),
    ("House M.D.", 2004, 1408, "tt0412142", 8.7),
    ("Severance", 2022, 95557, "tt11280740", 8.7),
    ("The Boys", 2019, 76479, "tt1190634", 8.7),
    ("Invincible", 2021, 95557, "tt6741278", 8.7),
    ("Mad Men", 2007, 4614, "tt0804503", 8.7),
    ("The Crown", 2016, 65494, "tt4786824", 8.6),
    ("South Park", 1997, 2190, "tt0121955", 8.7),
    ("Parks and Recreation", 2009, 8592, "tt1266020", 8.6),
    ("The Mandalorian", 2019, 82856, "tt8111088", 8.6),
    ("Stranger Things", 2016, 66732, "tt4574334", 8.7),
    ("Downton Abbey", 2010, 42008, "tt1606375", 8.7),
    ("Mindhunter", 2017, 67744, "tt5290382", 8.6),
    ("Arrested Development", 2003, 4589, "tt0367279", 8.7),
    ("Six Feet Under", 2001, 1423, "tt0248654", 8.7),
    ("The Queen's Gambit", 2020, 87739, "tt9831936", 8.5),
    ("Mr. Robot", 2015, 62560, "tt4158110", 8.5),
    ("Silicon Valley", 2014, 60573, "tt2575988", 8.5),
    ("Line of Duty", 2012, 43901, "tt2303687", 8.7),
    ("Deadwood", 2004, 2195, "tt0357590", 8.6),
    ("Justified", 2010, 22530, "tt1489428", 8.6),
    ("Battlestar Galactica", 2004, 1972, "tt0407362", 8.7),
    ("Rome", 2005, 1877, "tt0384766", 8.7),
    ("The Shield", 2002, 1414, "tt0286486", 8.7),
    ("Oz", 1997, 433, "tt0118421", 8.7),
    ("Peep Show", 2003, 1998, "tt0387764", 8.7),
    ("The Thick of It", 2005, 2038, "tt0459159", 8.7),
    ("Gomorrah", 2014, 59570, "tt2049116", 8.7),
    ("Monster", 2004, 1930, "tt0434706", 8.7),
    ("Blackadder Goes Forth", 1989, 735, "tt0096548", 8.8),
    ("Freaks and Geeks", 1999, 2197, "tt0193676", 8.8),
    ("Boardwalk Empire", 2010, 1104, "tt0979432", 8.6),
    ("Shōgun", 2024, 126308, "tt2788316", 8.7),
    ("The Grand Tour", 2016, 67535, "tt5712554", 8.7),
    ("Spartacus", 2010, 46261, "tt1442449", 8.5),
    ("Sons of Anarchy", 2008, 1409, "tt1124373", 8.6),
    ("Vikings", 2013, 44217, "tt2306299", 8.5),
    ("House of the Dragon", 2022, 94997, "tt11198330", 8.4),
    ("The Penguin", 2024, 194764, "tt15474916", 8.8),
    ("The Bear", 2022, 136283, "tt14452792", 8.6),
    ("Yellowstone", 2018, 73586, "tt4236770", 8.7),
    ("Person of Interest", 2011, 1411, "tt1839578", 8.5),
    ("White Lotus", 2021, 111803, "tt13406094", 8.0),
    ("Dexter", 2006, 1405, "tt0773262", 8.7),
    ("Daredevil", 2015, 61889, "tt3322312", 8.6),
    ("Loki", 2021, 84958, "tt9140554", 8.2),
    ("Hannibal", 2013, 40008, "tt2243973", 8.5),
    ("Lost", 2004, 4607, "tt0411008", 8.3),
    ("Doctor Who", 2005, 57243, "tt0436992", 8.6)
]

# 3. VISIONARY DIRECTORS
VISIONARY_DIRECTORS = [
    {
        "slug": "director-david-fincher",
        "id": 7467,
        "name": "David Fincher",
        "description": "Master of psychological thrillers, meticulous visual symmetry, and dark existential investigations.",
        "badge": "VISIONARY DIRECTOR",
        "avatar": "https://image.tmdb.org/t/p/w500/tpEczFclQZeKA7zgJcuT04Rnzbv.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/hZkgoQYus5vegHoetLkCJzb17zJ.jpg"
    },
    {
        "slug": "director-christopher-nolan",
        "id": 525,
        "name": "Christopher Nolan",
        "description": "Architect of monumental IMAX cinema, non-linear temporality, and profound philosophical puzzles.",
        "badge": "VISIONARY DIRECTOR",
        "avatar": "https://image.tmdb.org/t/p/w500/xuAIuYSmsUzKlUMBFGVZaWsY3Z5.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/rAiYTsqJiOEZg0nJApjYq9WpA2f.jpg"
    },
    {
        "slug": "director-zack-snyder",
        "id": 15217,
        "name": "Zack Snyder",
        "description": "Pioneering visual stylist known for mythic superhero epics, kinetic action, and striking painterly compositions.",
        "badge": "VISIONARY DIRECTOR",
        "avatar": "https://image.tmdb.org/t/p/w500/pAtd5eU12g6sMvd76x1sH2x7Z3k.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/8Y43POKjjKDGI9MH89NW0NAzzp8.jpg"
    },
    {
        "slug": "director-quentin-tarantino",
        "id": 138,
        "name": "Quentin Tarantino",
        "description": "Iconic auteur celebrated for razor-sharp dialogue, non-linear narrative, and stylized homage cinema.",
        "badge": "VISIONARY DIRECTOR",
        "avatar": "https://image.tmdb.org/t/p/w500/1gjcvAEbZhZe55sqgEQ41y7z474.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg"
    },
    {
        "slug": "director-martin-scorsese",
        "id": 1032,
        "name": "Martin Scorsese",
        "description": "Legendary chronicler of American crime, morality, ambition, and the human condition.",
        "badge": "VISIONARY DIRECTOR",
        "avatar": "https://image.tmdb.org/t/p/w500/9U9Y5GQuWX3Ebg39JdkRM59V6Mb.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/mSDsSDwaP3E7dEfUPWy4J0djt4O.jpg"
    },
    {
        "slug": "director-steven-spielberg",
        "id": 488,
        "name": "Steven Spielberg",
        "description": "The definitive master of modern cinema, blending wonder, human empathy, and groundbreaking spectacle.",
        "badge": "VISIONARY DIRECTOR",
        "avatar": "https://image.tmdb.org/t/p/w500/tZxcg19YQ3e8fJ0pOs7SfOhVU06.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/lXhgCODAbBXL5buk9yEmTBPBaFc.jpg"
    },
    {
        "slug": "director-denis-villeneuve",
        "id": 137427,
        "name": "Denis Villeneuve",
        "description": "Visionary sci-fi and drama director known for breathtaking scale, atmospheric tension, and philosophical depth.",
        "badge": "VISIONARY DIRECTOR",
        "avatar": "https://image.tmdb.org/t/p/w500/zdqwN83b0F2pXg3eP3x9XjL4m6T.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/x2RS3uT099v46yDq2oc8w6n9quw.jpg"
    },
    {
        "slug": "director-ridley-scott",
        "id": 578,
        "name": "Ridley Scott",
        "description": "Master of immersive sci-fi and historical epics, creating rich, tactile cinematic worlds.",
        "badge": "VISIONARY DIRECTOR",
        "avatar": "https://image.tmdb.org/t/p/w500/kSOmD4i4jY81kO7m0p8zK1i8L7p.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/bOGkgRGdhrBYZdCekJ32s1sy5uF.jpg"
    },
    {
        "slug": "director-james-cameron",
        "id": 2710,
        "name": "James Cameron",
        "description": "Pioneering cinematic visionary who redefined science fiction, action filmmaking, and immersive technology.",
        "badge": "VISIONARY DIRECTOR",
        "avatar": "https://image.tmdb.org/t/p/w500/9NApHT1b2UmIR5uqve5xTqlBke.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg"
    },
    {
        "slug": "director-stanley-kubrick",
        "id": 240,
        "name": "Stanley Kubrick",
        "description": "One of cinema's greatest masterminds, revered for technical perfection, symmetry, and existential inquiries.",
        "badge": "VISIONARY DIRECTOR",
        "avatar": "https://image.tmdb.org/t/p/w500/w7kP8B7c2d1s0t4t7m3k1L6i8X7.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/sAtoMqDVhNDQBc4QJL3wFlkJL0D.jpg"
    },
    {
        "slug": "director-hayao-miyazaki",
        "id": 608,
        "name": "Hayao Miyazaki",
        "description": "Legendary Studio Ghibli animator and storyteller, weaving enchanting fantasies with deep environmental themes.",
        "badge": "VISIONARY DIRECTOR",
        "avatar": "https://image.tmdb.org/t/p/w500/7a9Mv3A3z0d9z9Z6M6z8k5K2k0.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/Ab8mkHmkYADjU7wQiOkia99G9pF.jpg"
    },
    {
        "slug": "director-guillermo-del-toro",
        "id": 10828,
        "name": "Guillermo del Toro",
        "description": "Poet of dark fantasy and monster cinema, combining Gothic horror with fairy tale beauty.",
        "badge": "VISIONARY DIRECTOR",
        "avatar": "https://image.tmdb.org/t/p/w500/1X670P0r8L6u9Y6M6z8k5K2k0.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/w79Lw7Q2x2tK8r7z1p4p5x6y7z8.jpg"
    },
    {
        "slug": "director-wes-anderson",
        "id": 5655,
        "name": "Wes Anderson",
        "description": "Unique cinematic stylist famous for pastel palettes, symmetrical framing, and quirky melancholic ensembles.",
        "badge": "VISIONARY DIRECTOR",
        "avatar": "https://image.tmdb.org/t/p/w500/7n4x7Z6k5k4k2k0m3k1L6i8X7.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/bOGkgRGdhrBYZdCekJ32s1sy5uF.jpg"
    },
    {
        "slug": "director-bong-joon-ho",
        "id": 21684,
        "name": "Bong Joon-ho",
        "description": "Academy Award-winning Korean auteur known for blending dark satire, genre subversion, and social commentary.",
        "badge": "VISIONARY DIRECTOR",
        "avatar": "https://image.tmdb.org/t/p/w500/7a9Mv3A3z0d9z9Z6M6z8k5K2k0.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/Hi8H4n4Z7g8m3k1L6i8X7.jpg"
    },
    {
        "slug": "director-alfred-hitchcock",
        "id": 2636,
        "name": "Alfred Hitchcock",
        "description": "The definitive Master of Suspense, pioneering cinematic voyeurism, psychological tension, and twist endings.",
        "badge": "VISIONARY DIRECTOR",
        "avatar": "https://image.tmdb.org/t/p/w500/7a9Mv3A3z0d9z9Z6M6z8k5K2k0.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/sAtoMqDVhNDQBc4QJL3wFlkJL0D.jpg"
    },
    {
        "slug": "director-coen-brothers",
        "id": 1223,
        "name": "Joel & Ethan Coen",
        "description": "Uncompromising storytellers blending dark comedy, neo-noir realism, and philosophical irony.",
        "badge": "VISIONARY DIRECTORS",
        "avatar": "https://image.tmdb.org/t/p/w500/7a9Mv3A3z0d9z9Z6M6z8k5K2k0.jpg",
        "backdrop": "https://image.tmdb.org/t/p/w1280/sAtoMqDVhNDQBc4QJL3wFlkJL0D.jpg"
    }
]

def build_movie_item(t):
    title, year, tmdb_id, imdb_id, rating = t
    res = fetch_tmdb(f"movie/{tmdb_id}")
    if res:
        poster = f"https://image.tmdb.org/t/p/w500{res.get('poster_path')}" if res.get('poster_path') else None
        backdrop = f"https://image.tmdb.org/t/p/w1280{res.get('backdrop_path')}" if res.get('backdrop_path') else None
        overview = res.get('overview') or ""
        vote_avg = round(res.get('vote_average') or rating, 1)
        r_year = int((res.get('release_date') or str(year))[:4]) if (res.get('release_date') or year) else year
    else:
        poster = None
        backdrop = None
        overview = f"{title} ({year}) - Ranked among the greatest films in cinematic history."
        vote_avg = rating
        r_year = year

    return {
        "id": str(tmdb_id),
        "tmdbId": tmdb_id,
        "imdbId": imdb_id,
        "title": title,
        "year": r_year,
        "type": "movie",
        "poster": poster,
        "backdrop": backdrop,
        "rating": vote_avg,
        "imdbRating": rating,
        "overview": overview,
        "slug": f"{slugify(title)}-{tmdb_id}",
        "has_playback": True
    }

def build_tv_item(t):
    title, year, tmdb_id, imdb_id, rating = t
    res = fetch_tmdb(f"tv/{tmdb_id}")
    if res:
        poster = f"https://image.tmdb.org/t/p/w500{res.get('poster_path')}" if res.get('poster_path') else None
        backdrop = f"https://image.tmdb.org/t/p/w1280{res.get('backdrop_path')}" if res.get('backdrop_path') else None
        overview = res.get('overview') or ""
        vote_avg = round(res.get('vote_average') or rating, 1)
        r_year = int((res.get('first_air_date') or str(year))[:4]) if (res.get('first_air_date') or year) else year
    else:
        poster = None
        backdrop = None
        overview = f"{title} ({year}) - Acclaimed masterpiece of television storytelling."
        vote_avg = rating
        r_year = year

    return {
        "id": str(tmdb_id),
        "tmdbId": tmdb_id,
        "imdbId": imdb_id,
        "title": title,
        "year": r_year,
        "type": "tv",
        "poster": poster,
        "backdrop": backdrop,
        "rating": vote_avg,
        "imdbRating": rating,
        "overview": overview,
        "slug": f"{slugify(title)}-{tmdb_id}",
        "has_playback": True
    }

def main():
    export_dir = Path(r"G:\streaming app\scraper\worker_export\collections")
    export_dir.mkdir(parents=True, exist_ok=True)

    print("=== SEEDING IMDB TOP 100 MOVIES ===")
    top_movies_items = []
    for idx, m in enumerate(TOP_100_MOVIES):
        item = build_movie_item(m)
        top_movies_items.append(item)
        if (idx + 1) % 20 == 0:
            print(f"  Processed {idx + 1}/{len(TOP_100_MOVIES)} movies...")

    movie_col_data = {
        "collection": {
            "slug": "imdb-top-100-movies",
            "name": "IMDb Top 100 Movies",
            "title": "IMDb Top 100 Movies of All Time",
            "description": "The 100 highest-rated films in cinematic history according to millions of IMDb movie lovers worldwide.",
            "kind": "editorial",
            "badge": "IMDb TOP 100",
            "cover_image": top_movies_items[0].get("backdrop") or top_movies_items[0].get("poster"),
            "backdrop": top_movies_items[0].get("backdrop"),
            "poster": top_movies_items[0].get("poster"),
            "count": len(top_movies_items),
            "title_count": len(top_movies_items)
        },
        "items": top_movies_items
    }
    with open(export_dir / "imdb-top-100-movies.json", "w", encoding="utf-8") as f:
        json.dump(movie_col_data, f, indent=2)
    print(f"Saved imdb-top-100-movies.json with {len(top_movies_items)} titles.")

    print("\n=== SEEDING IMDB TOP 100 TV SERIES ===")
    top_tv_items = []
    for idx, tv in enumerate(TOP_100_TV):
        item = build_tv_item(tv)
        top_tv_items.append(item)
        if (idx + 1) % 20 == 0:
            print(f"  Processed {idx + 1}/{len(TOP_100_TV)} TV series...")

    tv_col_data = {
        "collection": {
            "slug": "imdb-top-100-tv",
            "name": "IMDb Top 100 TV Series",
            "title": "IMDb Top 100 TV Series of All Time",
            "description": "The 100 most celebrated and highest-rated television series and miniseries of all time.",
            "kind": "editorial",
            "badge": "IMDb TOP 100",
            "cover_image": top_tv_items[0].get("backdrop") or top_tv_items[0].get("poster"),
            "backdrop": top_tv_items[0].get("backdrop"),
            "poster": top_tv_items[0].get("poster"),
            "count": len(top_tv_items),
            "title_count": len(top_tv_items)
        },
        "items": top_tv_items
    }
    with open(export_dir / "imdb-top-100-tv.json", "w", encoding="utf-8") as f:
        json.dump(tv_col_data, f, indent=2)
    print(f"Saved imdb-top-100-tv.json with {len(top_tv_items)} titles.")

    # COMBINED IMDB TOP RATED
    combined_imdb = {
        "collection": {
            "slug": "imdb-top-rated",
            "name": "IMDb Top 200 Hall of Fame",
            "title": "IMDb Top 200 Movies & TV Series",
            "description": "The definitive canon of highest-rated cinematic masterpieces and legendary television dramas.",
            "kind": "editorial",
            "badge": "IMDb HALL OF FAME",
            "cover_image": top_movies_items[0].get("backdrop"),
            "count": len(top_movies_items) + len(top_tv_items),
            "title_count": len(top_movies_items) + len(top_tv_items)
        },
        "items": top_movies_items + top_tv_items
    }
    with open(export_dir / "imdb-top-rated.json", "w", encoding="utf-8") as f:
        json.dump(combined_imdb, f, indent=2)

    print("\n=== SEEDING VISIONARY DIRECTORS COLLECTIONS ===")
    director_cols_for_index = []
    for d in VISIONARY_DIRECTORS:
        slug = d["slug"]
        pid = d["id"]
        name = d["name"]
        print(f"Fetching filmography for {name} (TMDB: {pid})...")
        res = fetch_tmdb(f"person/{pid}/combined_credits")
        d_items = []
        if res:
            crew = res.get("crew", [])
            directed = [c for c in crew if c.get("department") == "Directing" or c.get("job") == "Director"]
            # deduplicate
            seen = set()
            for c in directed:
                cid = c.get("id")
                if not cid or cid in seen:
                    continue
                seen.add(cid)
                media_type = c.get("media_type") or "movie"
                title = c.get("title") or c.get("name")
                if not title:
                    continue
                date_str = c.get("release_date") or c.get("first_air_date") or ""
                year = int(date_str[:4]) if date_str and len(date_str) >= 4 and date_str[:4].isdigit() else None
                poster = f"https://image.tmdb.org/t/p/w500{c.get('poster_path')}" if c.get('poster_path') else None
                backdrop = f"https://image.tmdb.org/t/p/w1280{c.get('backdrop_path')}" if c.get('backdrop_path') else None
                
                d_items.append({
                    "id": str(cid),
                    "tmdbId": cid,
                    "title": title,
                    "year": year,
                    "type": media_type,
                    "poster": poster,
                    "backdrop": backdrop,
                    "rating": round(c.get("vote_average", 0), 1),
                    "overview": c.get("overview", ""),
                    "slug": f"{slugify(title)}-{cid}",
                    "popularity": c.get("popularity", 0),
                    "vote_count": c.get("vote_count", 0),
                    "has_playback": True
                })

            # Sort by vote count / popularity
            d_items.sort(key=lambda x: (x.get("vote_count", 0) > 100, x.get("popularity", 0)), reverse=True)

        cover_img = d.get("backdrop") or (d_items[0].get("backdrop") if d_items else None) or d.get("avatar")
        col_json = {
            "collection": {
                "slug": slug,
                "name": f"{name} Filmography",
                "title": f"The Films & Series of {name}",
                "description": d["description"],
                "kind": "director",
                "badge": d["badge"],
                "cover_image": cover_img,
                "backdrop": cover_img,
                "poster": d.get("avatar") or (d_items[0].get("poster") if d_items else None),
                "count": len(d_items),
                "title_count": len(d_items)
            },
            "items": d_items
        }
        with open(export_dir / f"{slug}.json", "w", encoding="utf-8") as f:
            json.dump(col_json, f, indent=2)
        print(f"  Saved {slug}.json with {len(d_items)} titles.")

        director_cols_for_index.append(col_json["collection"])

    print("\n=== UPDATING COLLECTIONS.JSON INDEX ===")
    index_path = Path(r"G:\streaming app\scraper\worker_export\collections.json")
    with open(index_path, "r", encoding="utf-8") as f:
        existing_cols = json.load(f)

    # Remove old versions of these slugs
    new_slugs = {"imdb-top-100-movies", "imdb-top-100-tv", "imdb-top-rated"} | {d["slug"] for d in VISIONARY_DIRECTORS}
    filtered_cols = [c for c in existing_cols if c.get("slug") not in new_slugs]

    # Prepend IMDb Top 100 collections and Director collections
    all_new_cols = [
        movie_col_data["collection"],
        tv_col_data["collection"],
        combined_imdb["collection"]
    ] + director_cols_for_index

    updated_cols = all_new_cols + filtered_cols
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(updated_cols, f, indent=2)
    print(f"Updated collections.json with {len(updated_cols)} total collections.")

    print("\n=== UPLOADING NEW COLLECTIONS TO CLOUDFLARE R2 ===")
    BUCKET = "streamapp-catalog"
    files_to_upload = [
        "collections.json",
        "collections/imdb-top-100-movies.json",
        "collections/imdb-top-100-tv.json",
        "collections/imdb-top-rated.json"
    ] + [f"collections/{d['slug']}.json" for d in VISIONARY_DIRECTORS]

    SRC = Path(r"G:\streaming app\scraper\worker_export")
    success_count = 0
    for rel in files_to_upload:
        file_path = SRC / rel
        if not file_path.exists():
            print(f"  Missing file: {rel}")
            continue
        key = f"{BUCKET}/{rel.replace(os.sep, '/')}"
        cmd = [
            "npx", "wrangler", "r2", "object", "put", key,
            "--file", str(file_path),
            "--content-type", "application/json",
            "--remote", "-y"
        ]
        res = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            cwd=r"G:\streaming app\downloads\streamapp-worker",
            timeout=60
        )
        if res.returncode == 0:
            print(f"  [OK] Uploaded: {rel}")
            success_count += 1
        else:
            err = (res.stderr or res.stdout or "").strip()[:80]
            print(f"  [FAIL] {rel}: {err}")

    print(f"\nR2 Upload complete: {success_count}/{len(files_to_upload)} files uploaded successfully.")

if __name__ == "__main__":
    main()
