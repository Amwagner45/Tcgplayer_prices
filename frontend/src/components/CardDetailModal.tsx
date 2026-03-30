import { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Box,
    Typography,
    Chip,
    Table,
    TableBody,
    TableRow,
    TableCell,
    TableHead,
    Link,
    Skeleton,
    ToggleButton,
    ToggleButtonGroup,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";
import { useProduct, usePriceHistory, usePriceComparisons } from "../hooks/useProducts";

interface Props {
    productId: number | null;
    onClose: () => void;
}

function getHighResImage(url: string | null): string {
    if (!url) return "";
    return url.replace("_200w", "_in_1000x1000");
}

function formatPrice(price: number | null): string {
    if (price === null || price === undefined) return "N/A";
    return `$${price.toFixed(2)}`;
}

function getPctColor(pct: number | null): string {
    if (pct === null) return "default";
    if (pct >= 30) return "#4caf50";
    if (pct >= 15) return "#ff9800";
    return "#666";
}

function ComparisonChip({
    label,
    pct,
    oldPrice,
}: {
    label: string;
    pct: number;
    oldPrice: number;
}) {
    const color = pct <= -5 ? "#4caf50" : pct >= 5 ? "#f44336" : "#999";
    const sign = pct > 0 ? "+" : "";
    return (
        <Chip
            label={`${label}: ${sign}${pct.toFixed(1)}% (was $${oldPrice.toFixed(2)})`}
            size="small"
            sx={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color,
                borderColor: color,
            }}
            variant="outlined"
        />
    );
}

export default function CardDetailModal({ productId, onClose }: Props) {
    const { data: product, isLoading } = useProduct(productId);
    const [chartDays, setChartDays] = useState(365);
    const { data: historyData } = usePriceHistory(productId, chartDays);
    const { data: comparisons } = usePriceComparisons(productId);

    return (
        <Dialog
            open={productId !== null}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{ sx: { borderRadius: 3 } }}
        >
            <DialogTitle
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    pb: 1,
                }}
            >
                <Typography variant="h6" fontWeight={700} noWrap sx={{ flex: 1 }}>
                    {product?.name ?? "Loading..."}
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                {isLoading ? (
                    <Box sx={{ display: "flex", gap: 3 }}>
                        <Skeleton variant="rectangular" width={300} height={420} />
                        <Box sx={{ flex: 1 }}>
                            <Skeleton width="60%" height={32} />
                            <Skeleton width="40%" height={24} />
                            <Skeleton width="100%" height={200} sx={{ mt: 2 }} />
                        </Box>
                    </Box>
                ) : product ? (
                    <>
                        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                            {/* Card Image */}
                            <Box sx={{ flexShrink: 0 }}>
                                {product.imageUrl ? (
                                    <img
                                        src={getHighResImage(product.imageUrl)}
                                        alt={product.name}
                                        style={{
                                            width: 300,
                                            borderRadius: 12,
                                            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                                        }}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = product.imageUrl!;
                                        }}
                                    />
                                ) : (
                                    <Box
                                        sx={{
                                            width: 300,
                                            height: 420,
                                            bgcolor: "grey.100",
                                            borderRadius: 3,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Typography color="text.secondary">No Image</Typography>
                                    </Box>
                                )}
                            </Box>

                            {/* Card Details */}
                            <Box sx={{ flex: 1, minWidth: 280 }}>
                                <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
                                    <Chip label={product.categoryName} size="small" color="primary" />
                                    <Chip label={product.groupName} size="small" variant="outlined" />
                                    {product.rarity && (
                                        <Chip label={product.rarity} size="small" variant="outlined" />
                                    )}
                                    {product.cardNumber && (
                                        <Chip
                                            label={`#${product.cardNumber}`}
                                            size="small"
                                            variant="outlined"
                                        />
                                    )}
                                </Box>

                                {product.url && (
                                    <Link
                                        href={product.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mb: 2 }}
                                    >
                                        View on TCGPlayer <OpenInNewIcon fontSize="small" />
                                    </Link>
                                )}

                                <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
                                    Price Variants
                                </Typography>

                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Variant</TableCell>
                                            <TableCell align="right">Market</TableCell>
                                            <TableCell align="right">Mid</TableCell>
                                            <TableCell align="right">Low</TableCell>
                                            <TableCell align="right">% Below Mid</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {product.prices.map((p) => (
                                            <TableRow key={p.subTypeName}>
                                                <TableCell>{p.subTypeName}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                                    {formatPrice(p.marketPrice)}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {formatPrice(p.midPrice)}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {formatPrice(p.lowPrice)}
                                                </TableCell>
                                                <TableCell
                                                    align="right"
                                                    sx={{
                                                        color: getPctColor(p.pctBelowMid),
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    {p.pctBelowMid !== null ? `${p.pctBelowMid}%` : "N/A"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* Price Comparisons */}
                                {comparisons && (
                                    <Box sx={{ mt: 3 }}>
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                                            Price Comparisons
                                        </Typography>
                                        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                                            {comparisons.thirtyDaysAgo && (
                                                <ComparisonChip
                                                    label="vs 30d ago"
                                                    pct={comparisons.thirtyDaysAgo.pctChange}
                                                    oldPrice={comparisons.thirtyDaysAgo.price}
                                                />
                                            )}
                                            {comparisons.ninetyDaysAgo && (
                                                <ComparisonChip
                                                    label="vs 90d ago"
                                                    pct={comparisons.ninetyDaysAgo.pctChange}
                                                    oldPrice={comparisons.ninetyDaysAgo.price}
                                                />
                                            )}
                                            {comparisons.oneYearAgo && (
                                                <ComparisonChip
                                                    label="vs 1yr ago"
                                                    pct={comparisons.oneYearAgo.pctChange}
                                                    oldPrice={comparisons.oneYearAgo.price}
                                                />
                                            )}
                                            {comparisons.allTimeLow && (
                                                <Chip
                                                    label={`ATL: ${formatPrice(comparisons.allTimeLow.price)}${comparisons.allTimeLow.date ? ` (${comparisons.allTimeLow.date})` : ""}`}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ fontSize: "0.75rem" }}
                                                />
                                            )}
                                            {comparisons.allTimeHigh && (
                                                <Chip
                                                    label={`ATH: ${formatPrice(comparisons.allTimeHigh.price)}${comparisons.allTimeHigh.date ? ` (${comparisons.allTimeHigh.date})` : ""}`}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ fontSize: "0.75rem" }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        </Box>

                        {/* Price History Chart */}
                        {historyData && historyData.history.length > 0 && (
                            <Box sx={{ mt: 3 }}>
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        Price History
                                    </Typography>
                                    <ToggleButtonGroup
                                        value={chartDays}
                                        exclusive
                                        onChange={(_, val) => val !== null && setChartDays(val)}
                                        size="small"
                                    >
                                        <ToggleButton value={30}>30d</ToggleButton>
                                        <ToggleButton value={90}>90d</ToggleButton>
                                        <ToggleButton value={365}>1yr</ToggleButton>
                                        <ToggleButton value={3000}>All</ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>
                                <ResponsiveContainer width="100%" height={250}>
                                    <LineChart data={historyData.history}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 11 }}
                                            tickFormatter={(d: string) => {
                                                const dt = new Date(d);
                                                return `${dt.getMonth() + 1}/${dt.getDate()}`;
                                            }}
                                            minTickGap={30}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11 }}
                                            tickFormatter={(v: number) => `$${v}`}
                                            width={55}
                                        />
                                        <Tooltip
                                            formatter={(value) => [`$${Number(value)?.toFixed(2) ?? "N/A"}`]}
                                            labelFormatter={(label) => new Date(String(label)).toLocaleDateString()}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="marketPrice"
                                            stroke="#1976d2"
                                            strokeWidth={2}
                                            dot={false}
                                            name="Market"
                                            connectNulls
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="lowPrice"
                                            stroke="#4caf50"
                                            strokeWidth={1}
                                            dot={false}
                                            name="Low"
                                            connectNulls
                                            strokeDasharray="4 2"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>
                        )}
                    </>
                ) : (
                    <Typography>Product not found.</Typography>
                )}
            </DialogContent>
        </Dialog>
    );
}
