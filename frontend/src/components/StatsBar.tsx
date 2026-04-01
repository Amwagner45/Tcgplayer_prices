import { Box, Paper, Typography } from "@mui/material";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import InventoryIcon from "@mui/icons-material/Inventory";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { useStats } from "../hooks/useProducts";

interface Props {
    categoryId?: number;
}

function StatCard({
    icon,
    label,
    value,
    gradient,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    gradient: string;
}) {
    return (
        <Paper
            sx={{
                p: 2.5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                flex: 1,
                minWidth: 180,
                display: "flex",
                alignItems: "center",
                gap: 2,
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                },
            }}
        >
            <Box
                sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: gradient,
                    color: "#fff",
                    flexShrink: 0,
                }}
            >
                {icon}
            </Box>
            <Box>
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: "0.75rem", fontWeight: 500 }}
                >
                    {label}
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.2 }}>
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
        stats?.categories
            .map((c) => `${c.displayName}: ${c.totalCards.toLocaleString()}`)
            .join("  ·  ") ?? "";

    return (
        <Box sx={{ mb: 3 }}>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1 }}>
                <StatCard
                    icon={<InventoryIcon />}
                    label="Total Cards"
                    value={totalCards.toLocaleString()}
                    gradient="linear-gradient(135deg, #2962ff, #768fff)"
                />
                <StatCard
                    icon={<TrendingDownIcon />}
                    label="Deals (>20% below mid)"
                    value={(stats?.bigDeals ?? 0).toLocaleString()}
                    gradient="linear-gradient(135deg, #00c853, #69f0ae)"
                />
                <StatCard
                    icon={<SportsEsportsIcon />}
                    label="Games Tracked"
                    value={stats?.categories.length ?? 0}
                    gradient="linear-gradient(135deg, #ff9100, #ffca28)"
                />
            </Box>
            {gameBreakdown && (
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: "0.7rem" }}
                >
                    {gameBreakdown}
                </Typography>
            )}
        </Box>
    );
}
