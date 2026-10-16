====================================================================
PROJECT: GLOBAL STREAMING CATALOG — MICRO-LEVEL DATA, COVER, LINK,
PLAYBACK, SEARCH, VARIETY & DISCOVERY REBUILD
====================================================================

TARGET APPLICATION:
https://ls7m73ztxvfc2.space.minimax.io/

PRIMARY GOAL:

Rebuild the application's catalog and discovery system so that every
movie, TV show, anime title, short drama, season and episode has correct
identity, correct artwork, correct metadata, correct URL relationships,
correct categories and truthful playback availability.

The final product should combine:

1. The catalog variety and specialized collections seen in modern
   MovieBox-style interfaces.
2. The structured metadata, search, language handling, contextual rows
   and discovery principles used by Netflix.
3. TMDB as the primary canonical metadata/identity layer.
4. Scrapling as the ingestion/crawling framework for permitted public
   sources.
5. Multiple independent reference sources for cross-validation.
6. A completely separate availability/playback layer.
7. Automated data-quality verification before anything reaches users.

DO NOT simply copy MovieBox or Netflix.

Build a better system.

====================================================================
0. MOST IMPORTANT RULE
====================================================================

THE DATABASE MUST NEVER TREAT A SOURCE LISTING AS THE CONTENT IDENTITY.

A scraped page is a SOURCE RECORD.

TMDB/other authoritative metadata identifies the CONTENT ENTITY.

Playback information identifies an AVAILABILITY RECORD.

These three things must remain separate.

Correct architecture:

CONTENT ENTITY
    ↓
CANONICAL METADATA
    ↓
SOURCE RECORDS
    ↓
AVAILABILITY RECORDS
    ↓
PLAYER

Never:

SOURCE PAGE
    ↓
movie
    ↓
poster
    ↓
play link

That architecture is the root cause of title/cover/link mismatches.

====================================================================
1. FIRST ACTION — COMPLETE APPLICATION AUDIT
====================================================================

Before changing the application:

Inspect the actual deployed application.

Inspect the complete source code available to the development environment.

Inspect:

frontend
backend
API routes
database
catalog
scrapers
TMDB integration
player
routing
search
country pages
genre pages
language pages
detail pages
TV pages
episode pages
watchlist
history
continue watching
loading states
error states
mobile
desktop
images
links
source handling

Create an internal audit.

For every existing feature classify:

WORKING
PARTIALLY WORKING
BROKEN
MISSING
WRONG DATA
WRONG UI
WRONG LINK
WRONG METADATA
WRONG IMAGE
DUPLICATE
UNVERIFIED

Do not begin a visual redesign until this audit is complete.

====================================================================
2. IDENTIFY THE CURRENT CATALOG DATA PROBLEM
====================================================================

Specifically investigate these defects:

TITLE ≠ POSTER
TITLE ≠ DESCRIPTION
TITLE ≠ YEAR
TITLE ≠ TMDB ID
TITLE ≠ SOURCE URL
TITLE ≠ PLAYBACK
TITLE ≠ GENRE
TITLE ≠ COUNTRY
TITLE ≠ LANGUAGE
TITLE ≠ SEASON
TITLE ≠ EPISODE

A record must not be displayed to users until identity integrity passes.

====================================================================
3. CANONICAL CONTENT IDENTITY
====================================================================

Every content entity must have a canonical internal ID.

Example:

content_id:
movie_tmdb_12345

OR

tv_tmdb_67890

Store:

internalId
tmdbId
imdbId when legitimately available
contentType
canonicalTitle
originalTitle
alternativeTitles
year
releaseDate
runtime
overview
originalLanguage
countries
genres

Do NOT use:

source URL
poster filename
slug
scraped page ID

as the canonical identity.

====================================================================
4. TMDB MUST BECOME THE METADATA AUTHORITY
====================================================================

Use the TMDB API key securely on the server.

Never expose the secret API key in frontend JavaScript.

Use TMDB for:

movie identity
TV identity
alternative titles
original titles
release dates
genres
countries
language
runtime
overview
ratings
cast
crew
seasons
episodes
posters
backdrops
logos
trailers/videos
similar content
related content

Use TMDB IDs to normalize content.

Do not blindly trust the title returned by a scraped website.

====================================================================
5. TITLE MATCHING ENGINE
====================================================================

Build a dedicated matching pipeline.

SCRAPED RECORD
       ↓
clean title
       ↓
normalize title
       ↓
detect language suffix
       ↓
detect quality suffix
       ↓
detect season/episode suffix
       ↓
detect year
       ↓
TMDB search
       ↓
candidate matching
       ↓
confidence score
       ↓
accept / review / reject

Never match using title string alone.

====================================================================
6. TITLE NORMALIZATION
====================================================================

Before matching, normalize:

case
whitespace
punctuation
apostrophes
unicode
hyphens
colon
brackets
parentheses
duplicate spaces

Remove ONLY technical/source annotations such as:

[HD]
[720P]
[1080P]
[2160P]
[4K]
[CAM]
[WEB-DL]
[WEBRip]
[English]
[Hindi]
[Arabic Dub]
[Dubbed]

But NEVER destroy meaningful parts of the actual title.

Example:

"Reacher [Hindi]"
must become:

canonicalTitle = "Reacher"
audioLanguage = "Hindi"

NOT:

canonicalTitle = "Reacher [Hindi]"

====================================================================
7. TRANSLATED / DUBBED TITLES
====================================================================

Never create separate movies merely because the source has:

The Movie [Hindi]
Hindi The Movie
The Movie English
The Movie [Arabic]
The Movie Dubbed

These are language variants of one content entity unless the underlying
metadata proves they are separate productions.

Store:

canonicalTitle
originalTitle
localizedTitles[]
audioLanguages[]
subtitleLanguages[]

One content entity.

Multiple language representations.

====================================================================
8. MATCHING CONFIDENCE
====================================================================

Create a scoring engine.

Possible signals:

TMDB ID exact match
IMDb ID exact match
normalized title similarity
alternative title similarity
year match
content type match
original language match
country match
runtime similarity
cast overlap
director overlap
release date similarity
season number
episode number

Suggested internal scoring:

100 = exact external ID
95+ = extremely strong identity
90+ = safe automatic match
80–89 = strong but check supporting metadata
70–79 = review queue
below 70 = reject unless manually approved

Do not automatically publish low-confidence matches.

The score is internal data-quality logic.
Do not display it to normal users.

====================================================================
9. TITLE + POSTER INTEGRITY
====================================================================

This directly fixes:

"NAME AND COVER DON'T MATCH"

Never use a scraped poster as the canonical poster simply because it is
attached to a scraped title.

After a content entity is matched:

Fetch canonical artwork from the trusted metadata layer.

Store:

posterPath
backdropPath
logoPath

Also store:

artworkSource
artworkLastChecked

Prefer artwork belonging to the canonical content ID.

For every record verify:

poster belongs to same content
backdrop belongs to same content
logo belongs to same content

Do not combine:

Movie A title
Movie B poster
Movie C backdrop

into one record.

====================================================================
10. ARTWORK VALIDATION
====================================================================

For every image:

check HTTP status
check content type
check image dimensions
check file readability
check image URL
check expected aspect ratio
check canonical content ID
check source
check language where relevant

Reject:

broken images
HTML returned as image
zero-byte files
placeholder images
generic posters
wrong title artwork
obviously mismatched artwork

Create an artwork fallback chain:

PRIMARY CANONICAL POSTER
→ ALTERNATIVE CANONICAL POSTER
→ VERIFIED FALLBACK SOURCE
→ PLACEHOLDER

Never silently use a random source poster.

====================================================================
11. DO NOT TRUST SOURCE TITLES
====================================================================

Scraped websites may contain:

misspellings
season names appended incorrectly
duplicate records
language prefixes
quality prefixes
wrong years
wrong artwork
wrong episode numbers
wrong links

Example defects can include:

"MobLand Seaosn2"

instead of a canonical series/season representation.

The source record may retain the original scraped title for auditing,
but the user interface must use the canonical normalized title.

====================================================================
12. TV IDENTITY IS DIFFERENT FROM MOVIE IDENTITY
====================================================================

Separate:

TV SHOW
SEASON
EPISODE

Example:

TV SHOW:
Reacher

SEASON:
Season 4

EPISODE:
Episode 1

Do not create:

Reacher Season 4 Episode 1
as a new movie-like content entity.

Represent:

series_id
season_number
episode_number

Use canonical episode metadata.

====================================================================
13. SEASON MATCHING
====================================================================

Never infer a season purely from text.

Verify against TMDB season data.

Check:

series ID
season number
season name
episode count
air dates
poster
episodes

A source saying:

"Reacher S04"

must resolve to the canonical Reacher TV entity,
then Season 4.

====================================================================
14. EPISODE MATCHING
====================================================================

For every episode verify:

series ID
season
episode number
episode title
air date
overview
runtime
still image

Reject:

Episode 4 pointing to Episode 5 metadata
Episode 2 using Episode 1 artwork
Episode from a different series
duplicate episode numbers

====================================================================
15. SOURCE RECORD SYSTEM
====================================================================

Create:

source_records

Fields:

source_record_id
content_id
source_name
source_url
source_title
source_type
external_source_id
source_poster
source_metadata
first_seen
last_seen
last_verified
status

Possible status:

active
changed
stale
dead
blocked
invalid
removed

A source record must never overwrite canonical metadata.

====================================================================
16. MANY SOURCES
====================================================================

Use many sources as independent references.

Recommended architecture:

TMDB
+
permitted public metadata/catalog sources
+
official network/studio/service pages
+
specialized databases where licensing permits
+
Scrapling-collected public listings where permitted

Each source is an evidence provider.

No single source gets unconditional authority.

====================================================================
17. SOURCE CONSENSUS
====================================================================

For important fields compare multiple sources.

Example:

TITLE:
TMDB = Reacher
Source A = Reacher [Hindi]
Source B = Reacher
Source C = Reacher Season 4

Canonical =
Reacher

LANGUAGE:
Source A = Hindi
TMDB original = English

Canonical:
originalLanguage = English
audioLanguages = Hindi where verified

Do not overwrite the canonical title with the localized source title.

====================================================================
18. SCRAPLING ARCHITECTURE
====================================================================

Use:

D4Vinci/Scrapling

as the collection framework.

Build independent adapters.

Each adapter must return normalized source records.

Example:

SourceAdapter
    discover()
    search()
    browse()
    parse()
    normalize()
    persist()

Do NOT allow site-specific selectors to leak into the canonical database
layer.

Scrapling should collect public/permitted information.
Respect the target site's terms, robots requirements and access controls.
Do not make anti-bot bypassing a prerequisite for your product.

====================================================================
19. SCRAPLING ADAPTIVE PARSING
====================================================================

Where appropriate use Scrapling adaptive parsing so small source layout
changes do not immediately break extraction.

Add:

selector health
field extraction health
source response health
parser version
last successful extraction

If a site's layout changes and confidence drops:

STOP INGESTION
FLAG SOURCE
DO NOT FILL DATABASE WITH BAD DATA

Do not continue scraping garbage simply because the HTTP request returns
200.

====================================================================
20. SOURCE VALIDATION
====================================================================

For every scraped listing check:

title exists
URL exists
URL resolves
content type is known
poster exists
metadata exists
canonical identity resolves

If identity cannot be established:

send to review/rejection

Do not publish the raw record.

====================================================================
21. LINK INTEGRITY — CRITICAL
====================================================================

This directly fixes:

"LINKS DON'T MATCH"

Every source URL must belong to the exact source record.

Never construct a playback URL from a title string.

Never construct a playback URL from an unrelated poster.

Never assume:

TMDB ID = playable source ID

unless the provider explicitly documents that relationship.

====================================================================
22. SEPARATE AVAILABILITY FROM CONTENT
====================================================================

Create:

availability_records

Fields:

availability_id
content_id
source_name
source_record_id
provider
region
language
audioLanguage
subtitleLanguage
availabilityType
url
lastChecked
status
failureReason
expiresAt

Possible states:

available
temporarily_unavailable
upcoming
expired
unknown

This prevents a broken playback source from destroying the content record.

====================================================================
23. PLAY BUTTON RULE
====================================================================

NEVER show PLAY when availability is unknown.

Show:

PLAY

only when there is a verified playable authorized source.

If only metadata exists:

MORE INFO

If the title is upcoming:

COMING SOON

If the source is currently unavailable:

TEMPORARILY UNAVAILABLE

This one rule will dramatically reduce broken-user journeys.

====================================================================
24. PLAYABILITY CHECKING
====================================================================

Do not consider:

HTTP 200

proof that a title can be played.

A page can return 200 while:

video is missing
embed is broken
URL redirects
provider denies playback
manifest is unavailable
region blocks playback
source is expired

For authorized playback sources use provider-specific verification.

Track:

discovery check
availability check
player check
last successful playback verification

====================================================================
25. PLAYBACK FAILURE HANDLING
====================================================================

Player states:

checking
loading
playing
buffering
paused
completed
temporarily unavailable
error

If one authorized source fails:

try another verified authorized source.

Do not show:

"Playback failed"

without trying the available fallback sources.

Do not loop infinitely.

====================================================================
26. DO NOT PROMISE 100% PLAYABILITY
====================================================================

The catalog and playback layers are different.

Display real statistics:

125,430 titles
87,200 with verified playback
38,230 metadata-only

Never say:

125,430 movies available

when only 87,200 have playable availability.

====================================================================
27. TMDB WATCH PROVIDERS
====================================================================

Use TMDB provider/availability data where appropriate for regional
availability information.

Store region-specific provider information.

Do not interpret TMDB watch-provider metadata as a direct stream URL.

Where provider data is used, follow TMDB's current attribution and usage
requirements.

====================================================================
28. REGION-AWARE AVAILABILITY
====================================================================

Availability can differ by country.

Represent:

country
region
provider
availabilityType

Example:

Pakistan
United States
United Kingdom
India
Saudi Arabia
UAE

Do not say globally available when availability is regional.

====================================================================
29. LANGUAGE-AWARE AVAILABILITY
====================================================================

A title can exist while a specific dub does not.

Example:

MOVIE:
Available

English:
Available

Hindi Dub:
Unavailable

Arabic:
Available

Display those distinctions accurately.

====================================================================
30. LANGUAGE MODEL
====================================================================

Use:

originalLanguage
audioLanguages[]
subtitleLanguages[]
localizedTitles[]

Do not place all of this into the title string.

Bad:

Movie Name [Hindi][English][Arabic]

Good:

Movie Name

Original:
English

Audio:
Hindi
English

Subtitles:
Arabic
Urdu

====================================================================
31. CANONICAL TITLE VS DISPLAY TITLE
====================================================================

Store one canonical title.

Allow localized display titles.

Example:

canonicalTitle:
One Piece

originalTitle:
ワンピース

localized:
One Piece

Hindi:
One Piece

Arabic:
ون بيس

The user sees the appropriate display title based on selected language.

====================================================================
32. CONTENT VARIETY
====================================================================

Build first-class sections:

Movies
TV Shows
Anime
Short Dramas
Documentaries
Reality
Animation
Specials
Kids
Concerts
Sports where legitimately available

====================================================================
33. GLOBAL REGIONAL VARIETY
====================================================================

Support:

Hollywood
Bollywood
South Indian
Pakistani
Bangladeshi
Nollywood
Korean
Chinese
Japanese
Thai
Turkish
Arabic
African
European
Latin American
Southeast Asian
International

Do not force a title into one geographic category.

====================================================================
34. GENRES
====================================================================

Use normalized genres:

Action
Adventure
Animation
Comedy
Crime
Documentary
Drama
Family
Fantasy
History
Horror
Music
Musical
Mystery
Reality
Romance
Science Fiction
Sport
Thriller
War
Western
Biography
Short
Talk Show
Game Show

Allow multiple genres.

====================================================================
35. SPECIALIZED COLLECTIONS
====================================================================

Create dynamic collections.

Examples:

Trending Today
Popular This Week
Latest Releases
Newly Added
Top Rated
Most Watched
Coming Soon
Family Night
Weekend Watch
Hidden Gems
Award Winners

Specialized:

K-Drama
C-Drama
J-Drama
Thai Drama
Turkish Drama
Indian Drama
Pakistani Drama
Arabic Drama
Western TV
African Series
Nollywood
Anime
Anime English Dubbed
Adult Animation
Sitcom
Teen Romance
Teen Fantasy
Superhero Series
Gangster
Action & Thriller
Horror
Romance
Epic Fantasy
Black Shows

These collections must be data-driven.

Do not manually duplicate titles.

====================================================================
36. THE HOMEPAGE SHOULD USE CATALOG INTELLIGENCE
====================================================================

The homepage should feel broad without becoming chaotic.

Structure:

Featured
Continue Watching
Trending Today
Latest Movies
Latest TV
Popular Movies
Popular Series
Anime
K-Drama
C-Drama
Indian Cinema
Pakistani TV
Arabic
African
Action
Horror
Romance
Coming Soon

Each section:

lazy loads
has View All
is query-driven
supports horizontal browsing
uses real data
handles empty state

====================================================================
37. DO NOT COPY MOVIEBOX'S DATA ERRORS
====================================================================

The reference sites demonstrate useful catalog breadth, but also show
duplicate entries, spelling errors and language labels mixed into titles.

Your platform must improve on this.

Canonical data must always win over scraped presentation data.

====================================================================
38. NETFLIX-STYLE DISCOVERY PRINCIPLES
====================================================================

Implement discovery using multiple dimensions:

title
genre
country
language
audio
subtitle
year
actors
directors
franchise
content type
recency
popularity
watch behavior

Do not rely only on keyword matching.

====================================================================
39. SEARCH
====================================================================

Search must support:

title
original title
alternative title
translated title
actor
director
genre
country
language
franchise
collection

Use TMDB multi-search for broad discovery where appropriate.

Then perform canonical content matching.

====================================================================
40. SEARCH RESULT ORDER
====================================================================

Search ranking should prioritize:

exact canonical title
exact alternative title
exact original title
exact person match
strong title similarity
content type relevance
language relevance
year relevance

Do not allow an obscure fuzzy match to outrank an exact title.

====================================================================
41. SEARCH EXAMPLES
====================================================================

"Reacher"
→ Reacher TV
→ related movies
→ actors
→ related collections

"Reacher Hindi"
→ Reacher
→ Hindi audio where verified

"Korean romance"
→ Korean + Romance

"2026 Pakistani drama"
→ Pakistan + TV + Drama + 2026

"One Piece English Dub"
→ One Piece + Anime + English audio

====================================================================
42. FILTER SYSTEM
====================================================================

Filters:

Movies
TV
Anime
Short Drama

Country

Genre

Original Language

Audio Language

Subtitle Language

Year

Rating

Runtime

Release Status

Franchise

Collection

Provider/Availability

====================================================================
43. FILTER COMBINATION
====================================================================

Filters must be AND/OR aware.

Example:

Country = Korea
AND
Type = TV
AND
Genre = Romance
AND
Year = 2026

must query the backend directly.

Never download the entire catalog and filter it in the browser.

====================================================================
44. CATALOG SCALE
====================================================================

The target is not "100k records".

The target is:

100k VALID canonical titles

with:

correct identity
correct metadata
correct artwork
correct categorization

A database full of duplicates and mismatches is failure.

====================================================================
45. DEDUPLICATION
====================================================================

Deduplicate primarily by:

TMDB ID

then:

IMDb ID where legitimate and available

then:

strong normalized identity matching

Potential duplicates must enter a merge workflow.

Never deduplicate solely by title.

Different titles can share the same name.

Same title can represent different movies.

====================================================================
46. DUPLICATE EXAMPLES
====================================================================

These must remain separate when they are different content:

The Batman 1966
The Batman 2022

Dune 1984
Dune 2021

Same title:
different country
different year
different media type

must not be merged incorrectly.

====================================================================
47. MERGE SYSTEM
====================================================================

When duplicate candidates are detected:

show:

Record A
Record B
TMDB IDs
Years
Types
Countries
Posters
Cast
Source URLs

Allow automatic merge only at very high confidence.

Otherwise require human/admin review.

====================================================================
48. SOURCE CONFLICTS
====================================================================

If sources disagree:

TMDB:
2026

Source A:
2025

Source B:
2026

Do not randomly choose.

Use authoritative metadata rules.

Store the conflicting values for audit.

Never silently overwrite evidence.

====================================================================
49. FIELD-LEVEL CONFIDENCE
====================================================================

Each important field should have:

value
source
confidence
updatedAt

Example:

releaseDate
2026-09-20
TMDB
high

poster
TMDB poster path
TMDB
high

audioLanguage
Hindi
Source A
medium

This makes debugging possible.

====================================================================
50. DATA LINEAGE
====================================================================

Every public data field must be traceable internally.

Example:

canonical title
← TMDB

poster
← TMDB

Hindi audio
← Source A

availability
← Provider B

Do not create fields whose origin cannot be determined.

====================================================================
51. REFRESH SYSTEM
====================================================================

Use scheduled refreshes.

High-change data:

availability
episodes
coming soon
release status
trending
new releases

Low-change data:

cast
crew
historical metadata

Refresh based on volatility.

Do not scrape everything every few minutes.

====================================================================
52. SOURCE HEALTH
====================================================================

For every source track:

status
last successful sync
last error
records discovered
records accepted
records rejected
duplicates
metadata conflicts
artwork failures
availability failures

If a source suddenly produces bad data:

automatically quarantine it.

====================================================================
53. PARSER REGRESSION
====================================================================

Before deploying a changed source adapter:

run a fixture test.

Keep representative source pages.

Verify:

title extraction
URL extraction
poster extraction
year extraction
type extraction
season extraction
episode extraction
language extraction

Do not deploy a parser change that causes fields to shift.

====================================================================
54. ARTWORK REGRESSION
====================================================================

Sample random records.

Verify:

title
poster
backdrop
year
type

all correspond to the same canonical entity.

Include automated mismatch tests.

====================================================================
55. LINK REGRESSION
====================================================================

Sample random availability records.

Verify:

source URL belongs to expected source
content identity is correct
availability record points to same content
status is current
provider is correct

Do not test only whether the URL returns HTTP 200.

====================================================================
56. DETAIL PAGE
====================================================================

Movie detail page:

Backdrop
Poster
Canonical title
Original title
Alternative titles
Year
Runtime
Certification
Country
Language
Audio languages
Subtitles
Genres
Rating
Overview
Trailer
Cast
Director
Related content
Similar content
Collections
Availability
Watch button
Watchlist

====================================================================
57. TV DETAIL PAGE
====================================================================

TV page:

Backdrop
Poster
Title
Original title
Year
Status
Country
Language
Genres
Rating
Overview
Cast
Trailer

Then:

Season selector

Episodes

Episode thumbnail
Episode title
Episode number
Air date
Description
Runtime
Watch state

====================================================================
58. PLAYER
====================================================================

Player must be availability-driven.

The UI receives:

contentId
season
episode
verifiedAvailability[]

Never receives a random source URL from a scraped card.

Player selection:

1. Choose currently verified available source.
2. Attempt playback.
3. Detect failure.
4. Attempt another verified source.
5. Report result.
6. Record health status.

====================================================================
59. PLAYER LINK CACHE
====================================================================

Do not permanently trust a discovered playback URL.

Use:

discoveredAt
lastChecked
lastPlayedSuccessfully
failureCount
status

Automatically expire stale links.

====================================================================
60. BROKEN-LINK QUARANTINE
====================================================================

If a source repeatedly fails:

mark unavailable

Do not keep showing it.

After refresh:

recheck.

If it works:

reactivate.

====================================================================
61. NO BROKEN PLAY BUTTONS
====================================================================

Normal card:

PLAY

Only when verified.

Otherwise:

DETAILS

or:

COMING SOON

or:

UNAVAILABLE

This is mandatory.

====================================================================
62. CARD DESIGN
====================================================================

Every card should have:

correct poster
canonical title
year
content type
rating
optional verified language badge
optional status badge

Never display technical source text as part of the canonical title.

Examples:

BAD:
Hindi Reacher [Hindi][1080P]

GOOD:
Reacher

Hindi Dub
TV
2022

====================================================================
63. QUALITY BADGES
====================================================================

Quality labels must represent actual known availability.

Allowed:

HD
1080p
4K
HDR

Only display when the underlying source actually verifies the quality.

Do not infer quality from filename alone when reliable verification is
available.

====================================================================
64. COMING SOON
====================================================================

Coming Soon must have:

title
poster
release date
type
country
genre

Move to Released automatically after release.

Never manually leave old titles in Coming Soon.

====================================================================
65. TRENDING
====================================================================

Trending must use real signals.

Possible signals:

views
starts
completion
recent activity
source popularity
regional popularity
time window

Do not call a random collection:

Trending

====================================================================
66. TOP 10 / POPULAR
====================================================================

Regional popularity should be stored with:

country
time window
content type
rank
measurement date

Example:

Pakistan
Movies
Week of YYYY-MM-DD

Do not use a US ranking as a Pakistan ranking.

====================================================================
67. RECOMMENDATIONS
====================================================================

Create:

Because You Watched
More Like This
More in this Genre
More from this Country
More with this Actor
More in this Franchise

Use content relationships.

When user history exists, recommendations may also use:

watch history
completion behavior
language preferences
favorite genres

Do not infer sensitive personal attributes.

====================================================================
68. CONTINUE WATCHING
====================================================================

Store:

contentId
season
episode
position
duration
lastWatched
completionPercentage

Clicking resumes at the correct location.

====================================================================
69. WATCHLIST
====================================================================

Watchlist stores canonical content IDs.

Never store source URLs as the identity.

If a source changes:

the watchlist item remains valid.

====================================================================
70. HISTORY
====================================================================

History stores canonical content IDs.

If poster or metadata changes:

history automatically displays the current canonical record.

It must never create a dead history entry because a source URL expired.

====================================================================
71. CATEGORY ENGINE
====================================================================

Categories must be query definitions.

Example:

K-Drama:

country = KR
AND
type = TV

Action Movies:

type = MOVIE
AND
genre includes ACTION

Anime English Dubbed:

type = ANIME
AND
audioLanguages contains EN

Pakistani Drama:

country = PK
AND
type = TV
AND
genre includes DRAMA

Do not create independent duplicate records for each category.

====================================================================
72. HOMEPAGE SECTIONS MUST BE DATA-DRIVEN
====================================================================

Each section is:

sectionId
title
description
query/filter
sort
limit

Example:

section:
kdrama

query:
country=KR&type=TV

sort:
popularity_desc

limit:
20

This makes the homepage scalable.

====================================================================
73. CONTENT COVERAGE
====================================================================

Measure coverage by:

movies
TV shows
anime
short dramas
countries
languages
genres
years
audio languages
subtitle languages

Do not measure success using one catalog number.

====================================================================
74. VARIETY TARGET
====================================================================

The system must have enough metadata to generate:

Movies
TV
Anime
Short Drama
Action
Comedy
Drama
Romance
Horror
Sci-Fi
Fantasy
Crime
Thriller
Family
Animation
Documentary

and:

Hollywood
Bollywood
South Indian
Pakistani
Nollywood
Korean
Chinese
Japanese
Thai
Turkish
Arabic
African
European
Latin American
International

and:

English
Hindi
Urdu
Arabic
Korean
Chinese
Japanese
Turkish
Thai
Spanish
French
Bengali
Tamil
Telugu
Malayalam
Punjabi
Indonesian
Filipino
etc.

====================================================================
75. SPECIALIZED CONTENT DEPTH
====================================================================

The system must support specialized discovery such as:

K-Drama
C-Drama
J-Drama
Thai Drama
Turkish Drama
Pakistani Drama
Indian Drama
Arabic Drama
Western TV
Nollywood
African Cinema
Anime
Anime Dubbed
Adult Animation
Sitcom
Teen Romance
Teen Fantasy
Superhero
Gangster
Action & Thriller
Epic Fantasy
Horror
Romance
Black Shows
Family
Kids

These are discovery views over the same canonical catalog.

====================================================================
76. SOURCE COVERAGE VS PLAYBACK COVERAGE
====================================================================

Create two statistics.

CATALOG COVERAGE:
How many valid canonical content entities exist?

PLAYBACK COVERAGE:
How many have verified authorized playback?

Example:

150,000 canonical titles
96,000 with verified playback
54,000 metadata-only

Never combine those numbers.

====================================================================
77. MISSING CONTENT SEARCH
====================================================================

When a user searches for a title not currently in the local catalog:

Perform a metadata lookup.

If a canonical title is found:

create/refresh metadata record.

Then independently resolve legitimate availability.

Do not manufacture a playback record simply because TMDB found the title.

====================================================================
78. ON-DEMAND CATALOG ENRICHMENT
====================================================================

Search flow:

user query
↓
local catalog
↓
TMDB search if missing
↓
candidate matching
↓
canonical content
↓
availability lookup
↓
result

This prevents the catalog from becoming dependent only on pre-crawled
titles.

====================================================================
79. TMDB RATE LIMITS
====================================================================

Implement:

request queue
cache
deduped requests
backoff
retry
rate limiting
persistent cache

Never fire redundant TMDB requests for the same content.

====================================================================
80. TMDB CACHE
====================================================================

Cache:

search results
details
images
credits
seasons
episodes
videos
provider availability

Use appropriate TTLs.

Do not call TMDB for every card render.

====================================================================
81. FRONTEND API
====================================================================

Frontend should consume canonical APIs such as:

GET /api/content/{id}

GET /api/movies

GET /api/tv

GET /api/anime

GET /api/search

GET /api/genres

GET /api/countries

GET /api/languages

GET /api/collections

GET /api/content/{id}/availability

GET /api/tv/{id}/seasons

GET /api/tv/{id}/season/{season}/episodes

GET /api/watchlist

GET /api/history

GET /api/continue-watching

Do not make the frontend communicate directly with individual scraper
implementations.

====================================================================
82. SOURCE-AGNOSTIC FRONTEND
====================================================================

The frontend must not care whether a title came from:

TMDB
Scrapling source A
source B
source C
official API
manual metadata

The frontend receives:

canonical content
canonical artwork
verified availability

====================================================================
83. RESPONSIVE UX
====================================================================

Desktop:

sidebar
large hero
dense catalog grid
hover preview
advanced filters

Tablet:

collapsed navigation
adaptive grid

Mobile:

bottom navigation
2-column poster grid
compact filters
touch-friendly cards
full-screen player

====================================================================
84. PERFORMANCE
====================================================================

Never download the whole catalog.

Use:

pagination
cursor pagination
virtualized grids
lazy artwork
image caching
API caching
request cancellation
debounced search
server-side filters

A 100k-title database must still feel fast.

====================================================================
85. IMAGE PERFORMANCE
====================================================================

Serve correctly sized artwork.

Do not load a 2000px poster when a 400px card poster is enough.

Use:

poster-small
poster-medium
poster-large
backdrop

Only load the appropriate size.

====================================================================
86. ADMIN DATA QUALITY SYSTEM
====================================================================

Create internal views for:

Unmatched titles
Low-confidence matches
Duplicate candidates
Wrong artwork
Broken URLs
Missing metadata
Missing identifiers
Conflicting metadata
Stale records
Broken episodes
Broken availability

Provide:

approve
reject
merge
rematch
refresh
quarantine

====================================================================
87. DATA QUALITY SCORE
====================================================================

Internal quality score based on:

identity
metadata completeness
artwork
source validity
availability
episode completeness

Do not show this to normal users.

Use it to prioritize cleanup.

====================================================================
88. AUTOMATED TEST DATA
====================================================================

Maintain a regression set of known titles including:

popular movies
old movies
new movies
TV shows
multi-season TV
anime
short dramas
localized titles
dubbed titles
same-name movies
remakes
regional titles

Every ingestion change must be tested against this set.

====================================================================
89. MICRO E2E TESTS
====================================================================

Test:

Search exact title
Search misspelled title
Search alternative title
Search localized title
Search actor
Open result
Verify title
Verify poster
Verify backdrop
Verify year
Verify type
Verify country
Verify language
Verify genre
Verify detail URL
Verify canonical ID
Verify availability
Open player
Verify source
Verify playback
Return
Add watchlist
Open watchlist
Continue watching
Refresh
Resume

====================================================================
90. TV E2E TEST
====================================================================

Search TV show.

Open show.

Select season.

Select episode.

Verify episode title.

Verify episode image.

Verify episode number.

Verify player.

Play.

Pause.

Resume.

Refresh.

Continue.

Next episode.

Previous episode.

Return to series.

Verify watch position.

====================================================================
91. WRONG COVER TEST
====================================================================

Randomly select 500 records.

For each:

read title
read canonical ID
read poster
read backdrop

Verify all correspond to same content.

Any mismatch:

FAIL BUILD.

====================================================================
92. WRONG NAME TEST
====================================================================

Randomly compare:

source title
canonical title
display title
original title
localized title

Verify transformations.

A language suffix must never become a new movie.

A quality suffix must never become a new movie.

A season suffix must never become a new movie.

====================================================================
93. WRONG LINK TEST
====================================================================

Randomly select 500 availability records.

Verify:

contentId
sourceRecordId
provider
URL
region
status

all belong to the same content.

Do not accept a URL merely because it returns HTTP 200.

====================================================================
94. BROKEN PLAYBACK TEST
====================================================================

Test every currently advertised source.

For each:

available
temporarily unavailable
expired
unknown

must render the correct UI state.

No broken Play button.

====================================================================
95. COVERAGE TEST
====================================================================

Verify catalog variety across:

movies
TV
anime
short drama
country
language
genre
year
audio
subtitles
collections

Report coverage by dimension.

====================================================================
96. SEARCH COMPLETENESS TEST
====================================================================

Test:

exact title
alternate title
original title
actor
director
genre
country
language
dub
subtitle
year

Results must resolve to canonical entities.

====================================================================
97. CACHE TEST
====================================================================

Verify that repeated requests do not repeatedly call:

TMDB
source crawlers
metadata APIs

unless cache expiry requires refresh.

====================================================================
98. SOURCE FAILURE TEST
====================================================================

Disable one source.

The catalog must continue operating.

Disable TMDB temporarily after existing data is cached.

Existing catalog must remain usable.

Disable one availability provider.

Other verified providers must continue working.

====================================================================
99. CATALOG FAILURE RULE
====================================================================

A failed source must NEVER:

delete the canonical title
erase the poster
erase metadata
create duplicates
change title identity
show stale availability as active

====================================================================
100. DATABASE DESIGN
====================================================================

Use a normalized model.

CORE TABLES:

content
content_aliases
genres
content_genres
countries
content_countries
languages
content_languages
audio_languages
subtitle_languages
people
content_people
collections
content_collections
franchises
content_franchises
seasons
episodes
source_records
availability_records
artwork
videos
catalog_events
match_reviews
source_health

====================================================================
101. CANONICAL CONTENT EXAMPLE
====================================================================

content:

id:
tmdb:123

canonicalTitle:
Example Movie

originalTitle:
Original Example

type:
movie

year:
2026

tmdbId:
123

Then:

genres:
Action
Drama

countries:
US

languages:
English

audio:
English
Hindi

sourceRecords:
Source A
Source B
Source C

availability:
Provider A
Provider B

All remain connected to:

tmdb:123

====================================================================
102. TV EXAMPLE
====================================================================

content:

tmdb:456

canonicalTitle:
Example Series

seasons:

Season 1

episodes:

S01E01
S01E02
S01E03

Season 2

S02E01
S02E02

All episodes remain descendants of the same canonical series.

====================================================================
103. COLLECTION EXAMPLE
====================================================================

Example Movie:

Action
Science Fiction
Hollywood
2026
Trending
Weekend Watch
Superhero

Do not create six copies.

Create:

ONE CONTENT ENTITY

with six relationships.

====================================================================
104. CATEGORY GENERATION
====================================================================

Categories must be database queries.

Never manually copy a movie into:

Action
Trending
2026
Hollywood

The content automatically appears anywhere its metadata qualifies it.

====================================================================
105. NAVIGATION
====================================================================

Primary:

Home
Movies
TV Shows
Anime
Short Dramas
Trending
Latest
Coming Soon
Genres
Countries
Languages
Collections
Watchlist
History

Do not make the sidebar hold hundreds of countries.

====================================================================
106. COUNTRY BROWSING
====================================================================

Country page:

Featured
Latest Movies
Popular Movies
TV Shows
Drama
Action
Romance
Anime
Coming Soon

Apply country filter to every section.

====================================================================
107. LANGUAGE BROWSING
====================================================================

Language page:

Movies
TV
Anime
Dubbed
Subtitled
Latest
Popular

Example:

Hindi

Hindi Movies
Hindi TV
Hindi Dubbed
Hindi Subtitles

====================================================================
108. DETAIL PAGE RELATED CONTENT
====================================================================

Every detail page should provide:

More Like This
Same Genre
Same Country
Same Language
Same Actor
Same Director
Same Franchise
Same Collection

All generated from canonical metadata.

====================================================================
109. COLLECTION PAGE
====================================================================

Collection page:

Hero
Description
Title count
Filters
Sort
Grid

Example:

Marvel

Movies
TV
Animation
Latest
Oldest
Top Rated

====================================================================
110. NO RAW SCRAPER DATA IN UI
====================================================================

The UI must never directly display:

raw scraped title
raw scraped year
raw scraped poster
raw scraped genre
raw scraped URL

unless it has passed normalization.

====================================================================
111. SOURCE AUDIT LOG
====================================================================

For every modification record:

field
oldValue
newValue
source
timestamp
reason
system/manual

This makes data debugging possible.

====================================================================
112. AUTO-REPAIR
====================================================================

When a source record is wrong:

do not patch the frontend.

Fix the canonical mapping.

Example:

Wrong title
→ rematch canonical ID
→ refresh metadata
→ refresh artwork
→ update availability

One backend fix should correct every page displaying that content.

====================================================================
113. NEVER PATCH INDIVIDUAL CARDS
====================================================================

Do not hardcode:

if title === "Reacher" use different poster

or:

if slug === "movie123" use another URL

This creates endless technical debt.

Fix the data model.

====================================================================
114. NO HARDCODED 683-TITLE DEPENDENCY
====================================================================

The existing small curated catalog may remain as a safe fallback during
development.

It must not remain the primary source of truth after the new canonical
catalog is operational.

====================================================================
115. NO FAKE CATALOG INFLATION
====================================================================

Do not count:

duplicate source records
metadata-only variants
language variants
episode records
season records

as separate movies.

Maintain separate metrics:

movies
TV shows
anime
short dramas
seasons
episodes
source records
availability records

====================================================================
116. REAL CATALOG COUNTS
====================================================================

Example:

Movies: 62,430
TV Shows: 18,900
Anime: 11,320
Short Dramas: 7,400
Documentaries: 4,100

Total canonical titles:
104,150

Do not add seasons and episodes into total title counts.

====================================================================
117. QUALITY OVER RAW NUMBER
====================================================================

The acceptance criterion is:

VALID UNIQUE CONTENT

not:

RAW SCRAPED RECORDS

If 200k scraped records produce 115k valid canonical titles,
display 115k.

====================================================================
118. SECURITY
====================================================================

TMDB API key:

server-side
environment variable
never bundled in frontend
never committed to Git
never exposed in source maps

Sanitize:

source URLs
search queries
external redirects
HTML
embedded metadata

Prevent:

SSRF
open redirect
malicious iframe injection
URL-based attacks
database injection

====================================================================
119. LEGAL / SOURCE SAFETY
====================================================================

Use Scrapling for permitted public data collection.

Respect:

terms of service
robots requirements
rate limits
access restrictions

Use legitimate/licensed/public-domain/creator-authorized playback
sources.

Do not build the application's core playback system around bypassing
security controls or extracting unauthorized copyrighted streams.

The catalog architecture must continue to work independently of any one
third-party site.

====================================================================
120. FINAL USER EXPERIENCE
====================================================================

The user should be able to:

SEARCH
↓
FIND CORRECT TITLE
↓
SEE CORRECT POSTER
↓
SEE CORRECT METADATA
↓
SEE CORRECT LANGUAGE
↓
SEE CORRECT SEASON/EPISODE
↓
SEE REAL AVAILABILITY
↓
PLAY VERIFIED SOURCE
↓
RESUME LATER
↓
FIND RELATED CONTENT

At no point should the user encounter:

wrong poster
wrong title
wrong year
wrong movie
wrong episode
wrong season
wrong link
dead Play button
fake availability
duplicate title

====================================================================
121. FINAL ACCEPTANCE STANDARD
====================================================================

The system is NOT complete when:

the homepage renders
the cards look good
the scraper runs
TMDB responds
100k rows exist

The system is complete only when:

TITLE MATCHES CONTENT
POSTER MATCHES CONTENT
BACKDROP MATCHES CONTENT
METADATA MATCHES CONTENT
SOURCE URL MATCHES SOURCE RECORD
AVAILABILITY MATCHES CONTENT
SEASON MATCHES SERIES
EPISODE MATCHES SEASON
LANGUAGE MATCHES ACTUAL VARIANT
CATEGORY MATCHES METADATA
SEARCH RESOLVES CANONICAL ENTITY
PLAY BUTTON REPRESENTS VERIFIED AVAILABILITY

====================================================================
122. THREE-LOOP QA FOR EVERY PHASE
====================================================================

LOOP 1:
QA verifies requirements.

LOOP 2:
Debugger investigates and fixes failures.

LOOP 3:
Tester performs complete end-to-end verification.

All findings go to the Project Manager.

Project Manager performs final approval.

Do not allow one agent to perform the entire project as one job.

Use separate roles:

Project Manager
Product Architect
Catalog/Data Architect
TMDB Integration Engineer
Scrapling Ingestion Engineer
Backend Engineer
Frontend Engineer
Playback/Availability Engineer
Data Quality Engineer
UX Engineer
QA Engineer
Debugger
E2E Tester
Performance Engineer
SEO Engineer

====================================================================
123. IMPLEMENTATION PHASES
====================================================================

PHASE 1:
Current application audit.

PHASE 2:
Canonical content database.

PHASE 3:
TMDB integration.

PHASE 4:
Title identity and matching engine.

PHASE 5:
Artwork identity validation.

PHASE 6:
Source-record system.

PHASE 7:
Scrapling source adapters.

PHASE 8:
Source normalization.

PHASE 9:
Deduplication.

PHASE 10:
Movies.

PHASE 11:
TV / Seasons / Episodes.

PHASE 12:
Anime.

PHASE 13:
Short Dramas.

PHASE 14:
Countries.

PHASE 15:
Languages / Dubbing / Subtitles.

PHASE 16:
Genres.

PHASE 17:
Collections / Franchises.

PHASE 18:
Search.

PHASE 19:
Filters.

PHASE 20:
Availability layer.

PHASE 21:
Playback reliability.

PHASE 22:
Watchlist.

PHASE 23:
History.

PHASE 24:
Continue Watching.

PHASE 25:
Recommendations.

PHASE 26:
Homepage discovery engine.

PHASE 27:
Performance.

PHASE 28:
Responsive UX.

PHASE 29:
SEO.

PHASE 30:
Accessibility.

PHASE 31:
Data-quality regression.

PHASE 32:
Full production E2E verification.

====================================================================
124. MICRO-LEVEL RANDOM AUDIT BEFORE RELEASE
====================================================================

Randomly select:

500 movie records
300 TV records
100 anime records
100 short dramas
500 source records
500 artwork records
500 availability records
200 seasons
1,000 episodes

Verify every relationship.

Acceptance:

0 title/poster identity errors
0 title/metadata identity errors
0 content/source mismatch
0 season/episode identity mismatch
0 obviously incorrect playback association

Any failure blocks release until corrected.

====================================================================
125. FINAL PRODUCT DEFINITION
====================================================================

BUILD:

A global entertainment catalog with:

canonical identity
correct artwork
deep metadata
multiple sources
source lineage
strong deduplication
language intelligence
regional intelligence
large content variety
Netflix-style discovery
MovieBox-style catalog breadth
truthful availability
reliable playback handling
fast search
TV season/episode integrity
watch history
watchlist
continue watching
data-quality monitoring

DO NOT BUILD:

A giant list of scraped pages.

DO NOT BUILD:

A giant collection of duplicate posters.

DO NOT BUILD:

A title database where the poster and URL may belong to another title.

DO NOT BUILD:

A player that displays Play regardless of availability.

DO NOT BUILD:

A fake 100k/200k catalog.

THE FINAL PRINCIPLE:

ONE REAL CONTENT ENTITY
        ↓
ONE CANONICAL IDENTITY
        ↓
ONE CORRECT METADATA RECORD
        ↓
ONE CORRECT ARTWORK SET
        ↓
MANY SOURCE REFERENCES
        ↓
MANY CATEGORIES
        ↓
MANY LANGUAGE REPRESENTATIONS
        ↓
MANY AVAILABILITY RECORDS
        ↓
ONE RELIABLE USER EXPERIENCE

Fix the identity layer first.

Everything else depends on it.

====================================================================
END OF INSTRUCTION
====================================================================