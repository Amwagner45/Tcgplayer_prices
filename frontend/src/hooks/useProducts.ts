import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchProducts, fetchStats, fetchFilters, fetchProduct } from "../services/api";
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
