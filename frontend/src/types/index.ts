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
    publishedOn?: string | null;
    releaseYear?: number | null;
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
    potentialGain: number | null;
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    macd: number | null;
    macdSignal: number | null;
    macdHistogram: number | null;
    priceVsSma20Pct: number | null;
    priceVsSma50Pct: number | null;
    priceVsSma200Pct: number | null;
    smaTrend: string | null;
    macdTrend: string | null;
    opportunityScore: number | null;
    buySignal: string | null;
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
    groups: {
        groupId: number;
        name: string;
        publishedOn?: string | null;
        releaseYear?: number | null;
    }[];
    subTypes: string[];
    releaseYears: number[];
}

export interface ProductFilters {
    categoryId?: number;
    groupIds?: number[];
    releaseYearStart?: number;
    releaseYearEnd?: number;
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
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    macd: number | null;
    macdSignal: number | null;
    macdHistogram: number | null;
}

export interface TechnicalSnapshot {
    marketPrice: number | null;
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    macd: number | null;
    macdSignal: number | null;
    macdHistogram: number | null;
    priceVsSma20Pct: number | null;
    priceVsSma50Pct: number | null;
    priceVsSma200Pct: number | null;
    smaTrend: string | null;
    macdTrend: string | null;
}

export interface PriceHistoryResponse {
    productId: number;
    history: PriceHistoryPoint[];
    snapshot: TechnicalSnapshot;
}

export interface MonthlyAnalyticsCard {
    productId: number;
    subTypeName: string;
    name: string;
    imageUrl: string | null;
    rarity: string | null;
    cardNumber: string | null;
    url: string | null;
    categoryId: number;
    categoryName: string;
    groupId: number;
    groupName: string;
    publishedOn?: string | null;
    releaseYear?: number | null;
    month: string;
    monthStartPrice: number | null;
    monthEndPrice: number | null;
    monthLowPrice: number | null;
    monthHighPrice: number | null;
    monthlyReturnPct: number | null;
    monthlyRangePosition: number | null;
    reboundPotentialPct: number | null;
    monthlyOpportunityScore: number | null;
    observations: number;
    appearanceCount?: number;
    performerAppearances?: number;
    opportunityAppearances?: number;
    totalAppearances?: number;
}

export interface MonthlyHighlight {
    month: string;
    qualifiedCards: number;
    averageMonthlyReturn: number | null;
    topPerformerName: string | null;
    topPerformerReturn: number | null;
    topOpportunityName: string | null;
    topOpportunityScore: number | null;
}

export interface MonthlyAnalyticsResponse {
    minPriceApplied: number;
    latestMonth: string | null;
    qualifiedCards: number;
    topPerformers: MonthlyAnalyticsCard[];
    topOpportunities: MonthlyAnalyticsCard[];
    recurringCards: MonthlyAnalyticsCard[];
    monthHighlights: MonthlyHighlight[];
}

export interface SetBestCardSummary {
    productId: number;
    name: string;
    pctChange30d?: number | null;
    opportunityScore?: number | null;
}

export interface SetAnalyticsSummary {
    groupId: number;
    groupName: string;
    categoryId: number;
    categoryName: string;
    publishedOn: string | null;
    releaseYear?: number | null;
    trackedCards: number;
    avgMarketPrice: number | null;
    avg30dChange: number | null;
    avg90dChange: number | null;
    avgOpportunityScore: number | null;
    opportunityCount: number;
    bestPerformer: SetBestCardSummary | null;
    bestOpportunity: SetBestCardSummary | null;
}

export interface SetAnalyticsHistoryPoint {
    groupId: number;
    groupName: string;
    month: string;
    qualifiedCards: number;
    averageMonthlyReturn: number | null;
    averageMonthEndPrice: number | null;
    opportunityCards: number;
}

export interface SetAnalyticsResponse {
    minPriceApplied: number;
    setCount: number;
    sets: SetAnalyticsSummary[];
    featuredHistory: SetAnalyticsHistoryPoint[];
}

export interface SetDetailHistoryPoint {
    month: string;
    qualifiedCards: number;
    averageMonthlyReturn: number | null;
    averageMonthEndPrice: number | null;
    opportunityCards: number;
    leaderCardName: string | null;
    leaderCardReturn: number | null;
}

export interface SetDetailResponse {
    groupId: number;
    groupName: string | null;
    categoryName?: string | null;
    minPriceApplied: number;
    history: SetDetailHistoryPoint[];
    cards: ProductItem[];
}

export interface LeaderboardHistoryPoint {
    month: string;
    rank: number | null;
    monthlyReturnPct: number | null;
}

export interface LeaderboardRow extends ProductItem {
    compositeScore: number;
    currentRank: number | null;
    rank30d: number | null;
    rank90d: number | null;
    rank1yr: number | null;
    rankOpportunity: number | null;
    latestMonthlyRank: number | null;
    previousMonthlyRank: number | null;
    rankDelta: number | null;
    appearanceCount: number;
    rankHistory: LeaderboardHistoryPoint[];
    publishedOn?: string | null;
}

export interface LeaderboardResponse {
    metric: string;
    minPriceApplied: number;
    latestMonth: string | null;
    rows: LeaderboardRow[];
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
