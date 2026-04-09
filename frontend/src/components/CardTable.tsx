import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    Paper,
    Box,
    Typography,
    Pagination,
    Chip,
    Avatar,
    Skeleton,
    Tooltip,
} from "@mui/material";
import { useProducts } from "../hooks/useProducts";
import type { ProductFilters, ProductItem } from "../types";

interface Props {
    filters: ProductFilters;
    onChange: (filters: Partial<ProductFilters>) => void;
    onSelectCard: (productId: number) => void;
}

function formatPrice(price: number | null): string {
    if (price === null || price === undefined) return "N/A";
    return `$${price.toFixed(2)}`;
}

function getDealBgColor(pct: number | null): string {
    if (pct === null) return "transparent";
    if (pct >= 40) return "rgba(76, 175, 80, 0.12)";
    if (pct >= 25) return "rgba(76, 175, 80, 0.06)";
    if (pct >= 15) return "rgba(255, 152, 0, 0.06)";
    return "transparent";
}

function formatPctChange(pct: number | null): string {
    if (pct === null) return "—";
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
}

function getPctChangeColor(pct: number | null): string {
    if (pct === null) return "#999";
    if (pct <= -20) return "#4caf50";  // big drop = good buying opportunity
    if (pct <= -5) return "#8bc34a";
    if (pct >= 20) return "#f44336";
    if (pct >= 5) return "#ff9800";
    return "#999";
}

function PriceRangeBar({
    atl,
    ath,
    current,
}: {
    atl: number | null;
    ath: number | null;
    current: number | null;
}) {
    if (atl === null || ath === null || current === null || ath <= atl) {
        return <Typography variant="caption" color="text.secondary">—</Typography>;
    }
    const pct = Math.min(Math.max((current - atl) / (ath - atl), 0), 1);
    const barColor =
        pct <= 0.25
            ? "#4caf50"
            : pct <= 0.5
                ? "#8bc34a"
                : pct <= 0.75
                    ? "#ff9800"
                    : "#f44336";

    return (
        <Tooltip
            title={`ATL: $${atl.toFixed(2)} | Current: $${current.toFixed(2)} | ATH: $${ath.toFixed(2)} (${(pct * 100).toFixed(0)}%)`}
            arrow
        >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 90 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", minWidth: 22, textAlign: "right" }}>
                    ${atl < 1 ? atl.toFixed(2) : atl.toFixed(0)}
                </Typography>
                <Box
                    sx={{
                        position: "relative",
                        flex: 1,
                        height: 8,
                        bgcolor: "#e0e0e0",
                        borderRadius: 4,
                        overflow: "hidden",
                    }}
                >
                    <Box
                        sx={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            height: "100%",
                            width: `${pct * 100}%`,
                            bgcolor: barColor,
                            borderRadius: 4,
                            transition: "width 0.3s ease",
                        }}
                    />
                    <Box
                        sx={{
                            position: "absolute",
                            left: `calc(${pct * 100}% - 4px)`,
                            top: -1,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            bgcolor: barColor,
                            border: "2px solid white",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                        }}
                    />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", minWidth: 22 }}>
                    ${ath < 1 ? ath.toFixed(2) : ath.toFixed(0)}
                </Typography>
            </Box>
        </Tooltip>
    );
}

const SORT_COLUMNS: { key: string; label: string; align: "left" | "right" }[] =
    [
        { key: "name", label: "Card", align: "left" },
        { key: "rarity", label: "Rarity", align: "left" },
        { key: "market_price", label: "Market", align: "right" },
        { key: "low_price", label: "Low", align: "right" },
        { key: "range_position", label: "ATL ← Price → ATH", align: "left" },
        { key: "pct_change_30d", label: "30d", align: "right" },
        { key: "pct_change_90d", label: "90d", align: "right" },
        { key: "pct_change_1yr", label: "1yr", align: "right" },
    ];

export default function CardTable({ filters, onChange, onSelectCard }: Props) {
    const { data, isLoading } = useProducts(filters);

    const handleSort = (column: string) => {
        if (filters.sortBy === column) {
            onChange({ sortDir: filters.sortDir === "desc" ? "asc" : "desc" });
        } else {
            onChange({ sortBy: column, sortDir: "desc" });
        }
    };

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
            }}
        >
            <TableContainer sx={{ maxHeight: "calc(100vh - 300px)" }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            {SORT_COLUMNS.map((col) => (
                                <TableCell
                                    key={col.key}
                                    align={col.align}
                                    sx={{ fontWeight: 700, bgcolor: "background.paper" }}
                                >
                                    <TableSortLabel
                                        active={filters.sortBy === col.key}
                                        direction={
                                            filters.sortBy === col.key
                                                ? (filters.sortDir as "asc" | "desc")
                                                : "desc"
                                        }
                                        onClick={() => handleSort(col.key)}
                                    >
                                        {col.label}
                                    </TableSortLabel>
                                </TableCell>
                            ))}
                            <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                                Set
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                                Variant
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading
                            ? Array.from({ length: 10 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 10 }).map((_, j) => (
                                        <TableCell key={j}>
                                            <Skeleton />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                            : data?.items.map((item: ProductItem) => (
                                <TableRow
                                    key={`${item.productId}-${item.subTypeName}`}
                                    hover
                                    onClick={() => onSelectCard(item.productId)}
                                    sx={{
                                        cursor: "pointer",
                                        bgcolor: getDealBgColor(item.pctBelowMid),
                                        "&:hover": {
                                            bgcolor: "action.hover",
                                        },
                                    }}
                                >
                                    <TableCell>
                                        <Box
                                            sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                                        >
                                            <Avatar
                                                src={item.imageUrl ?? ""}
                                                alt={item.name}
                                                variant="rounded"
                                                sx={{ width: 36, height: 50 }}
                                            />
                                            <Box>
                                                <Typography
                                                    variant="body2"
                                                    fontWeight={600}
                                                    noWrap
                                                    sx={{ maxWidth: 220 }}
                                                >
                                                    {item.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {item.categoryName}
                                                    {item.cardNumber ? ` · #${item.cardNumber}` : ""}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={item.rarity ?? "—"}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontSize: "0.7rem" }}
                                        />
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                        {formatPrice(item.marketPrice)}
                                    </TableCell>
                                    <TableCell align="right">
                                        {formatPrice(item.lowPrice)}
                                    </TableCell>
                                    <TableCell sx={{ minWidth: 130 }}>
                                        <PriceRangeBar
                                            atl={item.allTimeLow}
                                            ath={item.allTimeHigh}
                                            current={item.marketPrice}
                                        />
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{
                                            color: getPctChangeColor(item.pctChange30d),
                                            fontWeight: 600,
                                            fontSize: "0.8rem",
                                        }}
                                    >
                                        {formatPctChange(item.pctChange30d)}
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{
                                            color: getPctChangeColor(item.pctChange90d),
                                            fontWeight: 600,
                                            fontSize: "0.8rem",
                                        }}
                                    >
                                        {formatPctChange(item.pctChange90d)}
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{
                                            color: getPctChangeColor(item.pctChange1yr),
                                            fontWeight: 600,
                                            fontSize: "0.8rem",
                                        }}
                                    >
                                        {formatPctChange(item.pctChange1yr)}
                                    </TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="caption"
                                            noWrap
                                            sx={{ maxWidth: 140, display: "block" }}
                                        >
                                            {item.groupName}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption">
                                            {item.subTypeName}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        p: 2,
                        borderTop: "1px solid",
                        borderColor: "divider",
                    }}
                >
                    <Typography variant="body2" color="text.secondary">
                        {data.total.toLocaleString()} results
                    </Typography>
                    <Pagination
                        count={data.totalPages}
                        page={filters.page}
                        onChange={(_, page) => onChange({ page })}
                        color="primary"
                        size="small"
                    />
                </Box>
            )}
        </Paper>
    );
}
