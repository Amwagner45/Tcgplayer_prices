import { Box, Paper, Typography } from "@mui/material";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import InventoryIcon from "@mui/icons-material/Inventory";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { useStats } from "../hooks/useProducts";

interface Props {
    categoryId?: number;
}

function StatCard({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
}) {
    return (
        <Paper
            elevation={0}
            sx={{
                p: 2,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                flex: 1,
                minWidth: 160,
                display: "flex",
                alignItems: "center",
                gap: 2,
            }}
        >
            <Box
                sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: `${color}15`,
                    color: color,
                }}
            >
                {icon}
            </Box>
            <Box>
                <Typography variant="body2" color="text.secondary">
                    {label}
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                    {value}
                </Typography>
            </Box>
        </Paper>
    );
}

export default function StatsBar({ categoryId }: Props) {
    const { data: stats } = useStats(categoryId);

    const totalCards =
        stats?.categories.reduce((sum, c) => sum + c.totalCards, 0) ?? 0;

    const gameBreakdown =
        stats?.categories.map((c) => `${c.displayName}: ${c.totalCards.toLocaleString()}`).join(" | ") ?? "";

    return (
        <Box sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1 }}>
                <StatCard
                    icon={<InventoryIcon />}
                    label="Total Cards"
                    value={totalCards.toLocaleString()}
                    color="#2196f3"
                />
                <StatCard
                    icon={<TrendingDownIcon />}
                    label="Deals (>20% below mid)"
                    value={(stats?.bigDeals ?? 0).toLocaleString()}
                    color="#4caf50"
                />
                <StatCard
                    icon={<LocalOfferIcon />}
                    label="Games Tracked"
                    value={stats?.categories.length ?? 0}
                    color="#ff9800"
                />
            </Box>
            {gameBreakdown && (
                <Typography variant="caption" color="text.secondary">
                    {gameBreakdown}
                </Typography>
            )}
        </Box>
    );
}
