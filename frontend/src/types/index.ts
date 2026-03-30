export interface ProductItem {
    productId: number;
    name: string;
    cleanName: string | null;
    imageUrl: string | null;
    categoryId: number;
    groupId: number;
    url: string | null;
    rarity: string | null;
    cardNumber: string | null;
    cardType: string | null;
    groupName: string;
    categoryName: string;
    subTypeName: string;
    lowPrice: number | null;
    midPrice: number | null;
    highPrice: number | null;
    marketPrice: number | null;
    directLowPrice: number | null;
    pctBelowMid: number | null;
}

export interface ProductsResponse {
    items: ProductItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface ProductDetail {
    productId: number;
    name: string;
    cleanName: string | null;
    imageUrl: string | null;
    categoryId: number;
    groupId: number;
    url: string | null;
    rarity: string | null;
    cardNumber: string | null;
    cardType: string | null;
    groupName: string;
    categoryName: string;
    prices: PriceVariant[];
}

export interface PriceVariant {
    subTypeName: string;
    lowPrice: number | null;
    midPrice: number | null;
    highPrice: number | null;
    marketPrice: number | null;
    directLowPrice: number | null;
    pctBelowMid: number | null;
}

export interface StatsResponse {
    categories: CategoryStat[];
    bigDeals: number;
}

export interface CategoryStat {
    categoryId: number;
    displayName: string;
    totalCards: number;
}

export interface FiltersResponse {
    categories: { categoryId: number; displayName: string }[];
    rarities: string[];
    groups: { groupId: number; name: string }[];
    subTypes: string[];
}

export interface ProductFilters {
    categoryId?: number;
    groupId?: number;
    rarity?: string;
    subType?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    sortBy: string;
    sortDir: string;
    page: number;
    pageSize: number;
}
