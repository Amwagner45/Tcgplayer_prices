import { useState, useEffect } from "react";
import {
    Box,
    Paper,
    Typography,
    Chip,
    Avatar,
    Skeleton,
    Pagination,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from "@mui/material";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import { useProducts } from "../hooks/useProducts";
import type { ProductFilters, ProductItem } from "../types";

interface Props {
    filters: ProductFilters;
    onSelectCard: (productId: number) => void;
}

function formatPrice(price: number | null): string {
    if (price === null || price === undefined) return "N/A";
    return `$${price.toFixed(2)}`;
}

function getRangeColor(rp: number): string {
    if (rp <= 0.15) return "#2e7d32";
    if (rp <= 0.30) return "#4caf50";
    if (rp <= 0.50) return "#ff9800";
    return "#f44336";
}

function getRangeLabel(rp: number): string {
    if (rp <= 0.10) return "At ATL";
    if (rp <= 0.25) return "Near ATL";
    if (rp <= 0.40) return "Below Mid";
    return "Above Mid";
}

function getGainColor(gain: number): string {
    if (gain >= 200) return "#2e7d32";
    if (gain >= 100) return "#4caf50";
    if (gain >= 50) return "#ff9800";
    return "#999";
}

function getSignalColor(signal: string | null): string {
    if (signal === "Strong buy setup") return "#2e7d32";
    if (signal === "Momentum watch") return "#1565c0";
    if (signal === "Near low, wait") return "#ef6c00";
    return "#757575";
}

function formatTrendLabel(value: string | null): string {
    if (!value) return "No trend";
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function OpportunityCard({
    item,
    onClick,
}: {
    item: ProductItem;
    onClick: () => void;
}) {
    const rp = item.rangePosition;
    const rangeColor = rp !== null ? getRangeColor(rp) : "#999";
    const pg = item.potentialGain;
    const gainColor = pg !== null ? getGainColor(pg) : "#999";
    const signalColor = getSignalColor(item.buySignal);

    return (
        <Paper
            elevation={0}
            onClick={onClick}
            sx={{
                p: 0,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": {
                    borderColor: rangeColor,
                    transform: "translateY(-4px)",
                    boxShadow: `0 12px 32px ${rangeColor}25`,
                },
            }}
        >
            {/* Color accent bar */}
            <Box sx={{ height: 4, bgcolor: rangeColor }} />

            <Box sx={{ p: 2 }}>
                {/* Top row: image + name */}
                <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
                    <Avatar
                        src={item.imageUrl ?? ""}
                        alt={item.name}
                        variant="rounded"
                        sx={{ width: 48, height: 67 }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            variant="body2"
                            fontWeight={700}
                            noWrap
                            title={item.name}
                        >
                            {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                            {item.groupName}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                            {item.rarity && (
                                <Chip
                                    label={item.rarity}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: "0.6rem", height: 18 }}
                                />
                            )}
                            <Chip
                                label={item.categoryName}
                                size="small"
                                sx={{
                                    fontSize: "0.6rem",
                                    height: 18,
                                    bgcolor: "#e3f2fd",
                                }}
                            />
                        </Box>
                    </Box>
                </Box>

                {/* Price section */}
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 1,
                        mb: 1.5,
                        p: 1.5,
                        bgcolor: "#f8f9fa",
                        borderRadius: 2,
                    }}
                >
                    <Box>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.65rem" }}
                        >
                            Market
                        </Typography>
                        <Typography variant="body2" fontWeight={800}>
                            {formatPrice(item.marketPrice)}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.65rem" }}
                        >
                            ATL
                        </Typography>
                        <Typography
                            variant="body2"
                            fontWeight={700}
                            color="success.main"
                        >
                            {formatPrice(item.allTimeLow)}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.65rem" }}
                        >
                            ATH
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="text.secondary">
                            {formatPrice(item.allTimeHigh)}
                        </Typography>
                    </Box>
                </Box>

                {/* Potential Gain banner */}
                {pg !== null && (
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            p: 1,
                            mb: 1.5,
                            borderRadius: 2,
                            bgcolor: `${gainColor}10`,
                            border: `1px solid ${gainColor}30`,
                        }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <TrendingUpIcon
                                sx={{ fontSize: 16, color: gainColor }}
                            />
                            <Typography
                                variant="caption"
                                sx={{ fontWeight: 600, color: "text.secondary" }}
                            >
                                Potential Gain
                            </Typography>
                        </Box>
                        <Typography
                            variant="body2"
                            fontWeight={800}
                            sx={{ color: gainColor }}
                        >
                            +{pg.toFixed(0)}%
                        </Typography>
                    </Box>
                )}

                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 1.5 }}>
                    {item.opportunityScore !== null && (
                        <Chip
                            label={`Score ${item.opportunityScore.toFixed(0)}`}
                            size="small"
                            sx={{
                                fontWeight: 700,
                                bgcolor: "#e3f2fd",
                                color: "#1565c0",
                                height: 22,
                            }}
                        />
                    )}
                    {item.buySignal && (
                        <Chip
                            label={item.buySignal}
                            size="small"
                            sx={{
                                fontWeight: 700,
                                color: signalColor,
                                bgcolor: `${signalColor}15`,
                                border: `1px solid ${signalColor}35`,
                                height: 22,
                            }}
                        />
                    )}
                </Box>

                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 1,
                        mb: 1.5,
                    }}
                >
                    <Box
                        sx={{
                            p: 1,
                            borderRadius: 2,
                            bgcolor: "rgba(25, 118, 210, 0.06)",
                        }}
                    >
                        <Typography variant="caption" color="text.secondary">
                            SMA Trend
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                            {formatTrendLabel(item.smaTrend)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {item.priceVsSma20Pct !== null
                                ? `${item.priceVsSma20Pct > 0 ? "+" : ""}${item.priceVsSma20Pct.toFixed(1)}% vs SMA20`
                                : "Market price only"}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            p: 1,
                            borderRadius: 2,
                            bgcolor: "rgba(46, 125, 50, 0.06)",
                        }}
                    >
                        <Typography variant="caption" color="text.secondary">
                            MACD
                        </Typography>
                        <Typography variant="body2" fontWeight={700}>
                            {formatTrendLabel(item.macdTrend)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {item.macdHistogram !== null
                                ? `Hist ${item.macdHistogram > 0 ? "+" : ""}${item.macdHistogram.toFixed(3)}`
                                : "Awaiting signal"}
                        </Typography>
                    </Box>
                </Box>

                {/* Range bar */}
                {rp !== null && (
                    <Box sx={{ mb: 1.5 }}>
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                mb: 0.5,
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{ fontSize: "0.6rem", color: "text.secondary" }}
                            >
                                ATL
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{
                                    fontSize: "0.6rem",
                                    fontWeight: 700,
                                    color: rangeColor,
                                }}
                            >
                                {(rp * 100).toFixed(0)}%
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ fontSize: "0.6rem", color: "text.secondary" }}
                            >
                                ATH
                            </Typography>
                        </Box>
                        <Box
                            sx={{
                                position: "relative",
                                height: 6,
                                bgcolor: "#e8e8e8",
                                borderRadius: 3,
                            }}
                        >
                            <Box
                                sx={{
                                    position: "absolute",
                                    left: 0,
                                    top: 0,
                                    height: "100%",
                                    width: `${rp * 100}%`,
                                    bgcolor: rangeColor,
                                    borderRadius: 3,
                                    transition: "width 0.3s ease",
                                }}
                            />
                            <Box
                                sx={{
                                    position: "absolute",
                                    left: `calc(${rp * 100}% - 5px)`,
                                    top: -2,
                                    width: 10,
                                    height: 10,
                                    borderRadius: "50%",
                                    bgcolor: rangeColor,
                                    border: "2px solid white",
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                                }}
                            />
                        </Box>
                    </Box>
                )}

                {/* Bottom badges */}
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    {rp !== null && (
                        <Chip
                            label={getRangeLabel(rp)}
                            size="small"
                            sx={{
                                fontWeight: 700,
                                fontSize: "0.65rem",
                                height: 22,
                                bgcolor: `${rangeColor}18`,
                                color: rangeColor,
                                border: `1px solid ${rangeColor}40`,
                            }}
                        />
                    )}
                    {item.pctChange30d !== null && item.pctChange30d < -5 && (
                        <Chip
                            icon={<TrendingDownIcon sx={{ fontSize: 14 }} />}
                            label={`${item.pctChange30d.toFixed(0)}% 30d`}
                            size="small"
                            color="success"
                            sx={{ fontWeight: 600, fontSize: "0.65rem", height: 22 }}
                        />
                    )}
                </Box>
            </Box>
        </Paper>
    );
}

export default function OpportunitiesPanel({ filters, onSelectCard }: Props) {
    const [sortBy, setSortBy] = useState("opportunity_score");
    const [page, setPage] = useState(1);

    useEffect(() => {
        setPage(1);
    }, [
        filters.categoryId,
        filters.groupIds,
        filters.releaseYearStart,
        filters.releaseYearEnd,
        filters.rarities,
        filters.subTypes,
        filters.minPrice,
        filters.maxPrice,
        filters.search,
        filters.watchlistId,
        filters.maxRangePosition,
    ]);

    const opportunityFilters: ProductFilters = {
        ...filters,
        sortBy,
        sortDir:
            sortBy === "market_price" || sortBy === "range_position"
                ? "asc"
                : "desc",
        page,
        pageSize: 24,
        maxRangePosition: filters.maxRangePosition ?? 0.3,
    };

    const { data, isLoading } = useProducts(opportunityFilters);

    const items = data?.items ?? [];

    return (
        <Box>
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    background:
                        "linear-gradient(135deg, #0f1923 0%, #1a2a3a 100%)",
                    color: "white",
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                    }}
                >
                    <WhatshotIcon sx={{ color: "#ff9100", fontSize: 28 }} />
                    <Box>
                        <Typography variant="h6" fontWeight={800}>
                            Market-Price Opportunity Signals
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.6 }}>
                            Global dashboard filters are applied here too. This view ranks cards near their historical lows with momentum context.
                        </Typography>
                    </Box>
                    {data && (
                        <Chip
                            label={`${data.total.toLocaleString()} results`}
                            size="small"
                            sx={{
                                ml: "auto",
                                fontWeight: 700,
                                bgcolor: "rgba(255,255,255,0.12)",
                                color: "#fff",
                            }}
                        />
                    )}
                </Box>
                <Box
                    sx={{
                        display: "flex",
                        gap: 2,
                        flexWrap: "wrap",
                        alignItems: "center",
                        mt: 2,
                    }}
                >
                    <Chip label={filters.groupIds?.length ? `${filters.groupIds.length} set filters` : "All sets"} variant="outlined" />
                    <Chip label={filters.rarities?.length ? `${filters.rarities.length} rarity filters` : "All rarities"} variant="outlined" />
                    <Chip label={filters.subTypes?.length ? `${filters.subTypes.length} variant filters` : "All variants"} variant="outlined" />
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Opportunity Rank</InputLabel>
                        <Select
                            value={sortBy}
                            label="Opportunity Rank"
                            onChange={(e) => {
                                setSortBy(e.target.value);
                                setPage(1);
                            }}
                        >
                            <MenuItem value="potential_gain">
                                Highest Potential Gain
                            </MenuItem>
                            <MenuItem value="opportunity_score">
                                Best Signal Score
                            </MenuItem>
                            <MenuItem value="range_position">
                                Closest to ATL
                            </MenuItem>
                            <MenuItem value="market_price">
                                Price (Low to High)
                            </MenuItem>
                            <MenuItem value={0.1}>Near ATL (&le;10%)</MenuItem>
                            <MenuItem value={0.2}>Close (&le;20%)</MenuItem>
                            <MenuItem value={0.3}>Moderate (&le;30%)</MenuItem>
                            <MenuItem value={0.5}>Below Mid (&le;50%)</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </Paper>

            {/* Card Grid */}
            {isLoading ? (
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: "1fr 1fr",
                            md: "1fr 1fr 1fr",
                            lg: "1fr 1fr 1fr 1fr",
                        },
                        gap: 2,
                    }}
                >
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            variant="rounded"
                            height={280}
                            sx={{ borderRadius: 3 }}
                        />
                    ))}
                </Box>
            ) : items.length > 0 ? (
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: "1fr 1fr",
                            md: "1fr 1fr 1fr",
                            lg: "1fr 1fr 1fr 1fr",
                        },
                        gap: 2,
                    }}
                >
                    {items.map((item) => (
                        <OpportunityCard
                            key={`${item.productId}-${item.subTypeName}`}
                            item={item}
                            onClick={() => onSelectCard(item.productId)}
                        />
                    ))}
                </Box>
            ) : (
                <Paper
                    elevation={0}
                    sx={{
                        p: 4,
                        textAlign: "center",
                        borderRadius: 3,
                        border: "1px solid",
                        borderColor: "divider",
                    }}
                >
                    <Typography color="text.secondary">
                        No cards found matching your criteria. Try adjusting the
                        price range or range threshold.
                    </Typography>
                </Paper>
            )}

            {/* Pagination */}
            {data && data.totalPages > 1 && (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        mt: 3,
                    }}
                >
                    <Pagination
                        count={data.totalPages}
                        page={page}
                        onChange={(_, p) => setPage(p)}
                        color="primary"
                    />
                </Box>
            )}
        </Box>
    );
}
