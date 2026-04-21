import { Suspense, lazy, useCallback, useState } from "react";
import {
    Box,
    Button,
    Chip,
    Container,
    FormControl,
    InputAdornment,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Tab,
    Tabs,
    TextField,
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

const MarketOverviewTab = lazy(() => import("./MarketOverviewTab"));
const MonthlyIntelTab = lazy(() => import("./MonthlyIntelTab"));
const SetAnalyticsTab = lazy(() => import("./SetAnalyticsTab"));
const LeaderboardTab = lazy(() => import("./LeaderboardTab"));
const WatchlistView = lazy(() => import("./WatchlistView"));
const CardDetailModal = lazy(() => import("./CardDetailModal"));
const FetchStatusModal = lazy(() => import("./FetchStatusModal"));

const DEFAULT_FILTERS: ProductFilters = {
    sortBy: "pct_below_mid",
    sortDir: "desc",
    page: 1,
    pageSize: 50,
};

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
                                gap: 2,
                                gridTemplateColumns: {
                                    xs: "1fr",
                                    md: "minmax(220px, 260px) minmax(140px, 180px) 1fr",
                                },
                                alignItems: "center",
                                mb: 2,
                            }}
                        >
                            <FormControl size="small" fullWidth>
                                <InputLabel>Game Scope</InputLabel>
                                <Select
                                    value={filters.categoryId ?? ""}
                                    label="Game Scope"
                                    onChange={(event) =>
                                        handleFilterChange({
                                            categoryId: event.target.value
                                                ? Number(event.target.value)
                                                : undefined,
                                            groupIds: undefined,
                                            page: 1,
                                        })
                                    }
                                >
                                    <MenuItem value="">All Games</MenuItem>
                                    {filterOptions?.categories.map((category) => (
                                        <MenuItem key={category.categoryId} value={category.categoryId}>
                                            {category.displayName}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                size="small"
                                label="Analysis Floor"
                                type="number"
                                value={analyticsMinPrice}
                                onChange={(event) => {
                                    const nextValue = Number(event.target.value);
                                    setAnalyticsMinPrice(Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 1);
                                }}
                                slotProps={{
                                    input: {
                                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                    },
                                }}
                            />

                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                <Chip label={`Floor applies to monthly, set, and leaderboard analytics`} />
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
                            onSelectCard={setSelectedCard}
                        />
                    )}

                    {activeTab === "sets" && (
                        <SetAnalyticsTab
                            minPrice={analyticsMinPrice}
                            categoryId={filters.categoryId}
                            onSelectCard={setSelectedCard}
                        />
                    )}

                    {activeTab === "leaderboard" && (
                        <LeaderboardTab
                            minPrice={analyticsMinPrice}
                            categoryId={filters.categoryId}
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
