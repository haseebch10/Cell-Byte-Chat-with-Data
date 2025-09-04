"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Database, Table, BarChart3, Download, ArrowLeft, BarChart, LineChart, PieChart, TableProperties } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useData } from "@/components/data-provider";
import { DataVisualization } from "@/components/data-visualization";
import { DynamicChart } from "@/components/dynamic-chart";
import { FilterControls } from "@/components/filter-controls";
import { downloadAsCSV, downloadAsPNG, generateExportFilename } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { tRPCClient } from "@/lib/trpc-client";
import { 
  TableSkeleton,
  EmptyState,
  LoadingSpinner
} from "@/components/ui/loading-states";

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
  const [dynamicChartHtml, setDynamicChartHtml] = useState<string>("");
  const [isGeneratingChart, setIsGeneratingChart] = useState(false);
  const [chartGenerationError, setChartGenerationError] = useState<string>("");

  // Check if we should use dynamic chart generation
  // Now we use dynamic generation for ALL chart types, not just advanced ones
  const shouldUseDynamicChart = (query: string): boolean => {
    // Always use dynamic generation for chart display types
    return true;
  };

  // Generate custom chart using LLM
  const generateCustomChart = useCallback(async (originalQuery: string, data: any[], schema: any[]) => {
    if (!currentDataset || !data || data.length === 0) return;

    setIsGeneratingChart(true);
    setChartGenerationError("");
    setDynamicChartHtml("");

    try {
      // Determine chart type from the analysis or query
      let chartType: string = currentAnalysis?.interpretation?.chartType || "bar";
      
      // Override with more specific chart type if mentioned in query
      const lowerQuery = originalQuery.toLowerCase();
      if (lowerQuery.includes("line") || lowerQuery.includes("trend")) {
        chartType = "line";
      } else if (lowerQuery.includes("pie") || lowerQuery.includes("distribution") || lowerQuery.includes("percentage")) {
        chartType = "pie";
      } else if (lowerQuery.includes("heatmap")) {
        chartType = "heatmap";
      } else if (lowerQuery.includes("scatter")) {
        chartType = "scatter";
      } else if (lowerQuery.includes("area")) {
        chartType = "area";
      }

      const result = await tRPCClient.generateChart(
        originalQuery,
        data,
        schema,
        chartType
      );

      console.log("Chart generation result:", result);
      console.log("Result success:", result.success);
      console.log("Result code exists:", !!result.code);
      console.log("Result code length:", result.code?.length);

      if (result.success && result.code) {
        setDynamicChartHtml(result.code);
        console.log("Chart code set successfully, length:", result.code.length);
      } else {
        console.error("Chart generation failed:", result.error);
        console.error("Result object:", JSON.stringify(result, null, 2));
        setChartGenerationError(result.error || "Failed to generate custom chart");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setChartGenerationError(`Chart generation failed: ${errorMessage}`);
    } finally {
      setIsGeneratingChart(false);
    }
  }, [currentDataset, currentAnalysis]);

  // Initialize filtered data when analysis changes
  useEffect(() => {
    if (currentAnalysis?.data) {
      setFilteredData(currentAnalysis.data);
    }
  }, [currentAnalysis]);

  // Generate dynamic chart when needed
  useEffect(() => {
    if (!currentAnalysis?.data || !currentAnalysis?.originalQuery) return;
    
    const dataToUse = filteredData.length > 0 ? filteredData : currentAnalysis.data;
    const useDynamicChart = shouldUseDynamicChart(currentAnalysis.originalQuery);
    
    // Only generate for chart display types, and only if not already generated
    if (useDynamicChart && 
        currentAnalysis.displayType === "chart" && 
        !dynamicChartHtml && 
        !isGeneratingChart && 
        !chartGenerationError) {
      generateCustomChart(currentAnalysis.originalQuery, dataToUse, currentDataset?.schema || []);
    }
  }, [currentAnalysis, filteredData, dynamicChartHtml, isGeneratingChart, chartGenerationError, currentDataset?.schema, generateCustomChart]);

  const handleFiltersChange = (newFilteredData: any[]) => {
    setFilteredData(newFilteredData);
  };

  const exportCSV = () => {
    if (!currentAnalysis) return;
    
    const dataToExport = filteredData.length > 0 ? filteredData : currentAnalysis.data;
    const baseName = `${currentDataset?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'analysis'}-results`;
    const filename = generateExportFilename(baseName, "csv");
    
    downloadAsCSV(dataToExport, filename);
  };

  const exportPNG = async () => {
    if (!currentAnalysis || currentAnalysis.displayType === "table") return;
    
    const chartElement = document.querySelector('[data-chart-container="true"]') as HTMLElement;
    if (!chartElement) {
      console.error("Chart element not found for PNG export");
      return;
    }
    
    try {
      const baseName = `${currentDataset?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'analysis'}-${currentAnalysis.displayType}`;
      const filename = generateExportFilename(baseName, "png");
      
      await downloadAsPNG(chartElement, filename);
    } catch (error) {
      console.error("Failed to export visualization:", error);
    }
  };

  const renderNumberDisplay = (data: any[]) => {
    if (!data || data.length === 0) return null;
    
    const value = Object.values(data[0])[0] as number;
    const label = Object.keys(data[0])[0];
    
    return (
      <div className="text-center py-8" data-chart-container="true">
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
    
    // Check if we should use dynamic chart generation
    const originalQuery = currentAnalysis?.originalQuery || "";
    const useDynamicChart = shouldUseDynamicChart(originalQuery);

    const chartConfig = {
      type: selectedChartType,
      xField: Object.keys(dataToUse[0] || {})[0] || "x",
      yField: Object.keys(dataToUse[0] || {})[1] || "y",
    };

    return (
      <div>
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
            {useDynamicChart ? (
              <div>
                {isGeneratingChart ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                      <LoadingSpinner size="lg" />
                      <p className="mt-2 text-sm text-slate-600">Generating dynamic chart...</p>
                    </div>
                  </div>
                ) : chartGenerationError ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="text-center text-red-600">
                      <p className="text-sm mb-2">{chartGenerationError}</p>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateCustomChart(originalQuery, dataToUse, currentDataset?.schema || [])}
                          className="mr-2"
                        >
                          Retry Dynamic Generation
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setChartGenerationError("");
                            setDynamicChartHtml("");
                          }}
                        >
                          Use Standard Charts
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : dynamicChartHtml ? (
                  <div data-chart-container="true">
                    <DynamicChart chartCode={dynamicChartHtml} data={dataToUse} />
                  </div>
                ) : (
                  // Fallback to standard charts while dynamic generation is loading
                  <div>
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

                    <div data-chart-container="true">
                      <DataVisualization
                        data={dataToUse}
                        chartConfig={chartConfig}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Fallback to standard charts (should not happen with current logic, but kept for safety)
              <div>
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

                <div data-chart-container="true">
                  <DataVisualization
                    data={dataToUse}
                    chartConfig={chartConfig}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          renderTableDisplay(dataToUse)
        )}
      </div>
    );
  };

  // Enhanced empty state when no dataset
  if (!currentDataset) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <EmptyState
          icon={Database}
          title="No Dataset Loaded"
          description="Upload a CSV file or load sample data from the left panel to start analyzing your data and viewing insights here."
          className="max-w-md"
          variant="simple"
        />
      </div>
    );
  }

  // Show analysis results when in analysis mode
  if (analysisMode && currentAnalysis) {
    return (
      <div className="space-y-6 p-6 overflow-y-auto">
        <div className="flex items-center justify-between flex-shrink-0">
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
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border flex-shrink-0">
          <h3 className="font-semibold text-slate-900 mb-2">Generated SQL</h3>
          <code className="text-sm text-slate-700 bg-slate-100 px-2 py-1 rounded">
            {currentAnalysis.sql}
          </code>
        </div>

        <div className="flex-shrink-0">
          <FilterControls 
            data={currentAnalysis.data} 
            onFiltersChange={handleFiltersChange}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Analysis Results</h2>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportCSV}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Data
              </Button>
              
              {(currentAnalysis.displayType === "chart" && selectedViewType === "chart") || currentAnalysis.displayType === "number" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportPNG}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export {currentAnalysis.displayType === "number" ? "Image" : "Chart"}
                </Button>
              ) : null}
            </div>
          </div>
          
          {currentAnalysis.displayType === "number" ? 
            renderNumberDisplay(filteredData.length > 0 ? filteredData : currentAnalysis.data) : 
            currentAnalysis.displayType === "table" ?
            renderTableDisplay(filteredData.length > 0 ? filteredData : currentAnalysis.data) :
            renderChartDisplay(currentAnalysis.data)
          }
        </div>

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

  // Enhanced dataset overview with responsive design and loading states  
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 space-y-4 sm:space-y-6 overflow-y-auto p-4 sm:p-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">Dataset Overview</CardTitle>
              <p className="text-sm text-slate-600 mt-1 truncate">
                {currentDataset.name}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Active Dataset
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 bg-slate-50 rounded-lg border">
              <div className="text-xl sm:text-2xl font-bold text-slate-900">
                {currentDataset.rowCount?.toLocaleString() || 0}
              </div>
              <div className="text-xs sm:text-sm text-slate-600">Rows</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-slate-50 rounded-lg border">
              <div className="text-xl sm:text-2xl font-bold text-slate-900">
                {currentDataset.schema?.length || 0}
              </div>
              <div className="text-xs sm:text-sm text-slate-600">Columns</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-xl sm:text-2xl font-bold text-purple-900">
                {currentDataset.schema?.filter(col => col.type === 'number').length || 0}
              </div>
              <div className="text-xs sm:text-sm text-purple-600">Numeric</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xl sm:text-2xl font-bold text-blue-900">
                {currentDataset.schema?.filter(col => col.type === 'date').length || 0}
              </div>
              <div className="text-xs sm:text-sm text-blue-600">Dates</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Column Schema</CardTitle>
        </CardHeader>
        <CardContent>
          {currentDataset.schema && currentDataset.schema.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {currentDataset.schema.map((col) => (
                <div key={col.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="font-medium text-sm text-slate-900 truncate">{col.name}</div>
                    <div className="text-xs text-slate-500 truncate mt-1">
                      {col.sample ? `Sample: ${col.sample}` : 'No sample data'}
                    </div>
                  </div>
                  <div className={cn(
                    "text-xs px-2 py-1 rounded-full font-medium flex-shrink-0",
                    col.type === 'number' ? "bg-purple-100 text-purple-700" :
                    col.type === 'date' ? "bg-blue-100 text-blue-700" :
                    "bg-slate-200 text-slate-700"
                  )}>
                    {col.type}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <TableSkeleton rows={3} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg">Data Preview</CardTitle>
              <p className="text-sm text-slate-600">
                First {Math.min(5, currentDataset.preview?.length || 0)} rows
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                if (currentDataset?.preview) {
                  const filename = generateExportFilename(`${currentDataset.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'dataset'}-preview`, "csv");
                  downloadAsCSV(currentDataset.preview, filename);
                }
              }}
              className="w-full sm:w-auto"
            >
              <Download className="w-3 h-3 mr-1" />
              Export Preview
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {currentDataset.preview && currentDataset.preview.length > 0 ? (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {currentDataset.schema?.map((col) => (
                        <th key={col.name} className="text-left px-3 py-3 font-medium text-slate-700 border-b border-slate-200 min-w-[100px]">
                          <div className="truncate">{col.name}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentDataset.preview.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        {currentDataset.schema?.map((col) => (
                          <td key={col.name} className="px-3 py-3 text-slate-900 max-w-[150px]">
                            <div className="truncate" title={String(row[col.name] || '-')}>
                              {String(row[col.name] || '-')}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <EmptyState
                icon={Table}
                title="No Preview Data"
                description="Data preview is not available for this dataset."
                className="py-4"
                variant="simple"
              />
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
