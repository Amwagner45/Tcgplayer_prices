import { useState, useEffect } from "react";
import {
    Box,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Typography,
    Button,
    Paper,
    Chip,
    Autocomplete,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemSecondaryAction,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import DeleteIcon from "@mui/icons-material/Delete";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import {
    useFilters,
    useWatchlists,
    useCreateWatchlist,
    useDeleteWatchlist,
    useSavedFilters,
    useCreateSavedFilter,
    useDeleteSavedFilter,
} from "../hooks/useProducts";
import type { ProductFilters } from "../types";

interface Props {
    filters: ProductFilters;
    onChange: (filters: Partial<ProductFilters>) => void;
}

export default function FilterPanel({ filters, onChange }: Props) {
    const { data: filterOptions } = useFilters(filters.categoryId);
    const { data: watchlists } = useWatchlists();
    const { data: savedFilters } = useSavedFilters();
    const createWatchlist = useCreateWatchlist();
    const deleteWatchlist = useDeleteWatchlist();
    const createSavedFilter = useCreateSavedFilter();
    const deleteSavedFilter = useDeleteSavedFilter();

    const [searchInput, setSearchInput] = useState(filters.search || "");
    const [minPriceInput, setMinPriceInput] = useState(
        filters.minPrice !== undefined ? String(filters.minPrice) : ""
    );
    const [maxPriceInput, setMaxPriceInput] = useState(
        filters.maxPrice !== undefined ? String(filters.maxPrice) : ""
    );
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [saveFilterName, setSaveFilterName] = useState("");
    const [watchlistDialogOpen, setWatchlistDialogOpen] = useState(false);
    const [newWatchlistName, setNewWatchlistName] = useState("");

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            onChange({ search: searchInput || undefined, page: 1 });
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Debounce price inputs
    useEffect(() => {
        const timer = setTimeout(() => {
            const minVal = minPriceInput ? parseFloat(minPriceInput) : undefined;
            const maxVal = maxPriceInput ? parseFloat(maxPriceInput) : undefined;
            onChange({
                minPrice: minVal && !isNaN(minVal) ? minVal : undefined,
                maxPrice: maxVal && !isNaN(maxVal) ? maxVal : undefined,
                page: 1,
            });
        }, 600);
        return () => clearTimeout(timer);
    }, [minPriceInput, maxPriceInput]);

    const clearFilters = () => {
        setSearchInput("");
        setMinPriceInput("");
        setMaxPriceInput("");
        onChange({
            categoryId: undefined,
            groupIds: undefined,
            rarities: undefined,
            subTypes: undefined,
            minPrice: undefined,
            maxPrice: undefined,
            search: undefined,
            watchlistId: undefined,
            page: 1,
        });
    };

    const activeFilterCount = [
        filters.categoryId,
        filters.groupIds?.length,
        filters.rarities?.length,
        filters.subTypes?.length,
        filters.minPrice,
        filters.maxPrice,
        filters.search,
        filters.watchlistId,
    ].filter(Boolean).length;

    const handleSaveFilter = () => {
        if (!saveFilterName.trim()) return;
        const filterData = { ...filters };
        delete (filterData as Record<string, unknown>).page;
        delete (filterData as Record<string, unknown>).pageSize;
        createSavedFilter.mutate({
            name: saveFilterName.trim(),
            filterJson: JSON.stringify(filterData),
        });
        setSaveFilterName("");
        setSaveDialogOpen(false);
    };

    const handleLoadFilter = (filterJson: string) => {
        try {
            const loaded = JSON.parse(filterJson);
            onChange({ ...loaded, page: 1 });
            setSearchInput(loaded.search || "");
            setMinPriceInput(loaded.minPrice !== undefined ? String(loaded.minPrice) : "");
            setMaxPriceInput(loaded.maxPrice !== undefined ? String(loaded.maxPrice) : "");
        } catch {
            // ignore invalid JSON
        }
    };

    const handleCreateWatchlist = () => {
        if (!newWatchlistName.trim()) return;
        createWatchlist.mutate(newWatchlistName.trim());
        setNewWatchlistName("");
    };

    // Build options arrays for Autocomplete
    const groupOptions =
        filterOptions?.groups.map((g) => ({ id: g.groupId, label: g.name })) ?? [];
    const rarityOptions = filterOptions?.rarities ?? [];
    const subTypeOptions = filterOptions?.subTypes ?? [];

    const selectedGroups = groupOptions.filter((g) =>
        filters.groupIds?.includes(g.id)
    );
    const selectedRarities = rarityOptions.filter((r) =>
        filters.rarities?.includes(r)
    );
    const selectedSubTypes = subTypeOptions.filter((s) =>
        filters.subTypes?.includes(s)
    );

    return (
        <Paper
            elevation={0}
            sx={{
                p: 2.5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 1 }}>
                <FilterListIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                    Filters
                </Typography>
                {activeFilterCount > 0 && (
                    <Chip
                        label={activeFilterCount}
                        size="small"
                        color="primary"
                        sx={{ ml: 1 }}
                    />
                )}
                {activeFilterCount > 0 && (
                    <Button size="small" onClick={clearFilters} sx={{ ml: "auto" }}>
                        Clear All
                    </Button>
                )}
            </Box>

            <TextField
                fullWidth
                size="small"
                placeholder="Search cards..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                slotProps={{
                    input: {
                        startAdornment: (
                            <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
                        ),
                    },
                }}
                sx={{ mb: 2 }}
            />

            {/* Card Game - single select */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Card Game</InputLabel>
                <Select
                    value={filters.categoryId ?? ""}
                    label="Card Game"
                    onChange={(e) =>
                        onChange({
                            categoryId: e.target.value ? Number(e.target.value) : undefined,
                            groupIds: undefined,
                            rarities: undefined,
                            subTypes: undefined,
                            page: 1,
                        })
                    }
                >
                    <MenuItem value="">All Games</MenuItem>
                    {filterOptions?.categories.map((c) => (
                        <MenuItem key={c.categoryId} value={c.categoryId}>
                            {c.displayName}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Set - multi select */}
            <Autocomplete
                multiple
                size="small"
                options={groupOptions}
                getOptionLabel={(o) => o.label}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                value={selectedGroups}
                onChange={(_, newVal) =>
                    onChange({
                        groupIds: newVal.length > 0 ? newVal.map((g) => g.id) : undefined,
                        page: 1,
                    })
                }
                renderInput={(params) => <TextField {...params} label="Sets" />}
                sx={{ mb: 2 }}
            />

            {/* Rarity - multi select */}
            <Autocomplete
                multiple
                size="small"
                options={rarityOptions}
                value={selectedRarities}
                onChange={(_, newVal) =>
                    onChange({
                        rarities: newVal.length > 0 ? newVal : undefined,
                        page: 1,
                    })
                }
                renderInput={(params) => <TextField {...params} label="Rarities" />}
                sx={{ mb: 2 }}
            />

            {/* Variant - multi select */}
            <Autocomplete
                multiple
                size="small"
                options={subTypeOptions}
                value={selectedSubTypes}
                onChange={(_, newVal) =>
                    onChange({
                        subTypes: newVal.length > 0 ? newVal : undefined,
                        page: 1,
                    })
                }
                renderInput={(params) => <TextField {...params} label="Variants" />}
                sx={{ mb: 2 }}
            />

            {/* Price Range - text inputs */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Market Price Range
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                <TextField
                    size="small"
                    placeholder="Min"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        },
                    }}
                    sx={{ flex: 1 }}
                    type="number"
                />
                <TextField
                    size="small"
                    placeholder="Max"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        },
                    }}
                    sx={{ flex: 1 }}
                    type="number"
                />
            </Box>

            {/* Watchlist filter */}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <PlaylistAddIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2" fontWeight={700}>
                    Watchlists
                </Typography>
                <IconButton
                    size="small"
                    onClick={() => setWatchlistDialogOpen(true)}
                    sx={{ ml: "auto" }}
                >
                    <PlaylistAddIcon fontSize="small" />
                </IconButton>
            </Box>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Filter by Watchlist</InputLabel>
                <Select
                    value={filters.watchlistId ?? ""}
                    label="Filter by Watchlist"
                    onChange={(e) =>
                        onChange({
                            watchlistId: e.target.value ? Number(e.target.value) : undefined,
                            page: 1,
                        })
                    }
                >
                    <MenuItem value="">All Cards</MenuItem>
                    {watchlists?.map((w) => (
                        <MenuItem key={w.id} value={w.id}>
                            {w.name} ({w.itemCount})
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Saved Filters */}
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <BookmarkIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2" fontWeight={700}>
                    Saved Filters
                </Typography>
                <Button
                    size="small"
                    onClick={() => setSaveDialogOpen(true)}
                    sx={{ ml: "auto", textTransform: "none" }}
                >
                    Save Current
                </Button>
            </Box>
            {savedFilters && savedFilters.length > 0 ? (
                <List dense disablePadding>
                    {savedFilters.map((sf) => (
                        <ListItem key={sf.id} disablePadding>
                            <ListItemButton
                                onClick={() => handleLoadFilter(sf.filterJson)}
                                sx={{ borderRadius: 1, py: 0.5 }}
                            >
                                <ListItemText
                                    primary={sf.name}
                                    primaryTypographyProps={{ variant: "body2" }}
                                />
                            </ListItemButton>
                            <ListItemSecondaryAction>
                                <IconButton
                                    edge="end"
                                    size="small"
                                    onClick={() => deleteSavedFilter.mutate(sf.id)}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                </List>
            ) : (
                <Typography variant="caption" color="text.secondary">
                    No saved filters yet
                </Typography>
            )}

            {/* Save Filter Dialog */}
            <Dialog
                open={saveDialogOpen}
                onClose={() => setSaveDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Save Current Filters</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        size="small"
                        label="Filter Name"
                        value={saveFilterName}
                        onChange={(e) => setSaveFilterName(e.target.value)}
                        autoFocus
                        sx={{ mt: 1 }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveFilter();
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveFilter} variant="contained">
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Manage Watchlists Dialog */}
            <Dialog
                open={watchlistDialogOpen}
                onClose={() => setWatchlistDialogOpen(false)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Manage Watchlists</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: "flex", gap: 1, mb: 2, mt: 1 }}>
                        <TextField
                            size="small"
                            label="New Watchlist"
                            value={newWatchlistName}
                            onChange={(e) => setNewWatchlistName(e.target.value)}
                            fullWidth
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreateWatchlist();
                            }}
                        />
                        <Button onClick={handleCreateWatchlist} variant="contained">
                            Add
                        </Button>
                    </Box>
                    <List dense>
                        {watchlists?.map((w) => (
                            <ListItem key={w.id} disablePadding>
                                <ListItemText
                                    primary={w.name}
                                    secondary={`${w.itemCount} cards`}
                                />
                                <ListItemSecondaryAction>
                                    <IconButton
                                        edge="end"
                                        size="small"
                                        onClick={() => deleteWatchlist.mutate(w.id)}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setWatchlistDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
