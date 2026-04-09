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

export const STATIC_MODE = import.meta.env.VITE_STATIC_MODE === "true";

const api = axios.create({
    baseURL: "http://localhost:8000/api",
});

// Cache for the static opportunities JSON
let staticDataCache: (ProductsResponse & { exportedAt?: string }) | null = null;

async function getStaticData(): Promise<
    ProductsResponse & { exportedAt?: string }
> {
    if (staticDataCache) return staticDataCache;
    const resp = await fetch(
        import.meta.env.BASE_URL + "data/opportunities.json"
    );
    staticDataCache = await resp.json();
    return staticDataCache!;
}

export async function fetchProducts(
    filters: ProductFilters
): Promise<ProductsResponse> {
    if (STATIC_MODE) {
        const data = await getStaticData();
        let items = [...data.items];

        // Client-side filtering on the static dataset
        if (filters.categoryId)
            items = items.filter((i) => i.categoryId === filters.categoryId);
        if (filters.search) {
            const q = filters.search.toLowerCase();
            items = items.filter((i) => i.name.toLowerCase().includes(q));
        }
        if (filters.minPrice !== undefined)
            items = items.filter(
                (i) =>
                    i.marketPrice !== null && i.marketPrice >= filters.minPrice!
            );
        if (filters.maxPrice !== undefined)
            items = items.filter(
                (i) =>
                    i.marketPrice !== null && i.marketPrice <= filters.maxPrice!
            );
        if (filters.maxRangePosition !== undefined)
            items = items.filter(
                (i) =>
                    i.rangePosition !== null &&
                    i.rangePosition <= filters.maxRangePosition!
            );
        if (filters.rarities && filters.rarities.length > 0)
            items = items.filter(
                (i) => i.rarity !== null && filters.rarities!.includes(i.rarity)
            );
        if (filters.groupIds && filters.groupIds.length > 0)
            items = items.filter((i) =>
                filters.groupIds!.includes(i.groupId)
            );

        // Sort
        const dir = filters.sortDir === "asc" ? 1 : -1;
        const key = filters.sortBy as keyof typeof items[0];
        items.sort((a, b) => {
            const av = a[key] as number | null;
            const bv = b[key] as number | null;
            if (av === null && bv === null) return 0;
            if (av === null) return 1;
            if (bv === null) return -1;
            return (av > bv ? 1 : av < bv ? -1 : 0) * dir;
        });

        // Paginate
        const start = (filters.page - 1) * filters.pageSize;
        const paged = items.slice(start, start + filters.pageSize);

        return {
            items: paged,
            total: items.length,
            page: filters.page,
            pageSize: filters.pageSize,
            totalPages: Math.ceil(items.length / filters.pageSize),
        };
    }

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
    if (STATIC_MODE) {
        const data = await getStaticData();
        const item = data.items.find((i) => i.productId === productId);
        if (!item) throw new Error("Product not found");
        return {
            productId: item.productId,
            name: item.name,
            cleanName: item.cleanName,
            imageUrl: item.imageUrl,
            categoryId: item.categoryId,
            groupId: item.groupId,
            url: item.url,
            rarity: item.rarity,
            cardNumber: item.cardNumber,
            cardType: item.cardType,
            groupName: item.groupName,
            categoryName: item.categoryName,
            prices: [
                {
                    subTypeName: item.subTypeName,
                    lowPrice: item.lowPrice,
                    midPrice: item.midPrice,
                    highPrice: item.highPrice,
                    marketPrice: item.marketPrice,
                    directLowPrice: item.directLowPrice,
                    pctBelowMid: item.pctBelowMid,
                },
            ],
        };
    }
    const { data } = await api.get<ProductDetail>(`/products/${productId}`);
    return data;
}

export async function fetchStats(
    categoryId?: number
): Promise<StatsResponse> {
    if (STATIC_MODE) {
        const data = await getStaticData();
        const catMap = new Map<number, { name: string; count: number }>();
        for (const item of data.items) {
            const entry = catMap.get(item.categoryId) || {
                name: item.categoryName,
                count: 0,
            };
            entry.count++;
            catMap.set(item.categoryId, entry);
        }
        return {
            categories: Array.from(catMap.entries()).map(([id, v]) => ({
                categoryId: id,
                displayName: v.name,
                totalCards: v.count,
            })),
            bigDeals: data.items.length,
        };
    }
    const params: Record<string, number> = {};
    if (categoryId) params.category_id = categoryId;
    const { data } = await api.get<StatsResponse>("/stats", { params });
    return data;
}

export async function fetchFilters(
    categoryId?: number
): Promise<FiltersResponse> {
    if (STATIC_MODE) {
        const data = await getStaticData();
        let items = data.items;
        if (categoryId)
            items = items.filter((i) => i.categoryId === categoryId);
        const cats = new Map<number, string>();
        const groups = new Map<number, string>();
        const rarities = new Set<string>();
        const subTypes = new Set<string>();
        for (const item of items) {
            cats.set(item.categoryId, item.categoryName);
            groups.set(item.groupId, item.groupName);
            if (item.rarity) rarities.add(item.rarity);
            if (item.subTypeName) subTypes.add(item.subTypeName);
        }
        return {
            categories: Array.from(cats.entries()).map(([id, name]) => ({
                categoryId: id,
                displayName: name,
            })),
            rarities: Array.from(rarities).sort(),
            groups: Array.from(groups.entries()).map(([id, name]) => ({
                groupId: id,
                name,
            })),
            subTypes: Array.from(subTypes).sort(),
        };
    }
    const params: Record<string, number> = {};
    if (categoryId) params.category_id = categoryId;
    const { data } = await api.get<FiltersResponse>("/filters", { params });
    return data;
}

export async function fetchPriceHistory(
    productId: number,
    days: number = 365
): Promise<PriceHistoryResponse> {
    if (STATIC_MODE) return { productId, history: [] };
    const { data } = await api.get<PriceHistoryResponse>(
        `/products/${productId}/history`,
        { params: { days } }
    );
    return data;
}

export async function fetchPriceComparisons(
    productId: number
): Promise<PriceComparisonsResponse> {
    if (STATIC_MODE) return { productId, subTypeName: "Normal", currentPrice: null, thirtyDaysAgo: null, ninetyDaysAgo: null, oneYearAgo: null, allTimeLow: null, allTimeHigh: null };
    const { data } = await api.get<PriceComparisonsResponse>(
        `/products/${productId}/comparisons`
    );
    return data;
}

// ── Watchlists ──

export async function fetchWatchlists(): Promise<WatchlistSummary[]> {
    if (STATIC_MODE) return [];
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
    if (STATIC_MODE) return [];
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
