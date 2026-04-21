import { useEffect, useMemo, useState } from "react";
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    List,
    ListItem,
    ListItemButton,
    ListItemSecondaryAction,
    ListItemText,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import TuneIcon from "@mui/icons-material/Tune";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import DeleteIcon from "@mui/icons-material/Delete";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import {
    useCreateSavedFilter,
    useCreateWatchlist,
    useDeleteSavedFilter,
    useDeleteWatchlist,
    useFilters,
    useSavedFilters,
    useWatchlists,
} from "../hooks/useProducts";
import type { ProductFilters } from "../types";

interface Props {
    filters: ProductFilters;
    onChange: (filters: Partial<ProductFilters>) => void;
    analyticsMinPrice: number;
    onAnalyticsMinPriceChange: (value: number) => void;
}

interface EraPreset {
    key: string;
    label: string;
    description: string;
    releaseYearStart?: number;
    releaseYearEnd?: number;
}

interface GroupOption {
    id: number;
    label: string;
    publishedOn?: string | null;
    releaseYear?: number | null;
}

const ERA_PRESETS: EraPreset[] = [
    {
        key: "mid-modern",
        label: "Mid + Modern",
        description: "2013 and newer",
        releaseYearStart: 2013,
    },
    {
        key: "modern",
        label: "Modern",
        description: "2019 and newer",
        releaseYearStart: 2019,
    },
    {
        key: "mid",
        label: "Mid Era",
        description: "2013 to 2018",
        releaseYearStart: 2013,
        releaseYearEnd: 2018,
    },
    {
        key: "all",
        label: "All Eras",
        description: "No release-year filter",
    },
];

function getEraPresetKey(filters: ProductFilters): string | null {
    for (const preset of ERA_PRESETS) {
        if (
            filters.releaseYearStart === preset.releaseYearStart &&
            filters.releaseYearEnd === preset.releaseYearEnd
        ) {
            return preset.key;
        }
    }
    return null;
}

function getEraSummary(filters: ProductFilters): string {
    const preset = ERA_PRESETS.find((item) => item.key === getEraPresetKey(filters));
    if (preset) {
        return `${preset.label} · ${preset.description}`;
    }
    if (filters.releaseYearStart !== undefined && filters.releaseYearEnd !== undefined) {
        return `${filters.releaseYearStart} to ${filters.releaseYearEnd}`;
    }
    if (filters.releaseYearStart !== undefined) {
        return `${filters.releaseYearStart}+`;
    }
    if (filters.releaseYearEnd !== undefined) {
        return `Up to ${filters.releaseYearEnd}`;
    }
    return "All eras";
}

export default function FilterPanel({
    filters,
    onChange,
    analyticsMinPrice,
    onAnalyticsMinPriceChange,
}: Props) {
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
    const [workspaceOpen, setWorkspaceOpen] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            onChange({ search: searchInput || undefined, page: 1 });
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput, onChange]);

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
    }, [maxPriceInput, minPriceInput, onChange]);

    const clearFilters = () => {
        setSearchInput("");
        setMinPriceInput("");
        setMaxPriceInput("");
        onAnalyticsMinPriceChange(50);
        onChange({
            categoryId: undefined,
            groupIds: undefined,
            releaseYearStart: undefined,
            releaseYearEnd: undefined,
            rarities: undefined,
            subTypes: undefined,
            minPrice: undefined,
            maxPrice: undefined,
            search: undefined,
            watchlistId: undefined,
            maxRangePosition: undefined,
            page: 1,
        });
    };

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

    const groupOptions = useMemo<GroupOption[]>(
        () =>
            (filterOptions?.groups ?? [])
                .map((group) => ({
                    id: group.groupId,
                    label: group.name,
                    publishedOn: group.publishedOn,
                    releaseYear: group.releaseYear ?? null,
                }))
                .sort((left, right) => {
                    const yearDelta = (right.releaseYear ?? 0) - (left.releaseYear ?? 0);
                    if (yearDelta !== 0) return yearDelta;
                    return left.label.localeCompare(right.label);
                }),
        [filterOptions]
    );
    const rarityOptions = filterOptions?.rarities ?? [];
    const subTypeOptions = filterOptions?.subTypes ?? [];
    const releaseYears = filterOptions?.releaseYears ?? [];

    const selectedGroups = groupOptions.filter((group) =>
        filters.groupIds?.includes(group.id)
    );
    const selectedRarities = rarityOptions.filter((rarity) =>
        filters.rarities?.includes(rarity)
    );
    const selectedSubTypes = subTypeOptions.filter((subType) =>
        filters.subTypes?.includes(subType)
    );

    const activeFilterCount = [
        filters.categoryId,
        filters.groupIds?.length,
        filters.releaseYearStart,
        filters.releaseYearEnd,
        filters.rarities?.length,
        filters.subTypes?.length,
        filters.minPrice,
        filters.maxPrice,
        filters.search,
        filters.watchlistId,
    ].filter(Boolean).length;

    const recentReleaseYears = releaseYears.slice(0, 8);

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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <FilterListIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                    Filter Workspace
                </Typography>
                {activeFilterCount > 0 && <Chip label={activeFilterCount} size="small" color="primary" />}
                {activeFilterCount > 0 && (
                    <Button size="small" onClick={clearFilters} sx={{ ml: "auto" }}>
                        Clear All
                    </Button>
                )}
            </Box>

            <TextField
                fullWidth
                size="small"
                placeholder="Search cards or key names..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                slotProps={{
                    input: {
                        startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
                    },
                }}
                sx={{ mb: 2 }}
            />

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
                <Chip label={`Era: ${getEraSummary(filters)}`} color="primary" variant="outlined" />
                <Chip label={`Analytics floor: $${analyticsMinPrice.toFixed(0)}`} color="secondary" variant="outlined" />
                <Chip label={filters.groupIds?.length ? `${filters.groupIds.length} sets selected` : "All sets"} variant="outlined" />
                <Chip label={filters.rarities?.length ? `${filters.rarities.length} rarity filters` : "All rarities"} variant="outlined" />
                <Chip label={filters.subTypes?.length ? `${filters.subTypes.length} variants` : "All variants"} variant="outlined" />
            </Stack>

            <Button
                fullWidth
                variant="contained"
                startIcon={<TuneIcon />}
                onClick={() => setWorkspaceOpen(true)}
                sx={{ mb: 2 }}
            >
                Open Filter Workspace
            </Button>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Filter by Watchlist</InputLabel>
                <Select
                    value={filters.watchlistId ?? ""}
                    label="Filter by Watchlist"
                    onChange={(event) =>
                        onChange({
                            watchlistId: event.target.value ? Number(event.target.value) : undefined,
                            page: 1,
                        })
                    }
                >
                    <MenuItem value="">All Cards</MenuItem>
                    {watchlists?.map((watchlist) => (
                        <MenuItem key={watchlist.id} value={watchlist.id}>
                            {watchlist.name} ({watchlist.itemCount})
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <BookmarkIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2" fontWeight={700}>
                    Saved Filters
                </Typography>
                <Button size="small" onClick={() => setSaveDialogOpen(true)} sx={{ ml: "auto", textTransform: "none" }}>
                    Save Current
                </Button>
            </Box>
            {savedFilters && savedFilters.length > 0 ? (
                <List dense disablePadding>
                    {savedFilters.map((savedFilter) => (
                        <ListItem key={savedFilter.id} disablePadding>
                            <ListItemButton
                                onClick={() => handleLoadFilter(savedFilter.filterJson)}
                                sx={{ borderRadius: 1, py: 0.5 }}
                            >
                                <ListItemText
                                    primary={savedFilter.name}
                                    primaryTypographyProps={{ variant: "body2" }}
                                />
                            </ListItemButton>
                            <ListItemSecondaryAction>
                                <IconButton edge="end" size="small" onClick={() => deleteSavedFilter.mutate(savedFilter.id)}>
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

            <Dialog open={workspaceOpen} onClose={() => setWorkspaceOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>Filter Workspace</DialogTitle>
                <DialogContent>
                    <Box
                        sx={{
                            display: "grid",
                            gap: 3,
                            gridTemplateColumns: { xs: "1fr", xl: "1.2fr 1fr" },
                            pt: 1,
                        }}
                    >
                        <Stack spacing={3}>
                            <Paper sx={{ p: 2, border: "1px solid", borderColor: "divider" }}>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                                    Era Focus
                                </Typography>
                                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
                                    {ERA_PRESETS.map((preset) => (
                                        <Chip
                                            key={preset.key}
                                            label={`${preset.label} · ${preset.description}`}
                                            color={getEraPresetKey(filters) === preset.key ? "primary" : "default"}
                                            variant={getEraPresetKey(filters) === preset.key ? "filled" : "outlined"}
                                            onClick={() =>
                                                onChange({
                                                    releaseYearStart: preset.releaseYearStart,
                                                    releaseYearEnd: preset.releaseYearEnd,
                                                    page: 1,
                                                })
                                            }
                                        />
                                    ))}
                                </Stack>

                                <Box
                                    sx={{
                                        display: "grid",
                                        gap: 2,
                                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                                    }}
                                >
                                    <FormControl fullWidth size="small">
                                        <InputLabel>From Year</InputLabel>
                                        <Select
                                            value={filters.releaseYearStart ?? ""}
                                            label="From Year"
                                            onChange={(event) =>
                                                onChange({
                                                    releaseYearStart: event.target.value
                                                        ? Number(event.target.value)
                                                        : undefined,
                                                    page: 1,
                                                })
                                            }
                                        >
                                            <MenuItem value="">Any start year</MenuItem>
                                            {releaseYears.map((year) => (
                                                <MenuItem key={year} value={year}>
                                                    {year}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>To Year</InputLabel>
                                        <Select
                                            value={filters.releaseYearEnd ?? ""}
                                            label="To Year"
                                            onChange={(event) =>
                                                onChange({
                                                    releaseYearEnd: event.target.value
                                                        ? Number(event.target.value)
                                                        : undefined,
                                                    page: 1,
                                                })
                                            }
                                        >
                                            <MenuItem value="">Any end year</MenuItem>
                                            {releaseYears.map((year) => (
                                                <MenuItem key={year} value={year}>
                                                    {year}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>

                                {recentReleaseYears.length > 0 && (
                                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                                        {recentReleaseYears.map((year) => (
                                            <Chip
                                                key={year}
                                                label={`Only ${year}`}
                                                variant="outlined"
                                                onClick={() =>
                                                    onChange({
                                                        releaseYearStart: year,
                                                        releaseYearEnd: year,
                                                        page: 1,
                                                    })
                                                }
                                            />
                                        ))}
                                    </Stack>
                                )}
                            </Paper>

                            <Paper sx={{ p: 2, border: "1px solid", borderColor: "divider" }}>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                                    Set Browser
                                </Typography>
                                <Autocomplete
                                    multiple
                                    disableCloseOnSelect
                                    options={groupOptions}
                                    groupBy={(option) => `${option.releaseYear ?? "Unknown"}`}
                                    getOptionLabel={(option) => option.label}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    value={selectedGroups}
                                    onChange={(_, newValue) =>
                                        onChange({
                                            groupIds: newValue.length > 0 ? newValue.map((group) => group.id) : undefined,
                                            page: 1,
                                        })
                                    }
                                    renderOption={(props, option, { selected }) => {
                                        const { key, ...optionProps } = props;
                                        return (
                                            <li key={key} {...optionProps}>
                                                <Checkbox
                                                    icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                                                    checkedIcon={<CheckBoxIcon fontSize="small" />}
                                                    checked={selected}
                                                    sx={{ mr: 1 }}
                                                />
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography variant="body2">{option.label}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {option.publishedOn ?? "Release date unavailable"}
                                                    </Typography>
                                                </Box>
                                            </li>
                                        );
                                    }}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Search and select sets" placeholder="Type set names or years" />
                                    )}
                                />
                            </Paper>
                        </Stack>

                        <Stack spacing={3}>
                            <Paper sx={{ p: 2, border: "1px solid", borderColor: "divider" }}>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                                    Global Scope + Attributes
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Analytics Floor"
                                    type="number"
                                    value={analyticsMinPrice}
                                    onChange={(event) => {
                                        const nextValue = Number(event.target.value);
                                        onAnalyticsMinPriceChange(
                                            Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 1
                                        );
                                    }}
                                    slotProps={{
                                        input: {
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                        },
                                    }}
                                    sx={{ mb: 2 }}
                                />
                                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                    <InputLabel>Card Game</InputLabel>
                                    <Select
                                        value={filters.categoryId ?? ""}
                                        label="Card Game"
                                        onChange={(event) =>
                                            onChange({
                                                categoryId: event.target.value ? Number(event.target.value) : undefined,
                                                groupIds: undefined,
                                                page: 1,
                                            })
                                        }
                                    >
                                        <MenuItem value="">All Games</MenuItem>
                                        {filterOptions?.categories.map((category) => (
                                            <MenuItem key={category.categoryId} value={category.categoryId}>
                                                {category.displayName}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <Autocomplete
                                    multiple
                                    size="small"
                                    options={rarityOptions}
                                    value={selectedRarities}
                                    onChange={(_, newValue) =>
                                        onChange({
                                            rarities: newValue.length > 0 ? newValue : undefined,
                                            page: 1,
                                        })
                                    }
                                    renderInput={(params) => <TextField {...params} label="Rarities" />}
                                    sx={{ mb: 2 }}
                                />

                                <Autocomplete
                                    multiple
                                    size="small"
                                    options={subTypeOptions}
                                    value={selectedSubTypes}
                                    onChange={(_, newValue) =>
                                        onChange({
                                            subTypes: newValue.length > 0 ? newValue : undefined,
                                            page: 1,
                                        })
                                    }
                                    renderInput={(params) => <TextField {...params} label="Variants" />}
                                />
                            </Paper>

                            <Paper sx={{ p: 2, border: "1px solid", borderColor: "divider" }}>
                                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                                    Market Scanner Scope
                                </Typography>
                                <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                                    <TextField
                                        size="small"
                                        label="Min Price"
                                        type="number"
                                        value={minPriceInput}
                                        onChange={(event) => setMinPriceInput(event.target.value)}
                                        slotProps={{
                                            input: {
                                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                            },
                                        }}
                                    />
                                    <TextField
                                        size="small"
                                        label="Max Price"
                                        type="number"
                                        value={maxPriceInput}
                                        onChange={(event) => setMaxPriceInput(event.target.value)}
                                        slotProps={{
                                            input: {
                                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                            },
                                        }}
                                    />
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
                                    Search, watchlist, and price window narrow the market scanner. Era, game, set, rarity, variant, and analytics floor apply across the dashboard.
                                </Typography>
                            </Paper>

                            <Paper sx={{ p: 2, border: "1px solid", borderColor: "divider" }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                                    <PlaylistAddIcon fontSize="small" color="primary" />
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        Watchlists
                                    </Typography>
                                    <IconButton size="small" onClick={() => setWatchlistDialogOpen(true)} sx={{ ml: "auto" }}>
                                        <PlaylistAddIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Filter by Watchlist</InputLabel>
                                    <Select
                                        value={filters.watchlistId ?? ""}
                                        label="Filter by Watchlist"
                                        onChange={(event) =>
                                            onChange({
                                                watchlistId: event.target.value ? Number(event.target.value) : undefined,
                                                page: 1,
                                            })
                                        }
                                    >
                                        <MenuItem value="">All Cards</MenuItem>
                                        {watchlists?.map((watchlist) => (
                                            <MenuItem key={watchlist.id} value={watchlist.id}>
                                                {watchlist.name} ({watchlist.itemCount})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Paper>
                        </Stack>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={clearFilters}>Reset Filters</Button>
                    <Button onClick={() => setWorkspaceOpen(false)} variant="contained">
                        Done
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Save Current Filters</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        size="small"
                        label="Filter Name"
                        value={saveFilterName}
                        onChange={(event) => setSaveFilterName(event.target.value)}
                        autoFocus
                        sx={{ mt: 1 }}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") handleSaveFilter();
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

            <Dialog open={watchlistDialogOpen} onClose={() => setWatchlistDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Manage Watchlists</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: "flex", gap: 1, mb: 2, mt: 1 }}>
                        <TextField
                            size="small"
                            label="New Watchlist"
                            value={newWatchlistName}
                            onChange={(event) => setNewWatchlistName(event.target.value)}
                            fullWidth
                            onKeyDown={(event) => {
                                if (event.key === "Enter") handleCreateWatchlist();
                            }}
                        />
                        <Button onClick={handleCreateWatchlist} variant="contained">
                            Add
                        </Button>
                    </Box>
                    <List dense>
                        {watchlists?.map((watchlist) => (
                            <ListItem key={watchlist.id} disablePadding>
                                <ListItemText primary={watchlist.name} secondary={`${watchlist.itemCount} cards`} />
                                <ListItemSecondaryAction>
                                    <IconButton edge="end" size="small" onClick={() => deleteWatchlist.mutate(watchlist.id)}>
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