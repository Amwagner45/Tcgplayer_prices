import { useState, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import FilterPanel from "./FilterPanel";
import StatsBar from "./StatsBar";
import CardTable from "./CardTable";
import CardDetailModal from "./CardDetailModal";
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

    const handleFilterChange = useCallback(
        (partial: Partial<ProductFilters>) => {
            setFilters((prev) => ({ ...prev, ...partial }));
        },
        []
    );

    return (
        <Box
            sx={{
                minHeight: "100vh",
                bgcolor: "#f7f8fa",
                px: { xs: 2, md: 4 },
                py: 3,
            }}
        >
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{
                        background: "linear-gradient(135deg, #1976d2 0%, #4caf50 100%)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    TCG Price Dashboard
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Find buying opportunities across Pokemon, Flesh and Blood & One Piece
                </Typography>
            </Box>

            {/* Stats */}
            <StatsBar categoryId={filters.categoryId} />

            {/* Main Layout */}
            <Box
                sx={{
                    display: "flex",
                    gap: 3,
                    flexDirection: { xs: "column", md: "row" },
                }}
            >
                {/* Sidebar */}
                <Box sx={{ width: { xs: "100%", md: 280 }, flexShrink: 0 }}>
                    <FilterPanel filters={filters} onChange={handleFilterChange} />
                </Box>

                {/* Table */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <CardTable
                        filters={filters}
                        onChange={handleFilterChange}
                        onSelectCard={setSelectedCard}
                    />
                </Box>
            </Box>

            {/* Detail Modal */}
            <CardDetailModal
                productId={selectedCard}
                onClose={() => setSelectedCard(null)}
            />
        </Box>
    );
}
