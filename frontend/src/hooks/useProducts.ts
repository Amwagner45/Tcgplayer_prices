import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
    fetchProducts,
    fetchStats,
    fetchFilters,
    fetchProduct,
    fetchPriceHistory,
    fetchPriceComparisons,
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

export function usePriceComparisons(productId: number | null) {
    return useQuery({
        queryKey: ["priceComparisons", productId],
        queryFn: () => fetchPriceComparisons(productId!),
        enabled: productId !== null,
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
