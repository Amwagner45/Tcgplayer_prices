import { useState, useEffect } from "react";
import {
    Box,
    Paper,
    Typography,
    TextField,
    InputAdornment,
    Chip,
    Avatar,
    Skeleton,
    Pagination,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete,
} from "@mui/material";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import SearchIcon from "@mui/icons-material/Search";
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

function getGainColor(gain: number): string {
    if (gain >= 200) return "#2e7d32";
    if (gain >= 100) return "#4caf50";
    if (gain >= 50) return "#ff9800";
    return "#999";
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

export default function OpportunitiesPanel({ onSelectCard }: Props) {
    const [minPrice, setMinPrice] = useState("5");
    const [maxPrice, setMaxPrice] = useState("");
    const [maxRange, setMaxRange] = useState(0.3);
    const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
    const [groupIds, setGroupIds] = useState<number[]>([]);
    const [rarities, setRarities] = useState<string[]>([]);
    const [subTypes, setSubTypes] = useState<string[]>([]);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState<string | undefined>(undefined);
    const [sortBy, setSortBy] = useState("potential_gain");
    const [page, setPage] = useState(1);
    const { data: filterOptions } = useFilters(categoryId);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput || undefined);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const minVal = parseFloat(minPrice);
    const maxVal = parseFloat(maxPrice);

    const filters: ProductFilters = {
        sortBy,
        sortDir: sortBy === "potential_gain" ? "desc" : "asc",
        page,
        pageSize: 24,
        minPrice: !isNaN(minVal) && minVal > 0 ? minVal : undefined,
        maxPrice: !isNaN(maxVal) && maxVal > 0 ? maxVal : undefined,
        categoryId,
        groupIds: groupIds.length > 0 ? groupIds : undefined,
        rarities: rarities.length > 0 ? rarities : undefined,
        subTypes: subTypes.length > 0 ? subTypes : undefined,
        search,
        maxRangePosition: maxRange,
    };

    const { data, isLoading } = useProducts(filters);

    const items = data?.items ?? [];

    // Build Autocomplete options
    const groupOptions =
        filterOptions?.groups.map((g) => ({ id: g.groupId, label: g.name })) ??
        [];
    const rarityOptions = filterOptions?.rarities ?? [];
    const subTypeOptions = filterOptions?.subTypes ?? [];

    const selectedGroups = groupOptions.filter((g) => groupIds.includes(g.id));
    const selectedRarities = rarityOptions.filter((r) => rarities.includes(r));
    const selectedSubTypes = subTypeOptions.filter((s) => subTypes.includes(s));

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
                            Near All-Time Low Opportunities
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.6 }}>
                            Cards trading near their historical lows with high
                            potential gain to ATH
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
            </Paper>

            {/* Filters */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                }}
            >
                {/* Top row: search + game + sort */}
                <Box
                    sx={{
                        display: "flex",
                        gap: 2,
                        flexWrap: "wrap",
                        alignItems: "center",
                        mb: 2,
                    }}
                >
                    <TextField
                        size="small"
                        placeholder="Search cards..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <SearchIcon
                                        sx={{ mr: 1, color: "text.secondary" }}
                                    />
                                ),
                            },
                        }}
                        sx={{ minWidth: 200, flex: 1 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Game</InputLabel>
                        <Select
                            value={categoryId ?? ""}
                            label="Game"
                            onChange={(e) => {
                                setCategoryId(
                                    e.target.value
                                        ? Number(e.target.value)
                                        : undefined
                                );
                                setGroupIds([]);
                                setRarities([]);
                                setSubTypes([]);
                                setPage(1);
                            }}
                        >
                            <MenuItem value="">All Games</MenuItem>
                            {filterOptions?.categories.map((c) => (
                                <MenuItem
                                    key={c.categoryId}
                                    value={c.categoryId}
                                >
                                    {c.displayName}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Sort By</InputLabel>
                        <Select
                            value={sortBy}
                            label="Sort By"
                            onChange={(e) => {
                                setSortBy(e.target.value);
                                setPage(1);
                            }}
                        >
                            <MenuItem value="potential_gain">
                                Highest Potential Gain
                            </MenuItem>
                            <MenuItem value="range_position">
                                Closest to ATL
                            </MenuItem>
                            <MenuItem value="market_price">
                                Price (Low to High)
                            </MenuItem>
                            <MenuItem value="pct_change_30d">
                                Biggest 30d Drop
                            </MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                {/* Second row: sets, rarities, variants */}
                <Box
                    sx={{
                        display: "flex",
                        gap: 2,
                        flexWrap: "wrap",
                        alignItems: "center",
                        mb: 2,
                    }}
                >
                    <Autocomplete
                        multiple
                        size="small"
                        options={groupOptions}
                        getOptionLabel={(o) => o.label}
                        isOptionEqualToValue={(a, b) => a.id === b.id}
                        value={selectedGroups}
                        onChange={(_, newVal) => {
                            setGroupIds(newVal.map((g) => g.id));
                            setPage(1);
                        }}
                        renderInput={(params) => (
                            <TextField {...params} label="Sets" />
                        )}
                        sx={{ minWidth: 200, flex: 1 }}
                    />
                    <Autocomplete
                        multiple
                        size="small"
                        options={rarityOptions}
                        value={selectedRarities}
                        onChange={(_, newVal) => {
                            setRarities(newVal);
                            setPage(1);
                        }}
                        renderInput={(params) => (
                            <TextField {...params} label="Rarities" />
                        )}
                        sx={{ minWidth: 180, flex: 1 }}
                    />
                    <Autocomplete
                        multiple
                        size="small"
                        options={subTypeOptions}
                        value={selectedSubTypes}
                        onChange={(_, newVal) => {
                            setSubTypes(newVal);
                            setPage(1);
                        }}
                        renderInput={(params) => (
                            <TextField {...params} label="Variants" />
                        )}
                        sx={{ minWidth: 160, flex: 1 }}
                    />
                </Box>

                {/* Third row: price range + max range */}
                <Box
                    sx={{
                        display: "flex",
                        gap: 2,
                        flexWrap: "wrap",
                        alignItems: "center",
                    }}
                >
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
                                    <InputAdornment position="start">
                                        $
                                    </InputAdornment>
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
                                    <InputAdornment position="start">
                                        $
                                    </InputAdornment>
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
