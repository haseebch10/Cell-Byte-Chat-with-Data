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
};

type AnalysisResult = {
  data: any[];
  sql: string;
  displayType: "number" | "chart" | "table";
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
