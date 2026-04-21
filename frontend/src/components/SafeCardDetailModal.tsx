import { Component, Suspense, lazy, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Skeleton,
    Stack,
    Typography,
} from "@mui/material";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { usePriceComparisons, usePriceHistoryByVariant, useProduct } from "../hooks/useProducts";

const CardDetailModal = lazy(() => import("./CardDetailModal"));

interface Props {
    productId: number | null;
    onClose: () => void;
}

interface BoundaryProps extends Props {
    children: ReactNode;
}

interface BoundaryState {
    hasError: boolean;
}

function formatPrice(price: number | null | undefined): string {
    if (price === null || price === undefined) return "N/A";
    return `$${price.toFixed(2)}`;
}

function formatSignedPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) return "N/A";
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function FallbackCardDetailModal({ productId, onClose }: Props) {
    const { data: product, isLoading } = useProduct(productId);
    const [chartDays, setChartDays] = useState(365);
    const [selectedSubType, setSelectedSubType] = useState<string | undefined>(undefined);
    const { data: historyData } = usePriceHistoryByVariant(productId, chartDays, selectedSubType);
    const { data: comparisons } = usePriceComparisons(productId, selectedSubType);

    useEffect(() => {
        if (product?.prices.length) {
            setSelectedSubType((current) => {
                if (current && product.prices.some((item) => item.subTypeName === current)) {
                    return current;
                }
                return product.prices[0].subTypeName;
            });
        }
    }, [product]);

    const chartData = historyData?.history ?? [];

    return (
        <Dialog open={productId !== null} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>Card Detail</DialogTitle>
            <DialogContent>
                {isLoading ? (
                    <Box sx={{ display: "grid", gap: 2 }}>
                        <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 3 }} />
                        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3 }} />
                    </Box>
                ) : product ? (
                    <Box sx={{ display: "grid", gap: 3 }}>
                        <Paper sx={{ p: 2.5, border: "1px solid", borderColor: "divider" }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 2 }}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="h6" noWrap>
                                        {product.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {product.categoryName} · {product.groupName}
                                    </Typography>
                                </Box>
                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
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
                                </Stack>
                            </Box>

                            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 2 }}>
                                <FormControl size="small" sx={{ minWidth: 180 }}>
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
                                <Typography variant="caption" color="text.secondary">
                                    Stable fallback chart view. Advanced Plotly workbench failed to mount for this card.
                                </Typography>
                            </Box>

                            <Box sx={{ height: 360 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                        <XAxis dataKey="date" />
                                        <YAxis tickFormatter={(value) => `$${value}`} />
                                        <Tooltip formatter={(value) => formatPrice(typeof value === "number" ? value : null)} />
                                        <Line type="monotone" dataKey="marketPrice" stroke="#0f6cbd" strokeWidth={3} dot={false} />
                                        <Line type="monotone" dataKey="lowPrice" stroke="#64748b" strokeWidth={1.5} dot={false} />
                                        <Line type="monotone" dataKey="sma20" stroke="#22c55e" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="sma50" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>
                        </Paper>

                        <Box
                            sx={{
                                display: "grid",
                                gap: 2,
                                gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" },
                            }}
                        >
                            <Paper sx={{ p: 2, border: "1px solid", borderColor: "divider" }}>
                                <Typography variant="caption" color="text.secondary">Current</Typography>
                                <Typography variant="h6">{formatPrice(comparisons?.currentPrice)}</Typography>
                            </Paper>
                            <Paper sx={{ p: 2, border: "1px solid", borderColor: "divider" }}>
                                <Typography variant="caption" color="text.secondary">30D</Typography>
                                <Typography variant="h6">{formatSignedPercent(comparisons?.thirtyDaysAgo?.pctChange)}</Typography>
                            </Paper>
                            <Paper sx={{ p: 2, border: "1px solid", borderColor: "divider" }}>
                                <Typography variant="caption" color="text.secondary">90D</Typography>
                                <Typography variant="h6">{formatSignedPercent(comparisons?.ninetyDaysAgo?.pctChange)}</Typography>
                            </Paper>
                            <Paper sx={{ p: 2, border: "1px solid", borderColor: "divider" }}>
                                <Typography variant="caption" color="text.secondary">1Y</Typography>
                                <Typography variant="h6">{formatSignedPercent(comparisons?.oneYearAgo?.pctChange)}</Typography>
                            </Paper>
                        </Box>
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        Card details are unavailable for this item.
                    </Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained">Close</Button>
            </DialogActions>
        </Dialog>
    );
}

class CardDetailModalBoundary extends Component<BoundaryProps, BoundaryState> {
    state: BoundaryState = { hasError: false };

    static getDerivedStateFromError(): BoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("Card detail modal failed to render", error, info);
    }

    componentDidUpdate(prevProps: BoundaryProps) {
        if (
            this.state.hasError &&
            (prevProps.productId !== this.props.productId || this.props.productId === null)
        ) {
            this.setState({ hasError: false });
        }
    }

    render() {
        if (this.state.hasError) {
            return <FallbackCardDetailModal productId={this.props.productId} onClose={this.props.onClose} />;
        }

        return this.props.children;
    }
}

export default function SafeCardDetailModal({ productId, onClose }: Props) {
    return (
        <CardDetailModalBoundary productId={productId} onClose={onClose}>
            <Suspense fallback={null}>
                <CardDetailModal productId={productId} onClose={onClose} />
            </Suspense>
        </CardDetailModalBoundary>
    );
}