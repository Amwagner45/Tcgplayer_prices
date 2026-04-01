import { useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Chip,
    Avatar,
    Skeleton,
    IconButton,
    Tooltip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Pagination,
} from "@mui/material";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import AddIcon from "@mui/icons-material/Add";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
    useProducts,
    useWatchlists,
    useCreateWatchlist,
    useDeleteWatchlist,
    useRemoveFromWatchlist,
} from "../hooks/useProducts";
import type { ProductItem } from "../types";

interface Props {
    onSelectCard: (productId: number) => void;
}

function formatPrice(price: number | null): string {
    if (price === null || price === undefined) return "N/A";
    return `$${price.toFixed(2)}`;
}

function getRangeColor(rp: number): string {
    if (rp <= 0.25) return "#4caf50";
    if (rp <= 0.50) return "#8bc34a";
    if (rp <= 0.75) return "#ff9800";
    return "#f44336";
}

function WatchlistCard({
    item,
    onClick,
    onRemove,
}: {
    item: ProductItem;
    onClick: () => void;
    onRemove: () => void;
}) {
    const rp = item.rangePosition;
    const pctFromATL =
        item.allTimeLow !== null && item.marketPrice !== null && item.allTimeLow > 0
            ? ((item.marketPrice - item.allTimeLow) / item.allTimeLow) * 100
            : null;

    const trend30d = item.pctChange30d;
    const trendColor =
        trend30d !== null
            ? trend30d <= -5
                ? "#4caf50"
                : trend30d >= 5
                    ? "#f44336"
                    : "#9e9e9e"
            : "#9e9e9e";

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
                transition: "all 0.2s ease",
                "&:hover": {
                    borderColor: "primary.main",
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 24px rgba(25,118,210,0.12)",
                },
            }}
        >
            {/* Clickable area */}
            <Box
                onClick={onClick}
                sx={{ cursor: "pointer", p: 2, pb: 1.5 }}
            >
                <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
                    <Avatar
                        src={item.imageUrl ?? ""}
                        alt={item.name}
                        variant="rounded"
                        sx={{ width: 56, height: 78, border: "1px solid #eee" }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                            {item.name}
                        </Typography>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ display: "block" }}
                        >
                            {item.groupName}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                            {item.rarity && (
                                <Chip
                                    label={item.rarity}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontSize: "0.6rem", height: 18 }}
                                />
                            )}
                            <Chip
                                label={item.subTypeName}
                                size="small"
                                sx={{ fontSize: "0.6rem", height: 18, bgcolor: "#f5f5f5" }}
                            />
                        </Box>
                    </Box>
                </Box>

                {/* Price + trend */}
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 1,
                        mb: 1.5,
                        p: 1.5,
                        bgcolor: "#fafbfc",
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
                        <Typography variant="body2" fontWeight={700} color="success.main">
                            {formatPrice(item.allTimeLow)}
                        </Typography>
                    </Box>
                    <Box>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.65rem" }}
                        >
                            30d Change
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                            {trend30d !== null && trend30d < 0 && (
                                <TrendingDownIcon
                                    sx={{ fontSize: 14, color: trendColor }}
                                />
                            )}
                            {trend30d !== null && trend30d > 0 && (
                                <TrendingUpIcon
                                    sx={{ fontSize: 14, color: trendColor }}
                                />
                            )}
                            <Typography
                                variant="body2"
                                fontWeight={700}
                                sx={{ color: trendColor }}
                            >
                                {trend30d !== null
                                    ? `${trend30d > 0 ? "+" : ""}${trend30d.toFixed(1)}%`
                                    : "—"}
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Range bar */}
                {rp !== null && (
                    <Box sx={{ mb: 1 }}>
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
                                    bgcolor: getRangeColor(rp),
                                    borderRadius: 3,
                                }}
                            />
                            <Box
                                sx={{
                                    position: "absolute",
                                    left: `calc(${rp * 100}% - 4px)`,
                                    top: -1.5,
                                    width: 9,
                                    height: 9,
                                    borderRadius: "50%",
                                    bgcolor: getRangeColor(rp),
                                    border: "2px solid white",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                                }}
                            />
                        </Box>
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                mt: 0.3,
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
                                    color: getRangeColor(rp),
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
                    </Box>
                )}

                {/* Badges */}
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    {pctFromATL !== null && pctFromATL < 25 && (
                        <Chip
                            label={`+${pctFromATL.toFixed(0)}% from ATL`}
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ fontWeight: 600, fontSize: "0.6rem", height: 20 }}
                        />
                    )}
                    {item.pctChange90d !== null && item.pctChange90d < -15 && (
                        <Chip
                            label={`${item.pctChange90d.toFixed(0)}% 90d`}
                            size="small"
                            color="success"
                            sx={{ fontWeight: 600, fontSize: "0.6rem", height: 20 }}
                        />
                    )}
                </Box>
            </Box>

            {/* Actions bar */}
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    px: 1,
                    py: 0.5,
                    borderTop: "1px solid",
                    borderColor: "divider",
                    bgcolor: "#fafbfc",
                }}
            >
                <Tooltip title="Remove from watchlist" arrow>
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                        sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
                    >
                        <RemoveCircleOutlineIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        </Paper>
    );
}

export default function WatchlistView({ onSelectCard }: Props) {
    const { data: watchlists, isLoading: loadingWatchlists } = useWatchlists();
    const [activeWatchlistId, setActiveWatchlistId] = useState<number | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [page, setPage] = useState(1);
    const createWatchlist = useCreateWatchlist();
    const deleteWatchlist = useDeleteWatchlist();
    const removeFromWatchlist = useRemoveFromWatchlist();

    // Auto-select first watchlist
    const effectiveWlId =
        activeWatchlistId ??
        (watchlists && watchlists.length > 0 ? watchlists[0].id : null);

    const { data, isLoading } = useProducts({
        sortBy: "range_position",
        sortDir: "asc",
        page,
        pageSize: 24,
        watchlistId: effectiveWlId ?? undefined,
    });

    const activeWl = watchlists?.find((w) => w.id === effectiveWlId);

    const handleCreate = () => {
        if (!newName.trim()) return;
        createWatchlist.mutate(newName.trim());
        setNewName("");
        setCreateOpen(false);
    };

    if (loadingWatchlists) {
        return (
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" width={200} height={48} />
                ))}
            </Box>
        );
    }

    return (
        <Box>
            {/* Watchlist selector header */}
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
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mb: 2,
                    }}
                >
                    <PlaylistPlayIcon sx={{ color: "#768fff", fontSize: 28 }} />
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={800}>
                            My Watchlists
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.6 }}>
                            Track cards you&apos;re interested in and monitor price
                            movements
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateOpen(true)}
                        sx={{ textTransform: "none", borderRadius: 2 }}
                    >
                        New Watchlist
                    </Button>
                </Box>

                {/* Watchlist tabs */}
                {watchlists && watchlists.length > 0 ? (
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {watchlists.map((w) => (
                            <Chip
                                key={w.id}
                                label={`${w.name} (${w.itemCount})`}
                                onClick={() => {
                                    setActiveWatchlistId(w.id);
                                    setPage(1);
                                }}
                                onDelete={() => deleteWatchlist.mutate(w.id)}
                                deleteIcon={
                                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                                }
                                color={effectiveWlId === w.id ? "primary" : "default"}
                                variant={effectiveWlId === w.id ? "filled" : "outlined"}
                                sx={{
                                    fontWeight: effectiveWlId === w.id ? 700 : 400,
                                    borderRadius: 2,
                                    px: 0.5,
                                }}
                            />
                        ))}
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        No watchlists yet — create one to start tracking cards.
                    </Typography>
                )}
            </Paper>

            {/* Cards grid */}
            {!effectiveWlId ? (
                <Paper
                    elevation={0}
                    sx={{
                        p: 6,
                        textAlign: "center",
                        borderRadius: 3,
                        border: "1px solid",
                        borderColor: "divider",
                    }}
                >
                    <PlaylistPlayIcon
                        sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
                    />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Watchlist Selected
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Create a watchlist and add cards from the Browse tab to start
                        tracking.
                    </Typography>
                    <Button
                        variant="outlined"
                        onClick={() => setCreateOpen(true)}
                        startIcon={<AddIcon />}
                    >
                        Create Watchlist
                    </Button>
                </Paper>
            ) : isLoading ? (
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
            ) : data && data.items.length > 0 ? (
                <>
                    {/* Summary bar */}
                    <Box
                        sx={{
                            display: "flex",
                            gap: 2,
                            mb: 2,
                            flexWrap: "wrap",
                        }}
                    >
                        <Chip
                            label={`${data.total} cards in "${activeWl?.name}"`}
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                        />
                        {(() => {
                            const nearATL = data.items.filter(
                                (i) => i.rangePosition !== null && i.rangePosition <= 0.25
                            ).length;
                            return nearATL > 0 ? (
                                <Chip
                                    label={`${nearATL} near ATL`}
                                    color="success"
                                    size="small"
                                    sx={{ fontWeight: 600 }}
                                />
                            ) : null;
                        })()}
                        {(() => {
                            const dropping = data.items.filter(
                                (i) => i.pctChange30d !== null && i.pctChange30d < -10
                            ).length;
                            return dropping > 0 ? (
                                <Chip
                                    icon={<TrendingDownIcon sx={{ fontSize: 16 }} />}
                                    label={`${dropping} dropping 30d`}
                                    color="warning"
                                    size="small"
                                    sx={{ fontWeight: 600 }}
                                />
                            ) : null;
                        })()}
                    </Box>

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
                        {data.items.map((item: ProductItem) => (
                            <WatchlistCard
                                key={`${item.productId}-${item.subTypeName}`}
                                item={item}
                                onClick={() => onSelectCard(item.productId)}
                                onRemove={() =>
                                    removeFromWatchlist.mutate({
                                        watchlistId: effectiveWlId!,
                                        productId: item.productId,
                                    })
                                }
                            />
                        ))}
                    </Box>

                    {data.totalPages > 1 && (
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
                </>
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
                        This watchlist is empty. Browse cards and add them to start
                        tracking.
                    </Typography>
                </Paper>
            )}

            {/* Create Dialog */}
            <Dialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Create Watchlist</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        size="small"
                        label="Watchlist Name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        autoFocus
                        sx={{ mt: 1 }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreate();
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate} variant="contained">
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
