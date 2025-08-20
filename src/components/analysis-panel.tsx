"use client";

import React, { useState, useEffect } from "react";
import { Database, Table, BarChart3, Download, Copy, ArrowLeft, BarChart, LineChart, PieChart, TableProperties } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useData } from "@/components/data-provider";
import { DataVisualization } from "@/components/data-visualization";
import { FilterControls } from "@/components/filter-controls";
import { downloadAsCSV } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function AnalysisPanel() {
  const { 
    currentDataset, 
    currentAnalysis, 
    analysisMode, 
    setAnalysisMode 
  } = useData();
  
  const [selectedChartType, setSelectedChartType] = useState<"bar" | "line" | "pie">("bar");
  const [selectedViewType, setSelectedViewType] = useState<"chart" | "table">("chart");
  const [filteredData, setFilteredData] = useState<any[]>([]);

  // Initialize filtered data when analysis changes
  useEffect(() => {
    if (currentAnalysis?.data) {
      setFilteredData(currentAnalysis.data);
    }
  }, [currentAnalysis]);

  const handleFiltersChange = (newFilteredData: any[]) => {
    setFilteredData(newFilteredData);
  };

  const exportResults = (data: any[], filename: string) => {
    downloadAsCSV(data, `${filename}-results.csv`);
  };

  const renderNumberDisplay = (data: any[]) => {
    if (!data || data.length === 0) return null;
    
    const value = Object.values(data[0])[0] as number;
    const label = Object.keys(data[0])[0];
    
    return (
      <div className="text-center py-8">
        <div className="text-5xl font-bold text-purple-600 mb-2">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        <div className="text-lg text-slate-600 capitalize">
          {label.replace(/_/g, ' ')}
        </div>
      </div>
    );
  };

  const renderTableDisplay = (data: any[]) => {
    if (!data || data.length === 0) return null;

    const columns = Object.keys(data[0]);

    return (
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="text-left px-4 py-3 font-medium text-slate-700 border-b border-slate-200">
                    {col.replace(/_/g, ' ').toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-3 text-slate-900">
                      {typeof row[col] === 'number' ? row[col].toLocaleString() : String(row[col] || '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderChartDisplay = (data: any[]) => {
    if (!data || data.length === 0) return null;
    
    const dataToUse = filteredData.length > 0 ? filteredData : data;
    
    const chartConfig = {
      type: selectedChartType,
      xField: Object.keys(dataToUse[0] || {})[0] || "x",
      yField: Object.keys(dataToUse[0] || {})[1] || "y",
    };

    return (
      <div>
        {/* View Type Selector */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={selectedViewType === "chart" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedViewType("chart")}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Chart
          </Button>
          <Button
            variant={selectedViewType === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedViewType("table")}
            className="flex items-center gap-2"
          >
            <TableProperties className="w-4 h-4" />
            Table
          </Button>
        </div>

        {selectedViewType === "chart" ? (
          <div>
            {/* Chart Type Selector */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={selectedChartType === "bar" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedChartType("bar")}
                className="flex items-center gap-2"
              >
                <BarChart className="w-4 h-4" />
                Bar
              </Button>
              <Button
                variant={selectedChartType === "line" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedChartType("line")}
                className="flex items-center gap-2"
              >
                <LineChart className="w-4 h-4" />
                Line
              </Button>
              <Button
                variant={selectedChartType === "pie" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedChartType("pie")}
                className="flex items-center gap-2"
              >
                <PieChart className="w-4 h-4" />
                Pie
              </Button>
            </div>

            {/* Chart Visualization */}
            <DataVisualization
              data={dataToUse}
              chartConfig={chartConfig}
            />
          </div>
        ) : (
          renderTableDisplay(dataToUse)
        )}
      </div>
    );
  };

  // Show loading state when no dataset
  if (!currentDataset) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Load a dataset to start analysis</p>
        </div>
      </div>
    );
  }

  // Show analysis results when in analysis mode
  if (analysisMode && currentAnalysis) {
    return (
      <div className="h-full flex flex-col space-y-6">
        {/* Analysis Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAnalysisMode(false)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Overview
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportResults(currentAnalysis.data, `analysis-${Date.now()}`)}
          >
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
        </div>

        {/* SQL Query Display */}
        <div className="bg-slate-50 p-4 rounded-lg border">
          <h3 className="font-semibold text-slate-900 mb-2">Generated SQL</h3>
          <code className="text-sm text-slate-700 bg-slate-100 px-2 py-1 rounded">
            {currentAnalysis.sql}
          </code>
        </div>

        {/* Filter Controls */}
        <FilterControls 
          data={currentAnalysis.data} 
          onFiltersChange={handleFiltersChange}
        />

        {/* Results Display */}
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Analysis Results</h2>
          
          {currentAnalysis.displayType === "number" ? 
            renderNumberDisplay(filteredData.length > 0 ? filteredData : currentAnalysis.data) : 
            currentAnalysis.displayType === "table" ?
            renderTableDisplay(filteredData.length > 0 ? filteredData : currentAnalysis.data) :
            renderChartDisplay(currentAnalysis.data)
          }
        </div>

        {/* Raw Data Table for Chart Results Only */}
        {currentAnalysis.displayType === "chart" && selectedViewType === "chart" && currentAnalysis.data.length > 0 && (
          <div className="border-t border-slate-200 pt-6">
            <h3 className="font-semibold text-slate-900 mb-3">
              Raw Data {filteredData.length !== currentAnalysis.data.length && `(${filteredData.length} of ${currentAnalysis.data.length} rows)`}
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {Object.keys((filteredData.length > 0 ? filteredData[0] : currentAnalysis.data[0]) || {}).map((key) => (
                        <th key={key} className="text-left px-3 py-2 font-medium text-slate-700 border-b border-slate-200">
                          {key.replace(/_/g, ' ').toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(filteredData.length > 0 ? filteredData : currentAnalysis.data).slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        {Object.values(row).map((value, j) => (
                          <td key={j} className="px-3 py-2 text-slate-900">
                            {typeof value === 'number' ? value.toLocaleString() : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show dataset overview by default
  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Dataset Overview Stats */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Dataset Overview</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-slate-50 rounded-lg border">
            <div className="text-2xl font-bold text-slate-900">{currentDataset.rowCount.toLocaleString()}</div>
            <div className="text-sm text-slate-600">Rows</div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg border">
            <div className="text-2xl font-bold text-slate-900">{currentDataset.schema.length}</div>
            <div className="text-sm text-slate-600">Columns</div>
          </div>
        </div>
      </div>

      {/* Schema */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-3">Schema</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {currentDataset.schema.map((col) => (
            <div key={col.name} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
              <div className="flex-1">
                <div className="font-medium text-sm text-slate-900">{col.name}</div>
                <div className="text-xs text-slate-500">{col.sample}</div>
              </div>
              <div className="text-xs px-2 py-1 bg-slate-200 text-slate-700 rounded">
                {col.type}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Preview - First 5 Rows */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Data Preview</h3>
          <Button variant="outline" size="sm" onClick={() => exportResults(currentDataset.preview, "preview")}>
            <Download className="w-3 h-3 mr-1" />
            Export CSV
          </Button>
        </div>
        
        <div className="text-sm text-slate-600 mb-3">
          First {Math.min(5, currentDataset.preview.length)} rows:
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {currentDataset.schema.map((col) => (
                    <th key={col.name} className="text-left px-3 py-2 font-medium text-slate-700 border-b border-slate-200">
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {currentDataset.preview.slice(0, 5).map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {currentDataset.schema.map((col) => (
                      <td key={col.name} className="px-3 py-2 text-slate-900 max-w-[120px] truncate">
                        {String(row[col.name] || '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
