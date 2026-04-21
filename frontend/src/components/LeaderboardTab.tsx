import { useEffect, useState } from "react";
import {
    Box,
    Button,
    ButtonGroup,
    Chip,
    CircularProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import NorthIcon from "@mui/icons-material/North";
import SouthIcon from "@mui/icons-material/South";
import {
    ResponsiveContainer,
    LineChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Line,
} from "recharts";
import { useLeaderboard } from "../hooks/useProducts";
import type { LeaderboardRow } from "../types";

interface Props {
    minPrice: number;
    categoryId?: number;
    onSelectCard: (productId: number) => void;
}

const METRICS = [
    { key: "composite", label: "Composite" },
    { key: "30d", label: "30D" },
    { key: "90d", label: "90D" },
    { key: "1yr", label: "1Y" },
    { key: "opportunity", label: "Opportunity" },
] as const;

function formatPercent(value: number | null | undefined) {
    if (value === null || value === undefined) return "--";
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function rankDeltaChip(value: number | null) {
    if (value === null || value === undefined) {
        return <Chip label="--" size="small" variant="outlined" />;
    }
    if (value > 0) {
        return <Chip icon={<NorthIcon />} label={`+${value}`} size="small" color="success" />;
    }
    if (value < 0) {
        return <Chip icon={<SouthIcon />} label={`${value}`} size="small" color="error" />;
    }
    return <Chip icon={<TrendingFlatIcon />} label="0" size="small" />;
}

export default function LeaderboardTab({ minPrice, categoryId, onSelectCard }: Props) {
    const [metric, setMetric] = useState("composite");
    const { data, isLoading } = useLeaderboard(minPrice, 6, 40, metric, categoryId);
    const [selectedRow, setSelectedRow] = useState<LeaderboardRow | null>(null);

    useEffect(() => {
        if (!selectedRow && data?.rows.length) {
            setSelectedRow(data.rows[0]);
        }
    }, [data, selectedRow]);

    useEffect(() => {
        if (data?.rows.length) {
            const nextSelected = data.rows.find(
                (row) => row.productId === selectedRow?.productId && row.subTypeName === selectedRow?.subTypeName
            );
            setSelectedRow(nextSelected ?? data.rows[0]);
        }
    }, [data, selectedRow?.productId, selectedRow?.subTypeName]);

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
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2 }}>
                    <Box>
                        <Typography variant="h6">Leaderboard</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Premium cards only. Current ranking uses the selected metric, while the trend chart tracks monthly leaderboard position through time.
                        </Typography>
                    </Box>
                    <ButtonGroup size="small" variant="outlined">
                        {METRICS.map((item) => (
                            <Button
                                key={item.key}
                                variant={metric === item.key ? "contained" : "outlined"}
                                onClick={() => setMetric(item.key)}
                            >
                                {item.label}
                            </Button>
                        ))}
                    </ButtonGroup>
                </Box>

                <Box
                    sx={{
                        display: "grid",
                        gap: 3,
                        gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1.4fr) minmax(320px, 0.6fr)" },
                    }}
                >
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Rank</TableCell>
                                    <TableCell>Card</TableCell>
                                    <TableCell align="right">30D</TableCell>
                                    <TableCell align="right">90D</TableCell>
                                    <TableCell align="right">1Y</TableCell>
                                    <TableCell align="right">Opp.</TableCell>
                                    <TableCell align="center">Monthly Shift</TableCell>
                                    <TableCell align="right">List Count</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(data?.rows ?? []).map((row) => (
                                    <TableRow
                                        key={`${row.productId}-${row.subTypeName}`}
                                        hover
                                        selected={
                                            row.productId === selectedRow?.productId &&
                                            row.subTypeName === selectedRow?.subTypeName
                                        }
                                        onClick={() => setSelectedRow(row)}
                                        sx={{ cursor: "pointer" }}
                                    >
                                        <TableCell sx={{ fontWeight: 700 }}>
                                            #{row.currentRank ?? "--"}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={700} noWrap>
                                                    {row.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    {row.groupName} · {row.subTypeName}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">{formatPercent(row.pctChange30d)}</TableCell>
                                        <TableCell align="right">{formatPercent(row.pctChange90d)}</TableCell>
                                        <TableCell align="right">{formatPercent(row.pctChange1yr)}</TableCell>
                                        <TableCell align="right">{row.opportunityScore?.toFixed(1) ?? "--"}</TableCell>
                                        <TableCell align="center">{rankDeltaChip(row.rankDelta)}</TableCell>
                                        <TableCell align="right">{row.appearanceCount}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Paper sx={{ p: 2, border: "1px solid", borderColor: "divider" }}>
                        {selectedRow ? (
                            <>
                                <Typography variant="h6" noWrap>
                                    {selectedRow.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {selectedRow.groupName} · {selectedRow.subTypeName} · {data?.latestMonth ?? "No month"}
                                </Typography>
                                <Box sx={{ height: 220, mb: 2 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={selectedRow.rankHistory}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                            <XAxis dataKey="month" />
                                            <YAxis reversed allowDecimals={false} domain={["dataMin", "dataMax"]} />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="rank" stroke="#0f6cbd" strokeWidth={3} dot={{ r: 3 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </Box>
                                <Box sx={{ display: "grid", gap: 1, mb: 2 }}>
                                    <Typography variant="body2">30D rank: #{selectedRow.rank30d ?? "--"}</Typography>
                                    <Typography variant="body2">90D rank: #{selectedRow.rank90d ?? "--"}</Typography>
                                    <Typography variant="body2">1Y rank: #{selectedRow.rank1yr ?? "--"}</Typography>
                                    <Typography variant="body2">Opportunity rank: #{selectedRow.rankOpportunity ?? "--"}</Typography>
                                </Box>
                                <Button variant="contained" onClick={() => onSelectCard(selectedRow.productId)} fullWidth>
                                    Open chart workbench
                                </Button>
                            </>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                No leaderboard rows match the current filters.
                            </Typography>
                        )}
                    </Paper>
                </Box>
            </Paper>
        </Box>
    );
}