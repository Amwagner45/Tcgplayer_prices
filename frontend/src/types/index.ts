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
    pctChange30d: number | null;
    pctChange90d: number | null;
    pctChange1yr: number | null;
    allTimeLow: number | null;
    allTimeLowDate: string | null;
    allTimeHigh: number | null;
    allTimeHighDate: string | null;
    rangePosition: number | null;
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
    groupIds?: number[];
    rarities?: string[];
    subTypes?: string[];
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    watchlistId?: number;
    maxRangePosition?: number;
    sortBy: string;
    sortDir: string;
    page: number;
    pageSize: number;
}

export interface PriceHistoryPoint {
    date: string;
    marketPrice: number | null;
    midPrice: number | null;
    lowPrice: number | null;
}

export interface PriceHistoryResponse {
    productId: number;
    history: PriceHistoryPoint[];
}

export interface PriceComparisonPeriod {
    price: number;
    pctChange: number;
}

export interface PriceExtremePoint {
    price: number;
    date: string | null;
}

export interface PriceComparisonsResponse {
    productId: number;
    subTypeName: string;
    currentPrice: number | null;
    thirtyDaysAgo: PriceComparisonPeriod | null;
    ninetyDaysAgo: PriceComparisonPeriod | null;
    oneYearAgo: PriceComparisonPeriod | null;
    allTimeLow: PriceExtremePoint | null;
    allTimeHigh: PriceExtremePoint | null;
}

export interface WatchlistSummary {
    id: number;
    name: string;
    itemCount: number;
    createdAt: string;
}

export interface SavedFilterItem {
    id: number;
    name: string;
    filterJson: string;
    createdAt: string;
}
