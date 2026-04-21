import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
    fetchProducts,
    fetchStats,
    fetchFilters,
    fetchProduct,
    fetchPriceHistory,
    fetchPriceComparisons,
    fetchMonthlyAnalytics,
    fetchSetAnalytics,
    fetchSetHistory,
    fetchLeaderboard,
    fetchWatchlists,
    createWatchlist,
    deleteWatchlist,
    fetchWatchlistItems,
    addToWatchlist,
    removeFromWatchlist,
    fetchSavedFilters,
    createSavedFilter,
    deleteSavedFilter,
} from "../services/api";
import type { ProductFilters } from "../types";

export function useProducts(filters: ProductFilters) {
    return useQuery({
        queryKey: ["products", filters],
        queryFn: () => fetchProducts(filters),
        placeholderData: keepPreviousData,
    });
}

export function useProduct(productId: number | null) {
    return useQuery({
        queryKey: ["product", productId],
        queryFn: () => fetchProduct(productId!),
        enabled: productId !== null,
    });
}

export function useStats(categoryId?: number) {
    return useQuery({
        queryKey: ["stats", categoryId],
        queryFn: () => fetchStats(categoryId),
    });
}

export function useFilters(categoryId?: number) {
    return useQuery({
        queryKey: ["filters", categoryId],
        queryFn: () => fetchFilters(categoryId),
    });
}

export function usePriceHistory(productId: number | null, days: number = 365) {
    return useQuery({
        queryKey: ["priceHistory", productId, days],
        queryFn: () => fetchPriceHistory(productId!, days),
        enabled: productId !== null,
    });
}

export function usePriceHistoryByVariant(
    productId: number | null,
    days: number = 365,
    subType?: string
) {
    return useQuery({
        queryKey: ["priceHistory", productId, days, subType],
        queryFn: () => fetchPriceHistory(productId!, days, subType),
        enabled: productId !== null,
    });
}

export function usePriceComparisons(productId: number | null, subType?: string) {
    return useQuery({
        queryKey: ["priceComparisons", productId, subType],
        queryFn: () => fetchPriceComparisons(productId!, subType),
        enabled: productId !== null,
    });
}

export function useMonthlyAnalytics(
    minPrice: number,
    months: number,
    limit: number,
    categoryId?: number
) {
    return useQuery({
        queryKey: ["monthlyAnalytics", minPrice, months, limit, categoryId],
        queryFn: () => fetchMonthlyAnalytics(minPrice, months, limit, categoryId),
    });
}

export function useSetAnalytics(
    minPrice: number,
    months: number,
    limit: number,
    categoryId?: number
) {
    return useQuery({
        queryKey: ["setAnalytics", minPrice, months, limit, categoryId],
        queryFn: () => fetchSetAnalytics(minPrice, months, limit, categoryId),
    });
}

export function useSetHistory(groupId: number | null, minPrice: number, months: number) {
    return useQuery({
        queryKey: ["setHistory", groupId, minPrice, months],
        queryFn: () => fetchSetHistory(groupId!, minPrice, months),
        enabled: groupId !== null,
    });
}

export function useLeaderboard(
    minPrice: number,
    months: number,
    limit: number,
    metric: string,
    categoryId?: number
) {
    return useQuery({
        queryKey: ["leaderboard", minPrice, months, limit, metric, categoryId],
        queryFn: () => fetchLeaderboard(minPrice, months, limit, metric, categoryId),
    });
}

// ── Watchlists ──

export function useWatchlists() {
    return useQuery({
        queryKey: ["watchlists"],
        queryFn: fetchWatchlists,
    });
}

export function useWatchlistItems(watchlistId: number | null) {
    return useQuery({
        queryKey: ["watchlistItems", watchlistId],
        queryFn: () => fetchWatchlistItems(watchlistId!),
        enabled: watchlistId !== null,
    });
}

export function useCreateWatchlist() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (name: string) => createWatchlist(name),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
    });
}

export function useDeleteWatchlist() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => deleteWatchlist(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
    });
}

export function useAddToWatchlist() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ watchlistId, productId }: { watchlistId: number; productId: number }) =>
            addToWatchlist(watchlistId, productId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["watchlistItems"] });
            qc.invalidateQueries({ queryKey: ["watchlists"] });
        },
    });
}

export function useRemoveFromWatchlist() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ watchlistId, productId }: { watchlistId: number; productId: number }) =>
            removeFromWatchlist(watchlistId, productId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["watchlistItems"] });
            qc.invalidateQueries({ queryKey: ["watchlists"] });
        },
    });
}

// ── Saved Filters ──

export function useSavedFilters() {
    return useQuery({
        queryKey: ["savedFilters"],
        queryFn: fetchSavedFilters,
    });
}

export function useCreateSavedFilter() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ name, filterJson }: { name: string; filterJson: string }) =>
            createSavedFilter(name, filterJson),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["savedFilters"] }),
    });
}

export function useDeleteSavedFilter() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => deleteSavedFilter(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["savedFilters"] }),
    });
}
