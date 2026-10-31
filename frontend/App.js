import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { useWindowDimensions, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { COLORS } from './src/theme/colors';
import { getResponsiveLayout } from './src/theme/scaling';
import { installAdShield } from './src/utils/adShield';
import { watchInstallPrompt } from './src/utils/pwa';

// Deep-linking configuration so shared title URLs land on the right screen.
// Server-style paths (/title/:slug, /genre/:slug, /country/:slug, /collection/:slug)
// resolve via the slug fields stored in DB and exposed via /api/v1 endpoints.
const linking = {
    prefixes: [
        'https://ssmoviestvs.site',
        'https://www.ssmoviestvs.site',
        'http://localhost',
        'http://localhost:8081'
    ],
    config: {
        screens: {
            Home: '',
            Movies: 'movies',
            TV: 'tv',
            Anime: 'anime',
            ShortDramas: 'short-dramas',
            Sports: 'sports',
            Genres: 'genres',
            Countries: 'countries',
            CountryDetail: {
                path: 'country/:slug',
                stringify: {
                    country: () => undefined,
                    code: () => undefined,
                }
            },
            Languages: 'languages',
            Collections: 'collections',
            CollectionDetail: {
                path: 'collection/:slug',
                stringify: {
                    collection: () => undefined,
                    initialItems: () => undefined,
                }
            },
            Browse: {
                path: 'browse/:kind?',
                stringify: {
                    initialItems: () => undefined,
                }
            },
            Search: 'search',
            Watchlist: 'watchlist',
            History: 'history',
            TitleDetail: {
                path: 'title/:slug',
                stringify: {
                    item: () => undefined,
                }
            },
            Player: {
                path: 'play/:slug',
                parse: {
                    season: (val) => val ? parseInt(val, 10) : undefined,
                    episode: (val) => val ? parseInt(val, 10) : undefined,
                },
                stringify: {
                    // Without these, a null season/episode is serialised into
                    // the address bar as "?season=1&episode" with no value.
                    season: (val) => (val === null || val === undefined || Number.isNaN(val) ? undefined : String(val)),
                    episode: (val) => (val === null || val === undefined || Number.isNaN(val) ? undefined : String(val)),
                    item: () => undefined,
                }
            },
            Blogs: 'blogs',
            BlogDetail: 'blog/:slug',
            Apps: 'apps',
            Settings: 'settings',
            Admin: 'admin'
        }
    }
};

// Import all modular screens
import HomeScreen from './src/screens/HomeScreen';
import MoviesScreen from './src/screens/MoviesScreen';
import TVScreen from './src/screens/TVScreen';
import AnimeScreen from './src/screens/AnimeScreen';
import ShortDramasScreen from './src/screens/ShortDramasScreen';
import SportsScreen from './src/screens/SportsScreen';
import GenreScreen from './src/screens/GenreScreen';
import CountriesScreen from './src/screens/CountriesScreen';
import CountryDetailScreen from './src/screens/CountryDetailScreen';
import LanguagesScreen from './src/screens/LanguagesScreen';
import CollectionsScreen from './src/screens/CollectionsScreen';
import CollectionDetailScreen from './src/screens/CollectionDetailScreen';
import BrowseScreen from './src/screens/BrowseScreen';
import SearchScreen from './src/screens/SearchScreen';
import WatchlistScreen from './src/screens/WatchlistScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import TitleDetailScreen from './src/screens/TitleDetailScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AppsScreen from './src/screens/AppsScreen';
import AdminScreen from './src/screens/AdminScreen';
import BlogsScreen from './src/screens/BlogsScreen';
import BlogDetailScreen from './src/screens/BlogDetailScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import UpdateBanner from './src/components/UpdateBanner';

// Custom drawer navigation content
import DrawerContent from './src/navigation/DrawerContent';

const Drawer = createDrawerNavigator();

export default function App() {
    const { width, height } = useWindowDimensions();
    const responsive = getResponsiveLayout(width, height);
    const isDesktop = responsive.isDesktop;

    // Single owner of the window.open override, plus the browser install prompt.
    // Both are web-only and both no-op natively.
    useEffect(() => {
        const uninstall = installAdShield();
        const unwatch = watchInstallPrompt();
        return () => {
            uninstall();
            unwatch();
        };
    }, []);

    return (
        <ErrorBoundary>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
            <UpdateBanner />
            <NavigationContainer linking={linking}>
                <Drawer.Navigator
                    initialRouteName="Home"
                    screenOptions={({ route }) => {
                        const isPlayer = route.name === 'Player';
                        return {
                            headerShown: false,
                            drawerType: isPlayer ? 'front' : (isDesktop ? 'permanent' : 'front'),
                            drawerStyle: isPlayer
                                ? { display: 'none', width: 0 }
                                : {
                                    backgroundColor: COLORS.surface,
                                    borderRightColor: COLORS.border,
                                    borderRightWidth: 1,
                                    width: isDesktop ? 240 : 280
                                },
                            sceneStyle: {
                                backgroundColor: COLORS.bg
                            },
                            swipeEnabled: !isPlayer
                        };
                    }}
                    drawerContent={(props) => <DrawerContent {...props} />}
                >
                    <Drawer.Screen name="Home" component={HomeScreen} />
                    <Drawer.Screen name="Movies" component={MoviesScreen} />
                    <Drawer.Screen name="TV" component={TVScreen} />
                    <Drawer.Screen name="Anime" component={AnimeScreen} />
                    <Drawer.Screen name="ShortDramas" component={ShortDramasScreen} />
                    <Drawer.Screen name="Sports" component={SportsScreen} />
                    <Drawer.Screen name="Genres" component={GenreScreen} />
                    <Drawer.Screen name="Countries" component={CountriesScreen} />
                    <Drawer.Screen name="CountryDetail" component={CountryDetailScreen} />
                    <Drawer.Screen name="Languages" component={LanguagesScreen} />
                    <Drawer.Screen name="Collections" component={CollectionsScreen} />
                    <Drawer.Screen name="CollectionDetail" component={CollectionDetailScreen} />
                    <Drawer.Screen name="Browse" component={BrowseScreen} />
                    <Drawer.Screen name="Search" component={SearchScreen} />
                    <Drawer.Screen name="Watchlist" component={WatchlistScreen} />
                    <Drawer.Screen name="History" component={HistoryScreen} />
                    <Drawer.Screen name="TitleDetail" component={TitleDetailScreen} />
                    <Drawer.Screen name="Player" component={PlayerScreen} options={{ unmountOnBlur: true }} />
                    <Drawer.Screen name="Settings" component={SettingsScreen} />
                    <Drawer.Screen name="Apps" component={AppsScreen} />
                    <Drawer.Screen name="Admin" component={AdminScreen} />
                    <Drawer.Screen name="Blogs" component={BlogsScreen} />
                    <Drawer.Screen name="BlogDetail" component={BlogDetailScreen} />
                </Drawer.Navigator>
            </NavigationContainer>
        </ErrorBoundary>
    );
}
