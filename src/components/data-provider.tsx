"use client";

import React, { createContext, useContext, useState, type ReactNode } from "react";

type DataSchema = {
  name: string;
  type: "string" | "number" | "date" | "boolean";
  sample: string;
};

type DatasetInfo = {
  id: string;
  name: string;
  schema: DataSchema[];
  rowCount: number;
  preview: Record<string, any>[];
  fullData?: Record<string, any>[]; // Optional full dataset for filtering
};

type FilterValue = {
  column: string;
  type: "category" | "date" | "numeric";
  value: any;
};

type CategoryFilter = {
  column: string;
  type: "category";
  selectedValues: string[];
  availableValues: string[];
};

type DateFilter = {
  column: string;
  type: "date";
  startDate: string | null;
  endDate: string | null;
  minDate: string;
  maxDate: string;
};

type NumericFilter = {
  column: string;
  type: "numeric";
  minValue: number | null;
  maxValue: number | null;
  rangeMin: number;
  rangeMax: number;
};

type Filter = CategoryFilter | DateFilter | NumericFilter;

type AnalysisResult = {
  data: any[];
  sql: string;
  displayType: "number" | "chart" | "table";
  explanations?: string; // Add explanations field
  interpretation: {
    aggregation: string;
    groupBy: string[];
    filters: any[];
    chartType: "bar" | "line" | "pie";
    displayType: "number" | "chart" | "table";
  };
};

type DataContextType = {
  currentDataset: DatasetInfo | null;
  setCurrentDataset: (dataset: DatasetInfo | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  currentAnalysis: AnalysisResult | null;
  setCurrentAnalysis: (analysis: AnalysisResult | null) => void;
  analysisMode: boolean;
  setAnalysisMode: (mode: boolean) => void;
  filters: Filter[];
  setFilters: (filters: Filter[]) => void;
  updateFilter: (columnName: string, filterUpdate: Partial<Filter>) => void;
  clearFilters: () => void;
  getFilteredData: (data: any[]) => any[];
  availableFilters: Filter[];
  setAvailableFilters: (filters: Filter[]) => void;
  chatHistory: Array<{
    id: string;
    type: "user" | "assistant";
    content: string;
    timestamp: Date;
    data?: any[];
    chartConfig?: {
      type: "bar" | "line" | "pie";
      xField: string;
      yField: string;
    };
    displayType?: "number" | "chart" | "table";
    sql?: string;
    explanations?: string;
  }>;
  addMessage: (message: {
    type: "user" | "assistant";
    content: string;
    data?: any[];
    chartConfig?: {
      type: "bar" | "line" | "pie";
      xField: string;
      yField: string;
    };
    displayType?: "number" | "chart" | "table";
    sql?: string;
    explanations?: string;
  }) => void;
  clearHistory: () => void;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [currentDataset, setCurrentDataset] = useState<DatasetInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisMode, setAnalysisMode] = useState(false);
  const [chatHistory, setChatHistory] = useState<DataContextType["chatHistory"]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [availableFilters, setAvailableFilters] = useState<Filter[]>([]);

  const addMessage = (message: Omit<DataContextType["chatHistory"][0], "id" | "timestamp">) => {
    const newMessage = {
      ...message,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    setChatHistory(prev => [...prev, newMessage]);
    
    // If this is an assistant message with analysis data, update analysis state
    if (message.type === "assistant" && message.data && message.displayType) {
      setCurrentAnalysis({
        data: message.data,
        sql: message.sql || "",
        displayType: message.displayType,
        explanations: message.explanations,
        interpretation: {
          aggregation: "count",
          groupBy: [],
          filters: [],
          chartType: message.chartConfig?.type || "bar",
          displayType: message.displayType,
        },
      });
      setAnalysisMode(true);
    }
  };

  const clearHistory = () => {
    setChatHistory([]);
    setCurrentAnalysis(null);
    setAnalysisMode(false);
  };

  const updateFilter = (columnName: string, filterUpdate: Partial<Filter>) => {
    setFilters(prevFilters => {
      const existingFilterIndex = prevFilters.findIndex(f => f.column === columnName);
      if (existingFilterIndex >= 0) {
        // Update existing filter
        const updatedFilters = [...prevFilters];
        updatedFilters[existingFilterIndex] = { ...updatedFilters[existingFilterIndex], ...filterUpdate } as Filter;
        return updatedFilters;
      } else {
        // Add new filter (need to find available filter to get full structure)
        const availableFilter = availableFilters.find(f => f.column === columnName);
        if (availableFilter) {
          return [...prevFilters, { ...availableFilter, ...filterUpdate } as Filter];
        }
        return prevFilters;
      }
    });
  };

  const clearFilters = () => {
    setFilters([]);
  };

  const getFilteredData = (data: any[]): any[] => {
    if (!data || data.length === 0 || filters.length === 0) {
      return data;
    }

    return data.filter(row => {
      return filters.every(filter => {
        const value = row[filter.column];

        if (filter.type === "category") {
          const categoryFilter = filter as CategoryFilter;
          return categoryFilter.selectedValues.length === 0 || 
                 categoryFilter.selectedValues.includes(String(value));
        }

        if (filter.type === "date") {
          const dateFilter = filter as DateFilter;
          const rowDate = new Date(value);
          const startDate = dateFilter.startDate ? new Date(dateFilter.startDate) : null;
          const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : null;
          
          if (startDate && rowDate < startDate) return false;
          if (endDate && rowDate > endDate) return false;
          return true;
        }

        if (filter.type === "numeric") {
          const numericFilter = filter as NumericFilter;
          const numValue = parseFloat(value);
          if (isNaN(numValue)) return true; // Skip non-numeric values
          
          if (numericFilter.minValue !== null && numValue < numericFilter.minValue) return false;
          if (numericFilter.maxValue !== null && numValue > numericFilter.maxValue) return false;
          return true;
        }

        return true;
      });
    });
  };

  return (
    <DataContext.Provider
      value={{
        currentDataset,
        setCurrentDataset,
        isLoading,
        setIsLoading,
        currentAnalysis,
        setCurrentAnalysis,
        analysisMode,
        setAnalysisMode,
        filters,
        setFilters,
        updateFilter,
        clearFilters,
        getFilteredData,
        availableFilters,
        setAvailableFilters,
        chatHistory,
        addMessage,
        clearHistory,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

// Export types for use in other components
export type { Filter, CategoryFilter, DateFilter, NumericFilter, DataSchema, DatasetInfo, AnalysisResult };
