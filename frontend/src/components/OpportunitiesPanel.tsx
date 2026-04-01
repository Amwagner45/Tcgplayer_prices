import { useState } from "react";
import {
    Box,
    Paper,
    Typography,
    TextField,
    InputAdornment,
    Chip,
    Avatar,
    Skeleton,
    Tooltip,
    Pagination,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from "@mui/material";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import { useProducts, useFilters } from "../hooks/useProducts";
import type { ProductFilters, ProductItem } from "../types";

interface Props {
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

function OpportunityCard({
    item,
    onClick,
}: {
    item: ProductItem;
    onClick: () => void;
}) {
    const rp = item.rangePosition;
    const rangeColor = rp !== null ? getRangeColor(rp) : "#999";
    const pctFromATL =
        item.allTimeLow !== null && item.marketPrice !== null && item.allTimeLow > 0
            ? ((item.marketPrice - item.allTimeLow) / item.allTimeLow) * 100
            : null;

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
                                sx={{ fontSize: "0.6rem", height: 18, bgcolor: "#e3f2fd" }}
                            />
                        </Box>
                    </Box>
                </Box>

                {/* Price section */}
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 1,
                        mb: 1.5,
                    }}
                >
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            Market
                        </Typography>
                        <Typography variant="body1" fontWeight={800}>
                            {formatPrice(item.marketPrice)}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            All-Time Low
                        </Typography>
                        <Typography
                            variant="body1"
                            fontWeight={700}
                            color="success.main"
                        >
                            {formatPrice(item.allTimeLow)}
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
                                sx={{ fontSize: "0.65rem", color: "text.secondary" }}
                            >
                                ATL {formatPrice(item.allTimeLow)}
                            </Typography>
                            <Typography
                                variant="caption"
                                sx={{ fontSize: "0.65rem", color: "text.secondary" }}
                            >
                                ATH {formatPrice(item.allTimeHigh)}
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
                    {pctFromATL !== null && (
                        <Tooltip title="How far above the all-time low" arrow>
                            <Chip
                                label={`+${pctFromATL.toFixed(0)}% from ATL`}
                                size="small"
                                sx={{
                                    fontWeight: 600,
                                    fontSize: "0.65rem",
                                    height: 22,
                                }}
                                variant="outlined"
                            />
                        </Tooltip>
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

export default function OpportunitiesPanel({ onSelectCard }: Props) {
    const [minPrice, setMinPrice] = useState("5");
    const [maxPrice, setMaxPrice] = useState("");
    const [maxRange, setMaxRange] = useState(0.30);
    const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
    const [page, setPage] = useState(1);
    const { data: filterOptions } = useFilters(categoryId);

    const minVal = parseFloat(minPrice);
    const maxVal = parseFloat(maxPrice);

    const filters: ProductFilters = {
        sortBy: "range_position",
        sortDir: "asc",
        page,
        pageSize: 24,
        minPrice: !isNaN(minVal) && minVal > 0 ? minVal : undefined,
        maxPrice: !isNaN(maxVal) && maxVal > 0 ? maxVal : undefined,
        categoryId,
        maxRangePosition: maxRange,
    };

    const { data, isLoading } = useProducts(filters);

    const filteredItems = data?.items ?? [];

    return (
        <Box>
            {/* Header */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    background: "linear-gradient(135deg, #0f1923 0%, #1a2a3a 100%)",
                    color: "white",
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                    <WhatshotIcon sx={{ color: "#ff9100", fontSize: 28 }} />
                    <Box>
                        <Typography variant="h6" fontWeight={800}>
                            Near All-Time Low Opportunities
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.6 }}>
                            Cards trading close to their historical lows — potential
                            buying opportunities
                        </Typography>
                    </Box>
                </Box>

                <Box
                    sx={{
                        display: "flex",
                        gap: 2,
                        flexWrap: "wrap",
                        alignItems: "center",
                    }}
                >
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Game</InputLabel>
                        <Select
                            value={categoryId ?? ""}
                            label="Game"
                            onChange={(e) => {
                                setCategoryId(
                                    e.target.value ? Number(e.target.value) : undefined
                                );
                                setPage(1);
                            }}
                        >
                            <MenuItem value="">All Games</MenuItem>
                            {filterOptions?.categories.map((c) => (
                                <MenuItem key={c.categoryId} value={c.categoryId}>
                                    {c.displayName}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        size="small"
                        label="Min Price"
                        value={minPrice}
                        onChange={(e) => {
                            setMinPrice(e.target.value);
                            setPage(1);
                        }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">$</InputAdornment>
                                ),
                            },
                        }}
                        sx={{ width: 110 }}
                        type="number"
                    />
                    <TextField
                        size="small"
                        label="Max Price"
                        value={maxPrice}
                        onChange={(e) => {
                            setMaxPrice(e.target.value);
                            setPage(1);
                        }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">$</InputAdornment>
                                ),
                            },
                        }}
                        sx={{ width: 110 }}
                        type="number"
                    />
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Max Range %</InputLabel>
                        <Select
                            value={maxRange}
                            label="Max Range %"
                            onChange={(e) => {
                                setMaxRange(Number(e.target.value));
                                setPage(1);
                            }}
                        >
                            <MenuItem value={0.10}>Near ATL (&le;10%)</MenuItem>
                            <MenuItem value={0.20}>Close (&le;20%)</MenuItem>
                            <MenuItem value={0.30}>Moderate (&le;30%)</MenuItem>
                            <MenuItem value={0.50}>Below Mid (&le;50%)</MenuItem>
                        </Select>
                    </FormControl>

                    {data && (
                        <Chip
                            label={`${data.total.toLocaleString()} opportunities`}
                            variant="outlined"
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                    )}
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
                            height={220}
                            sx={{ borderRadius: 3 }}
                        />
                    ))}
                </Box>
            ) : filteredItems.length > 0 ? (
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
                    {filteredItems.map((item) => (
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
                        No cards found matching your criteria. Try adjusting the price
                        range or range threshold.
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
