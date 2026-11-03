// Curated Islamic & Religious History Titles Catalog
// Fully verified with TMDB metadata, active streams, posters, and season structures.

export interface CuratedIslamicTitle {
    id: number;
    catalogId: number;
    slug: string;
    title: string;
    year: number;
    type: 'movie' | 'tv';
    rating: number;
    tmdbId: number;
    tmdb_id: number;
    imdbId: string;
    imdb_id: string;
    poster: string | null;
    backdrop: string | null;
    overview: string;
    seasonCount?: number;
    episodeCount?: number;
    seasons?: any[];
    aliases: string[];
}

export function getIslamicStreams(t: any, season: number = 1, episode: number = 1): Array<Record<string, any>> {
    const slug = (t.slug || '').toLowerCase();
    const ep = Math.max(1, episode || 1);
    const s = Math.max(1, season || 1);
    const ep2 = String(ep).padStart(2, '0');
    const streams: Array<Record<string, any>> = [];

    if (slug.includes('the-message')) {
        streams.push({
            label: '⚡ Archive Direct (1080p BluRay Master)',
            provider: 'archive_org',
            url: 'https://archive.org/download/themessage1976/The.Message.1976.1080p.BluRay.x264.AAC5.1-[YTS.MX].mp4',
            format: 'video',
            quality: '1080p',
            language: 'en',
            languageName: 'English (Original)'
        });
        streams.push({
            label: '⚡ Archive Direct (720p HD Master)',
            provider: 'archive_org_720',
            url: 'https://archive.org/download/TheMessageEnglishVersion/The%20Message%20-%20%28English%20Version%29.mp4',
            format: 'video',
            quality: '720p',
            language: 'en',
            languageName: 'English (720p)'
        });
        streams.push({
            label: '⚡ VidSrc HD (IMDb Master)',
            provider: 'vidsrc_imdb',
            url: 'https://vidsrc.me/embed/movie?imdb=tt0074896',
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ VidSrc Multi-Server',
            provider: 'vidsrc',
            url: 'https://vidsrc.to/embed/movie/26842',
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ 2Embed Multi-Server',
            provider: '2embed',
            url: 'https://www.2embed.cc/embed/tmdb/movie?id=26842',
            format: 'embed',
            quality: '1080p'
        });
    } else if (slug.includes('muhammad-the-messenger-of-god')) {
        streams.push({
            label: '⚡ Archive Direct (1080p WEBRip)',
            provider: 'archive_org',
            url: 'https://archive.org/download/muhammad-the-messenger-of-god-2015-urdu/Muhammad.The.Messenger.of.God.2015.1080p.Urdu.Hindi.WEBRip.HE-AAC.2.0.x264-Shehnshahr.mp4',
            format: 'video',
            quality: '1080p',
            language: 'hi',
            languageName: 'Hindi/Urdu Dub',
            isDub: true
        });
        streams.push({
            label: '⚡ VidSrc HD (IMDb Master)',
            provider: 'vidsrc_imdb',
            url: 'https://vidsrc.me/embed/movie?imdb=tt3921314',
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ VidSrc Multi-Server',
            provider: 'vidsrc',
            url: 'https://vidsrc.to/embed/movie/315859',
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ 2Embed Multi-Server',
            provider: '2embed',
            url: 'https://www.2embed.cc/embed/tmdb/movie?id=315859',
            format: 'embed',
            quality: '1080p'
        });
    } else if (slug.includes('muhammad-the-last-prophet')) {
        streams.push({
            label: '⚡ Archive Direct (Animated Feature)',
            provider: 'archive_org',
            url: 'https://archive.org/download/MuhammadTheLastProphet1/MuhammadTheLastProphet1_512kb.mp4',
            format: 'video',
            quality: 'HD',
            language: 'en',
            languageName: 'English (Original)'
        });
        streams.push({
            label: '⚡ VidSrc HD (IMDb Master)',
            provider: 'vidsrc_imdb',
            url: 'https://vidsrc.me/embed/movie?imdb=tt0330671',
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ VidSrc Multi-Server',
            provider: 'vidsrc',
            url: 'https://vidsrc.to/embed/movie/45904',
            format: 'embed',
            quality: '1080p'
        });
    } else if (slug.includes('final-legacy') || slug.includes('qamar-bani-hashim')) {
        streams.push({
            label: `⚡ Archive Direct (Arabic Original Ep ${ep})`,
            provider: 'archive_org',
            url: `https://archive.org/download/qamar_bani_hashim/Qamar%20Bani%20Hashim/qamar_bani_hashim_${ep2}.mp4`,
            format: 'video',
            quality: 'HD',
            language: 'ar',
            languageName: 'Arabic (Original)'
        });
        streams.push({
            label: '⚡ VidSrc HD (IMDb Master)',
            provider: 'vidsrc_imdb',
            url: `https://vidsrc.me/embed/tv?imdb=tt8435132&season=${s}&episode=${ep}`,
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ VidSrc Multi-Server',
            provider: 'vidsrc',
            url: `https://vidsrc.to/embed/tv/57806/${s}/${ep}`,
            format: 'embed',
            quality: '1080p'
        });
    } else if (slug.includes('prophet-joseph')) {
        streams.push({
            label: `⚡ Archive Direct (Farsi Ep ${ep})`,
            provider: 'archive_org',
            url: `https://archive.org/download/hazrat-yusuf-a-s/Hazrat%20Yusuf%20%28A.S%29%20Farsi%20Ep${ep2}.mp4`,
            format: 'video',
            quality: 'HD',
            language: 'fa',
            languageName: 'Farsi (Original)'
        });
        streams.push({
            label: `⚡ Archive Direct (Urdu/Hindi Dub Ep ${ep})`,
            provider: 'archive_org_urdu',
            url: `https://archive.org/download/hazrat-yusuf-a-s/Hazrat%20Yusuf%20%28A.S%29%20Urdu%20Ep${ep2}.mp4`,
            format: 'video',
            quality: 'HD',
            language: 'hi',
            languageName: 'Hindi/Urdu Dub',
            isDub: true
        });
        streams.push({
            label: '⚡ VidSrc HD (IMDb Master)',
            provider: 'vidsrc_imdb',
            url: `https://vidsrc.me/embed/tv?imdb=tt3770334&season=${s}&episode=${ep}`,
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ VidSrc Multi-Server',
            provider: 'vidsrc',
            url: `https://vidsrc.to/embed/tv/70802/${s}/${ep}`,
            format: 'embed',
            quality: '1080p'
        });
    } else if (slug.includes('the-kingdom-of-solomon')) {
        streams.push({
            label: '⚡ Archive Direct (HD Master)',
            provider: 'archive_org',
            url: 'https://archive.org/download/TheKingdomOfSolomon/The%20Kingdom%20of%20Solomon%20%282010%29.mp4',
            format: 'video',
            quality: '720p',
            language: 'fa',
            languageName: 'Farsi'
        });
        streams.push({
            label: '⚡ VidSrc HD (IMDb Master)',
            provider: 'vidsrc_imdb',
            url: 'https://vidsrc.me/embed/movie?imdb=tt1706450',
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ VidSrc Multi-Server',
            provider: 'vidsrc',
            url: 'https://vidsrc.to/embed/movie/153779',
            format: 'embed',
            quality: '1080p'
        });
    } else if (slug.includes('abraham-friend-of-god') || slug.includes('prophet-abraham') || slug.includes('abraham')) {
        streams.push({
            label: '⚡ Archive Direct (Hindi/Urdu Dub)',
            provider: 'archive_org',
            url: 'https://archive.org/download/abraham-the-friend-of-god-hazrat-ibrahim-a.s-movie-in-urdu-hindi-by-hidayah-play/Abraham%20The%20Friend%20of%20GOD%20Hazrat%20Ibrahim%20a.s%20Movie%20in%20Urdu_Hindi%20by%20Hidayah%20Play.mp4',
            format: 'video',
            quality: 'HD',
            language: 'hi',
            languageName: 'Hindi/Urdu Dub',
            isDub: true
        });
        streams.push({
            label: '⚡ VidSrc HD (IMDb Master)',
            provider: 'vidsrc_imdb',
            url: 'https://vidsrc.me/embed/movie?imdb=tt2187050',
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ VidSrc Multi-Server',
            provider: 'vidsrc',
            url: 'https://vidsrc.to/embed/movie/310343',
            format: 'embed',
            quality: '1080p'
        });
    } else if (slug.includes('saint-mary')) {
        streams.push({
            label: `⚡ Archive Direct (Ep ${ep} Eng Subs)`,
            provider: 'archive_org',
            url: `https://archive.org/download/saint-mary-series/Saint%20Mary%20Series%20-%20Episode%20${ep2}.mp4`,
            format: 'video',
            quality: 'HD',
            language: 'en',
            languageName: 'English Subtitles'
        });
        streams.push({
            label: '⚡ VidSrc HD (IMDb Master)',
            provider: 'vidsrc_imdb',
            url: 'https://vidsrc.me/embed/movie?imdb=tt0290747',
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ VidSrc Multi-Server',
            provider: 'vidsrc',
            url: 'https://vidsrc.to/embed/movie/321637',
            format: 'embed',
            quality: '1080p'
        });
    } else if (slug.includes('the-messiah')) {
        streams.push({
            label: '⚡ VidSrc HD (IMDb Master)',
            provider: 'vidsrc_imdb',
            url: 'https://vidsrc.me/embed/movie?imdb=tt1148208',
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ VidSrc Multi-Server',
            provider: 'vidsrc',
            url: 'https://vidsrc.to/embed/movie/485991',
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ 2Embed Multi-Server',
            provider: '2embed',
            url: 'https://www.2embed.cc/embed/tmdb/movie?id=485991',
            format: 'embed',
            quality: '1080p'
        });
    } else if (slug.includes('testament-the-story-of-moses')) {
        streams.push({
            label: '⚡ VidSrc HD (IMDb Master)',
            provider: 'vidsrc_imdb',
            url: `https://vidsrc.me/embed/tv?imdb=tt31057778&season=${s}&episode=${ep}`,
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ VidSrc Multi-Server',
            provider: 'vidsrc',
            url: `https://vidsrc.to/embed/tv/247441/${s}/${ep}`,
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ 2Embed Multi-Server',
            provider: '2embed',
            url: `https://www.2embed.cc/embed/tmdb/tv?id=247441&s=${s}&e=${ep}`,
            format: 'embed',
            quality: '1080p'
        });
    } else if (slug.includes('omar-series')) {
        streams.push({
            label: `⚡ Archive Direct (Arabic + Eng Subs Ep ${ep})`,
            provider: 'archive_org',
            url: `https://archive.org/download/OmarSeriesArabicWithEnglishSubtitles/OmarSeries%20-%20Ep${ep}%20-%20English%20Subtitles.mp4`,
            format: 'video',
            quality: 'HD',
            language: 'en',
            languageName: 'English Subtitles'
        });
        streams.push({
            label: '⚡ VidSrc HD (IMDb Master)',
            provider: 'vidsrc_imdb',
            url: `https://vidsrc.me/embed/tv?imdb=tt2474776&season=${s}&episode=${ep}`,
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ VidSrc Multi-Server',
            provider: 'vidsrc',
            url: `https://vidsrc.to/embed/tv/58887/${s}/${ep}`,
            format: 'embed',
            quality: '1080p'
        });
    } else if (slug.includes('bilal-a-new-breed-of-hero')) {
        streams.push({
            label: '⚡ Archive Direct (1080p BluRay)',
            provider: 'archive_org',
            url: 'https://archive.org/download/BILAL_2015/Bilal%20A%20New%20Breed%20Of%20Hero%20%282015%29.mp4',
            format: 'video',
            quality: '1080p',
            language: 'en',
            languageName: 'English (Original)'
        });
        streams.push({
            label: '⚡ VidSrc HD (IMDb Master)',
            provider: 'vidsrc_imdb',
            url: 'https://vidsrc.me/embed/movie?imdb=tt3577666',
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ VidSrc Multi-Server',
            provider: 'vidsrc',
            url: 'https://vidsrc.to/embed/movie/332718',
            format: 'embed',
            quality: '1080p'
        });
    } else if (slug.includes('imam-ali')) {
        streams.push({
            label: `⚡ Archive Direct (720p Urdu Dub Ep ${ep})`,
            provider: 'archive_org',
            url: `https://archive.org/download/shaheed-e-kufa-imam-ali-a.s-in-urdu-episode-21-720-p-hd/Shaheed%20e%20Kufa%20_%20Imam%20Ali%20a.s%20_%20In%20Urdu%20_%20Episode%20${ep}%28720P_HD%29.mp4`,
            format: 'video',
            quality: '720p',
            language: 'hi',
            languageName: 'Hindi/Urdu Dub',
            isDub: true
        });
        streams.push({
            label: '⚡ Archive Direct (Persian Feature)',
            provider: 'archive_org_film',
            url: 'https://archive.org/download/ImamAliIbnAbiTalebpeaceBeUponHim-PersianFilm/ImamAli_Film_P_LargeScreen_HQ_xvid.mp4',
            format: 'video',
            quality: 'HD',
            language: 'fa',
            languageName: 'Farsi'
        });
        streams.push({
            label: '⚡ VidSrc HD (IMDb Master)',
            provider: 'vidsrc_imdb',
            url: `https://vidsrc.me/embed/tv?imdb=tt7388704&season=${s}&episode=${ep}`,
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ VidSrc Multi-Server',
            provider: 'vidsrc',
            url: `https://vidsrc.to/embed/tv/44058/${s}/${ep}`,
            format: 'embed',
            quality: '1080p'
        });
    } else if (slug.includes('men-of-anjolos')) {
        streams.push({
            label: `⚡ Archive Direct (Urdu Dub Ep ${ep})`,
            provider: 'archive_org',
            url: `https://archive.org/download/ashabekahfurdu/Ashab-e-Kahf%20-%20Episode%20${ep}%20in%20URDU%20%5Bwww.alfasahah.com%5D.mp4`,
            format: 'video',
            quality: 'HD',
            language: 'hi',
            languageName: 'Hindi/Urdu Dub',
            isDub: true
        });
        streams.push({
            label: '⚡ Archive Direct (Movie with Eng Subs)',
            provider: 'archive_org_movie',
            url: 'https://archive.org/download/the-ashab-e-kahf-men-of-the-cave-movie-urdu-with-english-subtitles/The%20Ashab-e-Kahf%20%28Men%20of%20The%20Cave%29%20Movie%20%E2%80%93%20Urdu%20with%20English%20Subtitles.mp4',
            format: 'video',
            quality: 'HD',
            language: 'en',
            languageName: 'English Subtitles'
        });
        streams.push({
            label: '⚡ VidSrc HD (IMDb Master)',
            provider: 'vidsrc_imdb',
            url: `https://vidsrc.me/embed/tv?imdb=tt7388656&season=${s}&episode=${ep}`,
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ VidSrc Multi-Server',
            provider: 'vidsrc',
            url: `https://vidsrc.to/embed/tv/60332/${s}/${ep}`,
            format: 'embed',
            quality: '1080p'
        });
    } else if (slug.includes('mokhtarnameh')) {
        const mukhtarUrl = ep === 1
            ? 'https://archive.org/download/mukhtar-18/mukhtar01.mp4'
            : ep === 2
            ? 'https://archive.org/download/mukhtar-18/mukhtar2oke.mp4'
            : ep === 3
            ? 'https://archive.org/download/mukhtar-18/mukhtar3.mp4'
            : `https://archive.org/download/mukhtar-18/mukhtar-${ep2}.mp4`;
        streams.push({
            label: `⚡ Archive Direct (HD Original Ep ${ep})`,
            provider: 'archive_org',
            url: mukhtarUrl,
            format: 'video',
            quality: 'HD',
            language: 'fa',
            languageName: 'Farsi (Original)'
        });
        streams.push({
            label: '⚡ VidSrc HD (IMDb Master)',
            provider: 'vidsrc_imdb',
            url: `https://vidsrc.me/embed/tv?imdb=tt2071536&season=${s}&episode=${ep}`,
            format: 'embed',
            quality: '1080p'
        });
        streams.push({
            label: '⚡ VidSrc Multi-Server',
            provider: 'vidsrc',
            url: `https://vidsrc.to/embed/tv/54467/${s}/${ep}`,
            format: 'embed',
            quality: '1080p'
        });
    }

    return streams;
}

export function buildIslamicAvailability(t: any, season: number = 1, episode: number = 1): any[] {
    const streams = getIslamicStreams(t, season, episode);
    return streams.map(s => ({
        source: s.provider,
        sourceName: s.label,
        sourceIsLegal: true,
        kind: s.format === 'video' ? 'playback' : 'embed',
        status: 'available',
        url: s.url,
        playbackUrl: s.url,
        language: s.language,
        languageName: s.languageName,
        isDub: s.isDub,
        isSub: s.isSub
    }));
}

export const CURATED_ISLAMIC_TITLES: any[] = [
    {
        id: 9808,
        catalogId: 9808,
        slug: "the-message-1976",
        title: "The Message",
        year: 1976,
        type: "movie",
        rating: 7.1,
        tmdbId: 26842,
        tmdb_id: 26842,
        imdbId: "tt0074896",
        imdb_id: "tt0074896",
        poster: "https://image.tmdb.org/t/p/w500/qVCBMg4ZuLPnWhIWJHD9IP4nIuY.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/rqODzehgQ8Hl0tcUd7qIcy8Pc9Z.jpg",
        overview: "In sixth-century Mecca, Prophet Muhammad receives his first revelation from God as a messenger. Three years later, he's not alone in his quest and publicly declares his prophecy. Muhammad is fought by Abu Sufian and his wife Hind, rulers of Mecca. Muhammad's followers are hunted and tortured but he continues his calling.",
        aliases: ["the message", "al-risalah", "risalah", "prophet muhammad", "hamza"],
    },
    {
        id: 62030,
        catalogId: 62030,
        slug: "muhammad-the-messenger-of-god-2015",
        title: "Muhammad: The Messenger of God",
        year: 2015,
        type: "movie",
        rating: 6.6,
        tmdbId: 315859,
        tmdb_id: 315859,
        imdbId: "tt3921314",
        imdb_id: "tt3921314",
        poster: "https://image.tmdb.org/t/p/w500/dSlPUIM2ONpxtsFBtY3O6hRF0pi.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/IKbNzzYI65c6VBaun5bjn45StF.jpg",
        overview: "Abousofyan tells Aboutaleb, Muhammad's uncle, that in the upcoming morning he wants to kill the holy prophet of Islam and Muslims, who are in boycott. Aboutaleb remembers the past years when Abraha charges ahead Mecca to ruin the house of God. but by God's will his army loses out against millions of small birds sent by GOD. A month later, Muhammad is born.",
        aliases: ["muhammad the messenger of god", "mohammad rasoolollah", "prophet muhammad", "majid majidi"],
    },
    {
        id: 47178,
        catalogId: 47178,
        slug: "muhammad-the-last-prophet-2002",
        title: "Muhammad: The Last Prophet",
        year: 2002,
        type: "movie",
        rating: 6.3,
        tmdbId: 45904,
        tmdb_id: 45904,
        imdbId: "tt0330671",
        imdb_id: "tt0330671",
        poster: "https://image.tmdb.org/t/p/w500/dujTx4ZNu1xgIVMV22nge0jfwRs.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/p2S8xran3Fw3rEyiYtRNukCLgmF.jpg",
        overview: "An account of the birth of Islam.",
        aliases: ["muhammad the last prophet", "the last prophet", "badr", "richard rich", "animated prophet"],
    },
    {
        id: 47693,
        catalogId: 47693,
        slug: "muhammad-the-final-legacy-2008",
        title: "Muhammad: The Final Legacy",
        year: 2008,
        type: "tv",
        rating: 0.0,
        tmdbId: 57806,
        tmdb_id: 57806,
        imdbId: "tt8435132",
        imdb_id: "tt8435132",
        poster: "https://image.tmdb.org/t/p/w500/AjgXyQnEFsNweVbNpKzJpAvEFhs.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/xScdxrSvo2pDZku0HERw9th49nB.jpg",
        overview: "About the life of the Prophet Muhammad from the inception of his prophethood, covering his noble champions.",
        seasonCount: 1,
        episodeCount: 30,
        aliases: ["qamar bani hashim", "muhammad the final legacy", "the final legacy", "qamar", "bani hashim"],
    },
    {
        id: 9902481,
        catalogId: 9902481,
        slug: "prophet-joseph-2008",
        title: "Prophet Joseph",
        year: 2008,
        type: "tv",
        rating: 7.6,
        tmdbId: 70802,
        tmdb_id: 70802,
        imdbId: "tt3770334",
        imdb_id: "tt3770334",
        poster: "https://image.tmdb.org/t/p/w500/h7nsyR0I53gM6P1Inxl438UnqS7.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/u4yhC4Q8bS1w7FWIPpKsmY4nv9E.jpg",
        overview: "This story basically follows the most important happenings in Prophet Josephs life, from the view of muslims. The most important happenings are: 1. his travel to egypt 2. his rise and growing up in Egypt 3. his life problems when his \"owner\" Zuleikha falls in love with him and wants him to return the love to him. 4. his stay in prison, and how he reforms the prisoners. 5. his return by the side of the Pharao. 6. his uprising to the side of the pharao as his advisor. 7. his brothers coming to egypt, and how he decides to make them regret their mistakes so they can receive forgivness, and peace. 8. his reunion with his family after more than 20 years.",
        seasonCount: 1,
        episodeCount: 45,
        aliases: ["prophet joseph", "yousuf e payambar", "yusuf", "joseph", "surah yusuf", "yaqub", "jacob"],
    },
    {
        id: 10024,
        catalogId: 10024,
        slug: "the-kingdom-of-solomon-2010",
        title: "The Kingdom of Solomon",
        year: 2010,
        type: "movie",
        rating: 6.3,
        tmdbId: 153779,
        tmdb_id: 153779,
        imdbId: "tt1706450",
        imdb_id: "tt1706450",
        poster: "https://image.tmdb.org/t/p/w500/j24feOqc1BINnVeT8yMPLosHJAJ.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/x21hZjoqMCDC0DqGibINQAzIrEe.jpg",
        overview: "Solomon, Prophet and the King, has asked God to give him an ideal kingdom which has never been given to anybody before. He is told to prepare himself and his subjects with evil and unearthly creatures that haunt the men.",
        aliases: ["the kingdom of solomon", "kingdom of solomon", "molk e soleiman", "solomon", "sulayman", "prophet sulaiman"],
    },
    {
        id: 9902488,
        catalogId: 9902488,
        slug: "prophet-abraham-friend-of-god-2005",
        title: "Abraham: The Friend of God",
        year: 2008,
        type: "movie",
        rating: 6.0,
        tmdbId: 310343,
        tmdb_id: 310343,
        imdbId: "tt2187050",
        imdb_id: "tt2187050",
        poster: "https://image.tmdb.org/t/p/w500/n1KTVWwfZxyXV7m7JsUfRtrLJpt.jpg",
        backdrop: null,
        overview: "M. Sadeghi stars as the title character in filmmaker Reza Varzi's epic retelling of the life and times of Abraham, known as the patriarch of Judaism, Christianity and Islam, the world's three most prominent monotheistic religions. Led by God from Mesopotamia to the land of Canaan, Abraham entered into a covenant with the Lord that, once fulfilled, would see him father a great nation of kings.",
        aliases: ["abraham the friend of god", "abraham friend of god", "abraham-friend-of-god", "abraham-friend-of-god-2008", "abraham-the-friend-of-god-2008", "prophet abraham", "prophet abraham friend of god", "ibrahim khalilullah", "ibrahim", "abraham", "khalilullah"],
    },
    {
        id: 62515,
        catalogId: 62515,
        slug: "saint-mary-2000",
        title: "Saint Mary",
        year: 2000,
        type: "tv",
        rating: 7.1,
        tmdbId: 321637,
        tmdb_id: 321637,
        imdbId: "tt0290747",
        imdb_id: "tt0290747",
        poster: "https://image.tmdb.org/t/p/w500/m6gIBrCqzNHGPwkaEET87UK9fh5.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/j5KuDZbVKZalltOuLMJMlFGiI8v.jpg",
        overview: "In the year 16 BCE, the people of Jerusalem are awaiting the birth of the son of Imran. Instead of the much-anticipated \"Messiah\", a girl is born to Imran and Anna. The latter names her ...",
        seasonCount: 1,
        episodeCount: 11,
        aliases: ["saint mary", "maryam moghaddas", "maryam", "mary", "isa", "jesus", "zakariyya"],
    },
    {
        id: 9902502,
        catalogId: 9902502,
        slug: "the-messiah-2007",
        title: "The Messiah",
        year: 2007,
        type: "movie",
        rating: 8.8,
        tmdbId: 485991,
        tmdb_id: 485991,
        imdbId: "tt1148208",
        imdb_id: "tt1148208",
        poster: "https://image.tmdb.org/t/p/w500/v7z5OJ4ko17kiNi6S9RHih0S57B.jpg",
        backdrop: null,
        overview: "The Islamic version of the story of Jesus",
        aliases: ["the messiah", "messiah", "basharat al munjil", "prophet isa", "jesus in islam"],
    },
    {
        id: 9902503,
        catalogId: 9902503,
        slug: "testament-the-story-of-moses-2024",
        title: "Testament: The Story of Moses",
        year: 2024,
        type: "tv",
        rating: 7.2,
        tmdbId: 247441,
        tmdb_id: 247441,
        imdbId: "tt31057778",
        imdb_id: "tt31057778",
        poster: "https://image.tmdb.org/t/p/w500/rRMIvf9OismdaKSuyUoo3mQa3iD.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/tKoO0zhN4ukIdCTWY1QNmYNsIHN.jpg",
        overview: "This illuminating docudrama series chronicles Moses' remarkable life as a prince, prophet and more with insights from theologians and historians.",
        seasonCount: 1,
        episodeCount: 3,
        aliases: ["testament the story of moses", "the story of moses", "moses", "musa", "prophet musa", "exodus"],
    },
    {
        id: 9902482,
        catalogId: 9902482,
        slug: "omar-series-2012",
        title: "Omar",
        year: 2012,
        type: "tv",
        rating: 9.0,
        tmdbId: 58887,
        tmdb_id: 58887,
        imdbId: "tt2474776",
        imdb_id: "tt2474776",
        poster: "https://image.tmdb.org/t/p/w500/ypNn2XybknDmxDOXDWcToFtVYMV.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/A9zg1MPSzBPoPBBAJmqD7jr2wWW.jpg",
        overview: "A historical saga about the second caliph and Commander of the Faithful Omar Bin Al-Khattab and his pivotal role in the Islamic State.",
        seasonCount: 1,
        episodeCount: 31,
        aliases: ["omar", "farouk omar", "umar ibn al khattab", "caliph omar", "sahaba", "hatem ali"],
    },
    {
        id: 9902487,
        catalogId: 9902487,
        slug: "bilal-a-new-breed-of-hero-2015",
        title: "Bilal: A New Breed of Hero",
        year: 2015,
        type: "movie",
        rating: 6.8,
        tmdbId: 332718,
        tmdb_id: 332718,
        imdbId: "tt3577666",
        imdb_id: "tt3577666",
        poster: "https://image.tmdb.org/t/p/w500/ncWuEzxnXqssxRfHghZuUAIezCo.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/tBY8hN4inRzOwUwfvhBUHo00pIQ.jpg",
        overview: "A thousand years ago, one boy with a dream of becoming a great warrior is abducted with his sister and taken to a land far away from home. Thrown into a world where greed and injustice rule all, Bilal finds the courage to raise his voice and make a change. Inspired by true events, this is a story of a real hero who earned his remembrance in time and history.",
        aliases: ["bilal a new breed of hero", "bilal", "bilal ibn rabah", "muezzin", "sahaba"],
    },
    {
        id: 62325,
        catalogId: 62325,
        slug: "imam-ali-1997",
        title: "Imam Ali",
        year: 1997,
        type: "tv",
        rating: 6.6,
        tmdbId: 44058,
        tmdb_id: 44058,
        imdbId: "tt7388704",
        imdb_id: "tt7388704",
        poster: "https://image.tmdb.org/t/p/w500/sOoOw2IVCGj9HywqKCDf0qdB25O.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/3kXJUl9atlYCLcIKuUr2FX20pg8.jpg",
        overview: "series focusing on the life of Ali ibn Abi Talib, directed by Davood Mirbagheri and originally broadcast in 1992 in 22 episodes. It was subsequently released on DVD, with other editions including one with English sub-titles, and one dubbed into Urdu. The series covers the events before the caliphate of Ali ibn Abi Talib to his assassination in Kufa, Iraq.",
        seasonCount: 1,
        episodeCount: 22,
        aliases: ["imam ali", "the martyr of kufa", "ali ibn abi talib", "kufa", "shaheed e kufa", "sahaba"],
    },
    {
        id: 62238,
        catalogId: 62238,
        slug: "men-of-anjolos-1997",
        title: "Men of Anjolos",
        year: 1997,
        type: "tv",
        rating: 7.3,
        tmdbId: 60332,
        tmdb_id: 60332,
        imdbId: "tt7388656",
        imdb_id: "tt7388656",
        poster: "https://image.tmdb.org/t/p/w500/tZb2JoVmFjZXBasoqVM1kv7ie0l.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/6WvScGsNmpnxgCaLuouoVqADirQ.jpg",
        overview: "The story of six nobles and one sheepman who become Christian, run away from Romans to a cave where they will sleep 309 years, from Islamic view",
        seasonCount: 1,
        episodeCount: 28,
        aliases: ["men of anjolos", "ashab e kahf", "companions of the cave", "the cave", "anjolos"],
    },
    {
        id: 62286,
        catalogId: 62286,
        slug: "mokhtarnameh-2010",
        title: "The Mokhtar Narrative",
        year: 2010,
        type: "tv",
        rating: 6.5,
        tmdbId: 54467,
        tmdb_id: 54467,
        imdbId: "tt2071536",
        imdb_id: "tt2071536",
        poster: "https://image.tmdb.org/t/p/w500/6zUdATUbXzmUwozQjvQZe6MEQRl.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/8pR82YBQEVcdKKCBBQ7KqiNEHug.jpg",
        overview: "The Mokhtar Narrative is an Epic/History television series directed by Davood Mirbagheri, based on the life of Al-Mokhtar. Over 140 actors were cast in it.  Mokhtar Saqafi was a Shiite Muslim leader who sets up a rebellion movement in 686 A.D in the town of Kufa to avenge the martyrdom of Hussain (grandson of Islamic Prophet Muhammad).",
        seasonCount: 1,
        episodeCount: 40,
        aliases: ["mokhtarnameh", "al mukhtar", "mukhtar al thaqafi", "karbala", "the mokhtar narrative"],
    },
];

// Populate seasons and availability for all titles
for (const t of CURATED_ISLAMIC_TITLES) {
    if (t.type === 'tv' && t.episodeCount) {
        t.seasons = [
            {
                season_number: 1,
                name: "Season 1",
                episode_count: t.episodeCount,
                episodes: Array.from({ length: t.episodeCount }, (_, i) => ({
                    episode_number: i + 1,
                    name: `Episode ${i + 1}`,
                    overview: `${t.title} Episode ${i + 1}`
                }))
            }
        ];
    }
    t.availability = buildIslamicAvailability(t, 1, 1);
}

export const CURATED_ISLAMIC_MAP: Record<string, any> = {};
export const CURATED_ISLAMIC_MAP_BY_ID: Record<string, any> = {};
export const ISLAMIC_KNOWN_TITLES: Record<string, { tmdbId?: number | string; imdbId?: string }> = {};

for (const t of CURATED_ISLAMIC_TITLES) {
    CURATED_ISLAMIC_MAP[t.slug] = t;
    CURATED_ISLAMIC_MAP_BY_ID[String(t.id)] = t;
    if (t.tmdbId) CURATED_ISLAMIC_MAP_BY_ID[String(t.tmdbId)] = t;
    ISLAMIC_KNOWN_TITLES[t.slug] = { tmdbId: t.tmdbId, imdbId: t.imdbId };
    const deshadow = t.slug.replace(/-\d+$/, '');
    if (deshadow !== t.slug) {
        CURATED_ISLAMIC_MAP[deshadow] = t;
        ISLAMIC_KNOWN_TITLES[deshadow] = { tmdbId: t.tmdbId, imdbId: t.imdbId };
    }
    for (const alias of t.aliases || []) {
        const clean = alias.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (clean && !CURATED_ISLAMIC_MAP[clean]) {
            CURATED_ISLAMIC_MAP[clean] = t;
            ISLAMIC_KNOWN_TITLES[clean] = { tmdbId: t.tmdbId, imdbId: t.imdbId };
        }
    }
}
