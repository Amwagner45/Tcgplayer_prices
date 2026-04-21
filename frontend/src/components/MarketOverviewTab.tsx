import { Box, Chip, Paper, Typography } from "@mui/material";
import StatsBar from "./StatsBar";
import CardTable from "./CardTable";
import OpportunitiesPanel from "./OpportunitiesPanel";
import type { ProductFilters } from "../types";

interface Props {
    filters: ProductFilters;
    onChange: (filters: Partial<ProductFilters>) => void;
    onSelectCard: (productId: number) => void;
}

export default function MarketOverviewTab({ filters, onChange, onSelectCard }: Props) {
    return (
        <Box sx={{ display: "grid", gap: 3 }}>
            <StatsBar categoryId={filters.categoryId} />

            <Box
                sx={{
                    display: "grid",
                    gap: 3,
                    gridTemplateColumns: { xs: "1fr", xl: "320px minmax(0, 1fr)" },
                    alignItems: "start",
                }}
            >
                <Box sx={{ display: "grid", gap: 3 }}>
                    <Paper
                        sx={{
                            p: 2.5,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "background.paper",
                        }}
                    >
                        <Chip label="Desk Notes" color="primary" size="small" sx={{ mb: 1.5 }} />
                        <Typography variant="h6" sx={{ mb: 1 }}>
                            Scanner tuned for higher-signal pricing.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Use the filter stack to tighten game, set, rarity, and watchlist scope. Open any card to launch the chart workbench with indicator toggles, drawing tools, and point-to-point measurement.
                        </Typography>
                    </Paper>
                </Box>

                <Box sx={{ display: "grid", gap: 3, minWidth: 0 }}>
                    <OpportunitiesPanel filters={filters} onSelectCard={onSelectCard} />
                    <CardTable
                        filters={filters}
                        onChange={onChange}
                        onSelectCard={onSelectCard}
                    />
                </Box>
            </Box>
        </Box>
    );
}