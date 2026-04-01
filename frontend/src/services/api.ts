import axios from "axios";
import type {
    ProductsResponse,
    ProductDetail,
    StatsResponse,
    FiltersResponse,
    ProductFilters,
    PriceHistoryResponse,
    PriceComparisonsResponse,
    WatchlistSummary,
    SavedFilterItem,
} from "../types";

const api = axios.create({
    baseURL: "http://localhost:8000/api",
});

export async function fetchProducts(
    filters: ProductFilters
): Promise<ProductsResponse> {
    const params: Record<string, string | number> = {
        sort_by: filters.sortBy,
        sort_dir: filters.sortDir,
        page: filters.page,
        page_size: filters.pageSize,
    };
    if (filters.categoryId) params.category_id = filters.categoryId;
    if (filters.groupIds && filters.groupIds.length > 0)
        params.group_id = filters.groupIds.join(",");
    if (filters.rarities && filters.rarities.length > 0)
        params.rarity = filters.rarities.join(",");
    if (filters.subTypes && filters.subTypes.length > 0)
        params.sub_type = filters.subTypes.join(",");
    if (filters.minPrice !== undefined) params.min_price = filters.minPrice;
    if (filters.maxPrice !== undefined) params.max_price = filters.maxPrice;
    if (filters.search) params.search = filters.search;
    if (filters.watchlistId) params.watchlist_id = filters.watchlistId;
    if (filters.maxRangePosition !== undefined)
        params.max_range_position = filters.maxRangePosition;

    const { data } = await api.get<ProductsResponse>("/products", { params });
    return data;
}

export async function fetchProduct(
    productId: number
): Promise<ProductDetail> {
    const { data } = await api.get<ProductDetail>(`/products/${productId}`);
    return data;
}

export async function fetchStats(
    categoryId?: number
): Promise<StatsResponse> {
    const params: Record<string, number> = {};
    if (categoryId) params.category_id = categoryId;
    const { data } = await api.get<StatsResponse>("/stats", { params });
    return data;
}

export async function fetchFilters(
    categoryId?: number
): Promise<FiltersResponse> {
    const params: Record<string, number> = {};
    if (categoryId) params.category_id = categoryId;
    const { data } = await api.get<FiltersResponse>("/filters", { params });
    return data;
}

export async function fetchPriceHistory(
    productId: number,
    days: number = 365
): Promise<PriceHistoryResponse> {
    const { data } = await api.get<PriceHistoryResponse>(
        `/products/${productId}/history`,
        { params: { days } }
    );
    return data;
}

export async function fetchPriceComparisons(
    productId: number
): Promise<PriceComparisonsResponse> {
    const { data } = await api.get<PriceComparisonsResponse>(
        `/products/${productId}/comparisons`
    );
    return data;
}

// ── Watchlists ──

export async function fetchWatchlists(): Promise<WatchlistSummary[]> {
    const { data } = await api.get<WatchlistSummary[]>("/watchlists");
    return data;
}

export async function createWatchlist(name: string): Promise<WatchlistSummary> {
    const { data } = await api.post<WatchlistSummary>("/watchlists", { name });
    return data;
}

export async function deleteWatchlist(id: number): Promise<void> {
    await api.delete(`/watchlists/${id}`);
}

export async function fetchWatchlistItems(watchlistId: number): Promise<number[]> {
    const { data } = await api.get<number[]>(`/watchlists/${watchlistId}/items`);
    return data;
}

export async function addToWatchlist(watchlistId: number, productId: number): Promise<void> {
    await api.post(`/watchlists/${watchlistId}/items`, { productId });
}

export async function removeFromWatchlist(watchlistId: number, productId: number): Promise<void> {
    await api.delete(`/watchlists/${watchlistId}/items/${productId}`);
}

// ── Saved Filters ──

export async function fetchSavedFilters(): Promise<SavedFilterItem[]> {
    const { data } = await api.get<SavedFilterItem[]>("/saved-filters");
    return data;
}

export async function createSavedFilter(name: string, filterJson: string): Promise<SavedFilterItem> {
    const { data } = await api.post<SavedFilterItem>("/saved-filters", { name, filterJson });
    return data;
}

export async function deleteSavedFilter(id: number): Promise<void> {
    await api.delete(`/saved-filters/${id}`);
}
