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

function getDealChipColor(
    pct: number | null
): "success" | "warning" | "default" {
    if (pct === null) return "default";
    if (pct >= 25) return "success";
    if (pct >= 15) return "warning";
    return "default";
}

const SORT_COLUMNS: { key: string; label: string; align: "left" | "right" }[] =
    [
        { key: "name", label: "Card", align: "left" },
        { key: "rarity", label: "Rarity", align: "left" },
        { key: "market_price", label: "Market", align: "right" },
        { key: "mid_price", label: "Mid", align: "right" },
        { key: "low_price", label: "Low", align: "right" },
        { key: "pct_below_mid", label: "% Below Mid", align: "right" },
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
                                    {Array.from({ length: 8 }).map((_, j) => (
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
                                        {formatPrice(item.midPrice)}
                                    </TableCell>
                                    <TableCell align="right">
                                        {formatPrice(item.lowPrice)}
                                    </TableCell>
                                    <TableCell align="right">
                                        {item.pctBelowMid !== null ? (
                                            <Chip
                                                label={`${item.pctBelowMid}%`}
                                                size="small"
                                                color={getDealChipColor(item.pctBelowMid)}
                                                sx={{ fontWeight: 700, minWidth: 60 }}
                                            />
                                        ) : (
                                            "N/A"
                                        )}
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
