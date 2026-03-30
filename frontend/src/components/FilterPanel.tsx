import { useState, useEffect, useCallback } from "react";
import {
    Box,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Slider,
    Typography,
    Button,
    Paper,
    Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useFilters } from "../hooks/useProducts";
import type { ProductFilters } from "../types";

interface Props {
    filters: ProductFilters;
    onChange: (filters: Partial<ProductFilters>) => void;
}

export default function FilterPanel({ filters, onChange }: Props) {
    const { data: filterOptions } = useFilters(filters.categoryId);
    const [searchInput, setSearchInput] = useState(filters.search || "");
    const [priceRange, setPriceRange] = useState<number[]>([
        filters.minPrice ?? 0,
        filters.maxPrice ?? 500,
    ]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            onChange({ search: searchInput || undefined, page: 1 });
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handlePriceCommit = useCallback(() => {
        onChange({
            minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
            maxPrice: priceRange[1] < 500 ? priceRange[1] : undefined,
            page: 1,
        });
    }, [priceRange, onChange]);

    const clearFilters = () => {
        setSearchInput("");
        setPriceRange([0, 500]);
        onChange({
            categoryId: undefined,
            groupId: undefined,
            rarity: undefined,
            subType: undefined,
            minPrice: undefined,
            maxPrice: undefined,
            search: undefined,
            page: 1,
        });
    };

    const activeFilterCount = [
        filters.categoryId,
        filters.groupId,
        filters.rarity,
        filters.subType,
        filters.minPrice,
        filters.maxPrice,
        filters.search,
    ].filter(Boolean).length;

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

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Card Game</InputLabel>
                <Select
                    value={filters.categoryId ?? ""}
                    label="Card Game"
                    onChange={(e) =>
                        onChange({
                            categoryId: e.target.value ? Number(e.target.value) : undefined,
                            groupId: undefined,
                            rarity: undefined,
                            subType: undefined,
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

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Set</InputLabel>
                <Select
                    value={filters.groupId ?? ""}
                    label="Set"
                    onChange={(e) =>
                        onChange({
                            groupId: e.target.value ? Number(e.target.value) : undefined,
                            page: 1,
                        })
                    }
                >
                    <MenuItem value="">All Sets</MenuItem>
                    {filterOptions?.groups.map((g) => (
                        <MenuItem key={g.groupId} value={g.groupId}>
                            {g.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Rarity</InputLabel>
                <Select
                    value={filters.rarity ?? ""}
                    label="Rarity"
                    onChange={(e) =>
                        onChange({
                            rarity: e.target.value || undefined,
                            page: 1,
                        })
                    }
                >
                    <MenuItem value="">All Rarities</MenuItem>
                    {filterOptions?.rarities.map((r) => (
                        <MenuItem key={r} value={r}>
                            {r}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Variant</InputLabel>
                <Select
                    value={filters.subType ?? ""}
                    label="Variant"
                    onChange={(e) =>
                        onChange({
                            subType: e.target.value || undefined,
                            page: 1,
                        })
                    }
                >
                    <MenuItem value="">All Variants</MenuItem>
                    {filterOptions?.subTypes.map((s) => (
                        <MenuItem key={s} value={s}>
                            {s}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <Box sx={{ px: 1, mb: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Market Price Range
                </Typography>
                <Slider
                    value={priceRange}
                    onChange={(_, val) => setPriceRange(val as number[])}
                    onChangeCommitted={handlePriceCommit}
                    min={0}
                    max={500}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `$${v}`}
                    sx={{ mt: 1 }}
                />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption" color="text.secondary">
                        ${priceRange[0]}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        ${priceRange[1]}
                        {priceRange[1] >= 500 ? "+" : ""}
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );
}
