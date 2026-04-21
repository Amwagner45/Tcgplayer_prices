import {
    Box,
    Chip,
    CircularProgress,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import {
    ResponsiveContainer,
    ComposedChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Bar,
    Line,
} from "recharts";
import { useMonthlyAnalytics } from "../hooks/useProducts";
import type { MonthlyAnalyticsCard } from "../types";

interface Props {
    minPrice: number;
    categoryId?: number;
    groupIds?: number[];
    rarities?: string[];
    subTypes?: string[];
    releaseYearStart?: number;
    releaseYearEnd?: number;
    onSelectCard: (productId: number) => void;
}

function formatPercent(value: number | null | undefined) {
    if (value === null || value === undefined) return "--";
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatPrice(value: number | null | undefined) {
    if (value === null || value === undefined) return "--";
    return `$${value.toFixed(2)}`;
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
    return (
        <Paper sx={{ p: 2.5, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="body2" color="text.secondary">
                {label}
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.5 }}>
                {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
                {note}
            </Typography>
        </Paper>
    );
}

function SignalList({
    title,
    items,
    valueKey,
    onSelectCard,
}: {
    title: string;
    items: MonthlyAnalyticsCard[];
    valueKey: "monthlyReturnPct" | "monthlyOpportunityScore" | "totalAppearances";
    onSelectCard: (productId: number) => void;
}) {
    return (
        <Paper sx={{ p: 2.5, border: "1px solid", borderColor: "divider", height: "100%" }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
                {title}
            </Typography>
            <Stack spacing={1.25}>
                {items.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                        No qualifying cards for the current scope.
                    </Typography>
                )}
                {items.map((item, index) => {
                    const score = item[valueKey];
                    const appearances = item.appearanceCount;
                    return (
                        <Paper
                            key={`${item.productId}-${item.subTypeName}`}
                            onClick={() => onSelectCard(item.productId)}
                            sx={{
                                p: 1.5,
                                border: "1px solid",
                                borderColor: "divider",
                                cursor: "pointer",
                                transition: "transform 0.2s ease, border-color 0.2s ease",
                                "&:hover": {
                                    transform: "translateY(-2px)",
                                    borderColor: "primary.main",
                                },
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "start", gap: 1.5 }}>
                                <Chip label={`#${index + 1}`} size="small" color="primary" />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" fontWeight={700} noWrap>
                                        {item.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                        {item.groupName}
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: "right" }}>
                                    <Typography variant="body2" fontWeight={700}>
                                        {valueKey === "totalAppearances"
                                            ? `${score ?? 0}x`
                                            : formatPercent(score)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {valueKey === "monthlyOpportunityScore"
                                            ? formatPrice(item.monthEndPrice)
                                            : appearances
                                                ? `${appearances} lists`
                                                : item.month}
                                    </Typography>
                                </Box>
                            </Box>
                        </Paper>
                    );
                })}
            </Stack>
        </Paper>
    );
}

export default function MonthlyIntelTab({
    minPrice,
    categoryId,
    groupIds,
    rarities,
    subTypes,
    releaseYearStart,
    releaseYearEnd,
    onSelectCard,
}: Props) {
    const { data, isLoading } = useMonthlyAnalytics(
        minPrice,
        6,
        8,
        categoryId,
        groupIds,
        rarities,
        subTypes,
        releaseYearStart,
        releaseYearEnd
    );

    if (isLoading) {
        return (
            <Paper sx={{ p: 4, border: "1px solid", borderColor: "divider", textAlign: "center" }}>
                <CircularProgress size={28} />
            </Paper>
        );
    }

    const chartData = data?.monthHighlights ?? [];
    const averageTopReturn =
        chartData.length > 0
            ? chartData.reduce((sum, item) => sum + (item.topPerformerReturn ?? 0), 0) /
            chartData.length
            : 0;

    return (
        <Box sx={{ display: "grid", gap: 3 }}>
            <Box
                sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                        xl: "repeat(4, minmax(0, 1fr))",
                    },
                }}
            >
                <MetricCard
                    label="Analysis Floor"
                    value={`$${minPrice.toFixed(0)}`}
                    note="Default filter for monthly and leaderboard analysis."
                />
                <MetricCard
                    label="Latest Month"
                    value={data?.latestMonth ?? "No data"}
                    note="Most recent completed month in the archive."
                />
                <MetricCard
                    label="Qualified Cards"
                    value={`${data?.qualifiedCards ?? 0}`}
                    note="Cards above the active value floor in the latest month."
                />
                <MetricCard
                    label="Average Top Return"
                    value={formatPercent(averageTopReturn)}
                    note="Average of monthly winner returns across the tracked period."
                />
            </Box>

            <Paper sx={{ p: 2.5, border: "1px solid", borderColor: "divider" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, mb: 2 }}>
                    <Box>
                        <Typography variant="h6">Monthly Signal Tape</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Past-month performance, top opportunity pressure, and qualifying card count for premium-priced cards.
                        </Typography>
                    </Box>
                    <Chip label={`Floor $${data?.minPriceApplied.toFixed(0) ?? minPrice.toFixed(0)}`} />
                </Box>
                <Box sx={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="month" />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip />
                            <Bar yAxisId="right" dataKey="qualifiedCards" fill="#0f6cbd" radius={[8, 8, 0, 0]} />
                            <Line yAxisId="left" type="monotone" dataKey="averageMonthlyReturn" stroke="#34d399" strokeWidth={3} dot={false} />
                            <Line yAxisId="left" type="monotone" dataKey="topPerformerReturn" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </Box>
            </Paper>

            <Box
                sx={{
                    display: "grid",
                    gap: 3,
                    gridTemplateColumns: { xs: "1fr", xl: "repeat(3, minmax(0, 1fr))" },
                }}
            >
                <SignalList
                    title="Best Performing Cards"
                    items={data?.topPerformers ?? []}
                    valueKey="monthlyReturnPct"
                    onSelectCard={onSelectCard}
                />
                <SignalList
                    title="Best Opportunity Setups"
                    items={data?.topOpportunities ?? []}
                    valueKey="monthlyOpportunityScore"
                    onSelectCard={onSelectCard}
                />
                <SignalList
                    title="Recurring Watchlist Names"
                    items={data?.recurringCards ?? []}
                    valueKey="totalAppearances"
                    onSelectCard={onSelectCard}
                />
            </Box>
        </Box>
    );
}