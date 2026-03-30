import axios from "axios";
import type {
    ProductsResponse,
    ProductDetail,
    StatsResponse,
    FiltersResponse,
    ProductFilters,
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
    if (filters.groupId) params.group_id = filters.groupId;
    if (filters.rarity) params.rarity = filters.rarity;
    if (filters.subType) params.sub_type = filters.subType;
    if (filters.minPrice !== undefined) params.min_price = filters.minPrice;
    if (filters.maxPrice !== undefined) params.max_price = filters.maxPrice;
    if (filters.search) params.search = filters.search;

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
