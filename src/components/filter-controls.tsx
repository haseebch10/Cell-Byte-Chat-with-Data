"use client";

import React, { useState, useMemo } from "react";
import { Calendar, Hash, List, X, Filter as FilterIcon, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData, type Filter, type CategoryFilter, type DateFilter, type NumericFilter } from "@/components/data-provider";
import { cn } from "@/lib/utils";

interface FilterControlsProps {
  data: any[];
  onFiltersChange?: (filteredData: any[]) => void;
}

export function FilterControls({ data, onFiltersChange }: FilterControlsProps) {
  const { 
    filters, 
    updateFilter, 
    clearFilters, 
    getFilteredData,
    currentDataset,
    availableFilters,
    setAvailableFilters 
  } = useData();
  
  const [showFilters, setShowFilters] = useState(false);
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());

  // Generate available filters from current dataset schema and full dataset (not query results)
  const generatedFilters = useMemo(() => {
    if (!currentDataset) return [];
    
    // Use full dataset if available, otherwise use preview data for filter generation
    const datasetForFilters = currentDataset.fullData || currentDataset.preview;
    if (!datasetForFilters || datasetForFilters.length === 0) return [];

    return currentDataset.schema.map(column => {
      const values = datasetForFilters.map(row => row[column.name]).filter(val => val !== null && val !== undefined && val !== "");
      
      if (column.type === "string") {
        const uniqueValues = [...new Set(values.map(val => String(val)))].sort();
        
        // Skip single-value columns (not useful for filtering)
        if (uniqueValues.length < 2) {
          return null;
        }
        
        // Skip columns that are clearly descriptive text rather than categories
        const avgLength = uniqueValues.reduce((sum, val) => sum + val.length, 0) / uniqueValues.length;
        const hasLongValues = uniqueValues.some(val => val.length > 100);
        
        // Skip if values are too long (likely descriptions, not categories)
        if (avgLength > 50 || hasLongValues) {
          return null;
        }
        
        // Include all categorical columns that pass the above checks
        return {
          column: column.name,
          type: "category" as const,
          selectedValues: [],
          availableValues: uniqueValues,
        };
      }
      
      if (column.type === "date") {
        const dates = values.filter(val => !isNaN(Date.parse(val))).map(val => new Date(val).toISOString().split('T')[0]);
        const sortedDates = dates.sort();
        
        // Include all date columns that have valid dates
        if (sortedDates.length < 1) {
          return null;
        }
        
        return {
          column: column.name,
          type: "date" as const,
          startDate: null,
          endDate: null,
          minDate: sortedDates[0] || new Date().toISOString().split('T')[0],
          maxDate: sortedDates[sortedDates.length - 1] || sortedDates[0] || new Date().toISOString().split('T')[0],
        };
      }
      
      if (column.type === "number") {
        const numbers = values.map(val => parseFloat(val)).filter(val => !isNaN(val));
        
        // Include all numeric columns that have valid numbers
        if (numbers.length < 1) {
          return null;
        }
        
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);
        
        return {
          column: column.name,
          type: "numeric" as const,
          minValue: null,
          maxValue: null,
          rangeMin: min,
          rangeMax: max,
        };
      }
      
      return null;
    }).filter(filter => filter !== null) as Filter[];
  }, [currentDataset]);

  // Update available filters when they change
  React.useEffect(() => {
    if (generatedFilters.length > 0) {
      setAvailableFilters(generatedFilters);
    }
  }, [generatedFilters, setAvailableFilters]);

  // Apply filters and notify parent when filters change
  React.useEffect(() => {
    const filteredData = getFilteredData(data);
    onFiltersChange?.(filteredData);
  }, [filters, data, getFilteredData, onFiltersChange]);

  const activeFiltersCount = filters.length;

  const toggleFilterExpansion = (filterColumn: string) => {
    setExpandedFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filterColumn)) {
        newSet.delete(filterColumn);
      } else {
        newSet.add(filterColumn);
      }
      return newSet;
    });
  };

  const getFilterSummary = (filter: Filter) => {
    const activeFilter = filters.find(f => f.column === filter.column);
    if (!activeFilter) return null;

    switch (filter.type) {
      case "category":
        const catFilter = activeFilter as CategoryFilter;
        return catFilter.selectedValues.length > 0 
          ? `${catFilter.selectedValues.length} selected`
          : null;
      case "numeric":
        const numFilter = activeFilter as NumericFilter;
        const hasMin = numFilter.minValue !== null;
        const hasMax = numFilter.maxValue !== null;
        if (hasMin || hasMax) {
          return `${hasMin ? numFilter.minValue : 'min'} - ${hasMax ? numFilter.maxValue : 'max'}`;
        }
        return null;
      case "date":
        const dateFilter = activeFilter as DateFilter;
        const hasStart = dateFilter.startDate;
        const hasEnd = dateFilter.endDate;
        if (hasStart || hasEnd) {
          return `${hasStart || 'any'} to ${hasEnd || 'any'}`;
        }
        return null;
    }
    return null;
  };

  const renderCompactFilter = (filter: Filter) => {
    const isExpanded = expandedFilters.has(filter.column);
    const summary = getFilterSummary(filter);
    const hasActiveFilter = filters.some(f => f.column === filter.column);
    
    return (
      <div key={filter.column} className="border border-slate-200 rounded-lg overflow-hidden">
        {/* Filter Header */}
        <button
          onClick={() => toggleFilterExpansion(filter.column)}
          className={cn(
            "w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors",
            hasActiveFilter && "bg-purple-50"
          )}
        >
          <div className="flex items-center gap-2">
            {filter.type === "category" && <List className="w-4 h-4 text-slate-500" />}
            {filter.type === "numeric" && <Hash className="w-4 h-4 text-slate-500" />}
            {filter.type === "date" && <Calendar className="w-4 h-4 text-slate-500" />}
            <span className="font-medium text-slate-700 capitalize">
              {filter.column.replace(/_/g, ' ')}
            </span>
            {summary && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                {summary}
              </span>
            )}
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Filter Content */}
        {isExpanded && (
          <div className="p-3 border-t border-slate-200 bg-slate-50">
            {filter.type === "category" && renderCategoryFilterContent(filter as CategoryFilter)}
            {filter.type === "numeric" && renderNumericFilterContent(filter as NumericFilter)}
            {filter.type === "date" && renderDateFilterContent(filter as DateFilter)}
          </div>
        )}
      </div>
    );
  };

  const renderCategoryFilterContent = (filter: CategoryFilter) => {
    const activeFilter = filters.find(f => f.column === filter.column) as CategoryFilter || filter;
    
    return (
      <div className="max-h-48 overflow-y-auto space-y-1">
        {filter.availableValues.map(value => (
          <label key={value} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-100 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={activeFilter.selectedValues.includes(value)}
              onChange={(e) => {
                const newSelectedValues = e.target.checked 
                  ? [...activeFilter.selectedValues, value]
                  : activeFilter.selectedValues.filter(v => v !== value);
                updateFilter(filter.column, { selectedValues: newSelectedValues });
              }}
              className="rounded"
            />
            <span className="text-sm text-slate-700">{value}</span>
          </label>
        ))}
      </div>
    );
  };

  const renderDateFilterContent = (filter: DateFilter) => {
    const activeFilter = filters.find(f => f.column === filter.column) as DateFilter || filter;
    
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">From</Label>
          <Input
            type="date"
            value={activeFilter.startDate || ""}
            onChange={(e) => updateFilter(filter.column, { startDate: e.target.value || null })}
            min={filter.minDate}
            max={filter.maxDate}
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">To</Label>
          <Input
            type="date"
            value={activeFilter.endDate || ""}
            onChange={(e) => updateFilter(filter.column, { endDate: e.target.value || null })}
            min={filter.minDate}
            max={filter.maxDate}
            className="text-sm"
          />
        </div>
      </div>
    );
  };

  const renderNumericFilterContent = (filter: NumericFilter) => {
    const activeFilter = filters.find(f => f.column === filter.column) as NumericFilter || filter;
    
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">Min</Label>
          <Input
            type="number"
            placeholder={`${filter.rangeMin}`}
            value={activeFilter.minValue !== null ? activeFilter.minValue : ""}
            onChange={(e) => updateFilter(filter.column, { 
              minValue: e.target.value ? parseFloat(e.target.value) : null 
            })}
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">Max</Label>
          <Input
            type="number"
            placeholder={`${filter.rangeMax}`}
            value={activeFilter.maxValue !== null ? activeFilter.maxValue : ""}
            onChange={(e) => updateFilter(filter.column, { 
              maxValue: e.target.value ? parseFloat(e.target.value) : null 
            })}
            className="text-sm"
          />
        </div>
      </div>
    );
  };

  if (!currentDataset) {
    return null;
  }

  // Don't show filters if no filterable columns available
  if (availableFilters.length === 0) {
    // Show a message for large datasets where we don't have full data
    const datasetForFilters = currentDataset.fullData || currentDataset.preview;
    if (!datasetForFilters || datasetForFilters.length === 0) {
      return null;
    }
    
    // If we only have preview data and no filters generated, show a message
    if (!currentDataset.fullData && availableFilters.length === 0) {
      return (
        <div className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">
          📊 Dataset too large for client-side filtering. Filters work with datasets under 5,000 rows.
        </div>
      );
    }
    
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <FilterIcon className="w-4 h-4" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="bg-purple-600 text-white text-xs rounded-full px-2 py-1 min-w-5 h-5 flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </div>

      {/* Compact Filter Panel */}
      {showFilters && (
        <Card className="p-4 max-w-md">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-slate-900">Filters</h3>
              <div className="flex items-center gap-2">
                {filters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Clear All
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Compact Filter List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableFilters.map(filter => renderCompactFilter(filter))}
            </div>
            
            {filters.length > 0 && (
              <div className="text-xs text-slate-500 pt-2 border-t">
                Showing {getFilteredData(data).length} of {data.length} rows
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
