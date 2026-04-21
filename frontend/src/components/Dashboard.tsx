import { Suspense, lazy, useCallback, useState } from "react";
import {
    Box,
    Button,
    Chip,
    Container,
    Paper,
    Tab,
    Tabs,
    Typography,
    type PaletteMode,
} from "@mui/material";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import QueryStatsOutlinedIcon from "@mui/icons-material/QueryStatsOutlined";
import CandlestickChartOutlinedIcon from "@mui/icons-material/CandlestickChartOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import { STATIC_MODE } from "../services/api";
import { useFetchPrices } from "../hooks/useFetchPrices";
import { useFilters } from "../hooks/useProducts";
import type { ProductFilters } from "../types";
import FilterPanel from "./FilterPanel";

const MarketOverviewTab = lazy(() => import("./MarketOverviewTab"));
const MonthlyIntelTab = lazy(() => import("./MonthlyIntelTab"));
const SetAnalyticsTab = lazy(() => import("./SetAnalyticsTab"));
const LeaderboardTab = lazy(() => import("./LeaderboardTab"));
const WatchlistView = lazy(() => import("./WatchlistView"));
const CardDetailModal = lazy(() => import("./SafeCardDetailModal"));
const FetchStatusModal = lazy(() => import("./FetchStatusModal"));

const DEFAULT_FILTERS: ProductFilters = {
    sortBy: "pct_below_mid",
    sortDir: "desc",
    releaseYearStart: 2013,
    page: 1,
    pageSize: 50,
};

function getEraScopeLabel(filters: ProductFilters): string {
    if (filters.releaseYearStart === 2013 && filters.releaseYearEnd === undefined) {
        return "Mid + Modern (2013+)";
    }
    if (filters.releaseYearStart === 2019 && filters.releaseYearEnd === undefined) {
        return "Modern (2019+)";
    }
    if (filters.releaseYearStart === 2013 && filters.releaseYearEnd === 2018) {
        return "Mid Era (2013-2018)";
    }
    if (filters.releaseYearStart !== undefined && filters.releaseYearEnd !== undefined) {
        return `${filters.releaseYearStart}-${filters.releaseYearEnd}`;
    }
    if (filters.releaseYearStart !== undefined) {
        return `${filters.releaseYearStart}+`;
    }
    if (filters.releaseYearEnd !== undefined) {
        return `Up to ${filters.releaseYearEnd}`;
    }
    return "All Eras";
}

interface Props {
    mode: PaletteMode;
    onToggleMode: () => void;
}

export default function Dashboard({ mode, onToggleMode }: Props) {
    const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
    const [selectedCard, setSelectedCard] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState("market");
    const [analyticsMinPrice, setAnalyticsMinPrice] = useState(50);
    const [fetchModalOpen, setFetchModalOpen] = useState(false);
    const { data: filterOptions } = useFilters();
    const { status, isLoading, startFetch, stopFetch, resetStatus } =
        useFetchPrices();

    const handleFilterChange = useCallback(
        (partial: Partial<ProductFilters>) => {
            setFilters((prev) => ({ ...prev, ...partial }));
        },
        []
    );

    const handleOpenFetchModal = useCallback(() => {
        resetStatus();
        setFetchModalOpen(true);
        // Automatically start the fetch
        startFetch();
    }, [startFetch, resetStatus]);

    const handleCloseFetchModal = useCallback(() => {
        setFetchModalOpen(false);
    }, []);

    const loadingPanel = (
        <Paper sx={{ p: 4, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="body2" color="text.secondary">
                Loading view...
            </Typography>
        </Paper>
    );

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
            <Box
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    backdropFilter: "blur(18px)",
                    px: { xs: 2, md: 4 },
                    pt: 2,
                    pb: 2,
                }}
            >
                <Container maxWidth="xl" disableGutters>
                    <Paper
                        sx={{
                            p: { xs: 2, md: 2.5 },
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "background.paper",
                            overflow: "hidden",
                        }}
                    >
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 2,
                                flexWrap: "wrap",
                                mb: 2,
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                <Box
                                    sx={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 3,
                                        background:
                                            mode === "dark"
                                                ? "linear-gradient(135deg, #38bdf8, #34d399)"
                                                : "linear-gradient(135deg, #0f6cbd, #0f9d76)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 900,
                                        fontSize: "1.2rem",
                                        color: "#fff",
                                        boxShadow: "0 20px 40px rgba(15, 108, 189, 0.18)",
                                    }}
                                >
                                    T
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ lineHeight: 1.05 }}>
                                        TCG Trading Desk
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Financial-dashboard style intelligence for trading cards, with premium-value analysis floored by your adjustable market-price threshold.
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
                                <Button
                                    variant="outlined"
                                    startIcon={mode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
                                    onClick={onToggleMode}
                                >
                                    {mode === "dark" ? "Light theme" : "Dark theme"}
                                </Button>
                                {!STATIC_MODE && (
                                    <Button
                                        variant="contained"
                                        startIcon={<CloudDownloadIcon />}
                                        onClick={handleOpenFetchModal}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? "Fetching..." : "Fetch Prices"}
                                    </Button>
                                )}
                            </Box>
                        </Box>

                        <Box
                            sx={{
                                display: "grid",
                                gap: 1,
                                alignItems: "center",
                                mb: 2,
                            }}
                        >
                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                <Chip label={`Floor applies to monthly, set, and leaderboard analytics`} />
                                <Chip label={`Era scope: ${getEraScopeLabel(filters)}`} color="secondary" variant="outlined" />
                                {filters.categoryId && filterOptions?.categories ? (
                                    <Chip
                                        color="primary"
                                        label={`Scoped to ${filterOptions.categories.find((item) => item.categoryId === filters.categoryId)?.displayName ?? "selected game"}`}
                                    />
                                ) : (
                                    <Chip label="Cross-game market scope" />
                                )}
                            </Box>
                        </Box>

                        <Tabs
                            value={activeTab}
                            onChange={(_, value) => setActiveTab(value)}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                minHeight: 48,
                                "& .MuiTabs-indicator": {
                                    height: 4,
                                    borderRadius: 999,
                                },
                            }}
                        >
                            <Tab icon={<DashboardOutlinedIcon />} iconPosition="start" label="Market" value="market" />
                            <Tab icon={<QueryStatsOutlinedIcon />} iconPosition="start" label="Monthly Intel" value="monthly" />
                            <Tab icon={<CandlestickChartOutlinedIcon />} iconPosition="start" label="Set Analytics" value="sets" />
                            <Tab icon={<EmojiEventsOutlinedIcon />} iconPosition="start" label="Leaderboard" value="leaderboard" />
                            {!STATIC_MODE && (
                                <Tab icon={<PlaylistPlayIcon />} iconPosition="start" label="Watchlists" value="watchlists" />
                            )}
                        </Tabs>
                    </Paper>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ py: 3 }}>
                <Box sx={{ mb: 3 }}>
                    <FilterPanel
                        filters={filters}
                        onChange={handleFilterChange}
                        analyticsMinPrice={analyticsMinPrice}
                        onAnalyticsMinPriceChange={setAnalyticsMinPrice}
                    />
                </Box>
                <Suspense fallback={loadingPanel}>
                    {activeTab === "market" && (
                        <MarketOverviewTab
                            filters={filters}
                            onChange={handleFilterChange}
                            onSelectCard={setSelectedCard}
                        />
                    )}

                    {activeTab === "monthly" && (
                        <MonthlyIntelTab
                            minPrice={analyticsMinPrice}
                            categoryId={filters.categoryId}
                            groupIds={filters.groupIds}
                            rarities={filters.rarities}
                            subTypes={filters.subTypes}
                            releaseYearStart={filters.releaseYearStart}
                            releaseYearEnd={filters.releaseYearEnd}
                            onSelectCard={setSelectedCard}
                        />
                    )}

                    {activeTab === "sets" && (
                        <SetAnalyticsTab
                            minPrice={analyticsMinPrice}
                            categoryId={filters.categoryId}
                            groupIds={filters.groupIds}
                            rarities={filters.rarities}
                            subTypes={filters.subTypes}
                            releaseYearStart={filters.releaseYearStart}
                            releaseYearEnd={filters.releaseYearEnd}
                            onSelectCard={setSelectedCard}
                        />
                    )}

                    {activeTab === "leaderboard" && (
                        <LeaderboardTab
                            minPrice={analyticsMinPrice}
                            categoryId={filters.categoryId}
                            groupIds={filters.groupIds}
                            rarities={filters.rarities}
                            subTypes={filters.subTypes}
                            releaseYearStart={filters.releaseYearStart}
                            releaseYearEnd={filters.releaseYearEnd}
                            onSelectCard={setSelectedCard}
                        />
                    )}

                    {activeTab === "watchlists" && !STATIC_MODE && (
                        <WatchlistView onSelectCard={setSelectedCard} />
                    )}
                </Suspense>
            </Container>

            <Suspense fallback={null}>
                {selectedCard !== null && (
                    <CardDetailModal
                        productId={selectedCard}
                        onClose={() => setSelectedCard(null)}
                    />
                )}

                {fetchModalOpen && (
                    <FetchStatusModal
                        open={fetchModalOpen}
                        status={status.status}
                        progress={status.progress}
                        output={status.output}
                        error={status.error}
                        onClose={handleCloseFetchModal}
                        onStop={stopFetch}
                    />
                )}
            </Suspense>
        </Box>
    );
}
