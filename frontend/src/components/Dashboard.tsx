import { useState, useCallback } from "react";
import { Box, Typography, Tabs, Tab, Container } from "@mui/material";
import ViewListIcon from "@mui/icons-material/ViewList";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import FilterPanel from "./FilterPanel";
import StatsBar from "./StatsBar";
import CardTable from "./CardTable";
import CardDetailModal from "./CardDetailModal";
import OpportunitiesPanel from "./OpportunitiesPanel";
import WatchlistView from "./WatchlistView";
import { STATIC_MODE } from "../services/api";
import type { ProductFilters } from "../types";

const DEFAULT_FILTERS: ProductFilters = {
    sortBy: "pct_below_mid",
    sortDir: "desc",
    page: 1,
    pageSize: 50,
};

export default function Dashboard() {
    const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
    const [selectedCard, setSelectedCard] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState(STATIC_MODE ? 1 : 0);

    const handleFilterChange = useCallback(
        (partial: Partial<ProductFilters>) => {
            setFilters((prev) => ({ ...prev, ...partial }));
        },
        []
    );

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
            {/* Dark Header */}
            <Box
                sx={{
                    background:
                        "linear-gradient(135deg, #0f1923 0%, #1a2a3a 50%, #162029 100%)",
                    color: "white",
                    px: { xs: 2, md: 4 },
                    pt: 2.5,
                    pb: 0,
                }}
            >
                <Container maxWidth="xl" disableGutters>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            mb: 2,
                        }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Box
                                sx={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 2,
                                    background:
                                        "linear-gradient(135deg, #2962ff, #00bfa5)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 900,
                                    fontSize: "1.1rem",
                                }}
                            >
                                T
                            </Box>
                            <Box>
                                <Typography
                                    variant="h5"
                                    fontWeight={800}
                                    sx={{ lineHeight: 1.2 }}
                                >
                                    TCG Tracker
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ opacity: 0.5, fontSize: "0.7rem" }}
                                >
                                    Pokemon · Flesh and Blood · One Piece · Riftbound
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    <Tabs
                        value={activeTab}
                        onChange={(_, v) => setActiveTab(v)}
                        sx={{
                            "& .MuiTabs-indicator": {
                                backgroundColor: "#2962ff",
                                height: 3,
                                borderRadius: "3px 3px 0 0",
                            },
                            "& .MuiTab-root": {
                                color: "rgba(255,255,255,0.5)",
                                minHeight: 48,
                                "&.Mui-selected": { color: "#fff" },
                            },
                        }}
                    >
                        {!STATIC_MODE && (
                            <Tab
                                icon={<ViewListIcon />}
                                iconPosition="start"
                                label="Browse"
                                value={0}
                            />
                        )}
                        <Tab
                            icon={<WhatshotIcon />}
                            iconPosition="start"
                            label="Opportunities"
                            value={1}
                        />
                        {!STATIC_MODE && (
                            <Tab
                                icon={<PlaylistPlayIcon />}
                                iconPosition="start"
                                label="Watchlists"
                                value={2}
                            />
                        )}
                    </Tabs>
                </Container>
            </Box>

            {/* Content */}
            <Container maxWidth="xl" sx={{ py: 3 }}>
                <StatsBar categoryId={filters.categoryId} />

                {activeTab === 0 && (
                    <Box
                        sx={{
                            display: "flex",
                            gap: 3,
                            flexDirection: { xs: "column", md: "row" },
                        }}
                    >
                        <Box sx={{ width: { xs: "100%", md: 300 }, flexShrink: 0 }}>
                            <FilterPanel
                                filters={filters}
                                onChange={handleFilterChange}
                            />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <CardTable
                                filters={filters}
                                onChange={handleFilterChange}
                                onSelectCard={setSelectedCard}
                            />
                        </Box>
                    </Box>
                )}

                {activeTab === 1 && (
                    <OpportunitiesPanel onSelectCard={setSelectedCard} />
                )}

                {activeTab === 2 && (
                    <WatchlistView onSelectCard={setSelectedCard} />
                )}
            </Container>

            <CardDetailModal
                productId={selectedCard}
                onClose={() => setSelectedCard(null)}
            />
        </Box>
    );
}
