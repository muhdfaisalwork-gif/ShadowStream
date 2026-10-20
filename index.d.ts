export declare const DEFAULT_API_BASE: string;

export interface ShadowStreamClientOptions {
    apiBase?: string;
    fetchImpl?: typeof fetch;
}

export interface TitleFilterParams {
    page?: number;
    page_size?: number;
    type?: 'movie' | 'tv' | 'anime' | 'short_drama';
    genre?: string;
    country?: string;
    audio_language?: string;
    subtitle_language?: string;
    language?: string;
    sort?: string;
    min_rating?: number;
    year_min?: number;
}

export declare class ShadowStreamClient {
    readonly apiBase: string;
    constructor(options?: ShadowStreamClientOptions);
    getHealth(): Promise<Record<string, unknown>>;
    getTitles(filters?: TitleFilterParams): Promise<Record<string, unknown>>;
    getTitle(idOrSlug: string | number): Promise<Record<string, unknown>>;
    getTitleSeasons(idOrSlug: string | number): Promise<Record<string, unknown>>;
    getCountries(): Promise<Record<string, unknown>>;
    getCollections(): Promise<Record<string, unknown>>;
    search(query: string, limit?: number): Promise<Record<string, unknown>>;
}

export default ShadowStreamClient;
