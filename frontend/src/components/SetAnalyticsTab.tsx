import { useEffect, useMemo, useState } from "react";
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
    LineChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Line,
    BarChart,
    Bar,
} from "recharts";
import { useSetAnalytics, useSetHistory } from "../hooks/useProducts";

interface Props {
    minPrice: number;
    categoryId?: number;
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

export default function SetAnalyticsTab({ minPrice, categoryId, onSelectCard }: Props) {
    const { data, isLoading } = useSetAnalytics(minPrice, 6, 18, categoryId);
    const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
    const { data: setHistory } = useSetHistory(selectedSetId, minPrice, 12);

    useEffect(() => {
        if (!selectedSetId && data?.sets.length) {
            setSelectedSetId(data.sets[0].groupId);
        }
    }, [data, selectedSetId]);

    const featuredSeries = useMemo(() => {
        const source = data?.featuredHistory ?? [];
        const grouped = new Map<string, Record<string, string | number | null>>();
        for (const point of source) {
            const entry = grouped.get(point.month) ?? { month: point.month };
            entry[point.groupName] = point.averageMonthlyReturn;
            grouped.set(point.month, entry);
        }
        return Array.from(grouped.values());
    }, [data]);

    if (isLoading) {
        return (
            <Paper sx={{ p: 4, border: "1px solid", borderColor: "divider", textAlign: "center" }}>
                <CircularProgress size={28} />
            </Paper>
        );
    }

    return (
        <Box sx={{ display: "grid", gap: 3 }}>
            <Paper sx={{ p: 2.5, border: "1px solid", borderColor: "divider" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, mb: 2 }}>
                    <Box>
                        <Typography variant="h6">Set Rotation Board</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Compare sets by premium-card breadth, opportunity density, and month-over-month strength.
                        </Typography>
                    </Box>
                    <Chip label={`${data?.setCount ?? 0} tracked sets`} color="primary" />
                </Box>
                <Box sx={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={featuredSeries}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            {(data?.sets ?? []).slice(0, 5).map((set, index) => (
                                <Line
                                    key={set.groupId}
                                    type="monotone"
                                    dataKey={set.groupName}
                                    stroke={["#0f6cbd", "#34d399", "#f59e0b", "#f43f5e", "#8b5cf6"][index]}
                                    strokeWidth={2.5}
                                    dot={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            </Paper>

            <Box
                sx={{
                    display: "grid",
                    gap: 3,
                    gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1.2fr) minmax(0, 0.8fr)" },
                }}
            >
                <Paper sx={{ p: 2.5, border: "1px solid", borderColor: "divider" }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Ranked Sets
                    </Typography>
                    <Stack spacing={1.25}>
                        {(data?.sets ?? []).map((set) => (
                            <Paper
                                key={set.groupId}
                                onClick={() => setSelectedSetId(set.groupId)}
                                sx={{
                                    p: 1.75,
                                    border: "1px solid",
                                    borderColor:
                                        selectedSetId === set.groupId ? "primary.main" : "divider",
                                    cursor: "pointer",
                                }}
                            >
                                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="body1" fontWeight={700} noWrap>
                                            {set.groupName}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" noWrap>
                                            {set.categoryName}
                                            {set.publishedOn ? ` · ${set.publishedOn}` : ""}
                                        </Typography>
                                    </Box>
                                    <Chip label={`${set.trackedCards} cards`} size="small" />
                                </Box>
                                <Box
                                    sx={{
                                        display: "grid",
                                        gap: 1,
                                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                                        mt: 1.5,
                                    }}
                                >
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Avg 30d
                                        </Typography>
                                        <Typography variant="body2" fontWeight={700}>
                                            {formatPercent(set.avg30dChange)}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Avg Opp Score
                                        </Typography>
                                        <Typography variant="body2" fontWeight={700}>
                                            {set.avgOpportunityScore?.toFixed(1) ?? "--"}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Avg Price
                                        </Typography>
                                        <Typography variant="body2" fontWeight={700}>
                                            {formatPrice(set.avgMarketPrice)}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Paper>
                        ))}
                    </Stack>
                </Paper>

                <Paper sx={{ p: 2.5, border: "1px solid", borderColor: "divider" }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {setHistory?.groupName ?? "Select a set"}
                    </Typography>
                    {setHistory && setHistory.history.length > 0 ? (
                        <>
                            <Box sx={{ height: 220, mb: 2.5 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={setHistory.history}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="averageMonthlyReturn" fill="#34d399" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Highest-conviction cards in set
                            </Typography>
                            <Stack spacing={1}>
                                {setHistory.cards.slice(0, 6).map((card) => (
                                    <Paper
                                        key={`${card.productId}-${card.subTypeName}`}
                                        onClick={() => onSelectCard(card.productId)}
                                        sx={{ p: 1.25, border: "1px solid", borderColor: "divider", cursor: "pointer" }}
                                    >
                                        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1.5 }}>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={700} noWrap>
                                                    {card.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {card.subTypeName} · {card.rarity ?? "No rarity"}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: "right" }}>
                                                <Typography variant="body2" fontWeight={700}>
                                                    {formatPrice(card.marketPrice)}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Score {card.opportunityScore?.toFixed(1) ?? "--"}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                ))}
                            </Stack>
                        </>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            No set-level history is available for the current scope.
                        </Typography>
                    )}
                </Paper>
            </Box>
        </Box>
    );
}