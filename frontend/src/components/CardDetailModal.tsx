import { useEffect, useMemo, useState } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-basic-dist-min";
import type { Config, Layout, Shape } from "plotly.js";
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Skeleton,
    Stack,
    Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import StraightenIcon from "@mui/icons-material/Straighten";
import EditNoteIcon from "@mui/icons-material/EditNote";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import {
    useAddToWatchlist,
    usePriceComparisons,
    usePriceHistoryByVariant,
    useProduct,
    useRemoveFromWatchlist,
    useWatchlistItems,
    useWatchlists,
} from "../hooks/useProducts";

const Plot = createPlotlyComponent(Plotly);

interface Props {
    productId: number | null;
    onClose: () => void;
}

interface MeasurePoint {
    x: string;
    y: number;
}

interface SeriesVisibility {
    marketPrice: boolean;
    lowPrice: boolean;
    sma20: boolean;
    sma50: boolean;
    sma200: boolean;
    macd: boolean;
    macdSignal: boolean;
    macdHistogram: boolean;
}

const DEFAULT_SERIES: SeriesVisibility = {
    marketPrice: true,
    lowPrice: false,
    sma20: false,
    sma50: false,
    sma200: false,
    macd: true,
    macdSignal: true,
    macdHistogram: true,
};

function getHighResImage(url: string | null): string {
    if (!url) return "";
    return url.replace("_200w", "_in_1000x1000");
}

function formatPrice(price: number | null | undefined): string {
    if (price === null || price === undefined) return "N/A";
    return `$${price.toFixed(2)}`;
}

function formatSignedPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) return "N/A";
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function MetricPill({ label, value }: { label: string; value: string }) {
    return (
        <Paper sx={{ p: 1.5, border: "1px solid", borderColor: "divider" }}>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Typography variant="body1" fontWeight={700}>
                {value}
            </Typography>
        </Paper>
    );
}

export default function CardDetailModal({ productId, onClose }: Props) {
    const { data: product, isLoading } = useProduct(productId);
    const [chartDays, setChartDays] = useState(365);
    const [selectedSubType, setSelectedSubType] = useState<string | undefined>(undefined);
    const [fullScreen, setFullScreen] = useState(false);
    const [measureMode, setMeasureMode] = useState(false);
    const [measurePoints, setMeasurePoints] = useState<MeasurePoint[]>([]);
    const [selectedWatchlistId, setSelectedWatchlistId] = useState<number | null>(null);
    const [seriesVisibility, setSeriesVisibility] = useState<SeriesVisibility>(DEFAULT_SERIES);
    const [userShapes, setUserShapes] = useState<Layout["shapes"]>([]);

    const { data: historyData } = usePriceHistoryByVariant(productId, chartDays, selectedSubType);
    const { data: comparisons } = usePriceComparisons(productId, selectedSubType);
    const { data: watchlists } = useWatchlists();
    const { data: watchlistItems } = useWatchlistItems(selectedWatchlistId);
    const addToWatchlist = useAddToWatchlist();
    const removeFromWatchlist = useRemoveFromWatchlist();

    useEffect(() => {
        if (product?.prices.length) {
            const nextValue = product.prices.some((item) => item.subTypeName === selectedSubType)
                ? selectedSubType
                : product.prices[0].subTypeName;
            setSelectedSubType(nextValue);
        }
    }, [product, selectedSubType]);

    useEffect(() => {
        setMeasurePoints([]);
        setUserShapes([]);
        setSeriesVisibility(DEFAULT_SERIES);
        setChartDays(365);
        setSelectedWatchlistId(null);
    }, [productId]);

    const isInWatchlist =
        productId !== null &&
        watchlistItems !== undefined &&
        watchlistItems.includes(productId);

    const handleToggleWatchlist = () => {
        if (!selectedWatchlistId || productId === null) return;
        if (isInWatchlist) {
            removeFromWatchlist.mutate({ watchlistId: selectedWatchlistId, productId });
            return;
        }
        addToWatchlist.mutate({ watchlistId: selectedWatchlistId, productId });
    };

    const measurement = useMemo(() => {
        if (measurePoints.length < 2) return null;
        const [start, end] = measurePoints;
        const startTime = new Date(start.x).getTime();
        const endTime = new Date(end.x).getTime();
        const dayDelta = Math.round((endTime - startTime) / 86400000);
        const priceDelta = end.y - start.y;
        const pctDelta = start.y !== 0 ? (priceDelta / start.y) * 100 : null;

        return {
            priceDelta,
            pctDelta,
            dayDelta,
            label: `${priceDelta >= 0 ? "+" : ""}${priceDelta.toFixed(2)} (${pctDelta === null ? "N/A" : `${pctDelta >= 0 ? "+" : ""}${pctDelta.toFixed(1)}%`}) over ${dayDelta}d`,
        };
    }, [measurePoints]);

    const chartShapes = useMemo(() => {
        if (!measurement || measurePoints.length < 2) {
            return userShapes ?? [];
        }
        const [start, end] = measurePoints;
        return [
            ...(userShapes ?? []),
            {
                type: "line",
                xref: "x",
                yref: "y",
                x0: start.x,
                x1: end.x,
                y0: start.y,
                y1: end.y,
                line: {
                    color: "#f59e0b",
                    width: 2,
                    dash: "dot",
                },
            } as Partial<Shape>,
        ];
    }, [measurePoints, measurement, userShapes]);

    const plotData = useMemo(() => {
        const points = historyData?.history ?? [];
        const dates = points.map((point) => point.date);

        return [
            {
                type: "scatter",
                mode: "lines",
                name: "Market Price",
                x: dates,
                y: points.map((point) => point.marketPrice),
                line: { color: "#0f6cbd", width: 3 },
                hovertemplate: "%{x}<br>$%{y:.2f}<extra></extra>",
                visible: seriesVisibility.marketPrice ? true : "legendonly",
                yaxis: "y",
            },
            {
                type: "scatter",
                mode: "lines",
                name: "Low Price",
                x: dates,
                y: points.map((point) => point.lowPrice),
                line: { color: "#64748b", width: 1.5, dash: "dot" },
                visible: seriesVisibility.lowPrice ? true : "legendonly",
                yaxis: "y",
            },
            {
                type: "scatter",
                mode: "lines",
                name: "SMA 20",
                x: dates,
                y: points.map((point) => point.sma20),
                line: { color: "#22c55e", width: 2 },
                visible: seriesVisibility.sma20 ? true : "legendonly",
                yaxis: "y",
            },
            {
                type: "scatter",
                mode: "lines",
                name: "SMA 50",
                x: dates,
                y: points.map((point) => point.sma50),
                line: { color: "#f59e0b", width: 2 },
                visible: seriesVisibility.sma50 ? true : "legendonly",
                yaxis: "y",
            },
            {
                type: "scatter",
                mode: "lines",
                name: "SMA 200",
                x: dates,
                y: points.map((point) => point.sma200),
                line: { color: "#ef4444", width: 2 },
                visible: seriesVisibility.sma200 ? true : "legendonly",
                yaxis: "y",
            },
            {
                type: "scatter",
                mode: "lines",
                name: "MACD",
                x: dates,
                y: points.map((point) => point.macd),
                line: { color: "#8b5cf6", width: 2 },
                visible: seriesVisibility.macd ? true : "legendonly",
                yaxis: "y2",
            },
            {
                type: "scatter",
                mode: "lines",
                name: "MACD Signal",
                x: dates,
                y: points.map((point) => point.macdSignal),
                line: { color: "#f97316", width: 2 },
                visible: seriesVisibility.macdSignal ? true : "legendonly",
                yaxis: "y2",
            },
            {
                type: "bar",
                name: "MACD Histogram",
                x: dates,
                y: points.map((point) => point.macdHistogram),
                marker: {
                    color: points.map((point) =>
                        (point.macdHistogram ?? 0) >= 0 ? "#34d399" : "#fb7185"
                    ),
                },
                visible: seriesVisibility.macdHistogram ? true : "legendonly",
                yaxis: "y2",
            },
        ];
    }, [historyData, seriesVisibility]);

    const plotLayout = useMemo<Partial<Layout>>(
        () => ({
            autosize: true,
            height: fullScreen ? 760 : 520,
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            margin: { l: 50, r: 40, t: 24, b: 40 },
            legend: {
                orientation: "h",
                x: 0,
                y: 1.14,
            },
            hovermode: "x unified",
            xaxis: {
                title: { text: "Date" },
                rangeslider: { visible: false },
                showgrid: false,
            },
            yaxis: {
                title: { text: "Price" },
                domain: [0.34, 1],
                tickprefix: "$",
                gridcolor: "rgba(148, 163, 184, 0.18)",
            },
            yaxis2: {
                title: { text: "MACD" },
                domain: [0, 0.24],
                gridcolor: "rgba(148, 163, 184, 0.12)",
                zeroline: true,
                zerolinecolor: "rgba(148, 163, 184, 0.35)",
            },
            shapes: chartShapes,
            annotations: measurement
                ? [
                    {
                        x: measurePoints[1]?.x,
                        y: measurePoints[1]?.y,
                        xref: "x",
                        yref: "y",
                        text: measurement.label,
                        showarrow: true,
                        arrowhead: 2,
                        ax: 30,
                        ay: -30,
                        bgcolor: "rgba(15, 23, 42, 0.9)",
                        font: { color: "#fff", size: 11 },
                    },
                ]
                : [],
            uirevision: `${productId}-${selectedSubType}-${chartDays}`,
        }),
        [chartDays, chartShapes, fullScreen, measurePoints, measurement, productId, selectedSubType]
    );

    const plotConfig = useMemo<Partial<Config>>(
        () => ({
            displaylogo: false,
            responsive: true,
            scrollZoom: true,
            doubleClick: "reset+autosize",
        }),
        []
    );

    const technicals = historyData?.snapshot;

    return (
        <Dialog
            open={productId !== null}
            onClose={onClose}
            maxWidth="xl"
            fullWidth
            fullScreen={fullScreen}
            PaperProps={{
                sx: {
                    borderRadius: fullScreen ? 0 : 4,
                    bgcolor: "background.paper",
                },
            }}
        >
            <DialogTitle sx={{ pb: 1.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "start" }}>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h5" noWrap>
                            {product?.name ?? "Loading chart workbench..."}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                            {product ? `${product.categoryName} · ${product.groupName}` : "Fetching product detail"}
                        </Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton onClick={() => setFullScreen((current) => !current)}>
                            {fullScreen ? <CloseFullscreenIcon /> : <OpenInFullIcon />}
                        </IconButton>
                        <IconButton onClick={onClose}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>
            </DialogTitle>

            <DialogContent>
                {isLoading ? (
                    <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "280px minmax(0, 1fr)" } }}>
                        <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 4 }} />
                        <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 4 }} />
                    </Box>
                ) : product ? (
                    <Box
                        sx={{
                            display: "grid",
                            gap: 3,
                            gridTemplateColumns: { xs: "1fr", lg: fullScreen ? "320px minmax(0, 1fr)" : "280px minmax(0, 1fr)" },
                            alignItems: "start",
                        }}
                    >
                        <Stack spacing={2.5}>
                            <Paper sx={{ p: 2.5, border: "1px solid", borderColor: "divider" }}>
                                {product.imageUrl ? (
                                    <img
                                        src={getHighResImage(product.imageUrl)}
                                        alt={product.name}
                                        style={{ borderRadius: 18, width: "100%" }}
                                        onError={(event) => {
                                            (event.target as HTMLImageElement).src = product.imageUrl ?? "";
                                        }}
                                    />
                                ) : (
                                    <Box sx={{ height: 360, display: "grid", placeItems: "center" }}>
                                        <Typography color="text.secondary">No image available</Typography>
                                    </Box>
                                )}
                                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
                                    <Chip label={product.categoryName} color="primary" size="small" />
                                    <Chip label={product.groupName} size="small" />
                                    {product.rarity && <Chip label={product.rarity} size="small" variant="outlined" />}
                                    {product.cardNumber && (
                                        <Chip label={`#${product.cardNumber}`} size="small" variant="outlined" />
                                    )}
                                </Box>
                                {product.url && (
                                    <Button
                                        href={product.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        endIcon={<OpenInNewIcon />}
                                        variant="outlined"
                                        fullWidth
                                        sx={{ mt: 2 }}
                                    >
                                        View on TCGPlayer
                                    </Button>
                                )}
                            </Paper>

                            <Paper sx={{ p: 2.5, border: "1px solid", borderColor: "divider" }}>
                                <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
                                    Watchlists
                                </Typography>
                                {watchlists && watchlists.length > 0 ? (
                                    <>
                                        <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                                            <InputLabel>Watchlist</InputLabel>
                                            <Select
                                                value={selectedWatchlistId ?? ""}
                                                label="Watchlist"
                                                onChange={(event) =>
                                                    setSelectedWatchlistId(
                                                        event.target.value ? Number(event.target.value) : null
                                                    )
                                                }
                                            >
                                                {watchlists.map((watchlist) => (
                                                    <MenuItem key={watchlist.id} value={watchlist.id}>
                                                        {watchlist.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <Button
                                            fullWidth
                                            variant={isInWatchlist ? "outlined" : "contained"}
                                            startIcon={isInWatchlist ? <StarIcon /> : <StarBorderIcon />}
                                            disabled={!selectedWatchlistId}
                                            onClick={handleToggleWatchlist}
                                        >
                                            {isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                                        </Button>
                                    </>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        Create a watchlist to pin cards directly from the workbench.
                                    </Typography>
                                )}
                            </Paper>

                            <Paper sx={{ p: 2.5, border: "1px solid", borderColor: "divider" }}>
                                <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
                                    Live Snapshot
                                </Typography>
                                <Box sx={{ display: "grid", gap: 1.25 }}>
                                    {product.prices.map((variant) => (
                                        <Box key={variant.subTypeName} sx={{ display: "flex", justifyContent: "space-between", gap: 1.5 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                {variant.subTypeName}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={700}>
                                                {formatPrice(variant.marketPrice)}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Paper>
                        </Stack>

                        <Stack spacing={2.5} sx={{ minWidth: 0 }}>
                            <Paper sx={{ p: 2.5, border: "1px solid", borderColor: "divider" }}>
                                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2 }}>
                                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                        {[90, 180, 365, 730].map((days) => (
                                            <Button
                                                key={days}
                                                size="small"
                                                variant={chartDays === days ? "contained" : "outlined"}
                                                onClick={() => setChartDays(days)}
                                            >
                                                {days === 730 ? "2Y" : `${Math.round(days / 30)}M`}
                                            </Button>
                                        ))}
                                    </Box>

                                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                        <FormControl size="small" sx={{ minWidth: 150 }}>
                                            <InputLabel>Variant</InputLabel>
                                            <Select
                                                value={selectedSubType ?? ""}
                                                label="Variant"
                                                onChange={(event) => setSelectedSubType(String(event.target.value))}
                                            >
                                                {product.prices.map((variant) => (
                                                    <MenuItem key={variant.subTypeName} value={variant.subTypeName}>
                                                        {variant.subTypeName}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <Button
                                            variant={measureMode ? "contained" : "outlined"}
                                            startIcon={<StraightenIcon />}
                                            onClick={() => {
                                                setMeasureMode((current) => !current);
                                                setMeasurePoints([]);
                                            }}
                                        >
                                            Measure
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            startIcon={<EditNoteIcon />}
                                            onClick={() => {
                                                setUserShapes([]);
                                                setMeasurePoints([]);
                                            }}
                                        >
                                            Clear overlays
                                        </Button>
                                    </Box>
                                </Box>

                                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                                    {[
                                        ["marketPrice", "Market"],
                                        ["lowPrice", "Low"],
                                        ["sma20", "SMA20"],
                                        ["sma50", "SMA50"],
                                        ["sma200", "SMA200"],
                                        ["macd", "MACD"],
                                        ["macdSignal", "Signal"],
                                        ["macdHistogram", "Histogram"],
                                    ].map(([key, label]) => (
                                        <Chip
                                            key={key}
                                            label={label}
                                            color={seriesVisibility[key as keyof SeriesVisibility] ? "primary" : "default"}
                                            variant={seriesVisibility[key as keyof SeriesVisibility] ? "filled" : "outlined"}
                                            onClick={() =>
                                                setSeriesVisibility((current) => ({
                                                    ...current,
                                                    [key]: !current[key as keyof SeriesVisibility],
                                                }))
                                            }
                                        />
                                    ))}
                                </Box>

                                <Box sx={{ height: fullScreen ? 780 : 540 }}>
                                    <Plot
                                        data={plotData as never}
                                        layout={plotLayout as never}
                                        config={plotConfig as never}
                                        style={{ width: "100%", height: "100%" }}
                                        useResizeHandler
                                        onClick={(event: any) => {
                                            if (!measureMode) return;
                                            const point = event.points?.[0];
                                            if (!point || typeof point.x !== "string" || typeof point.y !== "number") {
                                                return;
                                            }
                                            setMeasurePoints((current) =>
                                                current.length >= 2
                                                    ? [{ x: point.x, y: point.y }]
                                                    : [...current, { x: point.x, y: point.y }]
                                            );
                                        }}
                                        onRelayout={(event: any) => {
                                            const relayoutEvent = event as Record<string, unknown>;
                                            if (Array.isArray(relayoutEvent.shapes)) {
                                                setUserShapes(relayoutEvent.shapes as Layout["shapes"]);
                                            }
                                        }}
                                    />
                                </Box>
                            </Paper>

                            <Box
                                sx={{
                                    display: "grid",
                                    gap: 2,
                                    gridTemplateColumns: {
                                        xs: "1fr",
                                        md: "repeat(4, minmax(0, 1fr))",
                                    },
                                }}
                            >
                                <MetricPill label="Market" value={formatPrice(technicals?.marketPrice)} />
                                <MetricPill label="SMA20 vs price" value={formatSignedPercent(technicals?.priceVsSma20Pct)} />
                                <MetricPill label="SMA trend" value={technicals?.smaTrend ?? "N/A"} />
                                <MetricPill label="MACD trend" value={technicals?.macdTrend ?? "N/A"} />
                            </Box>

                            <Paper sx={{ p: 2.5, border: "1px solid", borderColor: "divider" }}>
                                <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
                                    Measurement + Comparison Tape
                                </Typography>
                                <Box
                                    sx={{
                                        display: "grid",
                                        gap: 2,
                                        gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                                    }}
                                >
                                    <MetricPill
                                        label="Measured move"
                                        value={measurement ? measurement.label : "Select two chart points"}
                                    />
                                    <MetricPill
                                        label="30D"
                                        value={formatSignedPercent(comparisons?.thirtyDaysAgo?.pctChange)}
                                    />
                                    <MetricPill
                                        label="90D"
                                        value={formatSignedPercent(comparisons?.ninetyDaysAgo?.pctChange)}
                                    />
                                    <MetricPill
                                        label="1Y"
                                        value={formatSignedPercent(comparisons?.oneYearAgo?.pctChange)}
                                    />
                                    <MetricPill
                                        label="ATL"
                                        value={formatPrice(comparisons?.allTimeLow?.price)}
                                    />
                                    <MetricPill
                                        label="ATH"
                                        value={formatPrice(comparisons?.allTimeHigh?.price)}
                                    />
                                </Box>
                            </Paper>
                        </Stack>
                    </Box>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}