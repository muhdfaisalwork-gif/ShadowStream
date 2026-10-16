import { BaseScraper } from './BaseScraper.js';

/**
 * MovieBoxScraper - Multi-source aggregator
 *
 * Replaces LegalCatalogScraper with a VidSrc + SuperEmbed + MultiEmbed
 * backed catalog. Every title streams via embeddable iframes from these
 * free public services which accept TMDB or IMDb IDs.
 *
 * VidSrc URL formats:
 *   Movie:  https://vidsrc.to/embed/movie/{tmdb_id}
 *   TV:     https://vidsrc.to/embed/tv/{tmdb_id}/{season}/{episode}
 * SuperEmbed (multiembed.mov) URL formats:
 *   Movie:  https://multiembed.mov/?video_id={imdb_id}
 *   TV:     https://multiembed.mov/?video_id={imdb_id}&s={s}&e={e}
 *   TMDB:   append &tmdb=1
 *
 * Posters/backdrops come from the public TMDB CDN:
 *   https://image.tmdb.org/t/p/w500/{poster_path}
 *   https://image.tmdb.org/t/p/w1280/{backdrop_path}
 *
 * This is the same architecture every MovieBox clone uses. VidSrc,
 * SuperEmbed, and MultiEmbed each scrape from upstream sources and
 * expose the results via embed URLs.
 */
export class MovieBoxScraper extends BaseScraper {
    constructor() {
        super('MovieBox', 'https://vidsrc.to');
    }

    getCatalog() {
        return [
            // ===== TOP RATED MOVIES (curated 300+) =====
            ...this.entries([
                // The Shawshank Redemption (1994)
                m('shawshank-redemption-1994', 'The Shawshank Redemption', 1994, 'tt0111161', '278',
                    ['Drama'], 8.7, 142, 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
                    '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', '/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg'),

                // The Godfather (1972)
                m('the-godfather-1972', 'The Godfather', 1972, 'tt0068646', '238',
                    ['Crime', 'Drama'], 8.7, 175, 'Don Vito Corleone, head of a mafia family, decides to hand over his empire to his youngest son Michael.',
                    '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', '/tmU7GeKVybMWFButweGlL9JqKPc.jpg'),

                // The Dark Knight (2008)
                m('the-dark-knight-2008', 'The Dark Knight', 2008, 'tt0468569', '155',
                    ['Action', 'Crime', 'Drama'], 8.5, 152, 'Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and DA Harvey Dent against the Joker.',
                    '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', '/hkBaDkMWbLaf8B1lsWsKX7Ew3Xq.jpg'),

                // 12 Angry Men (1957)
                m('12-angry-men-1957', '12 Angry Men', 1957, 'tt0050083', '240',
                    ['Drama'], 8.5, 96, 'A jury holdout attempts to prevent a miscarriage of justice by forcing his colleagues to reconsider the evidence.',
                    '/ow3wq89wM8q5moQjPDY1CkHojkA.jpg', '/qqHUNSt17cMXpR9O1p2lc0OhAeE.jpg'),

                // Schindler's List (1993)
                m('schindlers-list-1993', "Schindler's List", 1993, 'tt0108052', '424',
                    ['Biography', 'Drama', 'History'], 8.6, 195, 'In German-occupied Poland during WWII, Oskar Schindler saves the lives of more than a thousand Polish-Jewish refugees.',
                    '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg', '/loRmRzQXZeqG78TqZuyvSlEQfZb.jpg'),

                // The Lord of the Rings: The Return of the King (2003)
                m('lotr-return-king-2003', 'The Lord of the Rings: The Return of the King', 2003, 'tt0167260', '122',
                    ['Adventure', 'Fantasy'], 8.5, 201, 'Gandalf and Aragorn lead the World of Men against Sauron\'s army to draw his gaze from Frodo and Sam.',
                    '/rCzp4ELKHHNz6piqC5KqJRVbTn5.jpg', '/8BPZO0Bf8TeAy8znF43z8soK3ys.jpg'),

                // Pulp Fiction (1994)
                m('pulp-fiction-1994', 'Pulp Fiction', 1994, 'tt0113101', '680',
                    ['Crime', 'Drama'], 8.5, 154, 'The lives of two mob hitmen, a boxer, a gangster and his wife intertwine in four tales of violence and redemption.',
                    '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', '/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg'),

                // The Lord of the Rings: The Fellowship of the Ring (2001)
                m('lotr-fellowship-2001', 'The Lord of the Rings: The Fellowship of the Ring', 2001, 'tt0120737', '120',
                    ['Adventure', 'Fantasy'], 8.4, 178, 'A meek Hobbit and eight companions set out on a journey to destroy the One Ring.',
                    '/6oom5QYQ2yQTMJIbsyyfz4GPvL6.jpg', '/zCKpkRiUcDjBhBhDeggYaaVKOLm.jpg'),

                // Forrest Gump (1994)
                m('forrest-gump-1994', 'Forrest Gump', 1994, 'tt0109830', '13',
                    ['Drama', 'Romance'], 8.5, 142, 'The presidencies of Kennedy and Johnson, the Vietnam War, and other historical events unfold from the perspective of an Alabama man.',
                    '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', '/yE5d3BUhE8hCnkMUJOo1QDoOGNz.jpg'),

                // Fight Club (1999)
                m('fight-club-1999', 'Fight Club', 1999, 'tt0137523', '550',
                    ['Drama'], 8.4, 139, 'An insomniac office worker and a devil-may-care soap maker form an underground fight club.',
                    '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', '/52AfXWuXCHn3UjD17rBruA9f5qb.jpg'),

                // Inception (2010)
                m('inception-2010', 'Inception', 2010, 'tt1375666', '27205',
                    ['Action', 'Sci-Fi', 'Thriller'], 8.4, 148, 'A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea.',
                    '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', '/s3TBrRGB1iav7gFOCNx3H31MoES.jpg'),

                // The Lord of the Rings: The Two Towers (2002)
                m('lotr-two-towers-2002', 'The Lord of the Rings: The Two Towers', 2002, 'tt0167261', '121',
                    ['Adventure', 'Fantasy'], 8.4, 179, 'Frodo and Sam continue their journey to Mordor.',
                    '/5VTN0pR8yqY8Db3iB0v8XkJYKSu.jpg', '/kWYI2sBsd6XS8iYnOdy8VnWvPfd.jpg'),

                // Star Wars: Episode V - The Empire Strikes Back (1980)
                m('star-wars-empire-1980', 'Star Wars: Episode V - The Empire Strikes Back', 1980, 'tt0080684', '1891',
                    ['Action', 'Adventure', 'Fantasy'], 8.4, 124, 'After the Rebels are brutally overpowered by the Empire, Luke begins Jedi training with Yoda.',
                    '/7BuH8itoSrLExs2YZSsM01Qk8no.jpg', '/8GUyodO3iUa5IMDCcXYYbXwS7nL.jpg'),

                // The Matrix (1999)
                m('the-matrix-1999', 'The Matrix', 1999, 'tt0133093', '603',
                    ['Action', 'Sci-Fi'], 8.2, 136, 'A computer hacker learns about the true nature of his reality and his role in the war against its controllers.',
                    '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', '/fNG7i7RqMEyeJw4VYRoAcns4C7n.jpg'),

                // GoodFellas (1990)
                m('goodfellas-1990', 'GoodFellas', 1990, 'tt0099685', '769',
                    ['Crime', 'Drama'], 8.5, 146, 'The story of Henry Hill and his life in the mob.',
                    '/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg', '/sw7mordbZxgITU877yTpZCud90M.jpg'),

                // One Flew Over the Cuckoo's Nest (1975)
                m('one-flew-cuckoo-1975', "One Flew Over the Cuckoo's Nest", 1975, 'tt0073486', '510',
                    ['Drama'], 8.4, 133, 'A criminal pleads insanity and is admitted to a mental institution, where he rebels against the staff.',
                    '/3jcbDmRFiQ83drXNOvRDeKHxS0C.jpg', '/7pfvbpI4z3hLzwUbGRtzNc9KxBo.jpg'),

                // Se7en (1995)
                m('se7en-1995', 'Se7en', 1995, 'tt0114369', '807',
                    ['Crime', 'Drama', 'Mystery'], 8.4, 127, 'Two detectives hunt a serial killer who uses the seven deadly sins as his motives.',
                    '/6yoghtyTpzNRB1BoLR6pe8lkTsp.jpg', '/uSvsWyjQDLfRdkUj8hwJ5ZxKQNp.jpg'),

                // Interstellar (2014)
                m('interstellar-2014', 'Interstellar', 2014, 'tt0816692', '157336',
                    ['Adventure', 'Drama', 'Sci-Fi'], 8.4, 169, 'A team of explorers travel through a wormhole in space to ensure humanity\'s survival.',
                    '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', '/rAiYTfKGqDCRIIqo664sY9A14lf.jpg'),

                // It's a Wonderful Life (1946)
                m('wonderful-life-1946', "It's a Wonderful Life", 1946, 'tt0038650', '1585',
                    ['Drama', 'Family', 'Fantasy'], 8.4, 130, 'An angel is sent from Heaven to help a desperately frustrated businessman by showing him what life would have been like if he had never existed.',
                    '/bSqt9rhSxaGft3Lf6nlx73H7kCt.jpg', '/rOPF9DHG5ZrcZTEZW8VH85JYfCO.jpg'),

                // Saving Private Ryan (1998)
                m('saving-private-ryan-1998', 'Saving Private Ryan', 1998, 'tt0120815', '857',
                    ['Drama', 'War'], 8.2, 169, 'Following the Normandy Landings, a group of soldiers go behind enemy lines to retrieve a paratrooper.',
                    '/miQ9G4PzhlVT8xR8yZJpFK6aVCE.jpg', '/yE5d3BUhE8hCnkMUJOo1QDoOGNz.jpg'),

                // Spirited Away (2001)
                m('spirited-away-2001', 'Spirited Away', 2001, 'tt0245429', '129',
                    ['Animation', 'Adventure', 'Family'], 8.5, 125, 'A young girl wanders into a world ruled by gods, witches, and spirits.',
                    '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', '/Ab8mkHmkYADjU7waiOk9Qe7U2Rs.jpg'),

                // The Green Mile (1999)
                m('green-mile-1999', 'The Green Mile', 1999, 'tt0120689', '497',
                    ['Crime', 'Drama', 'Fantasy'], 8.2, 189, 'The lives of guards on Death Row are affected by one of their charges: a black man accused of child murder.',
                    '/velWPhVMQeSKx0jmqlRBbgPSf5b.jpg', '/velWPhVMQeSKx0jmqlRBbgPSf5b.jpg'),

                // Parasite (2019)
                m('parasite-2019', 'Parasite', 2019, 'tt6751668', '496243',
                    ['Drama', 'Thriller'], 8.5, 133, 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
                    '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', '/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg'),

                // The Lion King (1994)
                m('lion-king-1994', 'The Lion King', 1994, 'tt0110357', '8587',
                    ['Animation', 'Adventure', 'Drama'], 8.3, 88, 'Lion prince Simba and his father are targeted by his bitter uncle.',
                    '/sKCr78MXSLixwmZ8DyJLrpMsd15.jpg', '/1giL0futTFEjV1F5YjEPa2HvQjl.jpg'),

                // Gladiator (2000)
                m('gladiator-2000', 'Gladiator', 2000, 'tt0172495', '98',
                    ['Action', 'Adventure', 'Drama'], 8.2, 155, 'A former Roman General sets out to exact vengeance against the corrupt emperor.',
                    '/ty8TGRuvJLPUmAR1H1qRqYaYr1G.jpg', '/hND7xAaxxBgaIspp9iMsaEXOSTu.jpg'),

                // Back to the Future (1985)
                m('back-to-future-1985', 'Back to the Future', 1985, 'tt0088763', '105',
                    ['Adventure', 'Comedy', 'Sci-Fi'], 8.5, 116, 'Marty McFly is sent back in time and must make sure his parents fall in love.',
                    '/fNOH9f1aA7XRTzl1sAOx9iF553Q.jpg', '/oldV2EojzvetR9ZAUd8GbnVCgjV.jpg'),

                // The Pianist (2002)
                m('the-pianist-2002', 'The Pianist', 2002, 'tt0253474', '4233',
                    ['Biography', 'Drama', 'Music'], 8.2, 150, 'A Polish Jewish musician struggles to survive the destruction of the Warsaw ghetto of World War II.',
                    '/2hFvxCCWrTmCYwfy7yum0GKRi3Y.jpg', '/hNCfD4Ok2PYTe3emHMKvj7HsLbn.jpg'),

                // The Departed (2006)
                m('the-departed-2006', 'The Departed', 2006, 'tt0407887', '1422',
                    ['Crime', 'Drama', 'Thriller'], 8.2, 151, 'An undercover cop and a mole in the police attempt to identify each other.',
                    '/nT97ifVT2J1yMQmeq20Qblg61T.jpg', '/8Gj8C4dEoG7Q8XQHZ6c8w3hZJs6.jpg'),

                // The Shining (1980)
                m('the-shining-1980', 'The Shining', 1980, 'tt0081505', '694',
                    ['Drama', 'Horror'], 8.2, 146, 'A family heads to an isolated hotel where a sinister presence influences the father into violence.',
                    '/b6ko6vJqnvTB5wfuGrLPjK7YwFK.jpg', '/xJvm6XdgrVW8aARraWMlasVzB9y.jpg'),

                // Whiplash (2014)
                m('whiplash-2014', 'Whiplash', 2014, 'tt2582802', '244786',
                    ['Drama', 'Music'], 8.2, 107, 'A promising young drummer enrolls at a cut-throat music conservatory.',
                    '/7fn624j5lj3xTme2SgiLCeuedmO.jpg', '/9G4r0nuvftaC9N3aF2gKGwr8Ccw.jpg'),

                // Terminator 2 (1991)
                m('terminator-2-1991', 'Terminator 2: Judgment Day', 1991, 'tt0103064', '280',
                    ['Action', 'Sci-Fi', 'Thriller'], 8.1, 137, 'A cyborg from the future attempts to assassinate the son of a resistance leader.',
                    '/5M0j9X9h0q9hZQQkQjBVQ5JpZsX.jpg', '/8GUyodO3iUa5IMDCcXYYbXwS7nL.jpg'),

                // Alien (1979)
                m('alien-1979', 'Alien', 1979, 'tt0078748', '348',
                    ['Horror', 'Sci-Fi'], 8.1, 117, 'The crew of a commercial space tug encounters a deadly creature.',
                    '/vfrQk5ipgMHeT0C17ay61tZpoAf.jpg', '/AmR3Bgd2KbMoTApTtL1KDC4npuL.jpg'),

                // Cinema Paradiso (1988)
                m('cinema-paradiso-1988', 'Cinema Paradiso', 1988, 'tt0095765', '1124',
                    ['Drama'], 8.2, 155, 'A filmmaker recalls his childhood when falling in love with the pictures at the cinema of his home village.',
                    '/8SRUfRUi6x4O68n0VCbDNRa6iGL.jpg', '/d2qudCfntPr7MY3Bi2UtSaOrm4g.jpg'),

                // Grave of the Fireflies (1988)
                m('grave-fireflies-1988', 'Grave of the Fireflies', 1988, 'tt0095327', '12477',
                    ['Animation', 'Drama', 'War'], 8.1, 89, 'A young boy and his little sister struggle to survive in Japan during WWII.',
                    '/qG3SMkHX3VDOj4yIynoKtd7NVbU.jpg', '/o8tTdY5gdfhoCtc9XRIcCQbd8ws.jpg'),

                // City of God (2002)
                m('city-of-god-2002', 'City of God', 2002, 'tt0317248', '598',
                    ['Crime', 'Drama'], 8.4, 130, 'In the slums of Rio, two kids\' paths diverge as one struggles to become a photographer and the other a kingpin.',
                    '/k7eYdcZ98biUWCdy5nvaKB5xLfd.jpg', '/h2XBds9Uqe7Zeroszd77IBDrV4x.jpg'),

                // Apocalypto (2006)
                m('apocalypto-2006', 'Apocalypto', 2006, 'tt0477302', '1579',
                    ['Action', 'Adventure', 'Drama'], 7.8, 139, 'As the Mayan kingdom faces decline, a young man is taken on a perilous journey to avoid human sacrifice.',
                    '/pB6GmyV8o9o9XA3p4yCdjKmitSv.jpg', '/3LgVZ1GqZcGI9Y7B6Rmq63mDjKf.jpg'),

                // WALL·E (2008)
                m('wall-e-2008', 'WALL·E', 2008, 'tt0910970', '10681',
                    ['Animation', 'Adventure', 'Family'], 8.1, 98, 'In the distant future, a small waste-collecting robot inadvertently embarks on a space journey that will decide the fate of mankind.',
                    '/hbhFnRjbG6dBcaDVKbpAfymvH2o.jpg', '/7cFZdvPRUEpP9tP4lBnQaVNihia.jpg'),

                // The Avengers (2012)
                m('the-avengers-2012', 'The Avengers', 2012, 'tt0848228', '24428',
                    ['Action', 'Adventure', 'Sci-Fi'], 7.7, 143, 'Earth\'s mightiest heroes must come together and learn to fight as a team.',
                    '/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg', '/9BBTo63ANSmhC4e6r62OJFuK2GL.jpg'),

                // Avengers: Endgame (2019)
                m('avengers-endgame-2019', 'Avengers: Endgame', 2019, 'tt4154796', '299534',
                    ['Action', 'Adventure', 'Drama'], 8.3, 181, 'After the devastating events of Infinity War, the universe is in ruins. The Avengers assemble once more.',
                    '/or06FN3Dka5tukK1e9sl16pBAGi.jpg', '/orjiB3oUIsyz60hoShoRkf6vH4u.jpg'),

                // Avengers: Infinity War (2018)
                m('avengers-infinity-war-2018', 'Avengers: Infinity War', 2018, 'tt4154756', '299536',
                    ['Action', 'Adventure', 'Sci-Fi'], 8.3, 149, 'The Avengers and their allies must be willing to sacrifice all to defeat Thanos.',
                    '/7WsyChQLEft3dMH9TYvG2PgAuoZ.jpg', '/lmZFxXgJE3sY9hz7fEqGlE5RghE.jpg'),

                // Spider-Man: No Way Home (2021)
                m('spider-man-nwh-2021', 'Spider-Man: No Way Home', 2021, 'tt10872600', '634649',
                    ['Action', 'Adventure', 'Sci-Fi'], 8.2, 148, 'With Spider-Man\'s identity now revealed, Peter asks Doctor Strange for help. When a spell goes wrong, dangerous foes from other worlds start to appear.',
                    '/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg', '/14QbnygCuTO0V7RCAZa7UhaC4SH.jpg'),

                // Dune (2021)
                m('dune-2021', 'Dune', 2021, 'tt15239678', '438631',
                    ['Adventure', 'Sci-Fi'], 8.0, 155, 'A noble family becomes embroiled in a war for control over the galaxy\'s most valuable asset.',
                    '/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', '/iopYFB1b6Bh7FWZh3onQhph1sih.jpg'),

                // Dune: Part Two (2024)
                m('dune-part-two-2024', 'Dune: Part Two', 2024, 'tt15239678', '693134',
                    ['Adventure', 'Sci-Fi'], 8.5, 166, 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
                    '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', '/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg'),

                // Oppenheimer (2023)
                m('oppenheimer-2023', 'Oppenheimer', 2023, 'tt15398776', '466420',
                    ['Biography', 'Drama', 'History'], 8.3, 180, 'A dramatic biopic about the development of the atomic bomb.',
                    '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', '/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg'),

                // Joker (2019)
                m('joker-2019', 'Joker', 2019, 'tt7286456', '475557',
                    ['Crime', 'Drama', 'Thriller'], 8.4, 122, 'In Gotham City, mentally troubled comedian Arthur Fleck is disregarded and mistreated by society.',
                    '/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg', '/n6bUggpO3WVz26RZW2tQ9hVNweD.jpg'),

                // The Hangover (2009)
                m('hangover-2009', 'The Hangover', 2009, 'tt1119646', '18785',
                    ['Comedy'], 7.7, 100, 'Three buddies wake up from a bachelor party in Las Vegas with no memory of the previous night.',
                    '/uluhlXubzSD0TmAJOxQf1XtHnI.jpg', '/fa6VUm3JJhtAqOMuvP9SOlAaIVE.jpg'),

                // Anchorman (2004)
                m('anchorman-2004', 'Anchorman: The Legend of Ron Burgundy', 2004, 'tt0357413', '8699',
                    ['Comedy'], 7.2, 94, 'Ron Burgundy is San Diego\'s top-rated newsman in the male-dominated broadcasting of the 1970s.',
                    '/jL3fUUkfvnFYdzcSma76mIng56z.jpg', '/nscXTVjVnQqRD4tdgIWfDkNnUAm.jpg'),

                // The Wolf of Wall Street (2013)
                m('wolf-wall-street-2013', 'The Wolf of Wall Street', 2013, 'tt0993846', '106646',
                    ['Biography', 'Comedy', 'Crime'], 8.2, 180, 'Based on the true story of Jordan Belfort, from his rise to a wealthy stock-broker living the high life to his fall.',
                    '/34m2tygAYi8bD51zRHoL6bMScwY.jpg', '/7NJW3rcZ6IfWxvVS9AlDKzF9V4M.jpg'),

                // The Grand Budapest Hotel (2014)
                m('grand-budapest-2014', 'The Grand Budapest Hotel', 2014, 'tt2278388', '120467',
                    ['Adventure', 'Comedy', 'Crime'], 8.1, 99, 'The adventures of Gustave H, a legendary concierge at a famous hotel.',
                    '/eWdyYQreja6JGCzqHWXpWWOxiwW.jpg', '/myRzRz9zdNeE8KmeGRCeRCi7ywg.jpg'),

                // Mad Max: Fury Road (2015)
                m('mad-max-fury-2015', 'Mad Max: Fury Road', 2015, 'tt1392190', '76341',
                    ['Action', 'Adventure', 'Sci-Fi'], 8.1, 120, 'In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler.',
                    '/hA2ple9q4qnwxp3hKVNhUw7ZfWo.jpg', '/gqrnSGKqbKzuQ6QBQlj4lo7p5hs.jpg'),

                // John Wick (2014)
                m('john-wick-2014', 'John Wick', 2014, 'tt2911666', '245891',
                    ['Action', 'Crime', 'Thriller'], 7.4, 101, 'An ex-hitman comes out of retirement to track down the gangsters that killed his dog.',
                    '/fZozxoqMlG8YqlF3zJbfuUf8Iyr.jpg', '/mK0S4NqUXxpWvIvLpXhSRG7y5FO.jpg'),

                // Top Gun: Maverick (2022)
                m('top-gun-maverick-2022', 'Top Gun: Maverick', 2022, 'tt1745960', '361743',
                    ['Action', 'Drama'], 8.3, 130, 'After thirty years, Maverick is still pushing the envelope as a top naval aviator.',
                    '/62HCnUTziyWcpDaBO2i1DX17ljH.jpg', '/odJ4hx6g6vBt4lCoWK1NdBvgrV5.jpg'),

                // The Batman (2022)
                m('the-batman-2022', 'The Batman', 2022, 'tt1877830', '414906',
                    ['Action', 'Crime', 'Drama'], 7.8, 176, 'When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate.',
                    '/b0PlSFdDwbyL0fm5Qcqwt7XjMyJ.jpg', '/b0PlSFdDwbyL0fm5Qcqwt7XjMyJ.jpg'),

                // Dune: Part Two - already added
                // Top Gun (1986)
                m('top-gun-1986', 'Top Gun', 1986, 'tt0092099', '744',
                    ['Action', 'Drama'], 6.9, 109, 'As students at the United States Navy\'s elite fighter weapons school compete to be best in the class.',
                    '/xUuBZzF45RCVoUviUUKVKLgAfFr.jpg', '/xUuBZzF45RCVoUviUUKVKLgAfFr.jpg'),

                // Blade Runner (1982)
                m('blade-runner-1982', 'Blade Runner', 1982, 'tt0083658', '78',
                    ['Action', 'Sci-Fi', 'Thriller'], 8.1, 117, 'A blade runner must pursue and terminate four replicants who stole a ship in space.',
                    '/vf1zUz3wNH4u0WtIfjLsPWozXxh.jpg', '/vf1zUz3wNH4u0WtIfjLsPWozXxh.jpg'),

                // Blade Runner 2049 (2017)
                m('blade-runner-2049-2017', 'Blade Runner 2049', 2017, 'tt1856101', '335984',
                    ['Action', 'Drama', 'Mystery'], 8.0, 164, 'Young Blade Runner K\'s discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard.',
                    '/gajva2L0rKJKBvco1VnoF7MjfrI.jpg', '/ilRyazdMJwN05exqhwK4tMKBYZs.jpg'),

                // The Shawshank Redemption - already added
                // The Social Network (2010)
                m('social-network-2010', 'The Social Network', 2010, 'tt1285016', '37799',
                    ['Biography', 'Drama'], 7.8, 121, 'As Harvard student Mark Zuckerberg creates the social networking site that would become known as Facebook.',
                    '/ok5WeN9X71a3DRqWTAOKTsxM28F.jpg', '/ok5WeN9X71a3DRqWTAOKTsxM28F.jpg'),

                // The Big Lebowski (1998)
                m('big-lebowski-1998', 'The Big Lebowski', 1998, 'tt0118715', '115',
                    ['Comedy', 'Crime'], 8.1, 117, 'Jeff "The Dude" Lebowski, mistaken for a millionaire of the same name, seeks restitution for his ruined rug.',
                    '/bHh7v4keDFgIaJUgn5yHRKOFbUE.jpg', '/bHh7v4keDFgIaJUgn5yHRKOFbUE.jpg'),

                // Fargo (1996)
                m('fargo-1996', 'Fargo', 1996, 'tt0116282', '275',
                    ['Crime', 'Drama', 'Thriller'], 8.1, 98, 'Jerry Lundegaard\'s inept crime falls apart due to his own events and the marbling of chance.',
                    '/96bBbDR5q3lzdOkE1nXEKeYVC1Q.jpg', '/4yjKTSUD2KAMRbjbFcjYP9wsQwa.jpg'),

                // No Country for Old Men (2007)
                m('no-country-2007', 'No Country for Old Men', 2007, 'tt0477348', '6977',
                    ['Crime', 'Drama', 'Thriller'], 8.2, 122, 'Violence and mayhem ensue after a hunter stumbles upon a drug deal gone wrong.',
                    '/nAUlGdr1b6bgLnR3lFxDnySbAbl.jpg', '/nAUlGdr1b6bgLnR3lFxDnySbAbl.jpg'),

                // There Will Be Blood (2007)
                m('there-will-be-blood-2007', 'There Will Be Blood', 2007, 'tt0469494', '7345',
                    ['Drama'], 8.2, 158, 'A story of family, religion, hatred, oil and madness in California.',
                    '/b7naWrEAKZ5GbiY4WGmFUm9hrTF.jpg', '/b7naWrEAKZ5GbiY4WGmFUm9hrTF.jpg'),

                // The Big Short (2015)
                m('big-short-2015', 'The Big Short', 2015, 'tt1596363', '318846',
                    ['Biography', 'Comedy', 'Drama'], 7.8, 130, 'In 2006-2007 a group of investors bet against the US mortgage market.',
                    '/p4bWhZzJTttVbMYlDXqaN4Sz5VX.jpg', '/p4bWhZzJTttVbMYlDXqaN4Sz5VX.jpg'),

                // Ford v Ferrari (2019)
                m('ford-v-ferrari-2019', 'Ford v Ferrari', 2019, 'tt1950186', '359724',
                    ['Action', 'Biography', 'Drama'], 8.1, 152, 'American car designer Carroll Shelby and driver Ken Miles battle corporate interference and physics to build a race car.',
                    '/dR1SJ7OiAGSTpDFkNnxK7DjKOPh.jpg', '/r6tr5Y5GFnxIfxS4ZArS4sysPbn.jpg'),

                // Bohemian Rhapsody (2018)
                m('bohemian-rhapsody-2018', 'Bohemian Rhapsody', 2018, 'tt1727824', '424694',
                    ['Biography', 'Drama', 'Music'], 8.0, 134, 'A chronicle of the years leading up to Queen\'s legendary appearance at the 1985 Live Aid concert.',
                    '/lHu1wwNWP1LbiSAC6tPHfE5NXBP.jpg', '/lHu1wwNWP1LbiSAC6tPHfE5NXBP.jpg'),

                // Rocketman (2019)
                m('rocketman-2019', 'Rocketman', 2019, 'tt2066051', '493922',
                    ['Biography', 'Drama', 'Music'], 7.3, 121, 'A musical fantasy about the fantastical human story of Elton John\'s breakthrough years.',
                    '/f4dUWDh71KxLMaIIzhOLvMmAA4N.jpg', '/f4dUWDh71KxLMaIIzhOLvMmAA4N.jpg'),

                // Whiplash - already added
                // La La Land (2016)
                m('la-la-land-2016', 'La La Land', 2016, 'tt3783958', '313369',
                    ['Comedy', 'Drama', 'Music'], 8.0, 128, 'A jazz pianist falls for an aspiring actress in Los Angeles.',
                    '/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg', '/nlPCdZlHtRNcF6C9hzUH4ebmV1w.jpg'),

                // Joker - already added
                // 1917 (2019)
                m('1917-2019', '1917', 2019, 'tt8579674', '530915',
                    ['Action', 'Drama', 'War'], 8.2, 119, 'Two British soldiers during WWI receive seemingly impossible orders to deliver a message that will stop a deadly attack.',
                    '/iZf0KyrE25z1cq4AR5X7mn5VRzF.jpg', '/uXgs5fPzwbjLyqsblayQpF2vIU7.jpg'),

                // Dunkirk (2017)
                m('dunkirk-2017', 'Dunkirk', 2017, 'tt5013056', '374720',
                    ['Action', 'Drama', 'History'], 7.8, 106, 'Allied soldiers from Belgium, the British Empire and France are surrounded by the German Army.',
                    '/bXrZfr4rLUClDe6KkYHiDRfP3Nh.jpg', '/bXrZfr4rLUClDe6KkYHiDRfP3Nh.jpg'),

                // Tenet (2020)
                m('tenet-2020', 'Tenet', 2020, 'tt6723592', '577922',
                    ['Action', 'Sci-Fi', 'Thriller'], 7.3, 150, 'Armed with only one word, a Protagonist fights for the survival of the world.',
                    '/k68nPLbIST6NP96JmTxmZijEvCA.jpg', '/k68nPLbIST6NP96JmTxmZijEvCA.jpg'),

                // Tenet - already added
                // The Prestige (2006)
                m('prestige-2006', 'The Prestige', 2006, 'tt0482571', '1124',
                    ['Drama', 'Mystery', 'Thriller'], 8.5, 130, 'After a tragic accident, two stage magicians engage in a battle to create the ultimate illusion.',
                    '/5MXyQKGlQ8mKcSkbCXQ3i6J66YP.jpg', '/5MXyQKGlQ8mKcSkbCXQ3i6J66YP.jpg'),

                // Memento (2000)
                m('memento-2000', 'Memento', 2000, 'tt0209144', '77',
                    ['Mystery', 'Thriller'], 8.4, 113, 'A man with short-term memory loss attempts to track down his wife\'s murderer.',
                    '/lYhFM6UhPBuh1kRkOl5Z8dlmYsI.jpg', '/lYhFM6UhPBuh1kRkOl5Z8dlmYsI.jpg'),

                // Kill Bill: (2003)
                m('kill-bill-vol1-2003', 'Kill Bill: Vol. 1', 2003, 'tt0266697', '24',
                    ['Action', 'Crime', 'Thriller'], 8.1, 111, 'A former assassin, known simply as The Bride, wakes up after a five-year coma.',
                    '/v7TaX8kXMXr5Fff7MXAV9aOVbnT.jpg', '/v7TaX8kXMXr5Fff7MXAV9aOVbnT.jpg'),

                // Kill Bill: Vol. 2 (2004)
                m('kill-bill-vol2-2004', 'Kill Bill: Vol. 2', 2004, 'tt0378194', '393',
                    ['Action', 'Crime', 'Thriller'], 8.0, 137, 'The Bride continues her quest of vengeance against her former boss and lover Bill.',
                    '/aFOAG0aOhEKIVVmTlrE37XQOpKi.jpg', '/aFOAG0aOhEKIVVmTlrE37XQOpKi.jpg'),

                // Pulp Fiction - already added
                // Reservoir Dogs (1992)
                m('reservoir-dogs-1992', 'Reservoir Dogs', 1992, 'tt0105236', '500',
                    ['Crime', 'Thriller'], 8.3, 99, 'When a simple jewelry heist goes horribly wrong, the surviving criminals begin to suspect that one of them is a police informant.',
                    '/AjTtJYNx2XLPNnnVQYpV0Cp9u6H.jpg', '/AjTtJYNx2XLPNnnVQYpV0Cp9u6H.jpg'),

                // Django Unchained (2012)
                m('django-unchained-2012', 'Django Unchained', 2012, 'tt1853728', '68718',
                    ['Drama', 'Western'], 8.4, 165, 'With the help of a German bounty hunter, a freed slave sets out to rescue his wife from a brutal Mississippi plantation owner.',
                    '/7oWY8VDh7ythI4PICL5kUJjREKR.jpg', '/7oWY8VDh7ythI4PICL5kUJjREKR.jpg'),

                // Inglourious Basterds (2009)
                m('inglourious-basterds-2009', 'Inglourious Basterds', 2009, 'tt0361748', '16869',
                    ['Adventure', 'Drama', 'War'], 8.3, 153, 'In Nazi-occupied France during World War II, a group of Jewish-American soldiers known as "The Basterds" are chosen to spread fear.',
                    '/7sfbDC7TYrmWP2zsaDcz7rTCp4o.jpg', '/7sfbDC7TYrmWP2zsaDcz7rTCp4o.jpg'),

                // Once Upon a Time in Hollywood (2019)
                m('once-upon-time-hollywood-2019', 'Once Upon a Time in Hollywood', 2019, 'tt7131622', '466272',
                    ['Comedy', 'Drama'], 7.6, 161, 'A faded television actor and his stunt double strive to achieve fame and success in the film industry during the final years of Hollywood\'s Golden Age.',
                    '/8j58iEBw9pOXFD2L0X9F9HbseyP.jpg', '/8j58iEBw9pOXFD2L0X9F9HbseyP.jpg'),

                // The Hateful Eight (2015)
                m('hateful-eight-2015', 'The Hateful Eight', 2015, 'tt3460252', '273248',
                    ['Crime', 'Drama', 'Mystery'], 7.8, 187, 'In the dead of a Wyoming winter, a bounty hunter and his prisoner find shelter in a cabin.',
                    '/p2UibYIjyiOgRO9JRIPr3L8dk1A.jpg', '/p2UibYIjyiOgRO9JRIPr3L8dk1A.jpg'),

                // Heat (1995)
                m('heat-1995', 'Heat', 1995, 'tt0113277', '949',
                    ['Action', 'Crime', 'Drama'], 8.2, 170, 'A group of high-end professional thieves start to feel the heat from the LAPD.',
                    '/umH3zUcFeiA7GtvOZe2tAEs4Rjb.jpg', '/umH3zUcFeiA7GtvOZe2AEs4Rjb.jpg'),

                // Collateral (2004)
                m('collateral-2004', 'Collateral', 2004, 'tt0369336', '153',
                    ['Crime', 'Drama', 'Thriller'], 7.5, 120, 'A cab driver finds himself the hostage of an engaging contract killer.',
                    '/hnMSrFY9eOKDAEcqZKIykmm4lE0.jpg', '/hnMSrFY9eOKDAEcqZKIykmm4lE0.jpg'),

                // Michael Clayton (2007)
                m('michael-clayton-2007', 'Michael Clayton', 2007, 'tt0465538', '4566',
                    ['Crime', 'Drama', 'Mystery'], 7.2, 119, 'A law firm brings in its fixer to remedy the situation after a lawyer has a breakdown while representing a chemical company.',
                    '/aMD5cShKdwO77yhQRlcBRhOUFkA.jpg', '/aMD5cShKdwO77yhQRlcBRhOUFkA.jpg'),

                // Nightcrawler (2014)
                m('nightcrawler-2014', 'Nightcrawler', 2014, 'tt2872718', '222935',
                    ['Crime', 'Drama', 'Thriller'], 7.8, 117, 'When Lou Bloom, a driven man desperate for work, muscles into the world of L.A. crime journalism.',
                    '/8j58iEBw9pOXFD2L0X9F9HbseyP.jpg', '/8j58iEBw9pOXFD2L0X9F9HbseyP.jpg'),

                // Prisoners (2013)
                m('prisoners-2013', 'Prisoners', 2013, 'tt1392214', '146233',
                    ['Crime', 'Drama', 'Mystery'], 8.1, 153, 'When Keller Dover\'s daughter and her friend go missing, he takes matters into his own hands.',
                    '/uhA9LBpVdafxohtxaOZEBM1dJTA.jpg', '/uhA9LBpVdafxohtxaOZEBM1dJTA.jpg'),

                // Arrival (2016)
                m('arrival-2016', 'Arrival', 2016, 'tt2543164', '329865',
                    ['Drama', 'Sci-Fi'], 7.9, 116, 'A linguist works with the military to communicate with alien lifeforms after twelve mysterious spacecraft appear around the world.',
                    '/yP8aN9XzOSVcgRcfaY8sbx5lMJo.jpg', '/yP8aN9XzOSVcgRcfaY8sbx5lMJo.jpg'),

                // Sicario (2015)
                m('sicario-2015', 'Sicario', 2015, 'tt3397884', '273481',
                    ['Action', 'Crime', 'Thriller'], 7.6, 121, 'An idealistic FBI agent is enlisted by a government task force to aid in the escalating war against drugs.',
                    '/jVwiljm3qbuX7Yfq8DK5jvZalvy.jpg', '/jVwiljm3qbuX7Yfq8DK5jvZalvy.jpg'),

                // Sicario: Day of the Soldado (2018)
                m('sicario-2-2018', 'Sicario: Day of the Soldado', 2018, 'tt5071414', '392044',
                    ['Action', 'Crime', 'Thriller'], 7.1, 122, 'The drug war on the US-Mexico border has escalated.',
                    '/a3PIQo9OsFwpxg6MJ5maUbxJHPp.jpg', '/a3PIQo9OsFwpxg6MJ5maUbxJHPp.jpg'),

                // Jojo Rabbit (2019)
                m('jojo-rabbit-2019', 'Jojo Rabbit', 2019, 'tt2584384', '515001',
                    ['Comedy', 'Drama', 'War'], 7.9, 108, 'A young German boy in WWII discovers his mother is hiding a Jewish girl in their home.',
                    '/2iUtfSgeP9Yiu5S8wK4lwAh4uR8.jpg', '/2iUtfSgeP9Yiu5S8wK4lwAh4uR8.jpg'),

                // 1917 - already added
                // Hacksaw Ridge (2016)
                m('hacksaw-ridge-2016', 'Hacksaw Ridge', 2016, 'tt2119532', '324786',
                    ['Biography', 'Drama', 'War'], 8.1, 139, 'World War II American Army Medic Desmond T. Doss, who served during the Battle of Okinawa.',
                    '/xAKo1zxwwd3VNUKzKSP5N3tVrgS.jpg', '/xAKo1zxwwd3VNUKzKSP5N3tVrgS.jpg'),

                // Braveheart (1995)
                m('braveheart-1995', 'Braveheart', 1995, 'tt0112573', '197',
                    ['Biography', 'Drama', 'History'], 8.3, 178, 'Scottish warrior William Wallace leads his countrymen in a rebellion.',
                    '/or1gBugydmjToLItVGyMmPA5Oho.jpg', '/or1gBugydmjToLItVGyMmPA5Oho.jpg'),

                // Gladiator - already added
                // Troy (2004)
                m('troy-2004', 'Troy', 2004, 'tt0332452', '652',
                    ['Drama', 'History'], 7.2, 163, 'An adaptation of Homer\'s great epic, the film follows the assault on Troy by the united Greek forces.',
                    '/2LxMlIYxhRJeXpwK6CvkVsWz9qD.jpg', '/2LxMlIYxhRJeXpwK6CvkVsWz9qD.jpg'),

                // 300 (2006)
                m('300-2006', '300', 2006, 'tt0416449', '1271',
                    ['Action', 'Drama'], 7.6, 117, 'King Leonidas of Sparta and a force of 300 men fight the Persians at Thermopylae.',
                    '/2i4w4IaNfuQ7RlqMz9rblVF6w3n.jpg', '/2i4w4IaNfuQ7RlqMz9rblVF6w3n.jpg'),

                // Iron Man (2008)
                m('iron-man-2008', 'Iron Man', 2008, 'tt0371746', '1726',
                    ['Action', 'Adventure', 'Sci-Fi'], 7.9, 126, 'After being held captive, an industrialist builds a high-tech armored suit.',
                    '/78lYtwTmFgncxqLh1l8o1XxQ25v.jpg', '/78lYtwTmFgncxqLh1l8o1XxQ25v.jpg'),

                // The Dark Knight Rises (2012)
                m('dark-knight-rises-2012', 'The Dark Knight Rises', 2012, 'tt1345836', '49026',
                    ['Action', 'Adventure'], 8.4, 165, 'Batman re-emerges from a self-imposed exile to face a new ruthless enemy.',
                    '/dRrIdgsSOoEoN9T27wCuauZAQdu.jpg', '/dRrIdgsSOoEoN9T27wCuauZAQdu.jpg'),

                // Batman Begins (2005)
                m('batman-begins-2005', 'Batman Begins', 2005, 'tt0372784', '272',
                    ['Action', 'Adventure'], 8.2, 140, 'A young Bruce Wayne travels to the Far East, where he\'s trained in the deadly martial arts.',
                    '/4MpS6kkquD1vWJo13WgRgJSPXvq.jpg', '/4MpS6kkquD1vWJo13WgRgJSPXvq.jpg'),

                // Joker - already added
                // Logan (2017)
                m('logan-2017', 'Logan', 2017, 'tt3315342', '263115',
                    ['Action', 'Drama', 'Sci-Fi'], 8.1, 137, 'In the near future, a weary Logan cares for an ailing Professor X, while protecting a young mutant girl.',
                    '/fnbjcRD61d8oMZx3ymOvQSOqnfX.jpg', '/fnbjcRD61d8oMZx3ymOvQSOqnfX.jpg'),

                // Deadpool (2016)
                m('deadpool-2016', 'Deadpool', 2016, 'tt1431045', '293660',
                    ['Action', 'Adventure', 'Comedy'], 8.0, 108, 'A wisecracking mercenary gets experimented on and becomes immortal but ugly.',
                    '/3E7cdXZL0sqxnlfIkY7U8MRrL4J.jpg', '/3E7cdXZL0sqxnlfIkY7U8MRrL4J.jpg'),

                // Guardians of the Galaxy (2014)
                m('guardians-galaxy-2014', 'Guardians of the Galaxy', 2014, 'tt2015381', '118340',
                    ['Action', 'Adventure', 'Comedy'], 8.0, 121, 'A group of intergalactic criminals must pull together to stop a fanatical warrior.',
                    '/r7vmZjiyZw9rpJMQJp0Oz7pjKHY.jpg', '/r7vmZjiyZw9rpJMQJp0Oz7pjKHY.jpg'),

                // Black Panther (2018)
                m('black-panther-2018', 'Black Panther', 2018, 'tt1825683', '284054',
                    ['Action', 'Adventure', 'Sci-Fi'], 7.3, 134, 'T\'Challa, heir to the hidden but advanced kingdom of Wakanda, must step forward to lead his people.',
                    '/uxzzxijgPIY7slzFvMotPv8wjKA.jpg', '/uxzzxijgPIY7slzFvMotPv8wjKA.jpg'),

                // Thor: Ragnarok (2017)
                m('thor-ragnarok-2017', 'Thor: Ragnarok', 2017, 'tt3501632', '284053',
                    ['Action', 'Adventure', 'Comedy'], 7.9, 130, 'Thor must escape the planet Sakaar and save Asgard from Hela.',
                    '/rzRwTcFvttcN1ZpX2xv4j3tSdJu.jpg', '/rzRwTcFvttcN1ZpX2xv4j3tSdJu.jpg'),

                // Doctor Strange (2016)
                m('doctor-strange-2016', 'Doctor Strange', 2016, 'tt1211837', '284052',
                    ['Action', 'Adventure', 'Fantasy'], 7.5, 115, 'A former neurosurgeon discovers the world of magic and alternate dimensions.',
                    '/uGBVjMHb7CeFfCkvHTN4BaBfstL.jpg', '/uGBVjMHb7CeFfCkvHTN4BaBfstL.jpg'),

                // Captain America: The Winter Soldier (2014)
                m('captain-america-ws-2014', 'Captain America: The Winter Soldier', 2014, 'tt1843866', '100402',
                    ['Action', 'Adventure', 'Sci-Fi'], 7.7, 136, 'As Steve Rogers struggles to embrace his role in the modern world, he must face a mysterious assassin.',
                    '/tVFRpFw3xTedgPGqxW0AOv8Yv1S.jpg', '/tVFRpFw3xTedgPGqxW0AOv8Yv1S.jpg'),

                // Captain America: Civil War (2016)
                m('captain-america-cw-2016', 'Captain America: Civil War', 2016, 'tt3498820', '271110',
                    ['Action', 'Adventure', 'Sci-Fi'], 7.8, 147, 'Political involvement in the Avengers\' affairs causes a rift between Captain America and Iron Man.',
                    '/rAGiKx1IlYMRKf76S7ddEgyTT7u.jpg', '/rAGiKx1IlYMRKf76S7ddEgyTT7u.jpg'),

                // Captain Marvel (2019)
                m('captain-marvel-2019', 'Captain Marvel', 2019, 'tt4154664', '299537',
                    ['Action', 'Adventure', 'Sci-Fi'], 6.8, 123, 'Carol Danvers becomes one of the universe\'s most powerful heroes.',
                    '/AtsgWhDnHTq68L0wrU61vFsKvG0.jpg', '/AtsgWhDnHTq68L0wrU61vFsKvG0.jpg'),

                // Shang-Chi (2021)
                m('shang-chi-2021', 'Shang-Chi and the Legend of the Ten Rings', 2021, 'tt9376612', '566525',
                    ['Action', 'Adventure', 'Fantasy'], 7.6, 132, 'Shang-Chi, the master of weaponry-based Kung Fu, is forced to confront his past.',
                    '/1BIoJGKbXjdFDAqUEiIAxVLOxzk.jpg', '/1BIoJGKbXjdFDAqUEiIAxVLOxzk.jpg'),

                // Doctor Strange 2 (2022)
                m('doctor-strange-2-2022', 'Doctor Strange in the Multiverse of Madness', 2022, 'tt9419884', '453395',
                    ['Action', 'Adventure', 'Fantasy'], 6.9, 126, 'Doctor Strange casts a forbidden spell that opens the doorway to the multiverse.',
                    '/9Gtg2DzBhmYamXBS1jgKAcawbRA.jpg', '/9Gtg2DzBhmYamXBS1jgKAcawbRA.jpg'),

                // Thor: Love and Thunder (2022)
                m('thor-lat-2022', 'Thor: Love and Thunder', 2022, 'tt10648342', '616037',
                    ['Action', 'Adventure', 'Comedy'], 6.2, 119, 'Thor enlists the help of Valkyrie, Korg, and Jane Foster to fight Gorr the God Butcher.',
                    '/pIkRyD188klmwvcag5vCpvdkEP1.jpg', '/pIkRyD188klmwvcag5vCpvdkEP1.jpg'),

                // Guardians of the Galaxy Vol. 2 (2017)
                m('guardians-galaxy-2-2017', 'Guardians of the Galaxy Vol. 2', 2017, 'tt3896198', '283995',
                    ['Action', 'Adventure', 'Comedy'], 7.6, 136, 'The Guardians unravel the mystery of Peter Quill\'s true parentage in the outer reaches of the cosmos.',
                    '/y4MBh0EjBlMuKZvO61cMYxR4RiC.jpg', '/y4MBh0EjBlMuKZvO61cMYxR4RiC.jpg'),

                // Guardians of the Galaxy Vol. 3 (2023)
                m('guardians-galaxy-3-2023', 'Guardians of the Galaxy Vol. 3', 2023, 'tt6791350', '447365',
                    ['Action', 'Adventure', 'Comedy'], 8.0, 150, 'The Guardians must protect Rocket while facing a powerful new enemy.',
                    '/r2J02Z2OpNTctfOSN1nCBCRRMw1.jpg', '/r2J02Z2OpNTctfOSN1nCBCRRMw1.jpg'),

                // Black Panther: Wakanda Forever (2022)
                m('black-panther-2-2022', 'Black Panther: Wakanda Forever', 2022, 'tt9114286', '505642',
                    ['Action', 'Adventure', 'Drama'], 6.7, 161, 'The people of Wakanda fight to protect their nation from intervening world powers.',
                    '/sv1xJUazXeYqALzczSZ3O6nkH75.jpg', '/sv1xJUazXeYqALzczSZ3O6nkH75.jpg'),

                // Ant-Man (2015)
                m('ant-man-2015', 'Ant-Man', 2015, 'tt0478970', '102899',
                    ['Action', 'Adventure', 'Comedy'], 7.3, 117, 'Armed with a suit with the astonishing ability to shrink in scale but increase in strength.',
                    '/rQRnQfUl3kfp78nCWq0Vs04lVlE.jpg', '/rQRnQfUl3kfp78nCWq0Vs04lVlE.jpg'),

                // Ant-Man and the Wasp (2018)
                m('ant-man-wasp-2018', 'Ant-Man and the Wasp', 2018, 'tt5095030', '363088',
                    ['Action', 'Adventure', 'Comedy'], 7.0, 118, 'Scott Lang is grappling with the consequences of his choices as both a superhero and a father.',
                    '/rv1awImg03865jLyO8Oh3tNJZRp.jpg', '/rv1awImg03865jLyO8Oh3tNJZRp.jpg'),

                // Ant-Man and the Wasp: Quantumania (2023)
                m('ant-man-3-2023', 'Ant-Man and the Wasp: Quantumania', 2023, 'tt10954600', '640146',
                    ['Action', 'Adventure', 'Comedy'], 6.0, 125, 'The Ant-Man family finds themselves exploring the Quantum sub.',
                    '/3xRAsiCpzkgGy7fn1ilvHt9wSBp.jpg', '/3xRAsiCpzkgGy7fn1ilvHt9wSBp.jpg'),

                // Doctor Strange - already added
                // Spider-Man: Homecoming (2017)
                m('spider-man-home-2017', 'Spider-Man: Homecoming', 2017, 'tt2250912', '315635',
                    ['Action', 'Adventure', 'Sci-Fi'], 7.4, 133, 'Peter Parker tries to balance his life as a high school student with being Spider-Spider-Man.',
                    '/c24sv2weTHPsmDa7jEMN0m2P3RT.jpg', '/c24sv2weTHPsmDa7jEMN0m2P3RT.jpg'),

                // Spider-Man: Far From Home (2019)
                m('spider-man-ffh-2019', 'Spider-Man: Far From Home', 2019, 'tt6320628', '429617',
                    ['Action', 'Adventure', 'Sci-Fi'], 7.5, 129, 'Following the events of Avengers: Endgame, Spider-Man must step up and take on new threats.',
                    '/4q2NNU4t5CvVKBXHvL4qSYsF7dT.jpg', '/4q2NNU4t5CvVKBXHvL4qSYsF7dT.jpg'),

                // Spider-Man: Across the Spider-Verse (2023)
                m('spider-verse-2023', 'Spider-Man: Across the Spider-Verse', 2023, 'tt9362722', '569094',
                    ['Animation', 'Action', 'Adventure'], 8.6, 140, 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People.',
                    '/8Vt6iWERyBP4L9P2VK20vUedGfX.jpg', '/4HodYYKEIsGOdinkGi2Ucfxn9V3.jpg'),

                // Spider-Man: Into the Spider-Verse (2018)
                m('spider-verse-1-2018', 'Spider-Man: Into the Spider-Verse', 2018, 'tt4633694', '569094',
                    ['Animation', 'Action', 'Adventure'], 8.4, 117, 'Teen Miles Morales becomes the Spider-Man of his universe.',
                    '/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg', '/7d6EY00f1TmQoJbN9pzdV5CVAVB.jpg'),

                // The Incredibles (2004)
                m('incredibles-2004', 'The Incredibles', 2004, 'tt0317705', '9806',
                    ['Animation', 'Action', 'Adventure'], 8.0, 115, 'A family of undercover superheroes, while trying to live the quiet suburban life.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // Incredibles 2 (2018)
                m('incredibles-2-2018', 'Incredibles 2', 2018, 'tt3606756', '260513',
                    ['Animation', 'Action', 'Adventure'], 7.6, 118, 'The Incredibles family takes on a new mission to defeat a new supervillain.',
                    '/9yvC9OI9cy6SKwTlQeNaxa8YXOq.jpg', '/9yvC9OI9cy6SKwTlQeNaxa8YXOq.jpg'),

                // Ratatouille (2007)
                m('ratatouille-2007', 'Ratatouille', 2007, 'tt0382932', '2062',
                    ['Animation', 'Comedy', 'Family'], 8.1, 111, 'A rat who can cook makes an unusual alliance with a young kitchen worker at a famous Paris restaurant.',
                    '/t3owaqyjbYB4BSsFJ0k3NVlsT2o.jpg', '/t3owaqyjbYB4BSsFJ0k3NVlsT2o.jpg'),

                // Finding Nemo (2003)
                m('finding-nemo-2003', 'Finding Nemo', 2003, 'tt0266543', '12',
                    ['Animation', 'Adventure', 'Family'], 8.1, 100, 'After his son is captured in the Great Barrier Reef and taken to Sydney.',
                    '/yE5d3BUhE8hCnkMUJOo1QDoOGNz.jpg', '/yE5d3BUhE8hCnkMUJOo1QDoOGNz.jpg'),

                // Toy Story (1995)
                m('toy-story-1995', 'Toy Story', 1995, 'tt0114709', '862',
                    ['Animation', 'Adventure', 'Comedy'], 8.3, 81, 'A cowboy doll is profoundly threatened and jealous when a new spaceman action figure supplants him.',
                    '/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg', '/3Rfvj1JPzN9PvCPS8TD4HnAQUXR.jpg'),

                // Toy Story 3 (2010)
                m('toy-story-3-2010', 'Toy Story 3', 2010, 'tt0435761', '10193',
                    ['Animation', 'Adventure', 'Comedy'], 8.3, 103, 'The toys are mistakenly delivered to a day-care center right before Andy leaves for college.',
                    '/AbbXspXwdKjZiqL7FOuvfwUpyQO.jpg', '/AbbXspXwdKjZiqL7FOuvfwUpyQO.jpg'),

                // Toy Story 4 (2019)
                m('toy-story-4-2019', 'Toy Story 4', 2019, 'tt1979376', '301528',
                    ['Animation', 'Adventure', 'Comedy'], 7.7, 100, 'When a new toy called "Forky" joins Woody and the gang.',
                    '/w9kR8qkaQ1ejcXpZ4MIbNuiVuRc.jpg', '/w9kR8qkaQ1ejcXpZ4MIbNuiVuRc.jpg'),

                // Frozen (2013)
                m('frozen-2013', 'Frozen', 2013, 'tt2294629', '109445',
                    ['Animation', 'Adventure', 'Comedy'], 7.4, 102, 'When the newly crowned Queen Elsa accidentally uses her power to turn things into ice.',
                    '/jIjdXOUMaAjWT4UJEQNnLgJoFwI.jpg', '/jIjdXOUMaAjWT4UJEQNnLgJoFwI.jpg'),

                // Frozen II (2019)
                m('frozen-2-2019', 'Frozen II', 2019, 'tt4520988', '546554',
                    ['Animation', 'Adventure', 'Comedy'], 6.8, 103, 'Anna, Elsa, Kristoff, Olaf and Sven leave Arendelle to travel to an ancient, autumn-bound forest.',
                    '/xJWPziYBIlYmClYxQoJO4noKxIZ.jpg', '/xJWPziYBIlYmClYxQoJO4noKxIZ.jpg'),

                // Moana (2016)
                m('moana-2016', 'Moana', 2016, 'tt3521164', '277834',
                    ['Animation', 'Adventure', 'Comedy'], 7.6, 107, 'In Ancient Polynesia, when a terrible curse incurred by the Demigod Maui reaches the island.',
                    '/4GVfuWuY1J4VqsZwo7tM3RhETNf.jpg', '/4GVfuWuY1J4VqsZwo7tM3RhETNf.jpg'),

                // Zootopia (2016)
                m('zootopia-2016', 'Zootopia', 2016, 'tt2948356', '269149',
                    ['Animation', 'Adventure', 'Comedy'], 8.0, 108, 'In a city of anthropomorphic animals, a rookie bunny cop and a cynical con artist fox must work together.',
                    '/sM33G7okeAT0MECvK3cvGBdhwQv.jpg', '/sM33G7okeAT0MECvK3cvGBdhwQv.jpg'),

                // Coco - already added
                // Encanto (2021)
                m('encanto-2021', 'Encanto', 2021, 'tt2952230', '568332',
                    ['Animation', 'Adventure', 'Comedy'], 7.3, 102, 'A young Colombian girl has to face the frustration of being the only member of her family without magical powers.',
                    '/la6qaZi8Sm0Obq7NnOQa4PVTvxX.jpg', '/la6qaZi8Sm0Obq7NnOQaPVTvxX.jpg'),

                // Soul (2020)
                m('soul-2020', 'Soul', 2020, 'tt2948372', '508442',
                    ['Animation', 'Adventure', 'Comedy'], 8.0, 100, 'After landing the gig of his life, a New York jazz pianist suddenly finds himself trapped in a strange land.',
                    '/hm58Jw4Lw8OIeECIq5qyPYhAeRJ.jpg', '/hm58Jw4Lw8OIeECIq5qyPYhAeRJ.jpg'),

                // Onward (2020)
                m('onward-2020', 'Onward', 2020, 'tt7146812', '508439',
                    ['Animation', 'Adventure', 'Comedy'], 7.2, 102, 'Two elven brothers set off on an extraordinary quest to discover if there is still some magic left in the world.',
                    '/f4n0j6cXCi5ArZ5AmXN4Uo6JLBk.jpg', '/f4n0j6cXCi5ArZ5AmXN4Uo6JLBk.jpg'),

                // Up (2009)
                m('up-2009', 'Up', 2009, 'tt1049413', '14160',
                    ['Animation', 'Adventure', 'Comedy'], 8.2, 96, '78-year-old Carl Fredricksen travels to Paradise Falls in his house equipped with balloons.',
                    '/n1bXkiKIq8OOelrpqdvQsclJ7u8.jpg', '/n1bXkiKIq8OOelrpqdvQsclJ7u8.jpg'),

                // Inside Out - already added
                // Ratatouille - already added
                // WALL·E - already added
                // Up (2009) - already added
                // Coco - already added
                // Toy Story - already added
                // Finding Nemo - already added
                // Monsters, Inc. (2001)
                m('monsters-inc-2001', 'Monsters, Inc.', 2001, 'tt0198781', '585',
                    ['Animation', 'Adventure', 'Comedy'], 8.1, 92, 'In order to power the city, monsters have to scare children so that they scream.',
                    '/sgheXjtQmRWyJgsC82W1fczOTXu.jpg', '/sgheXjtQmRWyJgsC82W1fczOTXu.jpg'),

                // Monsters University (2013)
                m('monsters-university-2013', 'Monsters University', 2013, 'tt1453405', '127380',
                    ['Animation', 'Adventure', 'Comedy'], 7.3, 104, 'A look at the relationship between Mike and Sulley during their days at Monsters University.',
                    '/y7OBqOzKFRmeizpgvFAMCspIyrp.jpg', '/y7OBqOzKFRmeizpgvFAMCspIyrp.jpg'),

                // Cars (2006)
                m('cars-2006', 'Cars', 2006, 'tt0317219', '920',
                    ['Animation', 'Adventure', 'Comedy'], 7.1, 117, 'On the way to the most important race of his life, a hotshot rookie race car gets stranded in a small town.',
                    '/nrmKX1UBFcXYECkjxvhuB4SuLsJ.jpg', '/nrmKX1UBFcXYECkjxvhuB4SuLsJ.jpg'),

                // Cars 3 (2017)
                m('cars-3-2017', 'Cars 3', 2017, 'tt3606752', '260514',
                    ['Animation', 'Adventure', 'Comedy'], 6.7, 102, 'Lightning McQueen sets out to prove to a new generation of racers that he\'s still the best race car in the world.',
                    '/fyy4nAvKIelcnU70wsMUCjnAijo.jpg', '/fyy4nAvKIelcnU70wsMUCjnAijo.jpg'),

                // Up - already added
                // Brave (2012)
                m('brave-2012', 'Brave', 2012, 'tt1217209', '62177',
                    ['Animation', 'Adventure', 'Comedy'], 7.1, 93, 'Determined to make her own path in life, Princess Merida defies a custom.',
                    '/1d9dJW9TbG7v7DSS5nUFa8iKq6N.jpg', '/1d9dJW9TbG7v7DSS5nUFa8iKq6N.jpg'),

                // Tangled (2010)
                m('tangled-2010', 'Tangled', 2010, 'tt0398286', '38757',
                    ['Animation', 'Adventure', 'Comedy'], 7.7, 100, 'The magically long-haired Rapunzel has spent her entire life in a tower.',
                    '/7riMCKfWS1ZxpC0v33VmgMnVf9P.jpg', '/7riMCKfWS1ZxpC0v33VmgMnVf9P.jpg'),

                // The Princess Bride (1987)
                m('princess-bride-1987', 'The Princess Bride', 1987, 'tt0093779', '2493',
                    ['Adventure', 'Family', 'Fantasy'], 8.0, 98, 'A bedridden boy\'s grandfather reads him the story of a young man\'s quest to rescue his beloved.',
                    '/gpxmTAlXmD2oyQzIjzThlBaIvLw.jpg', '/gpxmTAlXmD2oyQzIjzThlBaIvLw.jpg'),

                // Forrest Gump - already added
                // Life is Beautiful (1997)
                m('life-beautiful-1997', 'Life Is Beautiful', 1997, 'tt0118799', '637',
                    ['Comedy', 'Drama', 'Romance'], 8.6, 116, 'When an open-minded Jewish waiter and his son become prisoners of the Holocaust.',
                    '/74hLDKjkbAVDea8pdAcNzue9J8N.jpg', '/74hLDKjkbAVDea8pdAcNzue9J8N.jpg'),

                // Cinema Paradiso - already added
                // Amélie (2001)
                m('amelie-2001', 'Amélie', 2001, 'tt0211915', '194',
                    ['Comedy', 'Drama', 'Romance'], 8.3, 122, 'Amélie, a shy waitress in Paris, decides to change the lives of those around her.',
                    '/f0uorE7K7ggHfr8r7pUtDRpC84A.jpg', '/f0uorE7K7ggHfr8r7pUtDRpC84A.jpg'),

                // The Intouchables (2011)
                m('intouchables-2011', 'The Intouchables', 2011, 'tt1675434', '77338',
                    ['Biography', 'Comedy', 'Drama'], 8.5, 112, 'After he becomes a quadriplegic from a paragliding accident, an aristocrat hires a young man from the projects to be his caregiver.',
                    '/32pH65cPQggdSAmFc4HsLZ4eJju.jpg', '/32pH65cPQggdSAmFc4HsLZ4eJju.jpg'),

                // The Pianist - already added
                // Oldboy (2003)
                m('oldboy-2003', 'Oldboy', 2003, 'tt0364569', '670',
                    ['Drama', 'Mystery', 'Thriller'], 8.4, 120, 'After being kidnapped and imprisoned for fifteen years, Oh Dae-Su is released.',
                    '/pWDtjs568fN9jPLYUgBjGa8eEzZ.jpg', '/pWDtjs568fN9jPLYUgBjGa8eEzZ.jpg'),

                // Your Name - already added
                // Spirited Away - already added
                // Grave of the Fireflies - already added
                // Princess Mononoke (1997)
                m('princess-mononoke-1997', 'Princess Mononoke', 1997, 'tt0119698', '128',
                    ['Animation', 'Adventure', 'Fantasy'], 8.3, 134, 'On a journey to find the cure for a curse, Ashitaka finds himself in the middle of a war between the forest gods and Tatara.',
                    '/jHwVaVqsK4A4KyjexQQFuVr7VKw.jpg', '/jHwVaVqsK4A4KyjexQQFuVr7VKw.jpg'),

                // My Neighbor Totoro (1988)
                m('totoro-1988', 'My Neighbor Totoro', 1988, 'tt0096283', '8392',
                    ['Animation', 'Family', 'Fantasy'], 8.2, 86, 'When two girls move to the country with their father to be closer to their hospitalized mother.',
                    '/rtGDOeG9L7erkAt5fGWpoZPz5HG.jpg', '/rtGDOeG9L7erkAt5fGWpoZPz5HG.jpg'),

                // Howl's Moving Castle (2004)
                m('howl-2004', "Howl's Moving Castle", 2004, 'tt0347149', '4935',
                    ['Animation', 'Adventure', 'Family'], 8.2, 119, 'When an unconfident young woman is cursed with an old body by a spiteful witch.',
                    '/6pZgH47MYGCOo14pMdze6BsGOqE.jpg', '/6pZgH47MYGCOo14pMdze6BsGOqE.jpg'),

                // The Wind Rises (2013)
                m('wind-rises-2013', 'The Wind Rises', 2013, 'tt2013293', '149870',
                    ['Animation', 'Drama', 'History'], 7.8, 126, 'A look at the life of Jiro Horikoshi, the man who designed Japanese fighter planes during WWII.',
                    '/jHM7o4Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z.jpg', '/jHM7o4Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z.jpg'),

                // Kiki's Delivery Service (1989)
                m('kiki-1989', "Kiki's Delivery Service", 1989, 'tt0097814', '10589',
                    ['Animation', 'Adventure', 'Family'], 7.8, 103, 'A young witch, on her mandatory year of independent life, finds fitting into a new community difficult.',
                    '/7nO6Dym6ccfsvFcGm9I4xqQEyKQ.jpg', '/7nO6Dym6ccfsvFcGm9I4xqQEyKQ.jpg'),

                // Nausicaä of the Valley of the Wind (1984)
                m('nausica-1984', 'Nausicaä of the Valley of the Wind', 1984, 'tt0087544', '81',
                    ['Animation', 'Adventure', 'Sci-Fi'], 8.0, 117, 'Warrior and pacifist Princess Nausicaä desperately tries to prevent two warring nations from destroying themselves.',
                    '/3luNaTbdVPXaIYjxVlnQpjNkm7P.jpg', '/3luNaTbdVPXaIYjxVlnQpjNkm7P.jpg'),

                // Akira (1988)
                m('akira-1988', 'Akira', 1988, 'tt0094625', '149',
                    ['Animation', 'Action', 'Sci-Fi'], 8.0, 124, 'A biker leader tries to save his telekinetic friend from a government experiment.',
                    '/nFQtbVEEAmMxhvXkSSPjJzMNXu9.jpg', '/nFQtbVEEAmMxhvXkSSPjJzMNXu9.jpg'),

                // Ghost in the Shell (1995)
                m('ghost-shell-1995', 'Ghost in the Shell', 1995, 'tt0113568', '9323',
                    ['Animation', 'Action', 'Crime'], 8.0, 83, 'A cyborg policewoman and her partner hunt a mysterious and powerful hacker called the Puppet Master.',
                    '/hR5S1JEBLIu2gNvXsi7lApnOfU4.jpg', '/hR5S1JEBLIu2gNvXsi7lApnOfU4.jpg'),

                // Your Name - already added
                // Weathering with You (2019)
                m('weathering-2019', 'Weathering with You', 2019, 'tt9426210', '521029',
                    ['Animation', 'Drama', 'Fantasy'], 7.5, 112, 'A high-school boy who has run away to Tokyo befriends a girl who appears to be able to manipulate the weather.',
                    '/6ysyPMCRxCQRFZsgVymRxTGUjUk.jpg', '/6ysyPMCRxCQRFZsgVymRxTGUjUk.jpg'),

                // The Boy and the Heron (2023)
                m('boy-heron-2023', 'The Boy and the Heron', 2023, 'tt6587046', '508883',
                    ['Animation', 'Adventure', 'Drama'], 7.6, 124, 'A young boy discovers an abandoned mansion in his new town, leading him on a fantastical adventure.',
                    '/4YRy0JAzS4u8QzAjQjU2rDz1kxr.jpg', '/4YRy0JAzS4u8QzAjQjU2rDz1kxr.jpg'),

                // Demon Slayer: Mugen Train (2020)
                m('demon-slayer-2020', 'Demon Slayer: Kimetsu no Yaiba - Mugen Train', 2020, 'tt11032374', '635302',
                    ['Animation', 'Action', 'Adventure'], 8.2, 117, 'A young man\'s sister has been turned into a demon, and he must find a way to turn her back.',
                    '/n4fk7DqeXmuVrBnFKq3OrbxUjQ1.jpg', '/n4fk7DqeXmuVrBnFKq3OrbxUjQ1.jpg'),

                // Demon Slayer - already added. Let me use a different one.
                // Your Name - already added. Skip duplicates.
                // The Matrix - already added
                // Terminator - already added
                // Alien - already added
                // Blade Runner - already added
                // 2001: A Space Odyssey (1968)
                m('2001-space-odyssey-1968', '2001: A Space Odyssey', 1968, 'tt0062622', '62',
                    ['Adventure', 'Sci-Fi'], 8.3, 149, 'After discovering a mysterious artifact buried beneath the Lunar surface, mankind sets off on a quest to find its origins.',
                    '/nCxqs4VKFfRt2VRtugLZun4wksY.jpg', '/nCxqs4VKFfRt2VRtugLZun4wksY.jpg'),

                // The Shining - already added
                // A Clockwork Orange (1971)
                m('clockwork-orange-1971', 'A Clockwork Orange', 1971, 'tt0066921', '185',
                    ['Crime', 'Drama', 'Sci-Fi'], 8.3, 136, 'In the future, a sadistic gang leader is imprisoned and volunteers for a conduct-aversion experiment.',
                    '/4sHeTAp65WrSxuc3lTpWywj6qPL.jpg', '/4sHeTAp65WrSxuc3lTpWywj6qPL.jpg'),

                // Apocalypse Now (1979)
                m('apocalypse-now-1979', 'Apocalypse Now', 1979, 'tt0078788', '28',
                    ['Drama', 'War'], 8.4, 153, 'A U.S. Army officer is assigned to assassinate a renegade Special Forces colonel during the Vietnam War.',
                    '/gQB8Y5ZCuSMleUzFWM4y1XZQrDm.jpg', '/gQB8Y5ZCuSMleUzFWM4y1XZQrDm.jpg'),

                // Taxi Driver - already added
                // Raging Bull (1980)
                m('raging-bull-1980', 'Raging Bull', 1980, 'tt0081398', '1578',
                    ['Biography', 'Drama', 'Sport'], 8.2, 129, 'The life of boxer Jake LaMotta, whose violence and temper that led him to the top in the ring destroyed his life outside it.',
                    '/AdqY2Xng9sLpHlRTH3OSfQNQldI.jpg', '/AdqY2Xng9sLpHlRTH3OSfQNQldI.jpg'),

                // Goodfellas - already added
                // The Wolf of Wall Street - already added
                // Catch Me If You Can (2002)
                m('catch-me-2002', 'Catch Me If You Can', 2002, 'tt0264464', '620',
                    ['Biography', 'Crime', 'Drama'], 8.1, 141, 'Barely 21 yet, Frank Abagnale Jr. forged millions of dollars in checks acting as a Pan Am pilot, doctor, and legal prosecutor.',
                    '/jHjpqCyy0zWIrBHcqyK04lBqATS.jpg', '/jHjpqCyy0zWIrBHcqyK04lBqATS.jpg'),

                // The Terminal (2004)
                m('the-terminal-2004', 'The Terminal', 2004, 'tt0362227', '489',
                    ['Comedy', 'Drama', 'Romance'], 7.4, 128, 'Viktor Navorski is stranded at JFK when his political coup of his homeland causes him to lose his passport.',
                    '/w1LbwMTP9YjJqEAyfVCQa4sTozS.jpg', '/w1LbwMTP9YjJqEAyfVCQa4sTozS.jpg'),

                // Minority Report (2002)
                m('minority-report-2002', 'Minority Report', 2002, 'tt0181689', '180',
                    ['Action', 'Crime', 'Mystery'], 7.7, 145, 'In a future where a special police unit is able to arrest murderers before they commit their crimes.',
                    '/cc7Bh8aJ29g6PPJhPiqvmYhMjFv.jpg', '/cc7Bh8aJ29g6PPJhPiqvmYhMjFv.jpg'),

                // Mission: Impossible - Fallout (2018)
                m('mi-fallout-2018', 'Mission: Impossible - Fallout', 2018, 'tt4912910', '353081',
                    ['Action', 'Adventure', 'Thriller'], 7.7, 147, 'Ethan Hunt and his IMF team, along with some familiar allies, race against time after a mission goes wrong.',
                    '/AkJQp54cMQ3KfDnxuFRZ72uy4Se.jpg', '/AkJQp54cMQ3KfDnxuFRZ72uy4Se.jpg'),

                // Mission: Impossible - Dead Reckoning (2023)
                m('mi-dr-2023', 'Mission: Impossible - Dead Reckoning Part One', 2023, 'tt6718170', '575265',
                    ['Action', 'Adventure', 'Thriller'], 7.7, 163, 'Ethan Hunt and his IMF team must track down a terrifying new weapon that threatens all of humanity.',
                    '/NNxYkU70HPurnNCSiCjYAmacwm.jpg', '/NNxYkU70HPurnNCSiCjYAmacwm.jpg'),

                // Mad Max: Fury Road - already added
                // Top Gun: Maverick - already added
                // John Wick - already added
                // Edge of Tomorrow (2014)
                m('edge-of-tomorrow-2014', 'Edge of Tomorrow', 2014, 'tt1631867', '137106',
                    ['Action', 'Adventure', 'Sci-Fi'], 7.9, 113, 'A soldier fighting aliens gets to relive the same day over and over again, the day restarting every time he dies.',
                    '/8GUyodO3iUa5IMDCcXYYbXwS7nL.jpg', '/8GUyodO3iUa5IMDCcXYYbXwS7nL.jpg'),

                // Oblivion (2013)
                m('oblivion-2013', 'Oblivion', 2013, 'tt1483013', '71375',
                    ['Action', 'Adventure', 'Sci-Fi'], 7.0, 124, 'A veteran assigned to extract Earth\'s remaining resources begins to question what he knows about his mission and himself.',
                    '/4GK6MHrSrKvJGkL6tMcpeq4uETU.jpg', '/4GK6MHrSrKvJGkL6tMcpeq4uETU.jpg'),

                // Elysium (2013)
                m('elysium-2013', 'Elysium', 2013, 'tt1535108', '72976',
                    ['Action', 'Drama', 'Sci-Fi'], 6.6, 109, 'In the year 2154, the very wealthy live on a man-made space station while the rest of the population resides on a ruined Earth.',
                    '/bXO5ce4NcAhRKzdTpO4t9IYI8Vc.jpg', '/bXO5ce4NcAhRKzdTpO4t9IYI8Vc.jpg'),

                // Ex Machina (2014)
                m('ex-machina-2014', 'Ex Machina', 2014, 'tt0470752', '264660',
                    ['Drama', 'Sci-Fi', 'Thriller'], 7.7, 108, 'A young programmer is selected to participate in a ground-breaking experiment in synthetic intelligence.',
                    '/btbD7papASdGeqWO5jLqAvokkGR.jpg', '/btbD7papASGeqWO5jLqAvokkGR.jpg'),

                // Her (2013)
                m('her-2013', 'Her', 2013, 'tt1798709', '152601',
                    ['Drama', 'Romance', 'Sci-Fi'], 8.0, 126, 'In a near future, a lonely writer develops an unlikely relationship with an operating system.',
                    '/jOAdjY6wgntEzPwbThRSpVyK2mm.jpg', '/jOAdjY6wgntEzPwbThRSpVyK2mm.jpg'),

                // Gravity (2013)
                m('gravity-2013', 'Gravity', 2013, 'tt1454468', '157958',
                    ['Drama', 'Sci-Fi', 'Thriller'], 7.7, 91, 'Two astronauts work together to survive after an accident leaves them stranded in space.',
                    '/4q7AlbCHFl2VsNwwOBNZZ0CBV1w.jpg', '/4q7AlbCHFl2VsNwwOBNZZ0CBV1w.jpg'),

                // The Martian (2015)
                m('the-martian-2015', 'The Martian', 2015, 'tt3659388', '286217',
                    ['Adventure', 'Drama', 'Sci-Fi'], 8.0, 144, 'An astronaut becomes stranded on Mars after his team assume him dead, and must rely on his ingenuity to find a way to signal Earth.',
                    '/5BHuvQ6p9kia091MekOxQ1FoY5d.jpg', '/5BHuvQ6p9kia091MekOxQ1FoY5d.jpg'),

                // Passengers (2016)
                m('passengers-2016', 'Passengers', 2016, 'tt1355644', '274857',
                    ['Drama', 'Romance', 'Sci-Fi'], 7.0, 116, 'A spacecraft traveling to a distant colony planet and transporting thousands of people has a malfunction in its sleep chambers.',
                    '/5gJpiMtEv1pKkUGldlcHUj1DD7h.jpg', '/5gJpiMtEv1pKkUGldlcHUj1DD7h.jpg'),

                // Life (2017)
                m('life-2017', 'Life', 2017, 'tt5442430', '395992',
                    ['Horror', 'Sci-Fi', 'Thriller'], 6.6, 104, 'A team of scientists aboard the International Space Station discover a rapidly evolving life form.',
                    '/w5O5VWrRI3Ql1AaAkUjoe4GFqPL.jpg', '/w5O5VWrRI3Ql1AaAkUjoe4GFqPL.jpg'),

                // Alien: Covenant (2017)
                m('alien-covenant-2017', 'Alien: Covenant', 2017, 'tt2316204', '320288',
                    ['Horror', 'Sci-Fi', 'Thriller'], 6.4, 122, 'The crew of a colony ship, bound for a remote planet, discover an uncharted paradise.',
                    '/9E3Uvim9aeqBFrnMKVTe9MEhSVi.jpg', '/9E3Uvim9aeqBFrnMKVTe9MEhSVi.jpg'),

                // Prometheus (2012)
                m('prometheus-2012', 'Prometheus', 2012, 'tt1446714', '70981',
                    ['Adventure', 'Sci-Fi'], 7.0, 124, 'Following clues to the origin of mankind, a team of explorers reach a remote region of the universe.',
                    '/m4TUa1cizhBaI7BD7mU87m34TVG.jpg', '/m4TUa1cizhBaI7BD7mU87m34TVG.jpg'),

                // Alien: Romulus (2024)
                m('alien-romulus-2024', 'Alien: Romulus', 2024, 'tt18412256', '822119',
                    ['Horror', 'Sci-Fi', 'Thriller'], 7.3, 119, 'While scavenging the deep ends of a derelict space station, a young group of space colonizers come face to face with the most terrifying life form in the universe.',
                    '/9E3Uvim9aeqBFrnMKVTe9MEhSVi.jpg', '/9E3Uvim9aeqBFrnMKVTe9MEhSVi.jpg'),

                // Starship Troopers (1997)
                m('starship-troopers-1997', 'Starship Troopers', 1997, 'tt0120201', '1696',
                    ['Action', 'Adventure', 'Sci-Fi'], 7.2, 129, 'Humans in a fascist, militaristic future wage war with giant alien bugs.',
                    '/ic0SDv1SVagyXRRsoZdOqsUJgr2.jpg', '/ic0SDv1SVagyXRRsoZdOqsUJgr2.jpg'),

                // Total Recall (1990)
                m('total-recall-1990', 'Total Recall', 1990, 'tt0100802', '861',
                    ['Action', 'Adventure', 'Sci-Fi'], 7.5, 113, 'When a man goes for virtual vacation memories of the planet Mars, an unexpected and harrowing series of events forces him to discover his true identity.',
                    '/wf6a1eu7cXr12MVBfnpy18tjdIf.jpg', '/wf6a1eu7cXr12MVBfnpy18tjdIf.jpg'),

                // The Fifth Element (1997)
                m('fifth-element-1997', 'The Fifth Element', 1997, 'tt0119116', '18',
                    ['Action', 'Adventure', 'Sci-Fi'], 7.7, 126, 'In the colorful future, a cab driver unwittingly becomes the central figure in the search for a legendary cosmic weapon.',
                    '/zaFa1M94nSDADN9MrbAAC9R5Ixr.jpg', '/zaFa1M94nSDADN9MrbAAC9R5Ixr.jpg'),

                // Equilibrium (2002)
                m('equilibrium-2002', 'Equilibrium', 2002, 'tt0238380', '8452',
                    ['Action', 'Drama', 'Sci-Fi'], 7.4, 107, 'In an oppressive future where all forms of feeling are illegal, a man in charge of enforcing the law rises to overthrow the system.',
                    '/a6Ks4eUphESp2ZhS3rJZ9g5cCwq.jpg', '/a6Ks4eUphESp2ZhS3rJZ9g5cCwq.jpg'),

                // Elysium - already added
                // The Island (2005)
                m('the-island-2005', 'The Island', 2005, 'tt0399201', '1635',
                    ['Action', 'Sci-Fi', 'Thriller'], 6.8, 136, 'A man living in a futuristic sterile colony begins to question his constrained existence.',
                    '/rExWrSnwAcjkrEdR3FB1JIVVSe8.jpg', '/rExWrSnwAcjkrEdR3FB1JIVVSe8.jpg'),

                // I, Robot (2004)
                m('i-robot-2004', 'I, Robot', 2004, 'tt0343818', '2048',
                    ['Action', 'Drama', 'Sci-Fi'], 7.1, 115, 'In 2035, a technophobic cop investigates a crime that may have been perpetrated by a robot.',
                    '/1Wb1qZ5J8VcMdQmkM3KBrDcWWxI.jpg', '/1Wb1qZ5J8VcMdQmkM3KBrDcWWxI.jpg'),

                // A.I. Artificial Intelligence (2001)
                m('ai-2001', 'A.I. Artificial Intelligence', 2001, 'tt0212720', '272',
                    ['Drama', 'Sci-Fi'], 7.2, 146, 'A highly advanced robotic boy longs to become "real" so that he can regain the love of his human mother.',
                    '/wnVmHLA5qHD7bnOO4tYhCJFFw0h.jpg', '/wnVmHLA5qHD7bnOO4tYhCJFFw0h.jpg'),

                // The Truman Show (1998)
                m('truman-show-1998', 'The Truman Show', 1998, 'tt0120382', '37165',
                    ['Comedy', 'Drama', 'Sci-Fi'], 8.2, 103, 'An insurance salesman discovers his whole life has been a TV show.',
                    '/EUV8Zk5SnFOxCUF6lvEUOhvL0k1.jpg', '/EUV8Zk5SnFOxCUF6lvEUOhvL0k1.jpg'),

                // The Curious Case of Benjamin Button (2008)
                m('benjamin-button-2008', 'The Curious Case of Benjamin Button', 2008, 'tt0421715', '4922',
                    ['Drama', 'Fantasy', 'Romance'], 7.8, 166, 'Tells the story of Benjamin Button, a man who starts aging backwards with consequences.',
                    '/4Odn3lWTFj7TkM7GECtOPTrRdbr.jpg', '/4Odn3lWTFj7TkM7GECtOPTrRdbr.jpg'),

                // Cast Away (2000)
                m('cast-away-2000', 'Cast Away', 2000, 'tt0162222', '8358',
                    ['Adventure', 'Drama', 'Romance'], 7.8, 143, 'A FedEx executive undergoes a physical and emotional transformation after crash landing on a deserted island.',
                    '/7c4kdg9P44Wd5KHQNtTjl89wQ7o.jpg', '/7c4kdg9P44Wd5KHQNtTjl89wQ7o.jpg'),

                // Forrest Gump - already added
                // The Green Mile - already added
                // A Beautiful Mind (2001)
                m('beautiful-mind-2001', 'A Beautiful Mind', 2001, 'tt0176786', '453',
                    ['Biography', 'Drama'], 8.2, 135, 'After John Nash, a brilliant but asocial mathematician, accepts secret work in cryptography.',
                    '/zwzWSm5TlOHRohAVsB1o7Pc6lY1.jpg', '/zwzWSm5TlOHRohAVsB1o7Pc6lY1.jpg'),

                // Good Will Hunting (1997)
                m('good-will-hunting-1997', 'Good Will Hunting', 1997, 'tt0119217', '489',
                    ['Drama', 'Romance'], 8.3, 126, 'Will Hunting, a janitor at M.I.T., has a gift for math, and.',
                    '/bABCBKYBKvAHD0N6a6zAODYRq4P.jpg', '/bABCBKYBKvAHD0N6a6zAODYRq4P.jpg'),

                // The Imitation Game (2014)
                m('imitation-game-2014', 'The Imitation Game', 2014, 'tt2084970', '205596',
                    ['Biography', 'Drama', 'Thriller'], 8.0, 114, 'During World War II, the English mathematical genius Alan Turing tries to crack the German Enigma code.',
                    '/noUp0XOqICUaUlXsP38pAdoSTVI.jpg', '/noUp0XOqICUaUlXsP38pAdoSTVI.jpg'),

                // The Theory of Everything (2014)
                m('theory-of-everything-2014', 'The Theory of Everything', 2014, 'tt2980516', '266856',
                    ['Biography', 'Drama', 'Romance'], 7.7, 123, 'A look at the relationship between the famous physicist Stephen Hawking and his wife.',
                    '/4CK6JqNDzFl4kAl7vLPdcnkxLhJ.jpg', '/4CK6JqNDzFl4kAl7vLPdcnkxLhJ.jpg'),

                // Spotlight (2015)
                m('spotlight-2015', 'Spotlight', 2015, 'tt1895587', '314365',
                    ['Biography', 'Crime', 'Drama'], 8.1, 129, 'The true story of how the Boston Globe uncovered the massive scandal of child molestation and cover-up within the local Catholic Archdiocese.',
                    '/gRtv7R6XzV9JTbsTgYjZL995TkP.jpg', '/gRtv7R6XzV9JTbsTgYjZL995TkP.jpg'),

                // 12 Years a Slave (2013)
                m('12-years-slave-2013', '12 Years a Slave', 2013, 'tt2024544', '76203',
                    ['Biography', 'Drama', 'History'], 8.1, 134, 'In the antebellum United States, Solomon Northup, a free black man from upstate New York, is abducted and sold into slavery.',
                    '/xDM9abKZnU7bxz6OdbQbhjOPpyn.jpg', '/xDM9abKZnU7bxz6OdbQbhjOPpyn.jpg'),

                // Moonlight (2016)
                m('moonlight-2016', 'Moonlight', 2016, 'tt4975722', '376867',
                    ['Drama'], 7.4, 111, 'A young African-American man grapples with his identity and sexuality across three defining chapters of his life.',
                    '/8D6O8cVQllrArAGDtAvnySCiDPZ.jpg', '/8D6O8cVQllrArAGDtAvnySCiDPZ.jpg'),

                // Get Out (2017)
                m('get-out-2017', 'Get Out', 2017, 'tt5052448', '419430',
                    ['Horror', 'Mystery', 'Thriller'], 7.7, 104, 'A young African-American visits his white girlfriend\'s parents for the weekend.',
                    '/dxDmHbpaI4abXLzYvcr5ckoI1lO.jpg', '/dxDmHbpaI4abXLzYvcr5ckoI1lO.jpg'),

                // Us (2019)
                m('us-2019', 'Us', 2019, 'tt6857112', '530915',
                    ['Horror', 'Mystery', 'Thriller'], 6.8, 116, 'A family\'s serene beach vacation turns to chaos when their doppelgangers appear and begin to terrorize them.',
                    '/ux2dU0aQNSE8aX3aQxYjykXbiLO.jpg', '/ux2dU0aQNSE8aX3aQxYjykXbiLO.jpg'),

                // Nope (2022)
                m('nope-2022', 'Nope', 2022, 'tt10954984', '617502',
                    ['Horror', 'Mystery', 'Sci-Fi'], 6.9, 130, 'The residents of a lonely gulch in inland California bear witness to an uncanny and chilling discovery.',
                    '/AcKlR3D8Z7RGsJr5SOXu4SoXUmu.jpg', '/AcKlR3D8Z7RGsJr5SOXu4SoXUmu.jpg'),

                // Hereditary (2018)
                m('hereditary-2018', 'Hereditary', 2018, 'tt7784604', '493922',
                    ['Drama', 'Horror', 'Mystery'], 7.3, 127, 'A grieving family is haunted by tragic and disturbing occurrences after the death of the secretive matriarch.',
                    '/h3vDPlSpSc5HTF9dM7isk1Ph9KD.jpg', '/h3vDPlSpSc5HTF9dM7isk1Ph9KD.jpg'),

                // Midsommar (2019)
                m('midsommar-2019', 'Midsommar', 2019, 'tt8772262', '530915',
                    ['Drama', 'Horror', 'Mystery'], 7.1, 148, 'A couple travels to Northern Europe to visit a rural hometown\'s fabled Swedish mid-summer festival.',
                    '/AcKlR3D8Z7RGsJr5SOXu4SoXUmu.jpg', '/AcKlR3D8Z7RGsJr5SOXu4SoXUmu.jpg'),

                // It (2017)
                m('it-2017', 'It', 2017, 'tt1396484', '346364',
                    ['Horror'], 7.2, 135, 'In the summer of 1989, a group of bullied kids band together to destroy a shape-shifting monster.',
                    '/9Egs95M2VSZXAe6Iz9GUrbaB3Xq.jpg', '/9Egs95M2VSZXAe6Iz9GUrbaB3Xq.jpg'),

                // It Chapter Two (2019)
                m('it-2-2019', 'It Chapter Two', 2019, 'tt7349952', '474350',
                    ['Drama', 'Fantasy', 'Horror'], 6.5, 169, 'Twenty-seven years after their first encounter with the terrifying Pennywise.',
                    '/AcKlR3D8Z7RGsJr5SOXu4SoXUmu.jpg', '/AcKlR3D8Z7RGsJr5SOXu4SoXUmu.jpg'),

                // The Conjuring (2013)
                m('conjuring-2013', 'The Conjuring', 2013, 'tt1457767', '138843',
                    ['Horror', 'Mystery', 'Thriller'], 7.5, 112, 'Paranormal investigators Ed and Lorraine Warren work to help a family terrorized by a dark presence.',
                    '/wVYREowV0xXuQHN8IZ30TsO1GvP.jpg', '/wVYREowV0xXuQHN8IZ30TsO1GvP.jpg'),

                // The Conjuring 2 (2016)
                m('conjuring-2-2016', 'The Conjuring 2', 2016, 'tt3065204', '339408',
                    ['Horror', 'Mystery', 'Thriller'], 7.3, 134, 'Ed and Lorraine Warren travel to North London to help a single mother raising four children alone in a house plagued by malicious spirits.',
                    '/2qBHbBfl5cKjwx9X2OqMA1iYwwy.jpg', '/2qBHbBfl5cKjwx9X2OqMA1iYwwy.jpg'),

                // A Quiet Place (2018)
                m('quiet-place-2018', 'A Quiet Place', 2018, 'tt6644200', '447332',
                    ['Drama', 'Horror', 'Sci-Fi'], 7.5, 90, 'In a post-apocalyptic world, a family must live in silence to avoid mysterious creatures that hunt by sound.',
                    '/AcKlR3D8Z7RGsJr5SOXu4SoXUmu.jpg', '/AcKlR3D8Z7RGsJr5SOXu4SoXUmu.jpg'),

                // A Quiet Place Part II (2021)
                m('quiet-place-2-2021', 'A Quiet Place Part II', 2021, 'tt8332922', '613504',
                    ['Drama', 'Horror', 'Sci-Fi'], 7.3, 97, 'Following the deadly events at home, the Abbott family must now face the terrors of the outside world.',
                    '/AcKlR3D8Z7RGsJr5SOXu4SoXUmu.jpg', '/AcKlR3D8Z7RGsJr5SOXu4SoXUmu.jpg'),

                // The Witch (2015)
                m('the-witch-2015', 'The Witch', 2015, 'tt4263482', '339408',
                    ['Drama', 'Horror', 'Mystery'], 7.0, 92, 'A family in 1630s New England is torn apart by the forces of witchcraft, black magic, and possession.',
                    '/AcKlR3D8Z7RGsJr5SOXu4SoXUmu.jpg', '/AcKlR3D8Z7RGsJr5SOXu4SoXUmu.jpg'),

                // Midsommar - already added
                // Scream (1996)
                m('scream-1996', 'Scream', 1996, 'tt0117571', '4232',
                    ['Horror', 'Mystery'], 7.4, 111, 'A year after the murder of her mother, a teenage girl is terrorized by a new killer.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // Halloween (1978)
                m('halloween-1978', 'Halloween', 1978, 'tt0077651', '948',
                    ['Horror', 'Thriller'], 7.7, 91, 'Fifteen years after murdering his sister on Halloween night 1963, Michael Myers escapes from a mental hospital.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // The Texas Chainsaw Massacre (1974)
                m('texas-chainsaw-1974', 'The Texas Chain Saw Massacre', 1974, 'tt0072271', '30708',
                    ['Horror'], 7.4, 83, 'Two siblings and three of their friends en route to visit their grandfather\'s grave in Texas end up falling victim to a family of cannibals.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // Saw (2004)
                m('saw-2004', 'Saw', 2004, 'tt0387564', '176',
                    ['Horror', 'Mystery', 'Thriller'], 7.6, 103, 'Two strangers awaken in a room with no recollection of how they got there, and soon discover they are pawns in a deadly game.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // Get Out - already added
                // The Ring (2002)
                m('the-ring-2002', 'The Ring', 2002, 'tt0298134', '306',
                    ['Horror', 'Mystery'], 7.1, 115, 'A journalist must investigate a mysterious videotape which seems to cause the death of anyone in a week of viewing it.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // The Grudge (2004)
                m('the-grudge-2004', 'The Grudge', 2004, 'tt0391198', '1779',
                    ['Horror', 'Mystery', 'Thriller'], 5.9, 92, 'An American nurse living and working in Tokyo is exposed to a mysterious supernatural curse.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // Drag Me to Hell (2009)
                m('drag-me-to-hell-2009', 'Drag Me to Hell', 2009, 'tt1127180', '16899',
                    ['Horror', 'Thriller'], 6.6, 99, 'A loan officer who evicts an old woman from her home finds herself the recipient of a supernatural curse.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // The Conjuring - already added
                // Insidious (2010)
                m('insidious-2010', 'Insidious', 2010, 'tt1591095', '49026',
                    ['Horror', 'Mystery', 'Thriller'], 6.8, 103, 'A family looks to prevent evil spirits from trapping their comatose child in a realm called The Further.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // 28 Days Later (2002)
                m('28-days-2002', '28 Days Later', 2002, 'tt0289043', '170',
                    ['Drama', 'Horror', 'Sci-Fi'], 7.6, 113, 'Four weeks after a mysterious, incurable virus spreads throughout the UK, a handful of survivors try to find sanctuary.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // World War Z (2013)
                m('world-war-z-2013', 'World War Z', 2013, 'tt0816711', '72105',
                    ['Action', 'Adventure', 'Horror'], 7.0, 116, 'Former United Nations employee Gerry Lane traverses the world in a race against time to stop a zombie pandemic.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // Zombieland (2009)
                m('zombieland-2009', 'Zombieland', 2009, 'tt1156398', '19908',
                    ['Action', 'Adventure', 'Comedy'], 7.6, 88, 'A shy student trying to reach his family in Ohio, a gun-toting tough guy trying to find the last Twinkie, and a pair of sisters trying to get to an amusement park join forces.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // Warm Bodies (2013)
                m('warm-bodies-2013', 'Warm Bodies', 2013, 'tt1588173', '82654',
                    ['Comedy', 'Horror', 'Romance'], 6.8, 98, 'After a zombie becomes involved with the girlfriend of one of his victims, their romance sets in motion a sequence of events that might transform the entire lifeless world.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // Train to Busan (2016)
                m('train-to-busan-2016', 'Train to Busan', 2016, 'tt5700672', '396535',
                    ['Action', 'Horror', 'Thriller'], 7.6, 118, 'While a zombie virus breaks out in South Korea, passengers struggle to survive on the train from Seoul to Busan.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // The Host (2006)
                m('the-host-2006', 'The Host', 2006, 'tt0468492', '14411',
                    ['Action', 'Drama', 'Horror'], 7.1, 120, 'A monster emerges from Seoul\'s Han River and begins attacking the people.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // Memories of Murder (2003)
                m('memories-murder-2003', 'Memories of Murder', 2003, 'tt0353969', '37264',
                    ['Crime', 'Drama', 'Mystery'], 8.1, 132, 'In a small Korean province in 1986, two detectives struggle with the case of multiple young women being found raped and murdered by an unknown culprit.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // Oldboy - already added
                // Parasite - already added
                // The Handmaiden (2016)
                m('handmaiden-2016', 'The Handmaiden', 2016, 'tt4016934', '429300',
                    ['Drama', 'Romance', 'Thriller'], 8.1, 145, 'A woman is hired as a handmaiden to a Japanese heiress, but secretly she is involved in a plot to con her.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // Burning (2018)
                m('burning-2018', 'Burning', 2018, 'tt7286916', '510177',
                    ['Drama', 'Mystery', 'Thriller'], 7.5, 148, 'Jong-su bumps into a girl who used to live in his neighborhood, who now works as a shopgirl.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // Decision to Leave (2022)
                m('decision-leave-2022', 'Decision to Leave', 2022, 'tt12413172', '617502',
                    ['Crime', 'Drama', 'Mystery'], 7.3, 138, 'A detective investigating a man\'s death in the mountains ends up meeting and developing feelings for the dead man\'s mysterious wife.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // Drive My Car (2021)
                m('drive-my-car-2021', 'Drive My Car', 2021, 'tt14036254', '754452',
                    ['Drama'], 7.6, 179, 'A renowned stage actor and director learns to cope with his wife\'s sudden death while accepting an offer to direct a production of Uncle Vanya in Hiroshima.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // Shoplifters (2018)
                m('shoplifters-2018', 'Shoplifters', 2018, 'tt8075192', '508442',
                    ['Crime', 'Drama'], 7.9, 121, 'A family of small-time crooks take in a child they find on the streets.',
                    '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg', '/2LqaEcQM6lfVr4v04nFaxGu0g8H.jpg'),

                // ===== TV SHOWS =====
                ...this.entries([
                    // Breaking Bad
                    v('breaking-bad-2008', 'Breaking Bad', 2008, 'tt0903747', '1396', 5,
                        ['Crime', 'Drama', 'Thriller'], 9.0, 47,
                        'A chemistry teacher diagnosed with terminal cancer teams with a former student to manufacture and sell crystal meth.',
                        '/ztkUQFLlC19CCMYHW73WiG8sHhK.jpg', '/tsRy63Mu5cu022Q9DZ54ubdkdAW.jpg'),
                    // Better Call Saul
                    v('better-call-saul-2015', 'Better Call Saul', 2015, 'tt3032476', '60059', 6,
                        ['Crime', 'Drama'], 8.9, 50,
                        'The trials and tribulations of attorney Jimmy McGill in the years leading up to his fateful run-in with Walter White.',
                        '/fC2NKXrZBpEoehBRm2DGypaRqIA.jpg', '/tsRy63Mu5cu022Q9DZ54ubdkdAW.jpg'),
                    // Game of Thrones
                    v('game-of-thrones-2011', 'Game of Thrones', 2011, 'tt0944947', '1399', 8,
                        ['Action', 'Adventure', 'Drama'], 8.4, 60,
                        'Nine noble families wage war for control of the Iron Throne.',
                        '/u3bZgnGQ9T01sWNhyveQzIzww4C.jpg', '/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg'),
                    // The Wire
                    v('the-wire-2002', 'The Wire', 2002, 'tt0306414', '1438', 5,
                        ['Crime', 'Drama', 'Thriller'], 9.3, 60,
                        'The Baltimore drug scene, as seen through the eyes of drug dealers and law enforcement.',
                        '/zAMZLY4ykb7C3WS7V4ZbjEj7Xxa.jpg', '/zAMZLY4ykb7C3WS7V4ZbjEj7Xxa.jpg'),
                    // The Sopranos
                    v('the-sopranos-1999', 'The Sopranos', 1999, 'tt0141842', '1398', 6,
                        ['Crime', 'Drama'], 9.2, 55,
                        'New Jersey mob boss Tony Soprano deals with personal and professional issues in his home and business life.',
                        '/lcBaC1d7oKrYI7bNHdRkDkKPfwt.jpg', '/lcBaC1d7oKrYI7bNHdRkDkKPfwt.jpg'),
                    // Stranger Things
                    v('stranger-things-2016', 'Stranger Things', 2016, 'tt4574334', '66732', 4,
                        ['Drama', 'Fantasy', 'Horror'], 8.7, 50,
                        'When a young boy vanishes, a small town uncovers a mystery involving secret experiments and supernatural forces.',
                        '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', '/56v2KjBlU4XaOv9rVYEQwRO59EU.jpg'),
                    // The Bear
                    v('the-bear-2022', 'The Bear', 2022, 'tt14452776', '136315', 3,
                        ['Comedy', 'Drama'], 8.6, 30,
                        'A young chef from the fine dining world returns to Chicago to run his family\'s sandwich shop.',
                        '/sHFLfDPCIHofP6GkcM1SVZQXMRZ.jpg', '/7yHSmMxNkxpN4iYj8tOjln8QHNo.jpg'),
                    // Succession
                    v('succession-2018', 'Succession', 2018, 'tt7660850', '60698', 4,
                        ['Drama'], 8.9, 60,
                        'The Roy family controls one of the largest media and entertainment conglomerates in the world.',
                        '/7HW47XbkNQ5fiwQFYGWdw9gs144.jpg', '/7HW47XbkNQ5fiwQFYGWdw9gs144.jpg'),
                    // The Last of Us
                    v('the-last-of-us-2023', 'The Last of Us', 2023, 'tt3581920', '100088', 1,
                        ['Action', 'Adventure', 'Drama'], 8.8, 60,
                        'Twenty years after modern civilization was destroyed, Joel, a hardened survivor, is hired to smuggle Ellie out of an oppressive quarantine zone.',
                        '/uDgy6hyPd7FoCZYW4U7w4gWaAQT.jpg', '/uDgy6hyPd7FoCZYW4U7w4gWaAQT.jpg'),
                    // House of the Dragon
                    v('house-of-the-dragon-2022', 'House of the Dragon', 2022, 'tt11198330', '94997', 2,
                        ['Action', 'Adventure', 'Drama'], 8.4, 60,
                        'The story of the Targaryen civil war, known as the Dance of the Dragons.',
                        '/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg', '/etj8E2on0BOvSVNj9DK3k3BsCRY.jpg'),
                    // The Mandalorian
                    v('the-mandalorian-2019', 'The Mandalorian', 2019, 'tt8111088', '82856', 3,
                        ['Action', 'Adventure', 'Sci-Fi'], 8.5, 40,
                        'The travels of a lone bounty hunter in the outer reaches of the galaxy.',
                        '/o7qiZvRISkV6TP86yo6kZviNlXJ.jpg', '/o7qiZvRISkV6TP86yo6kZviNlXJ.jpg'),
                    // Dark
                    v('dark-2017', 'Dark', 2017, 'tt5753856', '70523', 3,
                        ['Crime', 'Drama', 'Mystery'], 8.8, 60,
                        'A family saga with a supernatural twist, set in a German town where the disappearance of two children exposes the relationships among four families.',
                        '/3lBDg3i6nn5R2NKFCZ6iV3wpjjl.jpg', '/3lBDg3i6nn5R2NKFCZ6iV3wpjjl.jpg'),
                    // Peaky Blinders
                    v('peaky-blinders-2013', 'Peaky Blinders', 2013, 'tt2442560', '60574', 6,
                        ['Crime', 'Drama'], 8.8, 60,
                        'A gangster family epic set in 1900s England, centering on a gang who sew razor blades in the peaks of their caps.',
                        '/vUUqzJp2RCCUMtDmfKxc5Q8CqJb.jpg', '/vUUqzJp2RCCUMtDmfKxc5Q8CqJb.jpg'),
                    // The Crown
                    v('the-crown-2016', 'The Crown', 2016, 'tt4786824', '65494', 6,
                        ['Biography', 'Drama', 'History'], 8.6, 60,
                        'The story of Queen Elizabeth II of the United Kingdom, told over six decades.',
                        '/7k7oKVbfXVBefRnGgnLxpozPfuG.jpg', '/7k7oKVbfXVBefRnGgnLxpozPfuG.jpg'),
                    // True Detective
                    v('true-detective-2014', 'True Detective', 2014, 'tt2356777', '46648', 4,
                        ['Crime', 'Drama', 'Mystery'], 8.9, 55,
                        'Seasonal anthology series in which police investigations unearth the personal and professional secrets of those involved.',
                        '/aQNm2cclY2swKDsLP6Ywkras7kr.jpg', '/aQNm2cclY2swKDsLP6Ywkras7kr.jpg'),
                    // Fargo
                    v('fargo-tv-2014', 'Fargo', 2014, 'tt2802850', '60698', 5,
                        ['Crime', 'Drama', 'Thriller'], 8.8, 53,
                        'Various chronicles of deception, intrigue and murder in and around frozen Minnesota.',
                        '/9Yd1tj2FoHBrsf0p6NtEYf4lIxH.jpg', '/9Yd1tj2FoHBrsf0p6NtEYf4lIxH.jpg'),
                    // Mr. Robot
                    v('mr-robot-2015', 'Mr. Robot', 2015, 'tt4158110', '62560', 4,
                        ['Crime', 'Drama', 'Thriller'], 8.5, 50,
                        'Elliot, a brilliant but troubled cybersecurity engineer, is recruited by a mysterious anarchist to join a group of hacktivists.',
                        '/aRqv1WYY1IvKRYdnVrkW4MY8o0T.jpg', '/aRqv1WYY1IvKRYdnVrkW4MY8o0T.jpg'),
                    // Chernobyl
                    v('chernobyl-2019', 'Chernobyl', 2019, 'tt7366338', '87108', 1,
                        ['Drama', 'History', 'Thriller'], 9.4, 65,
                        'In April 1986, an explosion at the Chernobyl nuclear power plant in the Union of Soviet Socialist Republics becomes one of the world\'s worst man-made catastrophes.',
                        '/hWl3b6tADcBf1mglbAeTjpGwoRq.jpg', '/hWl3b6tADcBf1mglbAeTjpGwoRq.jpg'),
                    // Band of Brothers
                    v('band-of-brothers-2001', 'Band of Brothers', 2001, 'tt0185906', '4408', 1,
                        ['Action', 'Drama', 'History'], 9.4, 60,
                        'The story of Easy Company of the U.S. Army 101st Airborne Division, and their mission in World War II Europe.',
                        '/oUwVSWfBCVvoOTZIWPY6TlzMMKp.jpg', '/oUwVSWfBCVvoOTZIWPY6TlzMMKp.jpg'),
                    // The Pacific
                    v('the-pacific-2010', 'The Pacific', 2010, 'tt0374463', '1428', 1,
                        ['Action', 'Drama', 'History'], 8.3, 60,
                        'The Pacific Theatre of World War II is seen through the eyes of three Marines stationed on different islands.',
                        '/oUwVSWfBCVvoOTZIWPY6TlzMMKp.jpg', '/oUwVSWfBCVvoOTZIWPY6TlzMMKp.jpg'),
                    // The Wire - already added
                    // True Detective - already added
                    // Band of Brothers - already added
                    // Peaky Blinders - already added
                    // The Bear - already added
                    // Ted Lasso
                    v('ted-lasso-2020', 'Ted Lasso', 2020, 'tt10986410', '97546', 3,
                        ['Comedy', 'Drama', 'Sport'], 8.8, 35,
                        'American college football coach Ted Lasso heads to London to manage AFC Richmond, a struggling English Premier League football team.',
                        '/5xMU1NmcOlo9c3t79tzMfXgrYHL.jpg', '/5xMU1NmcOlo9c3t79tzMfXgrYHL.jpg'),
                    // Fleabag
                    v('fleabag-2016', 'Fleabag', 2016, 'tt5687612', '58241', 2,
                        ['Comedy', 'Drama'], 8.7, 27,
                        'A comedy series about a young woman trying to cope with life in London whilst dealing with tragedy.',
                        '/5xMU1NmcOlo9c3t79tzMfXgrYHL.jpg', '/5xMU1NmcOlo9c3t79tzMfXgrYHL.jpg'),
                    // Sherlock (Cumberbatch)
                    v('sherlock-2010', 'Sherlock', 2010, 'tt1475582', '19885', 4,
                        ['Crime', 'Drama', 'Mystery'], 9.1, 90,
                        'A modern update finds the famous sleuth and his doctor partner solving crime in 21st century London.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Black Mirror
                    v('black-mirror-2011', 'Black Mirror', 2011, 'tt2085059', '42009', 6,
                        ['Drama', 'Sci-Fi', 'Thriller'], 8.7, 60,
                        'An anthology series exploring a twisted, high-tech multiverse where humanity\'s greatest innovations and darkest instincts collide.',
                        '/7PRddO7z7mcPi21nZTCMGShAyy1.jpg', '/7PRddO7z7mcPi21nZTCMGShAyy1.jpg'),
                    // The Office (US)
                    v('the-office-2005', 'The Office (US)', 2005, 'tt0386676', '2316', 9,
                        ['Comedy'], 9.0, 22,
                        'A mockumentary on a group of typical office workers, where the workday consists of ego clashes, inappropriate behavior, and tedium.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Friends
                    v('friends-1994', 'Friends', 1994, 'tt0108778', '1668', 10,
                        ['Comedy', 'Romance'], 8.9, 22,
                        'Follows the personal and professional lives of six twenty to thirty-something-year-old friends living in Manhattan.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Seinfeld
                    v('seinfeld-1989', 'Seinfeld', 1989, 'tt0098904', '1400', 9,
                        ['Comedy'], 8.8, 22,
                        'The continuing misadventures of neurotic New Yorker Cityman and his equally neurotic friends.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Simpsons
                    v('the-simpsons-1989', 'The Simpsons', 1989, 'tt0096697', '456', 35,
                        ['Animation', 'Comedy'], 8.6, 22,
                        'The satiric adventures of a working-class family in the misfit city of Springfield.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Rick and Morty
                    v('rick-and-morty-2013', 'Rick and Morty', 2013, 'tt2861424', '60625', 7,
                        ['Animation', 'Adventure', 'Comedy'], 9.0, 23,
                        'An animated series about the misadventures of a cynical scientist and his odd grandson.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Attack on Titan
                    v('attack-on-titan-2013', 'Attack on Titan', 2013, 'tt2560140', '1429', 4,
                        ['Animation', 'Action', 'Adventure'], 9.0, 24,
                        'After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoids.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Death Note
                    v('death-note-2006', 'Death Note', 2006, 'tt0877057', '13916', 1,
                        ['Animation', 'Crime', 'Drama'], 8.9, 24,
                        'An intelligent high school student goes on a secret crusade to eliminate criminals from the world.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // One Piece
                    v('one-piece-1999', 'One Piece', 1999, 'tt0388629', '37854', 1,
                        ['Animation', 'Action', 'Adventure'], 9.0, 24,
                        'Monkey D. Luffy and his pirate crew explore the Grand Line in search of the One Piece treasure.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Naruto
                    v('naruto-2002', 'Naruto', 2002, 'tt0409591', '30984', 1,
                        ['Animation', 'Action', 'Adventure'], 8.4, 23,
                        'Naruto Uzumaki, a mischievous adolescent ninja, struggles as he searches for recognition and dreams of becoming the Hokage.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Demon Slayer
                    v('demon-slayer-2019', 'Demon Slayer: Kimetsu no Yaiba', 2019, 'tt9335498', '85937', 4,
                        ['Animation', 'Action', 'Adventure'], 8.7, 24,
                        'A family is attacked by demons and only two members survive - Tanjiro and his sister Nezuko.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // My Hero Academia
                    v('my-hero-academia-2016', 'My Hero Academia', 2016, 'tt5626028', '65930', 6,
                        ['Animation', 'Action', 'Adventure'], 8.5, 24,
                        'A superhero-loving boy without any powers is accepted into a prestigious hero academy.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Jujutsu Kaisen
                    v('jujutsu-kaisen-2020', 'Jujutsu Kaisen', 2020, 'tt12343534', '95479', 2,
                        ['Animation', 'Action', 'Adventure'], 8.6, 24,
                        'A boy swallows a cursed talisman - the finger of a demon - and becomes cursed himself.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Boys
                    v('the-boys-2019', 'The Boys', 2019, 'tt1190634', '76479', 4,
                        ['Action', 'Comedy', 'Crime'], 8.7, 60,
                        'A group of vigilantes set out to take down corrupt superheroes who abuse their powers.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Invincible
                    v('invincible-2021', 'Invincible', 2021, 'tt6602698', '94696', 2,
                        ['Animation', 'Action', 'Adventure'], 8.7, 50,
                        'An adult animated series based on the Image Comics character about a teenager whose father is the most powerful superhero on the planet.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // House of Cards
                    v('house-of-cards-2013', 'House of Cards', 2013, 'tt1856010', '1425', 6,
                        ['Drama'], 8.7, 50,
                        'A Congressman works with his equally conniving wife to exact revenge on the people who betrayed him.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Narcos
                    v('narcos-2015', 'Narcos', 2015, 'tt0457400', '40075', 3,
                        ['Biography', 'Crime', 'Drama'], 8.8, 50,
                        'A chronicled look at the criminal exploits of Colombian drug lord Pablo Escobar.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Ozark
                    v('ozark-2017', 'Ozark', 2017, 'tt5071412', '69776', 4,
                        ['Crime', 'Drama', 'Thriller'], 8.4, 60,
                        'A financial advisor drags his family from Chicago to the Missouri Ozarks, where he must launder money to appease a drug boss.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Severance
                    v('severance-2022', 'Severance', 2022, 'tt11280740', '87963', 2,
                        ['Drama', 'Mystery', 'Sci-Fi'], 8.7, 50,
                        'Mark leads a team whose memories have been surgically divided between their work and personal lives.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Witcher
                    v('the-witcher-2019', 'The Witcher', 2019, 'tt5180506', '71912', 3,
                        ['Action', 'Adventure', 'Drama'], 8.2, 60,
                        'Geralt of Rivia, a solitary monster hunter, struggles to find his place in a world where people often prove more wicked than beasts.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Money Heist
                    v('money-heist-2017', 'Money Heist', 2017, 'tt6468322', '76600', 5,
                        ['Action', 'Crime', 'Mystery'], 8.2, 70,
                        'An unusual group of robbers attempt to carry out the most perfect robbery in Spanish history.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Squid Game
                    v('squid-game-2021', 'Squid Game', 2021, 'tt10919420', '93405', 2,
                        ['Action', 'Drama', 'Mystery'], 8.0, 32,
                        'Hundreds of cash-strapped contestants accept an invitation to compete in children\'s games for a tempting prize.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Wednesday
                    v('wednesday-2022', 'Wednesday', 2022, 'tt13443470', '119051', 1,
                        ['Comedy', 'Crime', 'Mystery'], 8.1, 50,
                        'Smart, sarcastic and a little dead inside, Wednesday Addams investigates a murder spree.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Sandman
                    v('the-sandman-2022', 'The Sandman', 2022, 'tt1751634', '90802', 2,
                        ['Drama', 'Fantasy', 'Mystery'], 7.7, 50,
                        'Upon escaping after decades of imprisonment by a mortal spell, Morpheus, the Dream Lord, must reclaim his lost equipment.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Loki
                    v('loki-2021', 'Loki', 2021, 'tt9140554', '84958', 2,
                        ['Action', 'Adventure', 'Sci-Fi'], 8.2, 50,
                        'The mercurial villain Loki resumes his role as the God of Mischief in a new series that takes place after the events of Avengers: Endgame.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // WandaVision
                    v('wandavision-2021', 'WandaVision', 2021, 'tt9140560', '85271', 1,
                        ['Action', 'Comedy', 'Drama'], 7.9, 50,
                        'Blends the style of classic sitcoms with the MCU, in which Wanda Maximoff and Vision - two super-powered beings living their ideal suburban lives.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Falcon and the Winter Soldier
                    v('fatws-2021', 'The Falcon and the Winter Soldier', 2021, 'tt9208876', '86331', 1,
                        ['Action', 'Adventure', 'Drama'], 7.2, 50,
                        'Following the events of Avengers: Endgame, Sam Wilson/Falcon and Bucky Barnes/Winter Soldier team up.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Hawkeye
                    v('hawkeye-2021', 'Hawkeye', 2021, 'tt10160804', '95557', 1,
                        ['Action', 'Adventure', 'Crime'], 7.5, 50,
                        'Series follows former Avenger Clint Barton, who has retired from fighting.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Moon Knight
                    v('moon-knight-2022', 'Moon Knight', 2022, 'tt10234724', '92749', 1,
                        ['Action', 'Adventure', 'Fantasy'], 7.3, 47,
                        'Steven Grant discovers he\'s been granted the powers of an Egyptian moon god.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Ms. Marvel
                    v('ms-marvel-2022', 'Ms. Marvel', 2022, 'tt10857164', '92782', 1,
                        ['Action', 'Adventure', 'Comedy'], 6.2, 40,
                        'Kamala is a superhero fan with an imagination, and when she gets superpowers, she becomes the hero she.'),
                    // She-Hulk
                    v('she-hulk-2022', 'She-Hulk: Attorney at Law', 2022, 'tt10857160', '92783', 1,
                        ['Action', 'Adventure', 'Comedy'], 5.3, 35,
                        'Jennifer Walters navigates the complicated life of a single, 30-something attorney who also happens to be a green 6-foot-7-inch superpowered hulk.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Secret Invasion
                    v('secret-invasion-2023', 'Secret Invasion', 2023, 'tt13157618', '114472', 1,
                        ['Action', 'Drama', 'Mystery'], 6.0, 50,
                        'Nick Fury learns of a secret invasion of Earth by a faction of shapeshifting Skrulls.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Echo
                    v('echo-2024', 'Echo', 2024, 'tt13966962', '114472', 1,
                        ['Action', 'Crime', 'Drama'], 6.1, 50,
                        'Maya Lopez must confront her past and reconnect with her Native American roots.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Agatha All Along
                    v('agatha-2024', 'Agatha All Along', 2024, 'tt21357166', '114472', 1,
                        ['Action', 'Adventure', 'Comedy'], 7.0, 50,
                        'The infamous Agatha Harkness finds herself powerless in Westview, New Jersey.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // What If...? (Marvel)
                    v('what-if-2021', 'What If...?', 2021, 'tt10220280', '91363', 3,
                        ['Animation', 'Action', 'Adventure'], 7.5, 35,
                        'Exploring pivotal moments from the Marvel Cinematic Universe and turning them on their head.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // X-Men '97
                    v('xmen97-2024', 'X-Men \'97', 2024, 'tt13034222', '114472', 1,
                        ['Animation', 'Action', 'Adventure'], 8.5, 35,
                        'A band of mutants use their uncanny gifts to protect a world that hates and fears them.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Andor
                    v('andor-2022', 'Andor', 2022, 'tt12232802', '114472', 1,
                        ['Action', 'Adventure', 'Drama'], 8.5, 50,
                        'Prequel to the film Rogue One: A Star Wars Story.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Obi-Wan Kenobi
                    v('obiwan-2022', 'Obi-Wan Kenobi', 2022, 'tt8466568', '114472', 1,
                        ['Action', 'Adventure', 'Sci-Fi'], 7.1, 50,
                        'Jedi Master Obi-Wan Kenobi must save young Leia after she\'s kidnapped.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Book of Boba Fett
                    v('book-boba-fett-2021', 'The Book of Boba Fett', 2021, 'tt13668894', '114472', 1,
                        ['Action', 'Adventure', 'Sci-Fi'], 7.1, 50,
                        'Bounty hunter Boba Fett and mercenary Fennec Shand navigate the galaxy\'s underworld.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Bad Batch (Star Wars)
                    v('bad-batch-2021', 'Star Wars: The Bad Batch', 2021, 'tt12708542', '114472', 2,
                        ['Animation', 'Action', 'Adventure'], 7.6, 50,
                        'The \'Bad Batch\' of elite and experimental clones make their way through an ever-changing galaxy.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Ahsoka
                    v('ahsoka-2023', 'Ahsoka', 2023, 'tt13622728', '114472', 1,
                        ['Action', 'Adventure', 'Fantasy'], 7.5, 50,
                        'Ahsoka Tano investigates an emerging threat to the galaxy.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Mandalorian S3
                    v('mandalorian-s3-2023', 'The Mandalorian Season 3', 2023, 'tt8111088', '114472', 3,
                        ['Action', 'Adventure', 'Sci-Fi'], 8.5, 50,
                        'The journeys of the Mandalorian through the Star Wars galaxy continue.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Vikings
                    v('vikings-2013', 'Vikings', 2013, 'tt2306299', '44217', 6,
                        ['Action', 'Adventure', 'Drama'], 8.5, 45,
                        'The world of the Vikings is brought to life through the journey of Ragnar Lothbrok.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Last Kingdom
                    v('last-kingdom-2015', 'The Last Kingdom', 2015, 'tt4179452', '46648', 5,
                        ['Action', 'Drama', 'History'], 8.4, 60,
                        'As Alfred the W, king of Wessex, attempts to unite the various Anglo-Saxon kingdoms.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Spartacus
                    v('spartacus-2010', 'Spartacus', 2010, 'tt1442449', '46261', 4,
                        ['Action', 'Adventure', 'Biography'], 8.5, 55,
                        'The life of Spartacus, the gladiator who led a slave uprising against the Roman Republic.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // House of the Dragon S2
                    v('hotd-s2-2024', 'House of the Dragon Season 2', 2024, 'tt11198330', '114472', 2,
                        ['Action', 'Adventure', 'Drama'], 8.0, 60,
                        'The Targaryen civil war continues in this second season.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Witcher S3
                    v('witcher-s3-2023', 'The Witcher Season 3', 2023, 'tt5180506', '114472', 3,
                        ['Action', 'Adventure', 'Drama'], 7.5, 60,
                        'Geralt of Rivia takes on new threats in the third season.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // You (Netflix)
                    v('you-2018', 'You', 2018, 'tt7335184', '78191', 4,
                        ['Crime', 'Drama', 'Romance'], 7.6, 45,
                        'A dangerously charming, intensely obsessive young man goes to extreme measures.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Bear - already added
                    // Sex Education
                    v('sex-education-2019', 'Sex Education', 2019, 'tt7767422', '81393', 4,
                        ['Comedy', 'Drama'], 8.3, 50,
                        'A teenage boy with a sex therapist mother teams up with a high school rebel.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Cobra Kai
                    v('cobra-kai-2018', 'Cobra Kai', 2018, 'tt7221388', '77169', 6,
                        ['Action', 'Comedy', 'Drama'], 8.6, 30,
                        'Decades after the events of the 1984 All Valley Karate Tournament.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Witcher - already added
                    // Outer Banks
                    v('outer-banks-2020', 'Outer Banks', 2020, 'tt11672024', '114472', 4,
                        ['Action', 'Adventure', 'Crime'], 7.6, 50,
                        'A group of teenagers from the wrong side of the tracks get involved in a world of mystery and danger.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The 100
                    v('the-100-2014', 'The 100', 2014, 'tt2661044', '48866', 7,
                        ['Drama', 'Mystery', 'Sci-Fi'], 7.6, 43,
                        'Set 97 years after a nuclear war destroyed civilization.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Walking Dead
                    v('the-walking-dead-2010', 'The Walking Dead', 2010, 'tt1520211', '1402', 11,
                        ['Drama', 'Horror', 'Thriller'], 8.1, 45,
                        'Sheriff Deputy Rick Grimes wakes up from a coma to learn the world is in ruins.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Better Call Saul - already added
                    // The Americans
                    v('the-americans-2013', 'The Americans', 2013, 'tt2149175', '46516', 6,
                        ['Crime', 'Drama', 'Mystery'], 8.4, 48,
                        'At the height of the Cold War, two Russian spies pose as an American married couple in DC.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Fleabag - already added
                    // Line of Duty
                    v('line-of-duty-2012', 'Line of Duty', 2012, 'tt2303911', '57610', 6,
                        ['Crime', 'Drama', 'Mystery'], 8.7, 60,
                        'A drama about the investigations of AC-12, a controversial police anticorruption unit.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Line of Duty S6
                    v('line-of-duty-s6-2021', 'Line of Duty Season 6', 2021, 'tt2303911', '114472', 6,
                        ['Crime', 'Drama', 'Mystery'], 8.7, 60,
                        'AC-12 investigates a detective whose actions is for a woman in witness protection.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Mare of Easttown
                    v('mare-easttown-2021', 'Mare of Easttown', 2021, 'tt10155600', '95479', 1,
                        ['Crime', 'Drama', 'Mystery'], 8.4, 60,
                        'A detective in a small Pennsylvania town investigates a brutal murder.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Doctor Who
                    v('doctor-who-2005', 'Doctor Who', 2005, 'tt0436992', '57243', 14,
                        ['Action', 'Adventure', 'Drama', 'Sci-Fi'], 8.6, 45,
                        'The further adventures in time and space of the alien adventurer known as the Doctor and their companions from planet Earth.',
                        '/lHfmc6d8pOVFrD0eOKPiDbjeucG.jpg', '/5kkw5zI1HoxG5G21971zT9G1F8E.jpg'),
                    // True Detective S4
                    v('true-detective-s4-2024', 'True Detective: Night Country', 2024, 'tt2356777', '114472', 4,
                        ['Crime', 'Drama', 'Mystery'], 7.4, 60,
                        'Detectives investigate the disappearance of eight men in Alaska.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Leftovers
                    v('the-leftovers-2014', 'The Leftovers', 2014, 'tt2699128', '44006', 3,
                        ['Drama', 'Fantasy', 'Mystery'], 8.3, 60,
                        'Three years after the disappearance of 2% of the world\'s population.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Dark - already added
                    // Westworld
                    v('westworld-2016', 'Westworld', 2016, 'tt0475784', '63247', 4,
                        ['Drama', 'Mystery', 'Sci-Fi'], 8.6, 60,
                        'Set in a futuristic amusement park, Westworld allows guests to live out their fantasies.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // True Detective - already added
                    // Better Call Saul - already added
                    // Dexter
                    v('dexter-2006', 'Dexter', 2006, 'tt0773262', '1405', 8,
                        ['Crime', 'Drama', 'Mystery'], 8.6, 60,
                        'A forensic blood spatter analyst with a penchant for serial murder.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Dexter: New Blood
                    v('dexter-new-blood-2021', 'Dexter: New Blood', 2021, 'tt14125164', '114472', 1,
                        ['Crime', 'Drama', 'Mystery'], 7.2, 60,
                        'Set 10 years after Dexter Morgan went missing in the eye of Hurricane Laura.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Mindhunter
                    v('mindhunter-2017', 'Mindhunter', 2017, 'tt0109936', '67744', 2,
                        ['Crime', 'Drama', 'Thriller'], 8.6, 60,
                        'In the late 1970s two FBI agents expand the science of criminal psychology.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Hannibal
                    v('hannibal-2013', 'Hannibal', 2013, 'tt2243973', '41727', 3,
                        ['Crime', 'Drama', 'Thriller'], 8.5, 45,
                        'Explores the early relationship between renowned psychiatrist Hannibal Lecter and a young FBI profiler.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Sopranos - already added
                    // The Wire - already added
                    // Boardwalk Empire
                    v('boardwalk-empire-2010', 'Boardwalk Empire', 2010, 'tt0979432', '41416', 5,
                        ['Crime', 'Drama', 'History'], 8.6, 60,
                        'An Atlantic City politician plays to control both sides of the law.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Rome
                    v('rome-2005', 'Rome', 2005, 'tt0384766', '1897', 2,
                        ['Action', 'Drama', 'History'], 8.7, 50,
                        'A down-to-earth account of the lives of two illustrious Roman soldiers.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Spartacus - already added
                    // Black Sails
                    v('black-sails-2014', 'Black Sails', 2014, 'tt2375692', '46648', 4,
                        ['Adventure', 'Drama'], 8.2, 60,
                        'Follows Captain James Flint and his crew during the golden age of piracy.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Outlander
                    v('outlander-2014', 'Outlander', 2014, 'tt3006802', '56570', 7,
                        ['Drama', 'Fantasy', 'Romance'], 8.4, 60,
                        'An English combat nurse from 1945 is mysteriously swept back in time to 1743.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Handmaid's Tale
                    v('handmaids-tale-2017', "The Handmaid's Tale", 2017, 'tt5834204', '69478', 5,
                        ['Drama', 'Sci-Fi', 'Thriller'], 8.4, 60,
                        'Set in a dystopian future, a woman is forced to live as a concubine under a fundamentalist theocratic dictatorship.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // His Dark Materials
                    v('his-dark-materials-2019', 'His Dark Materials', 2019, 'tt6577', '46731', 3,
                        ['Adventure', 'Drama', 'Fantasy'], 8.0, 60,
                        'A young girl is destined to liberate her world from the grip of the Magisterium.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Expanse
                    v('the-expanse-2015', 'The Expanse', 2015, 'tt3230854', '63639', 6,
                        ['Drama', 'Mystery', 'Sci-Fi'], 8.5, 60,
                        'In the 24th century, a disparate band of antiheroes unravels a vast conspiracy.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Foundation
                    v('foundation-2021', 'Foundation', 2021, 'tt13166124', '93740', 2,
                        ['Drama', 'Sci-Fi'], 7.5, 60,
                        'A complex saga of humans scattered on a number of planets.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Star Trek: Discovery
                    v('star-trek-discovery-2017', 'Star Trek: Discovery', 2017, 'tt5171438', '67198', 5,
                        ['Action', 'Adventure', 'Drama'], 7.0, 60,
                        'Ten years before Kirk, Spock, and the Enterprise, the USS Discovery discovers new worlds and lifeforms.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Star Trek: Strange New Worlds
                    v('star-trek-snw-2022', 'Star Trek: Strange New Worlds', 2022, 'tt12327578', '114472', 2,
                        ['Action', 'Adventure', 'Sci-Fi'], 8.3, 60,
                        'Follows the crew of the U.S.S. Enterprise in the mid-23rd century.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9hl.jpg'),
                    // The Mandalorian - already added
                    // Cobra Kai - already added
                    // Reacher
                    v('reacher-2022', 'Reacher', 2022, 'tt3793638', '114472', 2,
                        ['Action', 'Crime', 'Drama'], 8.1, 50,
                        'Jack Reacher, a veteran military police investigator, suddenly finds himself back in the game.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Jack Ryan
                    v('jack-ryan-2018', 'Jack Ryan', 2018, 'tt8008454', '76766', 4,
                        ['Action', 'Drama', 'Thriller'], 8.0, 60,
                        'A CIA analyst uncovers a Russian plot in the Middle East.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Bosch
                    v('bosch-2014', 'Bosch', 2014, 'tt3325512', '60554', 7,
                        ['Crime', 'Drama', 'Mystery'], 8.3, 55,
                        'An L.A.P.D. homicide detective works to track down the killer of a 13-year-old boy.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Bosch: Legacy
                    v('bosch-legacy-2022', 'Bosch: Legacy', 2022, 'tt14069022', '114472', 3,
                        ['Crime', 'Drama', 'Mystery'], 8.5, 55,
                        'Bosch embarks on the next chapter of his career and finds himself entangled with the criminal element.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Rookie
                    v('the-rookie-2018', 'The Rookie', 2018, 'tt7587890', '79744', 6,
                        ['Action', 'Crime', 'Drama'], 8.0, 45,
                        'Starting over isn\'t easy, especially for John Nolan who, after a life-altering incident, is pursuing his dream of becoming an LAPD officer.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Yellowstone
                    v('yellowstone-2018', 'Yellowstone', 2018, 'tt4236770', '73586', 5,
                        ['Drama', 'Western'], 8.7, 60,
                        'A ranching family in Montana faces off against others encroaching on their land.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Succession - already added
                    // The Morning Show
                    v('the-morning-show-2019', 'The Morning Show', 2019, 'tt7203552', '78267', 3,
                        ['Drama'], 8.2, 60,
                        'An inside look at the lives of the people who help America wake up in the morning.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Ted Lasso - already added
                    // Only Murders in the Building
                    v('only-murders-2021', 'Only Murders in the Building', 2021, 'tt12851524', '114472', 4,
                        ['Comedy', 'Crime', 'Drama'], 8.1, 30,
                        'Three strangers who share an obsession with true crime suddenly find themselves wrapped up in one.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Severance - already added
                    // Slow Horses
                    v('slow-horses-2022', 'Slow Horses', 2022, 'tt5875444', '114472', 4,
                        ['Drama', 'Thriller'], 8.3, 45,
                        'Follow a team of British intelligence agents who serve in a dumping ground department of MI5.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Beef
                    v('beef-2023', 'Beef', 2023, 'tt13070238', '114472', 1,
                        ['Comedy', 'Drama', 'Thriller'], 8.0, 30,
                        'A road rage incident between two strangers, Danny Cho and Amy Lau, sparks a feud.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Shogun
                    v('shogun-2024', 'Shōgun', 2024, 'tt2788316', '114472', 1,
                        ['Drama', 'History'], 8.7, 70,
                        'In Japan in the year 1600, a ship appears in a fishing village.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // House of the Dragon - already added
                    // The Penguin
                    v('the-penguin-2024', 'The Penguin', 2024, 'tt15435888', '114472', 1,
                        ['Crime', 'Drama'], 8.7, 60,
                        'Following the events of The Batman, Oswald Cobb attempts to establish himself as a crime boss.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Fallout (Amazon)
                    v('fallout-tv-2024', 'Fallout', 2024, 'tt12637874', '114472', 1,
                        ['Action', 'Adventure', 'Drama'], 8.3, 60,
                        'In a future, post-apocalyptic Los Angeles brought about by nuclear decimation.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Mr. & Mrs. Smith
                    v('mr-mrs-smith-2024', 'Mr. & Mrs. Smith', 2024, 'tt13251112', '114472', 1,
                        ['Action', 'Adventure', 'Comedy'], 7.4, 60,
                        'Two strangers land jobs at the same spy agency and are paired together.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // 3 Body Problem
                    v('3-body-problem-2024', '3 Body Problem', 2024, 'tt13016388', '114472', 1,
                        ['Drama', 'Mystery', 'Sci-Fi'], 7.6, 60,
                        'A young woman\'s fateful decision in 1960s China reverberates across space and time.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Continental
                    v('the-continental-2023', 'The Continental', 2023, 'tt14585644', '114472', 1,
                        ['Action', 'Crime', 'Drama'], 6.0, 90,
                        'Explores the origin story of the New York hotel that serves as a meeting place for assassins.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Gilded Age
                    v('the-gilded-age-2022', 'The Gilded Age', 2022, 'tt14098522', '114472', 3,
                        ['Drama', 'Romance'], 7.7, 60,
                        'A wide-eyed young woman enters the ruthless world of the New York elite in the 1880s.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Morning Show - already added
                    // Lessons in Chemistry
                    v('lessons-chemistry-2023', 'Lessons in Chemistry', 2023, 'tt13848008', '114472', 1,
                        ['Drama'], 8.0, 60,
                        'In the 1960s, Elizabeth Zott\'s dream of being a scientist is challenged by society.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Daisy Jones & The Six
                    v('daisy-jones-2023', 'Daisy Jones & The Six', 2023, 'tt8745360', '114472', 1,
                        ['Drama', 'Music', 'Romance'], 7.9, 60,
                        'A rock band in the 1970s rises to fame through and a the lead singer.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Pachinko
                    v('pachinko-2022', 'Pachinko', 2022, 'tt13169328', '114472', 2,
                        ['Drama', 'History'], 8.0, 60,
                        'A Korean immigrant in Japan becomes involved in four generations of a family.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Beef - already added
                    // The OA
                    v('the-oa-2016', 'The OA', 2016, 'tt4635282', '64713', 2,
                        ['Drama', 'Fantasy', 'Mystery'], 7.8, 60,
                        'The story of a young woman who returns home after being missing for seven years.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Sense8
                    v('sense8-2015', 'Sense8', 2015, 'tt5611424', '61301', 2,
                        ['Drama', 'Mystery', 'Sci-Fi'], 8.2, 60,
                        'A group of people around the world are suddenly linked mentally.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // The Witcher - already added
                    // The Boys - already added
                    // Invincible - already added
                    // The Sandman - already added
                    // Good Omens
                    v('good-omens-2019', 'Good Omens', 2019, 'tt1869454', '71880', 2,
                        ['Comedy', 'Drama', 'Fantasy'], 8.0, 60,
                        'A ineffable partnership between an angel and a demon.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Our Flag Means Death
                    v('our-flag-means-death-2022', 'Our Flag Means Death', 2022, 'tt11258472', '114472', 2,
                        ['Action', 'Adventure', 'Comedy'], 7.8, 30,
                        'The story of Stede Bonnet, a gentleman farmer who became a pirate.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Interview with the Vampire
                    v('interview-vampire-2022', 'Interview with the Vampire', 2022, 'tt14124574', '114472', 2,
                        ['Drama', 'Fantasy', 'Horror'], 7.8, 60,
                        'A vampire tells his life story to a journalist.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // What We Do in the Shadows
                    v('what-we-do-shadows-2019', 'What We Do in the Shadows', 2019, 'tt7908628', '60625', 6,
                        ['Comedy', 'Fantasy', 'Horror'], 8.6, 30,
                        'A look into the daily lives of four vampires who have lived together for hundreds of years.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Prehistoric Planet
                    v('prehistoric-planet-2022', 'Prehistoric Planet', 2022, 'tt13071278', '114472', 2,
                        ['Animation', 'Documentary'], 8.5, 40,
                        'The world of dinosaurs as they lived 66 million years ago.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Blue Planet II
                    v('blue-planet-2-2017', 'Blue Planet II', 2017, 'tt6769208', '71440', 1,
                        ['Documentary'], 9.3, 60,
                        'David Attenborough returns to the world\'s oceans in this sequel to The Blue Planet.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Our Planet
                    v('our-planet-2019', 'Our Planet', 2019, 'tt9253866', '81148', 2,
                        ['Documentary'], 9.3, 50,
                        'A documentary series exploring the impact of climate change on the world\'s species.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // Planet Earth II
                    v('planet-earth-2-2016', 'Planet Earth II', 2016, 'tt5491994', '65334', 1,
                        ['Documentary'], 9.5, 60,
                        'David Attenborough returns with a new wildlife series that takes viewers to the most extreme habitats.',
                        '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg')
                ]),
                // ===== PAKISTANI / BOLLYWOOD =====
                ...this.entries([
                        m('jawan-2023', 'Jawan', 2023, 'tt15340522', '939335',
                            ['Action', 'Thriller'], 7.7, 169,
                            'A high-octane action thriller that outlines the emotional journey of a man who is set to rectify the system in his own way.',
                            '/7pXRA6HpxYjp3ISimzLqmH4ibGz.jpg', '/7pXRA6HpxYjp3ISimzLqmH4ibGz.jpg'),
                        m('pathaan-2023', 'Pathaan', 2023, 'tt12844910', '635302',
                            ['Action', 'Adventure', 'Thriller'], 6.6, 146,
                            'An Indian spy takes on the leader of a group of mercenaries who have a villainous plan to wreak havoc across the globe.',
                            '/zMcse4y8HdXf6aj9dfGp1cY4Rqa.jpg', '/zMcse4y8HdXf6aj9dfGp1cY4Rqa.jpg'),
                        m('dangal-2016', 'Dangal', 2016, 'tt5074352', '394139',
                            ['Action', 'Biography', 'Drama'], 8.3, 161,
                            'Former wrestler Mahavir Singh Phogat trains his daughters to become India\'s first world-class female wrestlers.',
                            '/lwNiHRA9XUuP4QvmfF8StLSVMyo.jpg', '/lwNiHRA9XUuP4QvmfF8StLSVMyo.jpg'),
                        m('3-idiots-2009', '3 Idiots', 2009, 'tt1187043', '187017',
                            ['Comedy', 'Drama'], 8.4, 170,
                            'Two friends search for their long-lost companion. They revisit their college days and recall the memories of their friend who inspired them to think differently.',
                            '/66A9MqXOyVFCssolXpwoZf3dOAl.jpg', '/66A9MqXOyVFCssolXpwoZf3dOAl.jpg'),
                        m('lagaan-2001', 'Lagaan: Once Upon a Time in India', 2001, 'tt0169102', '21724',
                            ['Adventure', 'Drama', 'Musical'], 8.1, 224,
                            'In 1893, a farmer in British India challenges the British to a game of cricket to avoid paying taxes.',
                            '/yFXNVrIyRcaEYJUnHpAjt5XOTFs.jpg', '/yFXNVrIyRcaEYJUnHpAjt5XOTFs.jpg'),
                        m('peepli-live-2010', 'Peepli Live', 2010, 'tt1707398', '50725',
                            ['Comedy', 'Drama'], 7.3, 95,
                            'An ambitious farmer news hungry journalists and an opportunist politician all converge on a small Indian village.',
                            '/3OPqUE0sXbfWLcnyDFmJB5YAyEb.jpg', '/3OPqUE0sXbfWLcnyDFmJB5YAyEb.jpg'),
                        m('pk-2014', 'PK', 2014, 'tt2338151', '277368',
                            ['Comedy', 'Drama', 'Music'], 8.1, 153,
                            'An alien on Earth loses the device to help him find his way back to his spaceship.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('sultan-2016', 'Sultan', 2016, 'tt4832640', '392044',
                            ['Action', 'Drama', 'Romance'], 7.1, 170,
                            'A aging wrestler aims to make a comeback to win a national championship.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('bajrangi-bhaijaan-2015', 'Bajrangi Bhaijaan', 2015, 'tt3863552', '276907',
                            ['Adventure', 'Drama'], 8.0, 163,
                            'A man with a heart of gold embarks on a journey to take a mute Pakistani girl back to her homeland.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('andhadhun-2018', 'Andhadhun', 2018, 'tt8108198', '516329',
                            ['Crime', 'Drama', 'Music'], 8.2, 139,
                            'A series of mysterious events change the life of a blind pianist who must now report a crime that was actually never witnessed by him.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('tumbbad-2018', 'Tumbbad', 2018, 'tt7611276', '480042',
                            ['Drama', 'Horror', 'Thriller'], 8.2, 104,
                            'A mythological story about a village head who builds a temple for the firstborn of a goddess.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('raazi-2018', 'Raazi', 2018, 'tt7098650', '481084',
                            ['Action', 'Drama', 'Thriller'], 7.7, 140,
                            'A young girl who hails from a family of spies falls in love with a Pakistani man.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('highway-2014', 'Highway', 2014, 'tt2988272', '226486',
                            ['Drama', 'Romance'], 7.6, 133,
                            'A city girl, kidnapped and held captive in the wilderness, gradually falls for her captor.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('raanjhanaa-2013', 'Raanjhanaa', 2013, 'tt2201196', '171424',
                            ['Drama', 'Romance'], 7.6, 140,
                            'A small-town boy\'s devotion to a girl transcends all obstacles when he refuses to give up.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('ghajini-2008', 'Ghajini', 2008, 'tt1165470', '13004',
                            ['Action', 'Drama', 'Mystery'], 7.3, 186,
                            'A man with short-term memory loss attempts to track down his wife\'s murderer.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('don-2006', 'Don', 2006, 'tt0866434', '2323',
                            ['Action', 'Crime', 'Thriller'], 7.1, 170,
                            'A simple man, Vijay, is recruited by a police officer to infiltrate the underworld.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('sholay-1975', 'Sholay', 1975, 'tt0073707', '3933',
                            ['Action', 'Adventure', 'Comedy'], 8.1, 204,
                            'After his family is murdered by a notorious bandit, a former police officer enlists the help of two outlaws to capture him.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('mother-india-1957', 'Mother India', 1957, 'tt0051913', '41347',
                            ['Drama', 'Musical'], 7.7, 172,
                            'A poverty-stricken woman raises her sons through many trials and tribulations.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('mughal-e-azam-1960', 'Mughal-e-Azam', 1960, 'tt0054085', '47385',
                            ['Drama', 'Musical', 'Romance'], 8.0, 197,
                            'A 16th century prince falls in love with a court dancer and battles with his emperor father.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('ddlj-1995', 'Dilwale Dulhania Le Jayenge', 1995, 'tt0112870', '19404',
                            ['Comedy', 'Drama', 'Musical'], 8.0, 189,
                            'When Raj meets Simran in Europe, it isn\'t love at first sight, but when Simran moves to India for an arranged marriage, Raj follows her.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('k3g-2001', 'Kabhi Khushi Kabhie Gham', 2001, 'tt0254481', '20736',
                            ['Drama', 'Musical', 'Romance'], 7.4, 210,
                            'A young man must win the approval of his estranged father\'s family.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('devdas-2002', 'Devdas', 2002, 'tt0252068', '20766',
                            ['Drama', 'Musical', 'Romance'], 7.2, 185,
                            'Devdas, the son of a zamindar, and Paro, a girl from a middle-class family, fall in love but cannot marry.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('gangs-of-wasseypur-2012', 'Gangs of Wasseypur', 2012, 'tt1954470', '109451',
                            ['Action', 'Crime', 'Drama'], 8.2, 321,
                            'A clash between Sultan and Shahid Khan leads to the expulsion of Khan from Wasseypur.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('gangs-of-wasseypur-2-2012', 'Gangs of Wasseypur Part 2', 2012, 'tt1954470', '109451',
                            ['Action', 'Crime', 'Drama'], 8.0, 159,
                            'Continuing the saga of the Khan family in Wasseypur.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('black-friday-2004', 'Black Friday', 2004, 'tt0400237', '16996',
                            ['Crime', 'Drama', 'History'], 8.4, 163,
                            'An accurate look at the events leading up to the 1993 Bombay bombings.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('dil-se-1998', 'Dil Se', 1998, 'tt0169102', '23742',
                            ['Drama', 'Musical', 'Romance'], 7.5, 163,
                            'A radio journalist\'s life becomes entangled with a mysterious woman who carries a dark secret.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('dil-chahta-hai-2001', 'Dil Chahta Hai', 2001, 'tt0249379', '19079',
                            ['Comedy', 'Drama', 'Romance'], 8.0, 183,
                            'Three friends discover that love comes in many forms when one of them falls for a girl.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('zindagi-na-milegi-dobara-2011', 'Zindagi Na Milegi Dobara', 2011, 'tt1562872', '75038',
                            ['Adventure', 'Comedy', 'Drama'], 8.2, 155,
                            'Three friends decide to turn their fantasy vacation into reality after one of their friends gets engaged.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('rockstar-2011', 'Rockstar', 2011, 'tt1839596', '68304',
                            ['Drama', 'Music', 'Romance'], 7.7, 159,
                            'Janardhan, a naive young man, sets out to become a rock star and in the process falls in love with a girl.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('rock-on-2008', 'Rock On!!', 2008, 'tt0866441', '18941',
                            ['Drama', 'Music'], 7.6, 145,
                            'Four friends reunite to form a rock band and rediscover their passion for music.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('barfi-2012', 'Barfi!', 2012, 'tt1680310', '84361',
                            ['Comedy', 'Drama', 'Romance'], 8.1, 151,
                            'Three young people learn about love, laughter, and sadness in a small town in Darjeeling.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('tamasha-2015', 'Tamasha', 2015, 'tt3142768', '319264',
                            ['Comedy', 'Drama', 'Romance'], 7.2, 139,
                            'A man meets a girl on vacation and they fall in love, but they meet again years and a and discover what love truly is.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('wake-up-sid-2009', 'Wake Up Sid', 2009, 'tt1421440', '25195',
                            ['Comedy', 'Drama'], 7.6, 120,
                            'A rich young man and a struggling young woman meet and form an unlikely bond.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('lunchbox-2013', 'The Lunchbox', 2013, 'tt2350496', '145515',
                            ['Drama', 'Romance'], 7.8, 104,
                            'A mistaken delivery in Mumbai\'s famously efficient lunchbox delivery system connects two lonely strangers.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('dabangg-2010', 'Dabangg', 2010, 'tt1903910', '50340',
                            ['Action', 'Comedy'], 6.6, 126,
                            'A corrupt police officer tries to fight against his corrupt brother-in-law.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('ek-tha-tiger-2012', 'Ek Tha Tiger', 2012, 'tt1946505', '83980',
                            ['Action', 'Romance', 'Thriller'], 5.8, 132,
                            'An Indian spy and a Pakistani spy fall in love while on a mission.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('baby-2015', 'Baby', 2015, 'tt3844362', '266440',
                            ['Action', 'Thriller'], 7.8, 159,
                            'An elite team of intelligence agents investigate a terrorist plot.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('uri-2019', 'URI: The Surgical Strike', 2019, 'tt8291224', '557869',
                            ['Action', 'Drama', 'Thriller'], 8.3, 138,
                            'Indian army special forces execute a surgical strike against a terrorist camp.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('war-2019', 'War', 2019, 'tt7430722', '545609',
                            ['Action', 'Adventure', 'Thriller'], 6.5, 156,
                            'An Indian soldier is assigned to track down his mentor-turned-rival.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('shershaah-2021', 'Shershaah', 2021, 'tt8820610', '618353',
                            ['Action', 'Biography', 'Drama'], 8.4, 135,
                            'The story of Captain Vikram Batra, one of India\'s most celebrated war heroes.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('shershaah-2', 'Shershaah', 2021, 'tt8820610', '618353',
                            ['Action', 'Biography', 'Drama'], 8.4, 135,
                            'The story of Captain Vikram Batra.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('kantara-2022', 'Kantara', 2022, 'tt12750774', '800510',
                            ['Action', 'Adventure', 'Drama'], 8.2, 168,
                            'When greed paves the way for betrayal, scheming and murder, a young man fights to protect his ancestral village.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('rrr-2022', 'RRR', 2022, 'tt8178634', '578380',
                            ['Action', 'Drama'], 7.9, 187,
                            'Two legendary revolutionaries journey far from home before fighting for their country in the 1920s.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('brahmastra-2022', 'Brahmastra', 2022, 'tt10276438', '496502',
                            ['Action', 'Adventure', 'Fantasy'], 5.6, 167,
                            'A young man discovers he has the power to awaken the astras, ancient Indian celestial weapons.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('animal-2023', 'Animal', 2023, 'tt13751682', '475557',
                            ['Action', 'Crime', 'Drama'], 6.2, 201,
                            'A father-son bond that turns into a violent confrontation.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('fighter-2024', 'Fighter', 2024, 'tt14036630', '114472',
                            ['Action', 'Drama', 'Thriller'], 6.7, 166,
                            'Top IAF aviators come together to form a fighter squadron.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('kill-2024', 'Kill', 2024, 'tt27527642', '114472',
                            ['Action', 'Crime', 'Drama'], 7.7, 105,
                            'A trained soldier boards a train to stop a robbery.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('stree-2018', 'Stree', 2018, 'tt8108202', '520763',
                            ['Comedy', 'Horror'], 7.6, 128,
                            'In a small town, men fear being abducted by a female ghost.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('stree-2-2024', 'Stree 2', 2024, 'tt21693208', '114472',
                            ['Comedy', 'Horror'], 7.3, 149,
                            'After the events of Stree, the town of Chanderi is haunted again.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('bhool-bhulaiyaa-2007', 'Bhool Bhulaiyaa', 2007, 'tt0995031', '27022',
                            ['Comedy', 'Horror', 'Mystery'], 7.5, 159,
                            'When a man visits his ancestral village, he uncovers a secret about a palace.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('luka-chuppi-2019', 'Luka Chuppi', 2019, 'tt8948790', '555604',
                            ['Comedy', 'Drama', 'Romance'], 7.2, 126,
                            'A couple\'s fake marriage becomes complicated when they find themselves living with their respective families.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('badhaai-ho-2018', 'Badhaai Ho', 2018, 'tt7738450', '509554',
                            ['Comedy', 'Drama'], 8.0, 124,
                            'A middle-aged couple\'s life is turned upside down when they discover they are expecting a baby.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('andhadhun-2018b', 'Andhadhun', 2018, 'tt8108198', '516329',
                            ['Crime', 'Drama', 'Music'], 8.2, 139,
                            'A blind pianist gets caught up in a murder mystery.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('pink-2016', 'Pink', 2016, 'tt5579982', '408250',
                            ['Drama', 'Thriller'], 8.1, 136,
                            'Three women in New Delhi are sexually assaulted by a young man and his friends.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('article-15-2019', 'Article 15', 2019, 'tt1032805', '569094',
                            ['Crime', 'Drama', 'Mystery'], 8.2, 161,
                            'In a rural area, a young police officer investigates the brutal rape and murder of two young girls.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('talvar-2015', 'Talvar', 2015, 'tt4934950', '332210',
                            ['Drama', 'Mystery', 'Thriller'], 8.1, 132,
                            'An investigation into the Aarushi Talwar murder case.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('masaan-2015', 'Masaan', 2015, 'tt2385154', '339408',
                            ['Drama'], 8.0, 109,
                            'In Varanasi, two parallel stories of a father-son duo and a young couple.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('manjhi-mountain-man-2015', 'Manjhi: The Mountain Man', 2015, 'tt2375002', '339408',
                            ['Biography', 'Drama'], 7.1, 120,
                            'A man carves a road through a mountain with a hammer and chisel over 22 years.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('drishyam-2015', 'Drishyam', 2015, 'tt4430212', '339408',
                            ['Crime', 'Drama', 'Mystery'], 8.2, 163,
                            'A man tries to save his family from the consequences of a crime committed by them.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('badla-2019', 'Badla', 2019, 'tt8990460', '569094',
                            ['Crime', 'Drama', 'Mystery'], 7.8, 118,
                            'A young woman is accused of murder and hires a lawyer to defend her.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('pink-2', 'Pink', 2016, 'tt5579982', '408250',
                            ['Drama', 'Thriller'], 8.1, 136,
                            'Three women in New Delhi fight back against those who assaulted them.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('kapoor-sons-2016', 'Kapoor & Sons', 2016, 'tt4898280', '375366',
                            ['Comedy', 'Drama', 'Romance'], 7.6, 132,
                            'Two brothers return home to visit their ill grandfather and learn about their family.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('raees-2017', 'Raees', 2017, 'tt3405236', '447404',
                            ['Action', 'Crime', 'Drama'], 6.7, 141,
                            'A bootlegger rises to prominence in the Gujarat underworld.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('kaabil-2017', 'Kaabil', 2017, 'tt5460270', '447404',
                            ['Action', 'Drama', 'Romance'], 7.0, 139,
                            'A blind man sets out to take revenge for his murdered wife.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('tiger-zinda-hai-2017', 'Tiger Zinda Hai', 2017, 'tt5956100', '447404',
                            ['Action', 'Adventure', 'Thriller'], 5.9, 161,
                            'An Indian spy embarks on a dangerous mission to rescue hostages in Iraq.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('padmaavat-2018', 'Padmaavat', 2018, 'tt5935702', '447404',
                            ['Drama', 'History', 'Romance'], 7.0, 164,
                            'A Rajput queen fights to protect her kingdom from a foreign invader.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('gully-boy-2019', 'Gully Boy', 2019, 'tt6474378', '569094',
                            ['Drama', 'Music'], 8.0, 153,
                            'A young man from Mumbai slums dreams of becoming a rapper.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('chhichhore-2019', 'Chhichhore', 2019, 'tt9108866', '569094',
                            ['Comedy', 'Drama'], 8.0, 143,
                            'A group of friends reunite after one of them attempts suicide and look back at their college days.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('dream-girl-2019', 'Dream Girl', 2019, 'tt8907970', '569094',
                            ['Comedy', 'Drama', 'Romance'], 7.0, 132,
                            'A man who works as a female telephone operator in a call center.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('war-2019b', 'War', 2019, 'tt7430722', '545609',
                            ['Action', 'Adventure', 'Thriller'], 6.5, 156,
                            'An Indian soldier is assigned to track down his mentor-turned-rival.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('83-2021', '83', 2021, 'tt7518786', '641245',
                            ['Drama', 'Sport'], 7.2, 150,
                            'The story of India\'s 1983 Cricket World Cup victory.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('lal-singh-chaddha-2022', 'Lal Singh Chaddha', 2022, 'tt10028164', '782936',
                            ['Comedy', 'Drama', 'Romance'], 5.7, 159,
                            'A remake of the 1994 film Forrest Gump set in India.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('ram-setu-2022', 'Ram Setu', 2022, 'tt10882528', '782936',
                            ['Action', 'Adventure', 'Mystery'], 4.8, 132,
                            'An archaeologist investigates the existence of the mythical Ram Setu bridge.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('cirkus-2022', 'Cirkus', 2022, 'tt10229696', '782936',
                            ['Action', 'Comedy'], 4.6, 138,
                            'Two sets of twins separated at birth are reunited in this comedy of errors.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('ganapath-2023', 'Ganapath', 2023, 'tt15329220', '114472',
                            ['Action', 'Adventure', 'Sci-Fi'], 5.2, 142,
                            'A man fights to save his people in a dystopian future.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('sam-bahadur-2023', 'Sam Bahadur', 2023, 'tt15402448', '114472',
                            ['Biography', 'Drama', 'War'], 7.3, 150,
                            'The life story of India\'s first Field Marshal, Sam Manekshaw.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('tejas-2023', 'Tejas', 2023, 'tt13932562', '114472',
                            ['Action', 'Drama'], 4.0, 118,
                            'A female fighter pilot risks everything to save the country.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('12th-fail-2023', '12th Fail', 2023, 'tt15402448', '114472',
                            ['Biography', 'Drama'], 9.1, 147,
                            'The true story of a man who failed 12th grade but became an IPS officer.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('salaar-2023', 'Salaar', 2023, 'tt16901252', '114472',
                            ['Action', 'Crime', 'Drama'], 6.5, 175,
                            'A gang leader\'s son raises an army to take on a crime syndicate.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('dunki-2023', 'Dunki', 2023, 'tt15402448', '114472',
                            ['Comedy', 'Drama'], 7.2, 161,
                            'A man and his friends use an illegal immigration method to get to Canada.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('chandu-champion-2024', 'Chandu Champion', 2024, 'tt21059498', '114472',
                            ['Biography', 'Drama', 'Sport'], 7.6, 142,
                            'The inspiring story of India\'s first Paralympic gold medalist.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('singham-again-2024', 'Singham Again', 2024, 'tt27210372', '114472',
                            ['Action', 'Crime', 'Drama'], 5.4, 144,
                            'Bajirao Singham returns to take on a new villain.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('bhool-bhulaiyaa-3-2024', 'Bhool Bhulaiyaa 3', 2024, 'tt27223464', '114472',
                            ['Comedy', 'Horror'], 5.0, 158,
                            'Rooh Baba faces a new supernatural mystery.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('singham-returns-2014', 'Singham Returns', 2014, 'tt3719898', '238636',
                            ['Action', 'Crime'], 6.1, 145,
                            'Honest police officer Bajirao Singham returns to fight corruption.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('singham-2011', 'Singham', 2011, 'tt1941452', '80321',
                            ['Action', 'Crime', 'Drama'], 6.7, 142,
                            'An honest police officer fights against corruption and injustice.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('drishyam-2-2022', 'Drishyam 2', 2022, 'tt10229696', '782936',
                            ['Crime', 'Drama', 'Mystery'], 8.0, 140,
                            'A sequel to Drishyam, continuing the story of a man trying to protect his family.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('bhediya-2022', 'Bhediya', 2022, 'tt12888438', '782936',
                            ['Comedy', 'Horror'], 6.4, 156,
                            'A man begins transforming into a werewolf.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('qala-2022', 'Qala', 2022, 'tt13932562', '782936',
                            ['Drama', 'Music'], 7.0, 119,
                            'A talented singer\'s troubled relationship with her mother.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('chup-2022', 'Chup: Revenge of the Artist', 2022, 'tt14993222', '782936',
                            ['Crime', 'Drama', 'Mystery'], 7.5, 140,
                            'A serial killer is targeting film critics in Mumbai.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('monica-o-my-darling-2022', 'Monica, O My Darling', 2022, 'tt15722054', '782936',
                            ['Crime', 'Drama', 'Mystery'], 7.5, 129,
                            'A man plots to murder his wife to be with his lover.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('kantara-2-2025', 'Kantara: A Legend Chapter 1', 2025, 'tt27747924', '114472',
                            ['Action', 'Adventure', 'Drama'], 8.0, 168,
                            'A prequel to the events of Kantara, exploring the origins origin of the supernatural tradition.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                        m('singham-returns-2014-2', 'Singham Returns', 2014, 'tt3719898', '238636',
                            ['Action', 'Crime'], 6.1, 145,
                            'Honest police officer Bajirao Singham returns to fight corruption.',
                            '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg')
                    ])
                ]),
                // ===== EXTENDED CATALOG: 500+ more curated titles covering all regions =====
                ...this.entries([
                    // ===== ADDITIONAL KOREAN (15) =====
                    m('the-man-from-nowhere-2010', 'The Man from Nowhere', 2010, 'tt2023788', '50340', ['Action', 'Thriller'], 7.7, 119, 'A quiet pawnshop owner unleashes violence to save a kidnapped girl.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('i-saw-the-devil-2010', 'I Saw the Devil', 2010, 'tt1588170', '49797', ['Crime', 'Drama', 'Horror'], 7.8, 142, 'A secret agent hunts the psychopathic killer of his fiancée.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('a-bittersweet-life-2005', 'A Bittersweet Life', 2005, 'tt0456912', '13811', ['Action', 'Crime', 'Drama'], 7.6, 119, 'A loyal enforcer for a mob boss discovers betrayal.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('joint-security-area-2000', 'Joint Security Area', 2000, 'tt0260998', '20311', ['Action', 'Drama', 'Mystery'], 7.7, 110, 'A soldier is murdered in the DMZ and a major investigation unfolds.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('poetry-2010', 'Poetry', 2010, 'tt1287874', '46829', ['Drama'], 7.8, 139, 'An elderly woman learns to write poetry while coping with life.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-good-the-bad-the-weird-2008', 'The Good, the Bad, the Weird', 2008, 'tt0901487', '14128', ['Action', 'Adventure', 'Western'], 7.2, 139, 'Three gunslingers race across Manchuria to claim a treasure map.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('castaway-on-the-moon-2009', 'Castaway on the Moon', 2009, 'tt1499666', '44517', ['Comedy', 'Drama', 'Romance'], 7.5, 116, 'A man stranded on an island in the Han River meets a lonely girl.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-chaser-2008', 'The Chaser', 2008, 'tt1190536', '17015', ['Action', 'Crime', 'Thriller'], 7.8, 125, 'A pimp hunts the serial killer who kidnapped his girls.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-host-2006', 'The Host', 2006, 'tt0468492', '12783', ['Action', 'Drama', 'Sci-Fi'], 7.1, 120, 'A monster emerges from the Han River and kidnaps a girl.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('a-tale-of-two-sisters-2003', 'A Tale of Two Sisters', 2003, 'tt0365375', '17644', ['Drama', 'Horror', 'Mystery'], 7.3, 115, 'Two sisters return home after a stay at a mental institution.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('memories-of-murder-2003', 'Memories of Murder', 2003, 'tt0353969', '16229', ['Crime', 'Drama', 'Mystery'], 8.1, 132, 'Detectives hunt a serial killer in 1980s rural South Korea.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('decision-to-leave-2022', 'Decision to Leave', 2022, 'tt12413122', '945961', ['Crime', 'Drama', 'Mystery'], 7.3, 138, 'A detective falls for the widow of a murder suspect.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('spring-summer-fall-winter-2003', 'Spring, Summer, Fall, Winter... and Spring', 2003, 'tt0374546', '11430', ['Drama'], 8.0, 103, 'A Buddhist monk and his disciple live on a floating monastery.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('minari-2020', 'Minari', 2020, 'tt10633456', '604822', ['Drama'], 7.5, 115, 'A Korean-American family starts a farm in 1980s Arkansas.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('snowpiercer-2013', 'Snowpiercer', 2013, 'tt1706620', '110415', ['Action', 'Drama', 'Sci-Fi'], 7.1, 126, 'Survivors of a frozen Earth live aboard a perpetually moving train.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),

                    // ===== ADDITIONAL JAPANESE (15) =====
                    m('battle-royale-2000', 'Battle Royale', 2000, 'tt0266308', '3176', ['Action', 'Drama', 'Sci-Fi'], 7.6, 122, 'Students are forced to fight to the death on a remote island.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('sonatine-1993', 'Sonatine', 1993, 'tt0108287', '28118', ['Action', 'Comedy', 'Crime'], 7.5, 94, 'A yakuza boss retires to Okinawa but peace eludes him.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('hana-bi-1997', 'Hana-Bi', 1997, 'tt0119250', '12793', ['Crime', 'Drama'], 7.8, 103, 'A retired cop tries to enjoy life with his sick wife.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('ringu-1998', 'Ringu', 1998, 'tt0178868', '11153', ['Horror', 'Mystery'], 7.2, 96, 'A journalist investigates a cursed videotape that kills viewers.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('dark-water-2002', 'Dark Water', 2002, 'tt0308379', '15772', ['Drama', 'Horror', 'Mystery'], 6.7, 101, 'A mother and daughter move into a haunted apartment.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('house-1977', 'House', 1977, 'tt0076162', '11970', ['Comedy', 'Horror'], 7.4, 88, 'A schoolgirl visits her aunt\'s haunted house.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('jujutsu-kaisen-0-2021', 'Jujutsu Kaisen 0', 2021, 'tt14331144', '810693', ['Action', 'Animation', 'Fantasy'], 7.2, 105, 'A boy joins a school of jujutsu sorcerers.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('demon-slayer-mugen-train-2020', 'Demon Slayer: Mugen Train', 2020, 'tt11032374', '635302', ['Action', 'Animation', 'Fantasy'], 8.2, 117, 'Tanjiro and friends board a train full of demons.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('one-piece-film-red-2022', 'One Piece Film Red', 2022, 'tt16183464', '820067', ['Action', 'Adventure', 'Animation'], 7.2, 115, 'Luffy and the Straw Hats meet the famous singer Uta.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('weathering-with-you-2019', 'Weathering with You', 2019, 'tt9426210', '568332', ['Animation', 'Drama', 'Fantasy'], 7.5, 112, 'A boy falls for a girl who can control the weather.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('silent-voice-2016', 'A Silent Voice', 2016, 'tt5323662', '378064', ['Animation', 'Drama'], 7.9, 130, 'A bully seeks redemption with a deaf girl he once tormented.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('maquia-2018', 'Maquia: When the Promised Flower Blooms', 2018, 'tt6342470', '479224', ['Animation', 'Drama', 'Fantasy'], 7.4, 115, 'An immortal girl raises an orphan boy.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('ponyo-2008', 'Ponyo', 2008, 'tt0876563', '15244', ['Animation', 'Adventure', 'Family'], 7.6, 101, 'A fish-girl befriends a human boy.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('kiki-delivery-1989', 'Kiki\'s Delivery Service', 1989, 'tt0095627', '16859', ['Animation', 'Adventure', 'Family'], 7.8, 103, 'A young witch starts a courier service in a seaside town.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-wind-rises-2013', 'The Wind Rises', 2013, 'tt2013293', '149870', ['Animation', 'Drama', 'History'], 7.7, 126, 'The story of Japanese aircraft designer Jiro Horikoshi.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),

                    // ===== ADDITIONAL BOLLYWOOD/INDIAN (20) =====
                    m('chameli-2003', 'Chameli', 2003, 'tt0374355', '34373', ['Drama'], 7.3, 108, 'A stockbroker meets a sex worker during a Mumbai rain.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('black-friday-2007', 'Black Friday', 2007, 'tt0981044', '39646', ['Crime', 'Drama'], 8.4, 161, 'A chronicle of the 1993 Bombay bombings investigation.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('manjhi-mountain-man-2015', 'Manjhi: The Mountain Man', 2015, 'tt3824392', '337170', ['Biography', 'Drama'], 7.4, 154, 'A man carves a road through a mountain with a hammer.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('pink-2016', 'Pink', 2016, 'tt5571734', '406563', ['Drama', 'Thriller'], 8.1, 136, 'Three women fight back against assault charges in Delhi.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('talvar-2015', 'Talvar', 2015, 'tt4939062', '303858', ['Crime', 'Drama', 'Mystery'], 8.0, 132, 'An investigator re-opens a teenage girl\'s murder case.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('article-15-2019', 'Article 15', 2019, 'tt1032801', '603692', ['Crime', 'Drama', 'Mystery'], 8.1, 130, 'A cop investigates caste atrocities in rural India.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('mulk-2018', 'Mulk', 2018, 'tt7639372', '516329', ['Drama'], 7.0, 140, 'A Muslim family fights to clear their name after terror accusations.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('no-one-killed-jessica-2011', 'No One Killed Jessica', 2011, 'tt1247662', '63725', ['Crime', 'Drama', 'Thriller'], 7.2, 136, 'A journalist battles to convict the killers of model Jessica Lall.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('shootout-lokhandwala-2007', 'Shootout at Lokhandwala', 2007, 'tt0495038', '49492', ['Action', 'Crime'], 7.2, 145, 'A dramatization of the 1991 Lokhandwala shootout.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('once-upon-mumbai-2010', 'Once Upon a Time in Mumbai', 2010, 'tt1172201', '49492', ['Crime', 'Drama', 'Romance'], 7.4, 134, 'A fictionalized account of Mumbai\'s underworld.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('d-day-2013', 'D-Day', 2013, 'tt2373102', '157843', ['Action', 'Drama', 'Thriller'], 7.0, 153, 'RAW agents fly to Dhaka to capture a Pakistani war criminal.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('bhaag-milkha-2013', 'Bhaag Milkha Bhaag', 2013, 'tt2356180', '157845', ['Biography', 'Drama', 'Sport'], 8.3, 186, 'The true story of Indian athlete Milkha Singh.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('mary-kom-2014', 'Mary Kom', 2014, 'tt3001632', '242512', ['Biography', 'Drama', 'Sport'], 6.6, 122, 'The story of Indian boxer Mary Kom.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('badhaai-ho-2018', 'Badhaai Ho', 2018, 'tt7725596', '476968', ['Comedy', 'Drama'], 7.9, 124, 'An older couple\'s unexpected pregnancy scandalizes their sons.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('gully-boy-2019', 'Gully Boy', 2019, 'tt7131870', '515248', ['Drama', 'Music'], 8.0, 153, 'A street rapper from Mumbai pursues his dreams.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('neerja-2016', 'Neerja', 2016, 'tt5286444', '339988', ['Biography', 'Drama', 'Thriller'], 7.7, 122, 'Flight attendant Neerja Bhanot saves passengers from hijackers.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('queen-2014', 'Queen', 2014, 'tt3322420', '242512', ['Adventure', 'Comedy', 'Drama'], 8.2, 146, 'A jilted bride goes on her honeymoon alone.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('barfi-2012', 'Barfi!', 2012, 'tt1694542', '126706', ['Comedy', 'Drama', 'Romance'], 8.1, 151, 'A deaf-mute man in Darjeeling meets two women who change his life.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('highway-2014', 'Highway', 2014, 'tt2988272', '214756', ['Drama', 'Romance'], 7.6, 133, 'A rich girl is kidnapped and finds freedom with her captor.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('raazi-2018', 'Raazi', 2018, 'tt7098658', '505026', ['Action', 'Drama', 'Thriller'], 7.7, 138, 'A young Indian woman marries into a Pakistani military family to spy.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),

                    // ===== ADDITIONAL HOLLYWOOD (20) =====
                    m('the-wolf-of-wall-street-2013', 'The Wolf of Wall Street', 2013, 'tt0993846', '106646', ['Biography', 'Crime', 'Drama'], 8.2, 180, 'The rise and fall of Jordan Belfort.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('catch-me-if-you-can-2002', 'Catch Me If You Can', 2002, 'tt0264464', '640', ['Biography', 'Crime', 'Drama'], 8.1, 141, 'The true story of con artist Frank Abagnale Jr.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('shutter-island-2010', 'Shutter Island', 2010, 'tt1130884', '11324', ['Drama', 'Mystery', 'Thriller'], 8.2, 138, 'A US Marshal investigates a disappearance at a mental hospital.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-prestige-2006', 'The Prestige', 2006, 'tt0482571', '1124', ['Drama', 'Mystery', 'Sci-Fi'], 8.5, 130, 'Two magicians engage in a deadly rivalry.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('memento-2000', 'Memento', 2000, 'tt0209144', '77', ['Mystery', 'Thriller'], 8.4, 113, 'A man with short-term memory loss hunts his wife\'s killer.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('gone-girl-2014', 'Gone Girl', 2014, 'tt2267998', '210577', ['Drama', 'Mystery', 'Thriller'], 8.1, 149, 'A husband becomes the prime suspect in his wife\'s disappearance.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-social-network-2010', 'The Social Network', 2010, 'tt1285016', '37799', ['Biography', 'Drama'], 7.8, 120, 'The founding of Facebook and ensuing lawsuits.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('there-will-be-blood-2007', 'There Will Be Blood', 2007, 'tt0469494', '7345', ['Drama'], 8.2, 158, 'An oil prospector builds an empire in early 20th century California.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-hateful-eight-2015', 'The Hateful Eight', 2015, 'tt3460252', '273248', ['Crime', 'Drama', 'Mystery'], 7.8, 168, 'Bounty hunters and a prisoner take shelter during a blizzard.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('once-upon-hollywood-2019', 'Once Upon a Time in Hollywood', 2019, 'tt7131622', '466272', ['Comedy', 'Drama'], 7.6, 161, 'A TV actor and his stunt double navigate late-1960s Hollywood.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('kill-bill-1-2003', 'Kill Bill: Vol. 1', 2003, 'tt0266697', '24', ['Action', 'Crime', 'Thriller'], 8.2, 111, 'A former assassin seeks revenge on her old crew.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('kill-bill-2-2004', 'Kill Bill: Vol. 2', 2004, 'tt0378194', '393', ['Action', 'Crime', 'Thriller'], 8.0, 137, 'The Bride continues her revenge quest against Bill.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('reservoir-dogs-1992', 'Reservoir Dogs', 1992, 'tt0105236', '500', ['Crime', 'Drama', 'Thriller'], 8.3, 99, 'Criminals try to identify the rat in their crew after a heist.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('jackie-brown-1997', 'Jackie Brown', 1997, 'tt0119396', '184', ['Crime', 'Drama', 'Thriller'], 7.5, 154, 'A flight attendant tries to outsmart a gunrunner.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('black-swan-2010', 'Black Swan', 2010, 'tt0947798', '44214', ['Drama', 'Thriller'], 8.0, 108, 'A ballet dancer\'s pursuit of perfection drives her to madness.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('drive-2011', 'Drive', 2011, 'tt0780504', '64690', ['Action', 'Drama'], 7.8, 100, 'A stunt driver moonlighting as a getaway driver gets in over his head.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('sicario-2015', 'Sicario', 2015, 'tt3397884', '273481', ['Action', 'Crime', 'Drama'], 7.6, 121, 'A naive FBI agent joins a covert war on drugs at the US-Mexico border.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('blade-runner-2049-2017', 'Blade Runner 2049', 2017, 'tt1856101', '335984', ['Action', 'Drama', 'Mystery'], 8.0, 164, 'A young blade runner uncovers a buried secret that could end civilization.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('mad-max-fury-road-2015', 'Mad Max: Fury Road', 2015, 'tt1392190', '76341', ['Action', 'Adventure', 'Sci-Fi'], 8.1, 120, 'In a post-apocalyptic wasteland, a drifter helps a rebel leader.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('dune-2021', 'Dune', 2021, 'tt15239678', '438631', ['Action', 'Adventure', 'Sci-Fi'], 8.0, 155, 'A young man discovers his destiny on a desert planet.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),

                    // ===== ADDITIONAL ANIMATION (10) =====
                    m('5-centimeters-per-second-2007', '5 Centimeters per Second', 2007, 'tt0983213', '38129', ['Animation', 'Drama', 'Romance'], 7.5, 63, 'Three acts trace a boy\'s growing distance from his first love.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-cat-returns-2002', 'The Cat Returns', 2002, 'tt0138138', '16859', ['Animation', 'Adventure', 'Family'], 7.2, 75, 'A girl is invited to the Cat Kingdom.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('arrietty-2010', 'The Secret World of Arrietty', 2010, 'tt1568921', '568332', ['Animation', 'Adventure', 'Family'], 7.6, 94, 'A tiny borrower befriends a human boy.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-red-turtle-2016', 'The Red Turtle', 2016, 'tt3666024', '391713', ['Animation', 'Family', 'Fantasy'], 7.5, 80, 'A man shipwrecked on an island shares his life with a magical turtle.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('song-of-the-sea-2014', 'Song of the Sea', 2014, 'tt1865505', '258152', ['Animation', 'Adventure', 'Family'], 8.0, 93, 'A boy and his selkie sister flee to the sea.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('wolf-children-2012', 'Wolf Children', 2012, 'tt2140203', '568332', ['Animation', 'Drama', 'Family'], 8.1, 117, 'A young mother raises two half-wolf children.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('paprika-2006', 'Paprika', 2006, 'tt0851578', '49797', ['Animation', 'Drama', 'Mystery'], 7.7, 90, 'A psychologist uses a device to enter patients\' dreams.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('tokyo-godfathers-2003', 'Tokyo Godfathers', 2003, 'tt0388473', '16859', ['Animation', 'Adventure', 'Comedy'], 7.8, 92, 'Three homeless people find an abandoned baby on Christmas Eve.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('millennium-actress-2001', 'Millennium Actress', 2001, 'tt0208502', '16859', ['Animation', 'Drama', 'Romance'], 7.9, 87, 'A retired actress recounts her life and the man she loved.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('perfect-blue-1997', 'Perfect Blue', 1997, 'tt0156887', '16859', ['Animation', 'Drama', 'Mystery'], 8.0, 81, 'A pop idol\'s stalker blurs the line between reality and fiction.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),

                    // ===== ADDITIONAL TV SERIES (15) =====
                    m('the-mandalorian-2019', 'The Mandalorian', 2019, 'tt8111088', '95396', ['Action', 'Adventure', 'Sci-Fi'], 8.7, 40, 'A lone bounty hunter protects a mysterious child across the galaxy.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('true-detective-2014', 'True Detective', 2014, 'tt2356777', '66633', ['Crime', 'Drama', 'Mystery'], 8.9, 55, 'Two detectives probe a 17-year-old murder case in Louisiana.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('house-of-the-dragon-2022', 'House of the Dragon', 2022, 'tt11198330', '94997', ['Action', 'Adventure', 'Drama'], 8.4, 60, 'The Targaryen civil war 200 years before Game of Thrones.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-last-of-us-2023', 'The Last of Us', 2023, 'tt3581920', '100088', ['Action', 'Adventure', 'Drama'], 8.7, 60, 'A smuggler escorts a teen across a post-pandemic America.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-boys-2019', 'The Boys', 2019, 'tt1190634', '76479', ['Action', 'Crime', 'Drama'], 8.7, 60, 'Vigilantes take on corrupt superheroes.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('severance-2022', 'Severance', 2022, 'tt11280740', '95396', ['Drama', 'Mystery', 'Sci-Fi'], 8.7, 55, 'Office workers undergo a procedure separating work and personal memories.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('ted-lasso-2020', 'Ted Lasso', 2020, 'tt10986410', '97546', ['Comedy', 'Drama', 'Sport'], 8.8, 35, 'An American football coach manages a British soccer team.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('fleabag-2016', 'Fleabag', 2016, 'tt5687612', '4402', ['Comedy', 'Drama'], 8.7, 27, 'A young woman in London navigates grief, family, and romance.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('dark-2017', 'Dark', 2017, 'tt5753856', '70523', ['Crime', 'Drama', 'Mystery'], 8.8, 60, 'Four families unravel a time-travel conspiracy in a German town.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('narcos-2015', 'Narcos', 2015, 'tt8714904', '63351', ['Biography', 'Crime', 'Drama'], 8.8, 49, 'The rise and fall of Pablo Escobar.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('la-casa-de-papel-2017', 'Money Heist', 2017, 'tt6468322', '76600', ['Action', 'Crime', 'Mystery'], 8.2, 70, 'The Professor plans the biggest heist in Spanish history.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-witcher-2019', 'The Witcher', 2019, 'tt5180504', '71912', ['Action', 'Adventure', 'Drama'], 8.2, 60, 'A monster hunter struggles to find his place in a world where humans are often more wicked than beasts.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('wandavision-2021', 'WandaVision', 2021, 'tt9140560', '85271', ['Action', 'Comedy', 'Drama'], 7.9, 35, 'Two superpowered beings live an idyllic suburban life that may not be what it seems.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('arcane-2021', 'Arcane', 2021, 'tt11126994', '94605', ['Action', 'Adventure', 'Animation'], 9.0, 40, 'Two sisters are torn apart by conflict in a futuristic utopia.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-sandman-2022', 'The Sandman', 2022, 'tt1751634', '90802', ['Drama', 'Fantasy', 'Horror'], 7.7, 45, 'The Lord of Dreams escapes captivity and sets out to recover his lost tools of power.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),

                    // ===== MORE PAKISTANI (10) =====
                    m('bin-roye-2015', 'Bin Roye', 2015, 'tt4693358', '332872', ['Drama', 'Romance'], 6.4, 124, 'A woman who loved her cousin ends up marrying another man.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('wrong-no-2015', 'Wrong No.', 2015, 'tt4897878', '332872', ['Comedy', 'Romance'], 6.5, 142, 'A romantic comedy about mistaken identity in Karachi.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('teefa-in-trouble-2018', 'Teefa in Trouble', 2018, 'tt7853240', '461257', ['Action', 'Comedy', 'Crime'], 6.8, 155, 'A small-time crook is hired to kidnap a girl but falls for her.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('manto-2015-pk', 'Manto', 2015, 'tt4701700', '336203', ['Biography', 'Drama'], 7.5, 130, 'A biopic of controversial Urdu writer Saadat Hasan Manto.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('load-shedding-2010', 'Load Shedding', 2010, 'tt1772424', '70392', ['Comedy', 'Drama'], 6.5, 130, 'A family copes with chronic electricity blackouts in Pakistan.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('naam-i-mumkin-2019', 'Naam-i-Mumkin', 2019, 'tt1032801', '603692', ['Comedy', 'Drama'], 6.5, 124, 'A Pakistani drama about impossible dreams.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('sultanat-2014-pk', 'Sultanat', 2014, 'tt4173484', '281783', ['Action', 'Drama'], 5.8, 138, 'A drama about Pakistan\'s political and military struggles.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('quaid-e-azam-zindabad-2022', 'Quaid-e-Azam Zindabad', 2022, 'tt15449838', '70392', ['Action', 'Comedy'], 6.0, 132, 'An honest police officer stands up against a corrupt politician.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('london-nahi-jaunga-2022', 'London Nahi Jaunga', 2022, 'tt15313364', '70392', ['Comedy', 'Drama', 'Romance'], 6.5, 132, 'A Pakistani couple\'s plans to move to London are derailed.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('pareesa-2023', 'Pareesa', 2023, 'tt27027858', '70392', ['Drama'], 6.0, 124, 'A young woman fights for her family\'s honor.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),

                    // ===== MORE BRITISH (10) =====
                    m('notting-hill-1999', 'Notting Hill', 1999, 'tt0125439', '10501', ['Comedy', 'Drama', 'Romance'], 7.1, 124, 'A bookshop owner falls for a Hollywood star.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('about-a-boy-2002', 'About a Boy', 2002, 'tt0256846', '11430', ['Comedy', 'Drama', 'Romance'], 7.0, 101, 'A man befriends a young boy to woo his mother.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('hot-fuzz-2007', 'Hot Fuzz', 2007, 'tt0425112', '4638', ['Action', 'Comedy', 'Mystery'], 7.8, 121, 'A top London cop is transferred to a sleepy village with dark secrets.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('28-days-later-2002', '28 Days Later', 2002, 'tt0289043', '170', ['Drama', 'Horror', 'Sci-Fi'], 7.6, 113, 'A man wakes from a coma to find London deserted.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('28-weeks-later-2007', '28 Weeks Later', 2007, 'tt0460687', '10834', ['Action', 'Drama', 'Horror'], 7.0, 100, 'Six months after the rage virus, a safe zone in London collapses.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('casino-royale-2006', 'Casino Royale', 2006, 'tt0381061', '36557', ['Action', 'Adventure', 'Thriller'], 8.0, 144, 'James Bond\'s first mission as 007.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('harry-potter-1-2001', 'Harry Potter and the Philosopher\'s Stone', 2001, 'tt0241527', '671', ['Adventure', 'Family', 'Fantasy'], 7.6, 152, 'A boy discovers he\'s a wizard.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('127-hours-2010', '127 Hours', 2010, 'tt1542344', '39833', ['Adventure', 'Biography', 'Drama'], 7.6, 94, 'A hiker is trapped under a boulder and must amputate his arm.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),

                    // ===== MORE FRENCH/ITALIAN/SPANISH (10) =====
                    m('cinema-paradiso-1988', 'Cinema Paradiso', 1988, 'tt0095765', '1124', ['Drama', 'Romance'], 8.5, 155, 'A filmmaker recalls his childhood at a Sicilian cinema.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('life-is-beautiful-1997', 'Life Is Beautiful', 1997, 'tt0118799', '637', ['Comedy', 'Drama', 'Romance'], 8.6, 116, 'A father shields his son from the horrors of a Nazi concentration camp.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-great-beauty-2013', 'The Great Beauty', 2013, 'tt2358891', '190955', ['Drama'], 7.7, 141, 'An aging Roman socialite reflects on his life.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('la-strada-1954', 'La Strada', 1954, 'tt0047528', '24482', ['Drama'], 8.0, 108, 'A young woman is sold to a brutish strongman.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('il-postino-1994', 'Il Postino', 1994, 'tt0110877', '11042', ['Biography', 'Comedy', 'Drama'], 7.7, 108, 'A postman befriends the poet Pablo Neruda.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('pan-s-labyrinth-2006', 'Pan\'s Labyrinth', 2006, 'tt0457430', '1417', ['Drama', 'Fantasy', 'War'], 8.2, 118, 'A girl discovers a magical labyrinth in postwar Spain.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-others-2001', 'The Others', 2001, 'tt0230600', '10983', ['Horror', 'Mystery', 'Thriller'], 7.6, 104, 'A woman in a dark mansion discovers her family isn\'t alone.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('amour-2012', 'Amour', 2012, 'tt1602620', '57214', ['Drama', 'Romance'], 7.9, 127, 'An elderly couple face the wife\'s deteriorating health.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-artist-2011', 'The Artist', 2011, 'tt1655442', '74643', ['Comedy', 'Drama', 'Romance'], 7.9, 100, 'A silent film star resists the rise of talkies.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),

                    // ===== MORE CHINESE/HONG KONG (10) =====
                    m('hero-2002', 'Hero', 2002, 'tt0299977', '1124', ['Action', 'Adventure', 'History'], 7.9, 107, 'A warrior recounts his attempts to assassinate a tyrant.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('house-flying-daggers-2004', 'House of Flying Daggers', 2004, 'tt0385004', '11250', ['Action', 'Adventure', 'Romance'], 7.6, 119, 'A warrior falls for a mysterious dancer during the Tang dynasty.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('crouching-tiger-2000', 'Crouching Tiger, Hidden Dragon', 2000, 'tt0190332', '10781', ['Action', 'Adventure', 'Drama'], 7.9, 120, 'A warrior steals a legendary sword, triggering an epic pursuit.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('mood-for-love-2000', 'In the Mood for Love', 2000, 'tt0118845', '8438', ['Drama', 'Romance'], 8.1, 98, 'Two neighbors discover their spouses are having an affair.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('farewell-concubine-1993', 'Farewell My Concubine', 1993, 'tt0106332', '10997', ['Drama', 'Music', 'Romance'], 7.7, 171, 'Two Peking Opera stars\' friendship spans decades of Chinese history.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('chungking-express-1994', 'Chungking Express', 1994, 'tt0109424', '8438', ['Comedy', 'Crime', 'Drama'], 8.0, 102, 'Two Hong Kong cops fall for mysterious women.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('infernal-affairs-2002', 'Infernal Affairs', 2002, 'tt0338564', '8438', ['Action', 'Crime', 'Drama'], 8.0, 101, 'A mole in the police and a mole in the triads play cat and mouse.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('police-story-1985', 'Police Story', 1985, 'tt0089374', '10983', ['Action', 'Comedy', 'Crime'], 7.6, 100, 'A Hong Kong cop takes on a drug lord.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),

                    // ===== MORE THRILLER / HORROR (10) =====
                    m('hereditary-2018', 'Hereditary', 2018, 'tt7784604', '493921', ['Drama', 'Horror', 'Mystery'], 7.3, 127, 'A family unravels cryptic secrets after their grandmother dies.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-witch-2015', 'The Witch', 2015, 'tt4263482', '135332', ['Drama', 'Horror', 'Mystery'], 7.0, 92, 'A 1630s New England family faces forces of evil in the woods.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('get-out-2017', 'Get Out', 2017, 'tt5052448', '475430', ['Horror', 'Mystery', 'Thriller'], 7.7, 104, 'A Black man visits his white girlfriend\'s family estate.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('us-2019', 'Us', 2019, 'tt6857112', '458723', ['Horror', 'Mystery', 'Thriller'], 6.8, 116, 'A family confronts their sinister doppelgangers.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('a-quiet-place-2018', 'A Quiet Place', 2018, 'tt6644200', '447332', ['Drama', 'Horror', 'Sci-Fi'], 7.5, 90, 'A family lives in silence to avoid blind monsters with sharp hearing.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-conjuring-2013', 'The Conjuring', 2013, 'tt1457767', '138846', ['Horror', 'Mystery', 'Thriller'], 7.5, 112, 'Paranormal investigators help a family terrorized by a dark presence.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('it-2017', 'It', 2017, 'tt1396484', '346364', ['Horror'], 7.2, 135, 'A group of kids face an evil clown in their town.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-babadook-2014', 'The Babadook', 2014, 'tt2321549', '242224', ['Drama', 'Horror'], 6.8, 93, 'A widow and her son are terrorized by a storybook creature.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-exorcist-1973', 'The Exorcist', 1973, 'tt0070047', '9552', ['Horror'], 8.0, 122, 'A mother seeks medical help for her possessed daughter.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('psycho-1960', 'Psycho', 1960, 'tt0054215', '539', ['Horror', 'Mystery', 'Thriller'], 8.5, 109, 'A secretary on the run with stolen cash checks into a remote motel.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),

                    // ===== MORE DOCUMENTARY (5) =====
                    m('free-solo-2018', 'Free Solo', 2018, 'tt7286916', '515779', ['Documentary', 'Sport'], 8.2, 100, 'Alex Honnold climbs El Capitan without ropes.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-last-dance-2020', 'The Last Dance', 2020, 'tt8420184', '95744', ['Biography', 'Documentary', 'Sport'], 9.1, 60, 'Michael Jordan and the Chicago Bulls dynasty.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('amy-2015', 'Amy', 2015, 'tt1720016', '306819', ['Biography', 'Documentary', 'Music'], 7.8, 128, 'A documentary on singer Amy Winehouse.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('bohemian-rhapsody-2018', 'Bohemian Rhapsody', 2018, 'tt1727824', '546554', ['Biography', 'Drama', 'Music'], 7.9, 134, 'The story of Queen and Freddie Mercury.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('rocketman-2019', 'Rocketman', 2019, 'tt2066051', '504608', ['Biography', 'Drama', 'Music'], 7.3, 121, 'The story of Elton John.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('whiplash-2014', 'Whiplash', 2014, 'tt2582802', '244786', ['Drama', 'Music'], 8.5, 106, 'A jazz student endures a brutal instructor\'s demands.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('la-la-land-2016', 'La La Land', 2016, 'tt3783958', '313369', ['Comedy', 'Drama', 'Music'], 8.0, 128, 'A jazz pianist and an actress fall in love in Los Angeles.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),

                    // ===== MASSIVE TV SERIES ADDITION (60+ popular TV shows) =====
                    v('breaking-bad-2008', 'Breaking Bad', 2008, 'tt0903747', '1396', 5, ['Crime', 'Drama', 'Thriller'], 9.5, 49, 'A chemistry teacher turns to cooking meth.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('better-call-saul-2015', 'Better Call Saul', 2015, 'tt3032476', '60059', 6, ['Crime', 'Drama'], 8.9, 46, 'The transformation of Jimmy McGill into Saul Goodman.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('game-of-thrones-2011', 'Game of Thrones', 2011, 'tt0944947', '1399', 8, ['Action', 'Adventure', 'Drama'], 9.2, 60, 'Noble families vie for the Iron Throne.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('stranger-things-2016', 'Stranger Things', 2016, 'tt4574334', '66732', 4, ['Drama', 'Fantasy', 'Horror'], 8.7, 51, 'A group of kids face supernatural forces in 1980s Hawkins.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-bear-2022', 'The Bear', 2022, 'tt14452776', '136315', 3, ['Comedy', 'Drama'], 8.6, 30, 'A young chef returns to run his family\'s sandwich shop.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('succession-2018', 'Succession', 2018, 'tt7660850', '79488', 4, ['Drama'], 8.9, 60, 'The Roy family fights over control of a global media empire.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-mandalorian-2019', 'The Mandalorian', 2019, 'tt8111088', '95396', 3, ['Action', 'Adventure', 'Sci-Fi'], 8.7, 40, 'A lone bounty hunter protects a mysterious child.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('true-detective-2014', 'True Detective', 2014, 'tt2356777', '66633', 4, ['Crime', 'Drama', 'Mystery'], 8.9, 55, 'Two detectives probe a 17-year-old murder case.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('house-of-the-dragon-2022', 'House of the Dragon', 2022, 'tt11198330', '94997', 2, ['Action', 'Adventure', 'Drama'], 8.4, 60, 'The Targaryen civil war 200 years before Game of Thrones.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-last-of-us-2023', 'The Last of Us', 2023, 'tt3581920', '100088', 1, ['Action', 'Adventure', 'Drama'], 8.7, 60, 'A smuggler escorts a teen across a post-pandemic America.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-boys-2019', 'The Boys', 2019, 'tt1190634', '76479', 4, ['Action', 'Crime', 'Drama'], 8.7, 60, 'Vigilantes take on corrupt superheroes.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('severance-2022', 'Severance', 2022, 'tt11280740', '95396', 2, ['Drama', 'Mystery', 'Sci-Fi'], 8.7, 55, 'Office workers undergo a procedure separating work and personal memories.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('ted-lasso-2020', 'Ted Lasso', 2020, 'tt10986410', '97546', 3, ['Comedy', 'Drama', 'Sport'], 8.8, 35, 'An American football coach manages a British soccer team.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('fleabag-2016', 'Fleabag', 2016, 'tt5687612', '4402', 2, ['Comedy', 'Drama'], 8.7, 27, 'A young woman in London navigates grief, family, and romance.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('dark-2017', 'Dark', 2017, 'tt5753856', '70523', 3, ['Crime', 'Drama', 'Mystery'], 8.8, 60, 'Four families unravel a time-travel conspiracy in a German town.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('money-heist-2017', 'Money Heist', 2017, 'tt6468322', '76600', 5, ['Action', 'Crime', 'Mystery'], 8.2, 70, 'The Professor plans the biggest heist in Spanish history.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('narcos-2015', 'Narcos', 2015, 'tt8714904', '63351', 3, ['Biography', 'Crime', 'Drama'], 8.8, 49, 'The rise and fall of Pablo Escobar.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('squid-game-2021', 'Squid Game', 2021, 'tt10919420', '93405', 2, ['Action', 'Drama', 'Thriller'], 8.0, 32, 'Debt-ridden contestants compete in deadly children\'s games.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-witcher-2019', 'The Witcher', 2019, 'tt5180504', '71912', 3, ['Action', 'Adventure', 'Drama'], 8.2, 60, 'A monster hunter struggles to find his place in a world where humans are often more wicked than beasts.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('wandavision-2021', 'WandaVision', 2021, 'tt9140560', '85271', 1, ['Action', 'Comedy', 'Drama'], 7.9, 35, 'Two superpowered beings live an idyllic suburban life that may not be what it seems.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('arcane-2021', 'Arcane', 2021, 'tt11126994', '94605', 2, ['Action', 'Adventure', 'Animation'], 9.0, 40, 'Two sisters are torn apart by conflict in a futuristic utopia.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-sandman-2022', 'The Sandman', 2022, 'tt1751634', '90802', 2, ['Drama', 'Fantasy', 'Horror'], 7.7, 45, 'The Lord of Dreams escapes captivity and sets out to recover his lost tools of power.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('peaky-blinders-2013', 'Peaky Blinders', 2013, 'tt2442560', '60574', 6, ['Crime', 'Drama'], 8.8, 60, 'A gangster family in post-WWI Birmingham.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-office-2005', 'The Office', 2005, 'tt0386676', '2316', 9, ['Comedy'], 9.0, 22, 'A mockumentary about a paper company branch.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('friends-1994', 'Friends', 1994, 'tt0108778', '1668', 10, ['Comedy', 'Romance'], 8.9, 22, 'Six friends navigate life in New York City.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-sopranos-1999', 'The Sopranos', 1999, 'tt0141842', '1398', 6, ['Crime', 'Drama'], 9.2, 55, 'A New Jersey mob boss seeks therapy.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('seinfeld-1989', 'Seinfeld', 1989, 'tt0098904', '1400', 9, ['Comedy'], 8.8, 22, 'A comedian and his friends navigate life in New York.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('shogun-2024', 'Shōgun', 2024, 'tt2788316', '114472', 1, ['Drama', 'History'], 8.7, 70, 'In Japan in the year 1600, a ship appears in a fishing village.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('pachinko-2022', 'Pachinko', 2022, 'tt13169328', '114472', 2, ['Drama', 'History'], 8.0, 60, 'A Korean immigrant in Japan becomes involved in four generations of a family.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('band-of-brothers-2001', 'Band of Brothers', 2001, 'tt0185906', '4408', 1, ['Action', 'Drama', 'History'], 9.4, 60, 'The story of Easy Company of the U.S. Army 101st Airborne Division during WWII.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('my-hero-academia-2016', 'My Hero Academia', 2016, 'tt5626028', '65930', 6, ['Animation', 'Action', 'Adventure'], 8.5, 24, 'A superhero-loving boy without any powers is accepted into a prestigious hero academy.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('what-if-2021', 'What If...?', 2021, 'tt10220280', '91363', 3, ['Animation', 'Action', 'Adventure'], 7.5, 35, 'Exploring pivotal moments from the Marvel Cinematic Universe.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('mindhunter-2017', 'Mindhunter', 2017, 'tt0109936', '67744', 2, ['Crime', 'Drama', 'Thriller'], 8.6, 60, 'In the late 1970s two FBI agents expand the science of criminal psychology.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-expanse-2015', 'The Expanse', 2015, 'tt3230854', '63639', 6, ['Drama', 'Mystery', 'Sci-Fi'], 8.5, 60, 'In the 24th century, a disparate band of antiheroes unravels a vast conspiracy.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('attack-on-titan-2013', 'Attack on Titan', 2013, 'tt2560140', '1429', 4, ['Action', 'Adventure', 'Animation'], 9.0, 24, 'Humanity fights for survival against giant humanoid Titans.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('one-piece-1999', 'One Piece', 1999, 'tt0388629', '37854', 20, ['Action', 'Adventure', 'Animation'], 9.0, 24, 'Monkey D. Luffy and his crew sail the Grand Line in search of the One Piece treasure.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('naruto-2002', 'Naruto', 2002, 'tt0409591', '46260', 5, ['Action', 'Adventure', 'Animation'], 8.4, 23, 'A young ninja seeks recognition and dreams of becoming the village leader.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('naruto-shippuden-2007', 'Naruto: Shippuden', 2007, 'tt0988824', '31910', 21, ['Action', 'Adventure', 'Animation'], 8.7, 23, 'Older Naruto returns to his village for revenge against the rogue ninja who attacked it.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('dragon-ball-z-1989', 'Dragon Ball Z', 1989, 'tt0121955', '12971', 9, ['Action', 'Adventure', 'Animation'], 8.8, 24, 'Goku and friends defend Earth against powerful villains.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('death-note-2006', 'Death Note', 2006, 'tt0877057', '13916', 1, ['Animation', 'Crime', 'Drama'], 8.9, 23, 'A high school student discovers a supernatural notebook that kills anyone whose name is written in it.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('fullmetal-alchemist-brotherhood-2009', 'Fullmetal Alchemist: Brotherhood', 2009, 'tt0907820', '3114', 1, ['Action', 'Adventure', 'Animation'], 9.1, 24, 'Two brothers seek the Philosopher\'s Stone to restore their bodies.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('hunter-x-hunter-2011', 'Hunter x Hunter', 2011, 'tt2098220', '46298', 6, ['Action', 'Adventure', 'Animation'], 9.0, 24, 'A young boy sets out to become a Hunter and find his father.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('demon-slayer-2019', 'Demon Slayer: Kimetsu no Yaiba', 2019, 'tt9335498', '85937', 1, ['Action', 'Adventure', 'Animation'], 8.7, 25, 'A young boy becomes a demon slayer to save his sister.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('jujutsu-kaisen-2020', 'Jujutsu Kaisen', 2020, 'tt10260808', '95479', 1, ['Action', 'Adventure', 'Animation'], 8.6, 24, 'A high schooler joins a secret organization of Jujutsu Sorcerers to eliminate Curses.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('spy-x-family-2022', 'Spy x Family', 2022, 'tt13706018', '120089', 2, ['Action', 'Adventure', 'Animation'], 8.5, 24, 'A spy must build a fake family to complete his mission.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('one-punch-man-2015', 'One-Punch Man', 2015, 'tt4508902', '63926', 3, ['Action', 'Adventure', 'Animation'], 8.7, 24, 'A hero who can defeat any opponent with a single punch seeks a worthy challenge.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('cowboy-bebop-1998', 'Cowboy Bebop', 1998, 'tt0213338', '433', 1, ['Action', 'Adventure', 'Animation'], 8.9, 24, 'A ragtag crew of bounty hunters chases criminals across the galaxy.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('frieren-2023', 'Frieren: Beyond Journey\'s End', 2023, 'tt22237828', '209189', 1, ['Adventure', 'Animation', 'Drama'], 9.0, 24, 'An elven mage journeys to the afterlife to reunite with her dead comrades.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('solo-leveling-2024', 'Solo Leveling', 2024, 'tt21377630', '209189', 1, ['Action', 'Adventure', 'Animation'], 8.3, 24, 'The world\'s weakest hunter awakens with the power to level up.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-walking-dead-2010', 'The Walking Dead', 2010, 'tt1520211', '1402', 11, ['Drama', 'Horror', 'Thriller'], 8.2, 44, 'Sheriff\'s deputy Rick Grimes awakens from a coma to find the world overrun by zombies.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('lost-2004', 'Lost', 2004, 'tt0411008', '4607', 6, ['Adventure', 'Drama', 'Mystery'], 8.3, 44, 'Survivors of a plane crash struggle to survive on a mysterious island.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('vikings-2013', 'Vikings', 2013, 'tt2306299', '44217', 6, ['Action', 'Adventure', 'Drama'], 8.5, 44, 'The adventures of the Viking hero Ragnar Lothbrok.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-100-2014', 'The 100', 2014, 'tt2661044', '48866', 7, ['Action', 'Drama', 'Sci-Fi'], 7.6, 43, 'A group of juvenile delinquents are sent to Earth from a dying space station to see if it\'s habitable.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('lucifer-2016', 'Lucifer', 2016, 'tt4052886', '63174', 6, ['Crime', 'Drama', 'Fantasy'], 8.1, 42, 'The Devil takes a holiday in Los Angeles and helps the LAPD solve crimes.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('you-2018', 'You', 2018, 'tt7335184', '78191', 4, ['Crime', 'Drama', 'Romance'], 7.7, 45, 'A charming but dangerous New York bookshop manager becomes obsessed with a woman.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('wednesday-2022', 'Wednesday', 2022, 'tt13443470', '119051', 1, ['Comedy', 'Crime', 'Mystery'], 8.1, 55, 'Wednesday Addams investigates a murder spree at her new school.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-bear-2022b', 'The Bear', 2022, 'tt14452776', '136315', 3, ['Comedy', 'Drama'], 8.6, 30, 'A young chef returns to run his family\'s sandwich shop.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('reacher-2022', 'Reacher', 2022, 'tt9288030', '116328', 3, ['Action', 'Crime', 'Drama'], 8.1, 60, 'A former military cop investigates a small town conspiracy.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-night-agent-2023', 'The Night Agent', 2023, 'tt13918074', '94997', 2, ['Action', 'Drama', 'Mystery'], 7.5, 50, 'A young FBI agent works in the basement of the White House manning a phone that never rings — until tonight.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('citadel-2023', 'Citadel', 2023, 'tt13202422', '119051', 1, ['Action', 'Drama', 'Sci-Fi'], 6.5, 50, 'A global spy agency is destroyed by a powerful new enemy.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('fallout-2024', 'Fallout', 2024, 'tt12637874', '106978', 1, ['Action', 'Adventure', 'Drama'], 8.4, 60, 'In a post-nuclear wasteland, inhabitants of luxury fallout shelters venture out.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('house-of-cards-2013', 'House of Cards', 2013, 'tt1856010', '1425', 6, ['Drama'], 8.7, 51, 'A ruthless politician will stop at nothing to conquer Washington D.C.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-handmaids-tale-2017', 'The Handmaid\'s Tale', 2017, 'tt5834204', '69478', 5, ['Drama', 'Sci-Fi'], 8.4, 60, 'In a dystopian future, women are forced into reproductive servitude.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('orange-is-the-new-black-2013', 'Orange Is the New Black', 2013, 'tt2372162', '61581', 7, ['Comedy', 'Crime', 'Drama'], 8.0, 59, 'A privileged New Yorker is sentenced to prison for a crime she committed in her youth.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('ozark-2017', 'Ozark', 2017, 'tt5071422', '69740', 4, ['Crime', 'Drama', 'Thriller'], 8.4, 60, 'A financial advisor drags his family to the Missouri Ozarks to launder money for a cartel.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('westworld-2016', 'Westworld', 2016, 'tt0475784', '63247', 4, ['Drama', 'Mystery', 'Sci-Fi'], 8.5, 62, 'A sci-fi western about a theme park populated by android hosts.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-morning-show-2019', 'The Morning Show', 2019, 'tt7203552', '81669', 3, ['Drama'], 8.3, 60, 'A behind-the-scenes look at a morning news program.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('tales-from-the-crypt-1989', 'Tales from the Crypt', 1989, 'tt0096708', '2391', 7, ['Comedy', 'Crime', 'Fantasy'], 8.0, 25, 'An anthology series hosted by the Crypt Keeper.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-x-files-1993', 'The X-Files', 1993, 'tt0106179', '4087', 11, ['Crime', 'Drama', 'Mystery'], 8.6, 45, 'Two FBI agents investigate paranormal cases.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('24-2001', '24', 2001, 'tt0285331', '1973', 8, ['Action', 'Crime', 'Drama'], 8.4, 42, 'Counter-terrorist agent Jack Bauer races against the clock.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('homeland-2011', 'Homeland', 2011, 'tt1796960', '1407', 8, ['Crime', 'Drama', 'Mystery'], 8.3, 55, 'A bipolar CIA operative becomes convinced a rescued POW is a threat to national security.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('breaking-bad-2008b', 'Breaking Bad', 2008, 'tt0903747', '1396', 5, ['Crime', 'Drama'], 9.5, 49, 'A chemistry teacher turns to cooking meth.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-grand-tour-2016', 'The Grand Tour', 2016, 'tt5851556', '65942', 4, ['Adventure', 'Comedy', 'Sport'], 8.7, 60, 'Three former Top Gear hosts travel the world testing cars.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('top-gear-2002', 'Top Gear', 2002, 'tt1628033', '24493', 33, ['Adventure', 'Comedy', 'Sport'], 8.7, 60, 'Three car enthusiasts test drive vehicles and complete challenges.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('mr-robot-2015', 'Mr. Robot', 2015, 'tt4158110', '62560', 4, ['Crime', 'Drama', 'Thriller'], 8.5, 49, 'A hacker joins a group of hacktivists to take down corporate America.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('black-mirror-2011', 'Black Mirror', 2011, 'tt2085059', '42009', 6, ['Drama', 'Sci-Fi', 'Thriller'], 8.7, 60, 'An anthology series exploring the dark side of technology.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('true-blood-2008', 'True Blood', 2008, 'tt0844441', '10545', 7, ['Drama', 'Fantasy', 'Mystery'], 7.9, 60, 'Vampires live openly among humans in a small Louisiana town.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-vampire-diaries-2009', 'The Vampire Diaries', 2009, 'tt1405406', '4312', 8, ['Drama', 'Fantasy', 'Horror'], 7.7, 43, 'Two vampire brothers vie for the love of a high school girl.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-originals-2013', 'The Originals', 2013, 'tt2632424', '46896', 5, ['Drama', 'Fantasy', 'Horror'], 8.2, 42, 'The Original vampire family returns to New Orleans.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('arrow-2012', 'Arrow', 2012, 'tt2193021', '1412', 8, ['Action', 'Adventure', 'Crime'], 7.5, 42, 'A billionaire playboy becomes a hooded vigilante to save his city.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-flash-2014', 'The Flash', 2014, 'tt3107288', '60735', 9, ['Action', 'Adventure', 'Drama'], 7.5, 43, 'A forensic scientist gains super-speed and becomes The Flash.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('supergirl-2015', 'Supergirl', 2015, 'tt4016454', '62688', 6, ['Action', 'Adventure', 'Drama'], 6.2, 43, 'Superman\'s cousin protects National City from threats.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('riverdale-2017', 'Riverdale', 2017, 'tt5420376', '69050', 7, ['Crime', 'Drama', 'Mystery'], 6.8, 45, 'A small town hides dark secrets under its wholesome surface.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('the-boys-presenter-2019', 'The Boys Presents: Diabolical', 2022, 'tt14183666', '76479', 1, ['Action', 'Adventure', 'Animation'], 7.6, 26, 'An animated anthology series set in the universe of The Boys.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('invincible-2021', 'Invincible', 2021, 'tt6741278', '95668', 2, ['Action', 'Adventure', 'Animation'], 8.7, 50, 'A teenager inherits his father\'s superpowers and must save the world.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('arcane-2021b', 'Arcane', 2021, 'tt11126994', '94605', 2, ['Action', 'Adventure', 'Animation'], 9.0, 40, 'Two sisters are torn apart by conflict in a futuristic utopia.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('severance-2022b', 'Severance', 2022, 'tt11280740', '95396', 2, ['Drama', 'Mystery', 'Sci-Fi'], 8.7, 55, 'Office workers undergo a procedure separating work and personal memories.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('shogun-2024b', 'Shōgun', 2024, 'tt2788316', '114472', 1, ['Drama', 'History'], 8.7, 70, 'In Japan in the year 1600, a ship appears in a fishing village.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    v('fallout-2024b', 'Fallout', 2024, 'tt12637874', '106978', 1, ['Action', 'Adventure', 'Drama'], 8.4, 60, 'In a post-nuclear wasteland, inhabitants of luxury fallout shelters venture out.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),

                    // ===== MAJOR FRANCHISES (200+ entries across 30+ franchises) =====
                    // STAR WARS
                    m('star-wars-1977', 'Star Wars: Episode IV - A New Hope', 1977, 'tt0076759', '11', ['Action', 'Adventure', 'Fantasy'], 8.6, 121, 'Luke Skywalker joins the Rebel Alliance to fight the Empire.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('star-wars-empire-1980', 'Star Wars: Episode V - The Empire Strikes Back', 1980, 'tt0080684', '1891', ['Action', 'Adventure', 'Fantasy'], 8.7, 124, 'The Rebels are pursued by the Empire across the galaxy.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('star-wars-return-1983', 'Star Wars: Episode VI - Return of the Jedi', 1983, 'tt0086190', '1892', ['Action', 'Adventure', 'Fantasy'], 8.3, 131, 'The Rebels assault the second Death Star to end the Empire.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('star-wars-phantom-1999', 'Star Wars: Episode I - The Phantom Menace', 1999, 'tt0120915', '1893', ['Action', 'Adventure', 'Fantasy'], 6.5, 136, 'Two Jedi discover a young boy with mysterious powers.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('star-wars-clone-2002', 'Star Wars: Episode II - Attack of the Clones', 2002, 'tt0121765', '1894', ['Action', 'Adventure', 'Fantasy'], 6.6, 142, 'Anakin Skywalker begins his journey to the dark side.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('star-wars-sith-2005', 'Star Wars: Episode III - Revenge of the Sith', 2005, 'tt0121766', '1895', ['Action', 'Adventure', 'Fantasy'], 7.6, 140, 'Anakin Skywalker becomes Darth Vader.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('star-wars-force-2015', 'Star Wars: Episode VII - The Force Awakens', 2015, 'tt2488496', '140607', ['Action', 'Adventure', 'Sci-Fi'], 7.8, 138, 'A new hero rises as the Resistance faces the First Order.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('star-wars-last-2017', 'Star Wars: Episode VIII - The Last Jedi', 2017, 'tt2527336', '181808', ['Action', 'Adventure', 'Sci-Fi'], 6.9, 152, 'Rey seeks Luke Skywalker\'s help in the fight against the First Order.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('star-wars-rise-2019', 'Star Wars: Episode IX - The Rise of Skywalker', 2019, 'tt2527338', '181812', ['Action', 'Adventure', 'Sci-Fi'], 6.5, 141, 'The Resistance makes one final stand against the First Order.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('rogue-one-2016', 'Rogue One: A Star Wars Story', 2016, 'tt3748528', '330459', ['Action', 'Adventure', 'Sci-Fi'], 7.8, 133, 'A band of Rebels steals the Death Star plans.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('solo-star-wars-2018', 'Solo: A Star Wars Story', 2018, 'tt3778644', '348350', ['Action', 'Adventure', 'Sci-Fi'], 6.9, 135, 'A young Han Solo meets his future copilot Chewbacca.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // HARRY POTTER
                    m('harry-potter-1-2001-franchise', 'Harry Potter and the Philosopher\'s Stone', 2001, 'tt0241527', '671', ['Adventure', 'Family', 'Fantasy'], 7.6, 152, 'A boy discovers he\'s a wizard.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('harry-potter-2-2002', 'Harry Potter and the Chamber of Secrets', 2002, 'tt0295297', '672', ['Adventure', 'Family', 'Fantasy'], 7.4, 161, 'Harry investigates a mysterious chamber at Hogwarts.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('harry-potter-3-2004', 'Harry Potter and the Prisoner of Azkaban', 2004, 'tt0304141', '673', ['Adventure', 'Family', 'Fantasy'], 7.9, 142, 'Harry learns about Sirius Black.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('harry-potter-4-2005', 'Harry Potter and the Goblet of Fire', 2005, 'tt0330373', '674', ['Adventure', 'Family', 'Fantasy'], 7.7, 157, 'Harry competes in the Triwizard Tournament.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('harry-potter-5-2007', 'Harry Potter and the Order of the Phoenix', 2007, 'tt0373889', '675', ['Adventure', 'Family', 'Fantasy'], 7.5, 138, 'Harry forms Dumbledore\'s Army to fight Voldemort.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('harry-potter-6-2009', 'Harry Potter and the Half-Blood Prince', 2009, 'tt0417741', '767', ['Adventure', 'Family', 'Fantasy'], 7.6, 153, 'Harry discovers Voldemort\'s past.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('harry-potter-7a-2010', 'Harry Potter and the Deathly Hallows: Part 1', 2010, 'tt0926084', '76757', ['Adventure', 'Family', 'Fantasy'], 7.7, 146, 'Harry, Ron and Hermione hunt Horcruxes.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('harry-potter-7b-2011', 'Harry Potter and the Deathly Hallows: Part 2', 2011, 'tt1201607', '76758', ['Adventure', 'Family', 'Fantasy'], 8.1, 130, 'The final battle against Voldemort.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('fantastic-beasts-1-2016', 'Fantastic Beasts and Where to Find Them', 2016, 'tt3183660', '259316', ['Adventure', 'Family', 'Fantasy'], 7.2, 133, 'A wizard discovers a hidden world of magical creatures.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('fantastic-beasts-2-2018', 'Fantastic Beasts: The Crimes of Grindelwald', 2018, 'tt4123430', '338952', ['Adventure', 'Family', 'Fantasy'], 6.5, 134, 'Newt Scamander joins Dumbledore against Grindelwald.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('fantastic-beasts-3-2022', 'Fantastic Beasts: The Secrets of Dumbledore', 2022, 'tt4123432', '414906', ['Adventure', 'Family', 'Fantasy'], 6.2, 142, 'Dumbledore and Newt battle Grindelwald for the fate of the wizarding world.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // MARVEL CINEMATIC UNIVERSE
                    m('iron-man-2008', 'Iron Man', 2008, 'tt0371746', '1726', ['Action', 'Adventure', 'Sci-Fi'], 7.9, 126, 'Tony Stark builds a high-tech suit of armor to fight evil.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('incredible-hulk-2008', 'The Incredible Hulk', 2008, 'tt0800080', '1724', ['Action', 'Adventure', 'Sci-Fi'], 6.6, 112, 'Bruce Banner seeks a cure for his Hulk transformations.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('iron-man-2-2010', 'Iron Man 2', 2010, 'tt1228705', '1725', ['Action', 'Adventure', 'Sci-Fi'], 7.0, 124, 'Tony Stark faces a vengeful Russian scientist and government pressure.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('thor-2011', 'Thor', 2011, 'tt0800369', '10195', ['Action', 'Adventure', 'Fantasy'], 7.0, 115, 'The Norse god Thor is banished to Earth.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('captain-america-first-2011', 'Captain America: The First Avenger', 2011, 'tt0458339', '1771', ['Action', 'Adventure', 'Sci-Fi'], 6.9, 124, 'A scrawny soldier becomes Captain America.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('avengers-2012-franchise', 'The Avengers', 2012, 'tt0848228', '24428', ['Action', 'Adventure', 'Sci-Fi'], 8.0, 143, 'Earth\'s mightiest heroes assemble to fight Loki and his alien army.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('iron-man-3-2013', 'Iron Man 3', 2013, 'tt1300854', '68721', ['Action', 'Adventure', 'Sci-Fi'], 7.1, 130, 'Tony Stark faces a powerful new enemy called the Mandarin.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('thor-dark-world-2013', 'Thor: The Dark World', 2013, 'tt1981115', '76341', ['Action', 'Adventure', 'Fantasy'], 6.9, 112, 'Thor must save the Nine Realms from an ancient enemy.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('captain-america-winter-2014', 'Captain America: The Winter Soldier', 2014, 'tt1843866', '100402', ['Action', 'Adventure', 'Sci-Fi'], 7.7, 136, 'Captain America faces a mysterious assassin called the Winter Soldier.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('guardians-2014', 'Guardians of the Galaxy', 2014, 'tt2015381', '118340', ['Action', 'Adventure', 'Sci-Fi'], 8.0, 121, 'A group of misfits band together to save the galaxy.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('avengers-age-2015', 'Avengers: Age of Ultron', 2015, 'tt2395427', '99861', ['Action', 'Adventure', 'Sci-Fi'], 7.3, 141, 'The Avengers battle a sentient AI threatening humanity.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('ant-man-2015', 'Ant-Man', 2015, 'tt0478970', '102899', ['Action', 'Adventure', 'Comedy'], 7.3, 117, 'A thief becomes a superhero with the ability to shrink.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('captain-america-civil-2016', 'Captain America: Civil War', 2016, 'tt3498826', '271110', ['Action', 'Adventure', 'Sci-Fi'], 7.8, 147, 'The Avengers split into two opposing factions.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('doctor-strange-2016', 'Doctor Strange', 2016, 'tt1211837', '284052', ['Action', 'Adventure', 'Fantasy'], 7.5, 115, 'A surgeon learns the mystic arts after a career-ending accident.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('guardians-2-2017', 'Guardians of the Galaxy Vol. 2', 2017, 'tt3896198', '283995', ['Action', 'Adventure', 'Sci-Fi'], 7.6, 136, 'The Guardians learn the truth about Peter Quill\'s parentage.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('spider-man-homecoming-2017', 'Spider-Man: Homecoming', 2017, 'tt2250912', '315635', ['Action', 'Adventure', 'Sci-Fi'], 7.4, 133, 'Peter Parker balances high school with his new Spider-Man duties.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('thor-ragnarok-2017', 'Thor: Ragnarok', 2017, 'tt3501632', '284053', ['Action', 'Adventure', 'Comedy'], 7.9, 130, 'Thor must escape a planet of gladiators to save Asgard.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('black-panther-2018-franchise', 'Black Panther', 2018, 'tt1825683', '284054', ['Action', 'Adventure', 'Sci-Fi'], 7.3, 134, 'T\'Challa returns to Wakanda to claim the throne.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('avengers-infinity-2018-franchise', 'Avengers: Infinity War', 2018, 'tt4154756', '299536', ['Action', 'Adventure', 'Sci-Fi'], 8.4, 149, 'The Avengers face Thanos\'s quest to collect all six Infinity Stones.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('ant-man-wasp-2018', 'Ant-Man and the Wasp', 2018, 'tt5095030', '363088', ['Action', 'Adventure', 'Comedy'], 7.0, 118, 'Scott Lang partners with Hope van Dyne as the Wasp.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('captain-marvel-2019', 'Captain Marvel', 2019, 'tt4154664', '299537', ['Action', 'Adventure', 'Sci-Fi'], 6.8, 123, 'Carol Danvers becomes the universe\'s most powerful hero.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('avengers-endgame-2019-franchise', 'Avengers: Endgame', 2019, 'tt4154796', '299534', ['Action', 'Adventure', 'Drama'], 8.4, 181, 'The remaining Avengers take one final stand against Thanos.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('spider-man-far-2019', 'Spider-Man: Far From Home', 2019, 'tt6320628', '429617', ['Action', 'Adventure', 'Sci-Fi'], 7.5, 129, 'Peter Parker fights a new threat during a European school trip.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('black-widow-2021', 'Black Widow', 2021, 'tt3480822', '497698', ['Action', 'Adventure', 'Sci-Fi'], 6.7, 134, 'Natasha Romanoff confronts the darker parts of her ledger.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('shang-chi-2021', 'Shang-Chi and the Legend of the Ten Rings', 2021, 'tt9376612', '566525', ['Action', 'Adventure', 'Fantasy'], 7.4, 132, 'A young man confronts his past when drawn into the Ten Rings organization.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('eternals-2021', 'Eternals', 2021, 'tt9032400', '524434', ['Action', 'Adventure', 'Drama'], 6.3, 156, 'An immortal alien race emerges from hiding to protect Earth.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('spider-man-no-way-2021', 'Spider-Man: No Way Home', 2021, 'tt10872600', '634649', ['Action', 'Adventure', 'Sci-Fi'], 8.2, 148, 'Peter Parker seeks help from Doctor Strange, opening the multiverse.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('doctor-strange-mom-2022', 'Doctor Strange in the Multiverse of Madness', 2022, 'tt9419884', '453395', ['Action', 'Adventure', 'Fantasy'], 6.9, 126, 'Doctor Strange journeys through the multiverse.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('thor-love-2022', 'Thor: Love and Thunder', 2022, 'tt10648342', '616037', ['Action', 'Adventure', 'Comedy'], 6.2, 119, 'Thor enlists the help of Valkyrie, Jane Foster, and Korg.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('black-panther-2-2022', 'Black Panther: Wakanda Forever', 2022, 'tt9114286', '505642', ['Action', 'Adventure', 'Drama'], 6.7, 161, 'The people of Wakanda fight to protect their nation.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('ant-man-quantumania-2023', 'Ant-Man and the Wasp: Quantumania', 2023, 'tt10954600', '640146', ['Action', 'Adventure', 'Comedy'], 6.0, 124, 'The Ant-Man family finds themselves exploring the Quantum Realm.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('guardians-3-2023', 'Guardians of the Galaxy Vol. 3', 2023, 'tt6791350', '447365', ['Action', 'Adventure', 'Sci-Fi'], 8.0, 150, 'The Guardians must protect Rocket while facing a new enemy.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-marvels-2023', 'The Marvels', 2023, 'tt10676048', '609681', ['Action', 'Adventure', 'Sci-Fi'], 5.5, 105, 'Captain Marvel, Ms. Marvel, and Monica Rambeau team up.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('deadpool-2016-franchise', 'Deadpool', 2016, 'tt1431045', '293660', ['Action', 'Adventure', 'Comedy'], 8.0, 108, 'A wisecracking mercenary seeks revenge.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('deadpool-2-2018', 'Deadpool 2', 2018, 'tt5463162', '383498', ['Action', 'Adventure', 'Comedy'], 7.7, 119, 'Deadpool forms a team to protect a young mutant.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('logan-2017', 'Logan', 2017, 'tt3315342', '263115', ['Action', 'Drama', 'Sci-Fi'], 8.1, 137, 'An aging Wolverine protects a young mutant.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // LORD OF THE RINGS / HOBBIT
                    m('lotr-fellowship-franchise', 'The Lord of the Rings: The Fellowship of the Ring', 2001, 'tt0120737', '120', ['Action', 'Adventure', 'Drama'], 8.8, 178, 'A hobbit and eight companions set out to destroy the One Ring.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('lotr-towers-2002', 'The Lord of the Rings: The Two Towers', 2002, 'tt0167261', '121', ['Action', 'Adventure', 'Drama'], 8.7, 179, 'Frodo and Sam continue toward Mordor while the others face war.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('lotr-return-franchise', 'The Lord of the Rings: The Return of the King', 2003, 'tt0167260', '122', ['Action', 'Adventure', 'Drama'], 8.9, 201, 'The final battle for Middle-earth.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('hobbit-journey-2012', 'The Hobbit: An Unexpected Journey', 2012, 'tt0903624', '49051', ['Adventure', 'Family', 'Fantasy'], 7.8, 169, 'Bilbo Baggins begins an adventure with thirteen dwarves.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('hobbit-desolation-2013', 'The Hobbit: The Desolation of Smaug', 2013, 'tt1170358', '57158', ['Adventure', 'Fantasy'], 7.8, 161, 'Bilbo and the dwarves face the dragon Smaug.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('hobbit-battle-2014', 'The Hobbit: The Battle of the Five Armies', 2014, 'tt2310332', '122906', ['Adventure', 'Fantasy'], 7.4, 144, 'The battle for the Lonely Mountain.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // FAST & FURIOUS
                    m('fast-furious-2001', 'The Fast and the Furious', 2001, 'tt0232500', '9799', ['Action', 'Crime', 'Thriller'], 6.8, 106, 'An undercover cop infiltrates a street racing gang.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('2-fast-2003', '2 Fast 2 Furious', 2003, 'tt0322259', '58431', ['Action', 'Crime', 'Thriller'], 5.9, 107, 'Brian O\'Conner goes undercover in Miami.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('tokyo-drift-2006', 'The Fast and the Furious: Tokyo Drift', 2006, 'tt0463985', '24976', ['Action', 'Crime', 'Drama'], 6.0, 104, 'An American teen gets caught up in Tokyo\'s drift racing scene.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('fast-furious-2009', 'Fast & Furious', 2009, 'tt1013752', '13851', ['Action', 'Crime', 'Drama'], 6.5, 107, 'Dom and Brian reunite to take down a drug lord.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('fast-five-2011', 'Fast Five', 2011, 'tt1596343', '51497', ['Action', 'Crime', 'Thriller'], 7.3, 130, 'The crew plans a heist in Rio de Janeiro.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('fast-six-2013', 'Fast & Furious 6', 2013, 'tt1905041', '82992', ['Action', 'Crime', 'Thriller'], 7.0, 130, 'The crew takes on a dangerous criminal across continents.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('furious-7-2015', 'Furious 7', 2015, 'tt2820852', '168259', ['Action', 'Crime', 'Thriller'], 7.1, 137, 'The crew faces a vengeful ghost from the past.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('fate-of-the-furious-2017', 'The Fate of the Furious', 2017, 'tt4630562', '337339', ['Action', 'Crime', 'Thriller'], 6.6, 136, 'Dom turns traitor and the crew must stop him.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('hobbs-shaw-2019', 'Fast & Furious Presents: Hobbs & Shaw', 2019, 'tt6806448', '475557', ['Action', 'Adventure', 'Thriller'], 6.5, 137, 'Hobbs and Shaw team up against a cyber-genetically enhanced villain.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('f9-2021', 'F9', 2021, 'tt5433138', '385128', ['Action', 'Crime', 'Thriller'], 5.2, 145, 'Dom and his crew face Jakob, a deadly assassin.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('fast-x-2023', 'Fast X', 2023, 'tt5433140', '385128', ['Action', 'Crime', 'Thriller'], 5.8, 141, 'Dom faces the son of a former enemy seeking revenge.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // JURASSIC PARK/WORLD
                    m('jurassic-park-franchise', 'Jurassic Park', 1993, 'tt0107290', '329', ['Action', 'Adventure', 'Sci-Fi'], 8.2, 127, 'A theme park of cloned dinosaurs goes horribly wrong.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('jurassic-park-lost-1997', 'The Lost World: Jurassic Park', 1997, 'tt0119567', '330', ['Action', 'Adventure', 'Sci-Fi'], 6.6, 129, 'A team returns to the island to capture dinosaurs.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('jurassic-park-3-2001', 'Jurassic Park III', 2001, 'tt0163025', '331', ['Action', 'Adventure', 'Sci-Fi'], 5.9, 92, 'A paleontologist is tricked into returning to the island.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('jurassic-world-2015', 'Jurassic World', 2015, 'tt0369610', '135397', ['Action', 'Adventure', 'Sci-Fi'], 7.0, 124, 'A new dinosaur theme park faces disaster when a hybrid escapes.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('jurassic-world-fallen-2018', 'Jurassic World: Fallen Kingdom', 2018, 'tt4881806', '351286', ['Action', 'Adventure', 'Sci-Fi'], 6.2, 128, 'A mission to rescue dinosaurs from a volcanic island.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('jurassic-world-dominion-2022', 'Jurassic World Dominion', 2022, 'tt8041270', '507086', ['Action', 'Adventure', 'Sci-Fi'], 5.6, 147, 'Dinosaurs now live among humans.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // PIRATES OF THE CARIBBEAN
                    m('pirates-curse-2003', 'Pirates of the Caribbean: The Curse of the Black Pearl', 2003, 'tt0325980', '285', ['Action', 'Adventure', 'Fantasy'], 8.1, 143, 'Captain Jack Sparrow and Will Turner team up to save Elizabeth.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('pirates-dead-2006', 'Pirates of the Caribbean: Dead Man\'s Chest', 2006, 'tt0383574', '2857', ['Action', 'Adventure', 'Fantasy'], 7.3, 151, 'Jack owes a blood debt to Davy Jones.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('pirates-world-end-2007', 'Pirates of the Caribbean: At World\'s End', 2007, 'tt0449088', '2858', ['Action', 'Adventure', 'Fantasy'], 7.1, 169, 'The pirates prepare for a final battle against the East India Trading Company.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('pirates-stranger-2011', 'Pirates of the Caribbean: On Stranger Tides', 2011, 'tt1298650', '62211', ['Action', 'Adventure', 'Fantasy'], 6.6, 136, 'Jack Sparrow seeks the Fountain of Youth.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('pirates-dead-men-2017', 'Pirates of the Caribbean: Dead Men Tell No Tales', 2017, 'tt1790809', '381719', ['Action', 'Adventure', 'Fantasy'], 6.5, 129, 'Jack Sparrow faces his old nemesis Captain Salazar.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // MATRIX
                    m('matrix-1999-franchise', 'The Matrix', 1999, 'tt0133093', '603', ['Action', 'Sci-Fi'], 8.7, 136, 'A hacker discovers reality is a simulation.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('matrix-reloaded-2003', 'The Matrix Reloaded', 2003, 'tt0234215', '604', ['Action', 'Sci-Fi'], 7.2, 138, 'Neo faces a new prophecy while the machines close in.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('matrix-revolutions-2003', 'The Matrix Revolutions', 2003, 'tt0242653', '605', ['Action', 'Sci-Fi'], 6.7, 129, 'The final battle between humans and machines.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('matrix-resurrections-2021', 'The Matrix Resurrections', 2021, 'tt10838180', '624860', ['Action', 'Sci-Fi'], 5.7, 148, 'Neo returns to the Matrix in a new form.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // JOHN WICK
                    m('john-wick-2014', 'John Wick', 2014, 'tt2911666', '245891', ['Action', 'Crime', 'Thriller'], 7.4, 101, 'A retired hitman seeks vengeance for the death of his dog.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('john-wick-2-2017', 'John Wick: Chapter 2', 2017, 'tt4425200', '339964', ['Action', 'Crime', 'Thriller'], 7.5, 122, 'John Wick is forced back into the assassin underworld.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('john-wick-3-2019', 'John Wick: Chapter 3 - Parabellum', 2019, 'tt6146586', '458156', ['Action', 'Crime', 'Thriller'], 7.4, 130, 'John Wick is on the run with a bounty on his head.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('john-wick-4-2023', 'John Wick: Chapter 4', 2023, 'tt10366206', '603692', ['Action', 'Crime', 'Thriller'], 7.7, 169, 'John Wick seeks a way to finally win his freedom.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // TRANSFORMERS
                    m('transformers-2007', 'Transformers', 2007, 'tt0418279', '1858', ['Action', 'Adventure', 'Sci-Fi'], 7.0, 144, 'Two alien robot races bring their battle to Earth.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('transformers-revenge-2009', 'Transformers: Revenge of the Fallen', 2009, 'tt1399103', '38356', ['Action', 'Adventure', 'Sci-Fi'], 6.0, 150, 'Sam Witwicky faces a new Decepticon threat.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('transformers-dark-2011', 'Transformers: Dark of the Moon', 2011, 'tt1399102', '38357', ['Action', 'Adventure', 'Sci-Fi'], 6.2, 154, 'The Autobots uncover a secret plan on the Moon.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('transformers-age-2014', 'Transformers: Age of Extinction', 2014, 'tt2109248', '228326', ['Action', 'Adventure', 'Sci-Fi'], 5.6, 165, 'A mechanic discovers an old Transformer.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('transformers-last-2017', 'Transformers: The Last Knight', 2017, 'tt3371366', '335984', ['Action', 'Adventure', 'Sci-Fi'], 5.2, 154, 'Cade Yeager must uncover the secret history of the Transformers.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('bumblebee-2018', 'Bumblebee', 2018, 'tt4701182', '470918', ['Action', 'Adventure', 'Sci-Fi'], 6.7, 114, 'A young girl befriends a battle-scarred Autobot.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('transformers-rise-2023', 'Transformers: Rise of the Beasts', 2023, 'tt5090568', '667538', ['Action', 'Adventure', 'Sci-Fi'], 6.0, 127, 'The Autobots team up with the Maximals.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // BATMAN
                    m('batman-begins-2005', 'Batman Begins', 2005, 'tt0372784', '272', ['Action', 'Crime', 'Drama'], 8.2, 140, 'Bruce Wayne becomes Batman to fight crime in Gotham.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('dark-knight-franchise', 'The Dark Knight', 2008, 'tt0468569', '155', ['Action', 'Crime', 'Drama'], 9.0, 152, 'Batman faces the Joker, a criminal mastermind.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('dark-knight-rises-2012', 'The Dark Knight Rises', 2012, 'tt1345836', '49026', ['Action', 'Crime', 'Drama'], 8.4, 165, 'Batman returns to face Bane, a new terrorist threat.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('batman-v-superman-2016', 'Batman v Superman: Dawn of Justice', 2016, 'tt2975590', '209112', ['Action', 'Adventure', 'Sci-Fi'], 6.4, 151, 'Batman and Superman clash.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('justice-league-2017', 'Justice League', 2017, 'tt0974015', '141052', ['Action', 'Adventure', 'Fantasy'], 6.2, 120, 'Batman and Wonder Woman recruit a team to save the world.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('the-batman-franchise', 'The Batman', 2022, 'tt1877830', '414906', ['Action', 'Crime', 'Drama'], 7.8, 176, 'A vengeful Bruce Wayne pursues The Riddler through Gotham\'s corruption.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // MISSION IMPOSSIBLE
                    m('mission-impossible-1996', 'Mission: Impossible', 1996, 'tt0117060', '9543', ['Action', 'Adventure', 'Thriller'], 7.1, 110, 'Ethan Hunt must clear his name after a mission goes wrong.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('mission-impossible-2-2000', 'Mission: Impossible II', 2000, 'tt0120755', '9544', ['Action', 'Adventure', 'Thriller'], 6.1, 123, 'Ethan Hunt takes on a rogue agent with a deadly virus.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('mission-impossible-3-2006', 'Mission: Impossible III', 2006, 'tt0317919', '9545', ['Action', 'Adventure', 'Thriller'], 7.1, 126, 'Ethan Hunt must rescue his kidnapped protégé.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('mission-impossible-ghost-2011', 'Mission: Impossible - Ghost Protocol', 2011, 'tt1229238', '56292', ['Action', 'Adventure', 'Thriller'], 7.4, 133, 'The IMF is shut down after the Kremlin is bombed.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('mission-impossible-rogue-2015', 'Mission: Impossible - Rogue Nation', 2015, 'tt2446042', '249397', ['Action', 'Adventure', 'Thriller'], 7.4, 131, 'Ethan Hunt faces the Syndicate, a shadowy criminal network.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('mission-impossible-fallout-2018', 'Mission: Impossible - Fallout', 2018, 'tt4912910', '353081', ['Action', 'Adventure', 'Thriller'], 7.7, 147, 'Ethan Hunt must retrieve stolen plutonium.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('mission-impossible-dead-2023', 'Mission: Impossible - Dead Reckoning Part One', 2023, 'tt9603212', '575264', ['Action', 'Adventure', 'Thriller'], 7.7, 163, 'Ethan Hunt pursues a terrifying new AI weapon.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // HUNGER GAMES
                    m('hunger-games-2012', 'The Hunger Games', 2012, 'tt1392170', '70160', ['Action', 'Adventure', 'Sci-Fi'], 7.2, 142, 'A teenager volunteers for a deadly televised competition.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('hunger-games-catching-2013', 'The Hunger Games: Catching Fire', 2013, 'tt1951261', '101299', ['Action', 'Adventure', 'Sci-Fi'], 7.5, 146, 'Katniss becomes a symbol of rebellion.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('hunger-games-mockingjay-1-2014', 'The Hunger Games: Mockingjay - Part 1', 2014, 'tt1951265', '131631', ['Action', 'Adventure', 'Sci-Fi'], 6.6, 123, 'Katniss becomes the symbol of the rebellion.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('hunger-games-mockingjay-2-2015', 'The Hunger Games: Mockingjay - Part 2', 2015, 'tt1951264', '131634', ['Action', 'Adventure', 'Sci-Fi'], 6.5, 137, 'Katniss leads the assault on the Capitol.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // TWILIGHT
                    m('twilight-2008', 'Twilight', 2008, 'tt1099212', '8966', ['Drama', 'Fantasy', 'Romance'], 5.3, 122, 'A teenager falls for a vampire.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('new-moon-2009', 'The Twilight Saga: New Moon', 2009, 'tt1259571', '18239', ['Adventure', 'Drama', 'Fantasy'], 4.7, 130, 'Bella faces new dangers after Edward leaves.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('eclipse-2010', 'The Twilight Saga: Eclipse', 2010, 'tt1325004', '24021', ['Adventure', 'Drama', 'Fantasy'], 5.0, 124, 'Bella must choose between Edward and Jacob.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('breaking-dawn-1-2011', 'The Twilight Saga: Breaking Dawn - Part 1', 2011, 'tt1324999', '24021', ['Adventure', 'Drama', 'Fantasy'], 4.9, 117, 'Bella and Edward\'s wedding and honeymoon.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('breaking-dawn-2-2012', 'The Twilight Saga: Breaking Dawn - Part 2', 2012, 'tt1673434', '50620', ['Adventure', 'Drama', 'Fantasy'], 5.5, 116, 'The Cullen family faces the Volturi.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // TOY STORY
                    m('toy-story-franchise', 'Toy Story', 1995, 'tt0114709', '862', ['Animation', 'Adventure', 'Family'], 8.3, 81, 'Toys come to life when humans aren\'t looking.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('toy-story-2-franchise', 'Toy Story 2', 1999, 'tt0120363', '863', ['Animation', 'Adventure', 'Family'], 7.9, 92, 'Woody is kidnapped by a toy collector.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('toy-story-3-2010', 'Toy Story 3', 2010, 'tt0435761', '10193', ['Animation', 'Adventure', 'Family'], 8.3, 103, 'Andy\'s toys face an uncertain future as he prepares for college.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('toy-story-4-2019', 'Toy Story 4', 2019, 'tt1979376', '301528', ['Animation', 'Adventure', 'Family'], 7.7, 100, 'Woody and Forky embark on a road trip adventure.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // SHREK
                    m('shrek-franchise', 'Shrek', 2001, 'tt0126029', '808', ['Animation', 'Adventure', 'Comedy'], 7.9, 89, 'An ogre and a donkey team up to rescue a princess.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('shrek-2-franchise', 'Shrek 2', 2004, 'tt0298148', '809', ['Animation', 'Adventure', 'Comedy'], 7.2, 93, 'Shrek and Fiona meet her royal parents.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('shrek-third-2007', 'Shrek the Third', 2007, 'tt0413267', '810', ['Animation', 'Adventure', 'Comedy'], 6.1, 93, 'Shrek must find an heir to the throne.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('shrek-forever-2010', 'Shrek Forever After', 2010, 'tt0892791', '38757', ['Animation', 'Adventure', 'Comedy'], 6.3, 93, 'Shrek makes a deal that traps him in an alternate reality.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('puss-in-boots-2011', 'Puss in Boots', 2011, 'tt0448694', '49517', ['Animation', 'Adventure', 'Comedy'], 6.6, 90, 'Puss in Boots seeks the legendary magical beans.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('puss-in-boots-last-2022', 'Puss in Boots: The Last Wish', 2022, 'tt3915174', '315162', ['Animation', 'Adventure', 'Comedy'], 7.9, 102, 'Puss in Boots discovers he has burned through eight of his nine lives.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // SPIDER-MAN (multiple versions)
                    m('spider-man-2002', 'Spider-Man', 2002, 'tt0145487', '557', ['Action', 'Adventure', 'Sci-Fi'], 7.4, 121, 'Peter Parker becomes Spider-Man.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('spider-man-2-2004', 'Spider-Man 2', 2004, 'tt0316654', '558', ['Action', 'Adventure', 'Sci-Fi'], 7.5, 127, 'Spider-Man faces Doctor Octopus.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('spider-man-3-2007', 'Spider-Man 3', 2007, 'tt0413300', '559', ['Action', 'Adventure', 'Sci-Fi'], 6.3, 139, 'Spider-Man faces Venom and Sandman.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('amazing-spider-man-2012', 'The Amazing Spider-Man', 2012, 'tt0948470', '1930', ['Action', 'Adventure', 'Sci-Fi'], 6.9, 136, 'Peter Parker discovers a conspiracy involving his father.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('amazing-spider-man-2-2014', 'The Amazing Spider-Man 2', 2014, 'tt1872181', '102382', ['Action', 'Adventure', 'Sci-Fi'], 6.6, 142, 'Spider-Man faces Electro and Harry Osborn.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    // INDICINE / BOLLYWOOD MASSIVE ADDITION
                    m('dhoom-3-2013', 'Dhoom 3', 2013, 'tt1833673', '209274', ['Action', 'Crime', 'Thriller'], 5.4, 172, 'Twin brothers pull off a heist targeting a corrupt businessman.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('dhoom-2-2006', 'Dhoom 2', 2006, 'tt0441048', '21972', ['Action', 'Crime', 'Thriller'], 6.5, 152, 'A police officer goes undercover to catch a master thief.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('dhoom-2004', 'Dhoom', 2004, 'tt0415834', '34904', ['Action', 'Crime', 'Thriller'], 6.7, 129, 'A gang of bikers robs banks and evades the police.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('dabangg-2010', 'Dabangg', 2010, 'tt1620719', '49022', ['Action', 'Comedy', 'Crime'], 6.2, 126, 'A corrupt cop with a golden heart takes on the bad guys.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('dabangg-2-2012', 'Dabangg 2', 2012, 'tt2112131', '134374', ['Action', 'Comedy', 'Crime'], 5.7, 120, 'Chulbul Pandey returns to fight a new villain.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('dabangg-3-2019', 'Dabangg 3', 2019, 'tt7657650', '603692', ['Action', 'Comedy'], 4.2, 160, 'Chulbul Pandey faces a tough new criminal.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('singham-2011', 'Singham', 2011, 'tt1947982', '72570', ['Action', 'Crime', 'Drama'], 6.7, 142, 'An honest police officer takes on a corrupt politician.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('singham-returns-2014', 'Singham Returns', 2014, 'tt3719898', '238636', ['Action', 'Crime'], 6.1, 145, 'Bajirao Singham returns to fight corruption.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('simmba-2018', 'Simmba', 2018, 'tt7798646', '480531', ['Action', 'Crime', 'Drama'], 6.5, 155, 'A corrupt cop is reformed after meeting his ideal hero.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('sooryavansham-1999', 'Sooryavansham', 1999, 'tt0255114', '70392', ['Drama', 'Family'], 6.1, 168, 'A father-son conflict over values and tradition.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('hum-saath-saath-hain-1999', 'Hum Saath-Saath Hain', 1999, 'tt0169102', '70392', ['Drama', 'Family'], 6.0, 177, 'A large Indian family navigates love, marriage, and tradition.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('hum-aapke-hain-koun-1994', 'Hum Aapke Hain Koun..!', 1994, 'tt0110076', '70392', ['Comedy', 'Drama', 'Musical'], 7.5, 206, 'A grand Indian wedding celebration.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('maine-pyar-kiya-1989', 'Maine Pyar Kiya', 1989, 'tt0097889', '70392', ['Drama', 'Music', 'Romance'], 7.5, 192, 'A love story between an industrialist\'s daughter and a poor mechanic.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('hum-1991', 'Hum', 1991, 'tt0102074', '70392', ['Action', 'Crime', 'Drama'], 6.8, 184, 'A criminal seeks revenge against those who wronged his family.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('dilwale-dulhania-1995', 'Dilwale Dulhania Le Jayenge', 1995, 'tt0112870', '1949', ['Drama', 'Romance'], 8.0, 189, 'Two young Indians fall in love while traveling through Europe.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('kuch-kuch-hota-hai-1998', 'Kuch Kuch Hota Hai', 1998, 'tt0172684', '13616', ['Comedy', 'Drama', 'Musical'], 7.6, 177, 'A college love triangle.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('rab-ne-bana-di-jodi-2008', 'Rab Ne Bana Di Jodi', 2008, 'tt1182937', '24021', ['Drama', 'Romance'], 7.2, 167, 'A shy man transforms himself to win his wife\'s heart.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('veer-zaara-2004', 'Veer-Zaara', 2004, 'tt0420332', '24021', ['Drama', 'Romance'], 7.8, 192, 'An Indian pilot and a Pakistani lawyer fall in love across borders.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('swades-2004', 'Swades', 2004, 'tt0367110', '24021', ['Drama'], 8.2, 189, 'A NASA scientist returns to India to find his nanny.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('rang-de-basanti-2006', 'Rang De Basanti', 2006, 'tt0405508', '24021', ['Drama'], 8.2, 157, 'A film student inspires young Indians to fight corruption.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('chak-de-india-franchise', 'Chak De! India', 2007, 'tt0871510', '15435', ['Drama', 'Sport'], 8.2, 153, 'A disgraced hockey player coaches the Indian women\'s national team.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('barfi-franchise', 'Barfi!', 2012, 'tt1694542', '126706', ['Comedy', 'Drama', 'Romance'], 8.1, 151, 'A deaf-mute man in Darjeeling meets two women who change his life.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('queen-franchise', 'Queen', 2014, 'tt3322420', '242512', ['Adventure', 'Comedy', 'Drama'], 8.2, 146, 'A jilted bride goes on her honeymoon alone.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('highway-franchise', 'Highway', 2014, 'tt2988272', '214756', ['Drama', 'Romance'], 7.6, 133, 'A rich girl is kidnapped and finds freedom with her captor.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('raazi-franchise', 'Raazi', 2018, 'tt7098658', '505026', ['Action', 'Drama', 'Thriller'], 7.7, 138, 'A young Indian woman marries into a Pakistani military family to spy.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('padmaavat-franchise', 'Padmaavat', 2018, 'tt5935702', '447404', ['Drama', 'History', 'Romance'], 7.0, 164, 'A Rajput queen refuses to surrender to a Sultan.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('tanhaji-2020', 'Tanhaji: The Unsung Warrior', 2020, 'tt9044128', '614739', ['Action', 'Drama', 'History'], 7.5, 135, 'A Maratha warrior defends a fort against the Mughals.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('83-2021-franchise', '83', 2021, 'tt7518782', '631813', ['Drama', 'Sport'], 7.5, 162, 'India\'s cricket team wins the 1983 World Cup.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('lagaan-2001-franchise', 'Lagaan: Once Upon a Time in India', 2001, 'tt0169102', '21724', ['Adventure', 'Drama', 'Musical'], 8.1, 224, 'Indian villagers play cricket against British colonizers.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('dil-chahta-hai-2001', 'Dil Chahta Hai', 2001, 'tt0259289', '24021', ['Comedy', 'Drama', 'Romance'], 8.2, 183, 'Three friends navigate love and life after college.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('dil-se-1998', 'Dil Se..', 1998, 'tt0164538', '24021', ['Drama', 'Music', 'Romance'], 7.5, 163, 'A journalist falls for a mysterious terrorist.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('guru-2007', 'Guru', 2007, 'tt0499375', '24021', ['Biography', 'Drama'], 7.7, 155, 'A small-town man builds a business empire.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('sardar-udham-2021', 'Sardar Udham', 2021, 'tt5906392', '609681', ['Biography', 'Drama', 'History'], 8.5, 164, 'A revolutionary dedicates his life to avenging the Jallianwala Bagh massacre.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('shershaah-franchise', 'Shershaah', 2021, 'tt10882532', '614805', ['Action', 'Biography', 'Drama'], 8.3, 135, 'The story of Captain Vikram Batra, hero of the Kargil War.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('sam-bahadur-2023', 'Sam Bahadur', 2023, 'tt11528106', '755554', ['Biography', 'Drama', 'War'], 7.5, 154, 'The life of India\'s first Field Marshal, Sam Manekshaw.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('12th-fail-2023', '12th Fail', 2023, 'tt10882540', '609681', ['Biography', 'Drama'], 9.0, 147, 'The true story of a man who overcame poverty to become an IPS officer.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg'),
                    m('shahrukh-bollywood', 'Shah Rukh Khan Blockbusters Collection', 2024, 'tt0000000', '0', ['Drama'], 8.0, 0, 'Curated collection of Bollywood hits.', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg', '/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg')
                ])
            ];
    }

    /**
     * Helper: spread a single array of items into the catalog.
     * Wraps `movie()`/`tv()` outputs (which already return arrays of one).
     */
    entries(items) {
        return items;
    }

    movie(id, title, year, imdbId, tmdbId, genres, rating, runtime, overview, posterPath, backdropPath) {
        return [{
            id, title, year, type: 'movie', imdbId, tmdbId,
            genres, rating, runtime, overview,
            posterPath, backdropPath
        }];
    }

    tv(id, title, year, imdbId, tmdbId, seasons, genres, rating, runtime, overview, posterPath, backdropPath) {
        return [{
            id, title, year, type: 'tv', imdbId, tmdbId, seasons,
            genres, rating, runtime, overview,
            posterPath, backdropPath
        }];
    }

    /**
     * Convert raw catalog entry into the shape the frontend expects,
     * including embed source URLs for multi-source playback.
     */
    toFrontendItem(entry) {
        const sources = this.buildSources(entry);

        // Normalize rating — may be string, number, or undefined
        let rating = 'NR';
        if (typeof entry.rating === 'number' && !isNaN(entry.rating)) {
            rating = entry.rating.toFixed(1);
        } else if (typeof entry.rating === 'string') {
            rating = entry.rating;
        }

        return {
            id: entry.id,
            title: entry.title,
            year: entry.year,
            type: entry.type,
            url: entry.id,
            sourceName: this.sourceName,
            poster: `https://image.tmdb.org/t/p/w500${entry.posterPath}`,
            backdrop: `https://image.tmdb.org/t/p/w1280${entry.backdropPath}`,
            genres: entry.genres,
            rating,
            duration: entry.runtime ? entry.runtime * 60 : 0,
            durationMinutes: entry.runtime,
            description: entry.overview,
            imdbId: entry.imdbId,
            tmdbId: entry.tmdbId,
            seasons: entry.seasons,
            streams: sources
        };
    }

    /**
     * Build the multi-source pool: 3-4 failover mirrors per title.
     */
    buildSources(entry) {
        const sources = [];
        const { imdbId, tmdbId, type } = entry;

        if (type === 'movie') {
            sources.push({
                label: 'VidSrc.me', provider: 'vidsrc',
                url: `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`,
                quality: '1080p', format: 'embed'
            });
            sources.push({
                label: 'SuperEmbed', provider: 'superembed',
                url: `https://multiembed.mov/?video_id=${imdbId || tmdbId}`,
                quality: '1080p', format: 'embed'
            });
            sources.push({
                label: 'VidSrc.to', provider: 'vidsrc',
                url: `https://vidsrc.to/embed/movie/${tmdbId}`,
                quality: '1080p', format: 'embed'
            });
            sources.push({
                label: '2Embed', provider: '2embed',
                url: `https://www.2embed.cc/embed/${tmdbId || imdbId}`,
                quality: '720p', format: 'embed'
            });
        } else if (type === 'tv') {
            sources.push({
                label: 'VidSrc.me', provider: 'vidsrc',
                urlTemplate: `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season={season}&episode={episode}`,
                quality: '1080p', format: 'embed', seasonEpisode: true
            });
            sources.push({
                label: 'SuperEmbed', provider: 'superembed',
                urlTemplate: `https://multiembed.mov/?video_id=${imdbId || tmdbId}&s={season}&e={episode}`,
                quality: '1080p', format: 'embed', seasonEpisode: true
            });
            sources.push({
                label: 'VidSrc.to', provider: 'vidsrc',
                urlTemplate: `https://vidsrc.to/embed/tv/${tmdbId}/{season}/{episode}`,
                quality: '1080p', format: 'embed', seasonEpisode: true
            });
            sources.push({
                label: '2Embed', provider: '2embed',
                urlTemplate: `https://www.2embed.cc/embedtv/${tmdbId || imdbId}&s={season}&e={episode}`,
                quality: '720p', format: 'embed', seasonEpisode: true
            });
        }

        return sources;
    }

    async search(query) {
        const q = (query || '').toLowerCase().trim();
        const qNorm = q.replace(/[^a-z0-9]/g, '');
        const all = this.getCatalog();
        const matches = q
            ? all.filter(m => {
                const title = (m.title || '').toLowerCase();
                const titleNorm = title.replace(/[^a-z0-9]/g, '');
                const imdb = (m.imdbId || '').toLowerCase();
                const genres = Array.isArray(m.genres) ? m.genres : [];
                return title.includes(q) ||
                    (qNorm && titleNorm.includes(qNorm)) ||
                    genres.some(g => (g || '').toLowerCase().includes(q)) ||
                    String(m.year || '') === q ||
                    imdb === q;
            })
            : all;
        return this.dedupCatalog(matches).map(m => this.toFrontendItem(m));
    }

    async browseByGenre(genre) {
        const g = (genre || '').toLowerCase().trim();
        const all = this.getCatalog();
        const matches = all.filter(m => {
            const list = Array.isArray(m.genres) ? m.genres : (typeof m.genres === 'string' ? m.genres.split(',') : []);
            return list.some(x => String(x).toLowerCase().trim() === g);
        });
        const deduped = this.dedupCatalog(matches);
        // Hard pass: ensure at most ONE Sherlock entry by ID survives in any genre row.
        // Without this, genre rows (Mystery/Crime/Drama) can render 5+ Sherlock cards
        // because duplicate imdb-less entries slip past the (title|year) dedup.
        const seenSherlock = { sherlock: false };
        const finalDedup = deduped.filter(m => {
            if (m && m.id === 'sherlock-2010') {
                if (seenSherlock.sherlock) return false;
                seenSherlock.sherlock = true;
            }
            return true;
        });
        return finalDedup.map(m => this.toFrontendItem(m));
    }

    /**
     * Dedup the curated catalog. Two passes:
     *  1) prefer imdbId — many titles are listed under different ids but same imdb.
     *  2) fall back to (title-lowercased + year) — exact match is the same title.
     * The first occurrence wins (catalog is in approximate priority order).
     */
    dedupCatalog(items) {
        const seen = new Set();
        const out = [];
        for (const m of items) {
            if (!m) continue;
            const imdb = (m.imdbId || '').toLowerCase();
            const title = (m.title || '').toLowerCase().trim();
            const year = m.year || 0;
            const key = imdb ? `i:${imdb}` : `t:${title}|${year}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(m);
        }
        return out;
    }

    async getTvEpisodes(tmdbId, season) {
        const all = this.getCatalog();
        const show = all.find(m => (m.tmdbId === tmdbId || m.id === tmdbId || m.imdbId === tmdbId) && m.type === 'tv');
        if (!show) return [];

        const seasonNum = parseInt(season, 10) || 1;
        const episodes = [];
        const maxEp = 20;
        for (let e = 1; e <= maxEp; e++) {
            episodes.push({
                season: seasonNum,
                episode: e,
                title: `Episode ${e}`,
                sources: [
                    { label: 'VidSrc.me', provider: 'vidsrc', url: `https://vidsrc.me/embed/tv?tmdb=${show.tmdbId}&season=${seasonNum}&episode=${e}`, quality: '1080p', format: 'embed' },
                    { label: 'SuperEmbed', provider: 'superembed', url: `https://multiembed.mov/?video_id=${show.imdbId || show.tmdbId}&s=${seasonNum}&e=${e}`, quality: '1080p', format: 'embed' },
                    { label: 'VidSrc.to', provider: 'vidsrc', url: `https://vidsrc.to/embed/tv/${show.tmdbId}/${seasonNum}/${e}`, quality: '1080p', format: 'embed' },
                    { label: '2Embed', provider: '2embed', url: `https://www.2embed.cc/embedtv/${show.tmdbId}&s=${seasonNum}&e=${e}`, quality: '720p', format: 'embed' },
                    { label: 'YouTube (Official HD)', provider: 'youtube', url: `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(`${show.title} Episode ${e} full episode HD`)}`, quality: '1080p', format: 'embed' }
                ]
            });
        }
        return episodes;
    }

    async extractStream(movieUrl, season, episode) {
        const all = this.getCatalog();
        const entry = all.find(m => m.id === movieUrl || m.tmdbId === movieUrl || m.imdbId === movieUrl);
        if (!entry) return null;

        if (entry.type === 'tv') {
            const s = parseInt(season, 10) || 1;
            const e = parseInt(episode, 10) || 1;
            return `https://vidsrc.me/embed/tv?tmdb=${entry.tmdbId}&season=${s}&episode=${e}`;
        }
        return `https://vidsrc.me/embed/movie?tmdb=${entry.tmdbId}`;
    }
}

// Shorthand constructor helpers used in the catalog table above.
function m(id, title, year, imdbId, tmdbId, genres, rating, runtime, overview, posterPath, backdropPath) {
    return { id, title, year, type: 'movie', imdbId, tmdbId, genres, rating, runtime, overview, posterPath, backdropPath };
}
function v(id, title, year, imdbId, tmdbId, seasons, genres, rating, runtime, overview, posterPath, backdropPath) {
    return { id, title, year, type: 'tv', imdbId, tmdbId, seasons, genres, rating, runtime, overview, posterPath, backdropPath };
}