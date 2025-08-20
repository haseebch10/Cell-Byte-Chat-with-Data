"use client";

import React, { useState, useCallback } from "react";
import { Send, Upload, Database, FileText, User, BarChart3, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useData } from "@/components/data-provider";
import { cn } from "@/lib/utils";
import { 
  LoadingSpinner, 
  ContextualLoading, 
  ErrorState, 
  EmptyState, 
  ProgressIndicator 
} from "@/components/ui/loading-states";


// tRPC client for HTTP endpoints
const tRPCClient = {
  async getSampleData(dataset: "germany_sample" | "treatment_costs") {
    const inputParam = JSON.stringify({
      "0": {
        "json": { dataset }
      }
    });
    
    const url = `/api/trpc/data.getSampleData?batch=1&input=${encodeURIComponent(inputParam)}`;
    
    const response = await fetch(url, {
      method: "GET",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json();
    
    if (data[0]?.result?.data?.json) {
      return data[0].result.data.json;
    } else if (data[0]?.result?.data) {
      return data[0].result.data;
    } else if (data[0]?.result) {
      return data[0].result;
    } else {
      throw new Error("Unexpected response structure");
    }
  },
  
  async processCSV(csvData: string, filename: string) {
    const response = await fetch("/api/trpc/data.processCSV", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "json": { csvData, filename } }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json();
    
    // Handle nested structure like getSampleData
    if (data.result?.data?.json) {
      return data.result.data.json;
    } else if (data.result?.data) {
      const resultData = data.result.data;
      if (resultData.json) {
        return resultData.json;
      } else {
        return resultData;
      }
    } else if (data.json) {
      return data.json;
    } else if (data.success !== undefined) {
      return data;
    }
    
    throw new Error("Unexpected response format from server");
  },

  async processQuery(query: string, datasetId: string) {
    const response = await fetch("/api/trpc/data.processQuery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "json": { query, datasetId } }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Handle response format
    if (data?.result?.data) {
      return data.result.data;
    } else if (data?.success !== undefined) {
      return data;
    } else {
      throw new Error("Unexpected response format from server");
    }
  }
};

export function QueryInterface() {
  const { currentDataset, setCurrentDataset, addMessage, isLoading, setIsLoading, chatHistory } = useData();
  const [inputValue, setInputValue] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Enhanced state management for better UX
  const [loadingType, setLoadingType] = useState<"upload" | "processing" | "analyzing" | null>(null);
  const [error, setError] = useState<{
    type: "error" | "warning" | "network" | "api";
    message: string;
    title?: string;
    retryAction?: () => void;
  } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    step: number;
    steps: string[];
  } | null>(null);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !currentDataset || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsLoading(true);
    setLoadingType("analyzing");
    setError(null);

    addMessage({ type: "user", content: userMessage });

    const retryQuery = () => {
      setError(null);
      setInputValue(userMessage);
      handleSubmit(e);
    };

    try {
      if (!currentDataset.id) {
        throw new Error("Dataset ID is missing. Please reload the dataset.");
      }

      const result = await tRPCClient.processQuery(userMessage, currentDataset.id);

      // Handle response structure
      const data = result.json || result;
      
      if (data.success) {
        // Show generated SQL query and explanations
        let content = `Here are the results for your query:\n\n**Generated SQL:** \`${data.sql || "No SQL generated"}\`\n\n`;
        
        // Add explanations if available
        if (data.explanations) {
          content += `**Analysis Explanation:**\n${data.explanations}\n\n`;
        }
        
        if (data.result && data.result.length > 0) {
          if (data.displayType === "number") {
            const value = Object.values(data.result[0])[0];
            const label = Object.keys(data.result[0])[0];
            content += `**Result:** ${typeof value === 'number' ? value.toLocaleString() : value} ${label.replace(/_/g, ' ')}`;
          } else if (data.displayType === "table") {
            content += `**Results:** Found ${data.result.length} record${data.result.length !== 1 ? 's' : ''}. View the filtered data in the table on the right →`;
          } else {
            content += `**Results:** Found ${data.result.length} record${data.result.length !== 1 ? 's' : ''}. View the analysis in the panel on the right →`;
          }
          
          addMessage({
            type: "assistant",
            content,
            data: data.result,
            displayType: data.displayType || "chart",
            sql: data.sql,
            explanations: data.explanations,
          });
        } else {
          // No results but query was successful
          content += "**No results found for your query.**";
          addMessage({ 
            type: "assistant", 
            content,
            sql: data.sql,
          });
        }
      } else {
        // Query failed - show error state instead of chat message
        const errorMsg = data.error || data.details || "Unknown error occurred";
        
        // Determine error type based on message content
        let errorType: "error" | "api" | "network" = "error";
        if (errorMsg.includes("OpenAI") || errorMsg.includes("API key")) {
          errorType = "api";
        } else if (errorMsg.includes("network") || errorMsg.includes("timeout")) {
          errorType = "network";
        }
        
        setError({
          type: errorType,
          title: "Query Failed",
          message: errorMsg,
          retryAction: retryQuery
        });
        
        // Also add to chat for context
        const sqlInfo = data.sql ? `\n\n**Generated SQL:** \`${data.sql}\`` : "";
        addMessage({ 
          type: "assistant", 
          content: `❌ Query failed: ${errorMsg}${sqlInfo}` 
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      
      setError({
        type: "network",
        title: "Connection Error", 
        message: errorMessage,
        retryAction: retryQuery
      });
      
      addMessage({ type: "assistant", content: `Error: ${errorMessage}` });
    } finally {
      setIsLoading(false);
      setLoadingType(null);
    }
  };

  const processFile = useCallback(async (file: File) => {
    // Clear any existing errors
    setError(null);
    
    // Validate file type
    if (!file.name.endsWith(".csv")) {
      setError({
        type: "warning",
        title: "Invalid File Type",
        message: "Please upload a CSV file. Only .csv files are supported for data analysis.",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError({
        type: "warning",
        title: "File Too Large",
        message: `File size is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Please upload a file smaller than 5MB for optimal performance.`,
      });
      return;
    }

    setUploadedFile(file);
    setIsLoading(true);
    setLoadingType("upload");
    
    // Set up progress tracking
    const steps = ["Reading", "Processing", "Analyzing", "Complete"];
    setUploadProgress({ step: 0, steps });

    const retryUpload = () => {
      setError(null);
      processFile(file);
    };

    try {
      // Step 1: Reading file
      setUploadProgress({ step: 0, steps });
      const csvData = await file.text();
      
      // Step 2: Processing 
      setUploadProgress({ step: 1, steps });
      const result = await tRPCClient.processCSV(csvData, file.name);

      // Step 3: Analyzing
      setUploadProgress({ step: 2, steps });
      
      if (result.success) {
        const datasetId = result.datasetId || Math.random().toString(36).substr(2, 9);
        
        setCurrentDataset({
          id: datasetId,
          name: result.filename || file.name,
          schema: result.schema || [],
          rowCount: result.rowCount || 0,
          preview: result.preview || [],
          fullData: result.fullData,
        });
        
        // Step 4: Complete
        setUploadProgress({ step: 3, steps });
        
        addMessage({
          type: "assistant",
          content: `✅ Successfully uploaded "${file.name}"!\n\nDataset contains ${result.rowCount || 0} rows and ${(result.schema || []).length} columns.\n\nYou can now ask questions about your data.`
        });
      } else {
        const errorMsg = result.error || "Unknown error occurred";
        
        setError({
          type: "error",
          title: "Processing Failed",
          message: `Could not process the CSV file: ${errorMsg}. Please check that your file is properly formatted.`,
          retryAction: retryUpload
        });
        
        addMessage({
          type: "assistant",
          content: `❌ Failed to process CSV file: ${errorMsg}`
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      
      // Determine error type based on error content
      let errorType: "error" | "network" = "error";
      if (errorMsg.includes("fetch") || errorMsg.includes("network") || errorMsg.includes("timeout")) {
        errorType = "network";
      }
      
      setError({
        type: errorType,
        title: errorType === "network" ? "Upload Failed" : "Processing Error",
        message: errorType === "network" 
          ? "Could not upload file due to network issues. Please check your connection and try again."
          : `Error processing file: ${errorMsg}`,
        retryAction: retryUpload
      });
      
      addMessage({
        type: "assistant",
        content: `❌ Error processing file: ${errorMsg}`
      });
    } finally {
      setIsLoading(false);
      setLoadingType(null);
      setUploadProgress(null);
    }
  }, [setCurrentDataset, setIsLoading, addMessage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  if (!currentDataset) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          {/* Enhanced Empty State */}
          <EmptyState
            icon={Database}
            title="Welcome to CellByte Analytics"
            description="Upload your CSV dataset or load sample data to begin analyzing your data with natural language queries powered by AI."
            variant="welcome"
            action={{
              label: "Load Sample Data",
              onClick: async () => {
                setIsLoading(true);
                setLoadingType("processing");
                setError(null);
                
                try {
                  const result = await tRPCClient.getSampleData("germany_sample");
                  if (result.success) {
                    setCurrentDataset({
                      id: "sample-germany",
                      name: "Germany Sample Dataset", 
                      schema: result.schema || [],
                      rowCount: result.data?.length || 0,
                      preview: result.data || [],
                      fullData: result.fullData || result.data,
                    });
                  } else {
                    setError({
                      type: "error",
                      title: "Sample Data Loading Failed",
                      message: result.error || "Failed to load sample data",
                    });
                  }
                } catch (error) {
                  const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
                  setError({
                    type: "network",
                    title: "Could Not Load Sample Data",
                    message: errorMsg,
                  });
                } finally {
                  setIsLoading(false);
                  setLoadingType(null);
                }
              }
            }}
          />
          
          <div className="mt-8">
            <div className="text-center mb-6">
              <p className="text-sm text-slate-500">Or upload your own data:</p>
            </div>

          {/* File Upload Area */}
          <Card
            className={cn(
              "p-8 border-2 border-dashed transition-colors cursor-pointer",
              dragActive ? "border-purple-400 bg-purple-50" : "border-slate-300",
              isLoading && "opacity-50 pointer-events-none"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-4" />
              <p className="text-sm text-slate-600 mb-4">
                Drag and drop your CSV file here, or
              </p>
              <label htmlFor="file-upload">
                <Button variant="outline" className="mb-4 cursor-pointer" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
                disabled={isLoading}
              />
            </div>
          </Card>

          {/* Enhanced Loading States */}
          {isLoading && loadingType && (
            <div className="mt-6">
              <ContextualLoading 
                type={loadingType}
                size="md"
                message={
                  loadingType === "upload" ? "Uploading and processing your file..." :
                  loadingType === "processing" ? "Loading sample dataset..." :
                  loadingType === "analyzing" ? "Analyzing your query with AI..." :
                  "Processing data..."
                }
              />
              
              {/* Progress indicator for uploads */}
              {uploadProgress && (
                <div className="mt-4">
                  <ProgressIndicator
                    steps={uploadProgress.steps}
                    currentStep={uploadProgress.step}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Error State Display */}
          {error && (
            <div className="mt-6">
              <ErrorState
                type={error.type}
                title={error.title}
                message={error.message}
                onRetry={error.retryAction}
                retryLabel="Try Again"
              />
            </div>
          )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-4 lg:px-0">
      {/* Enhanced Header with Better Responsive Design */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-slate-900 mb-1">Query Your Data</h1>
            <p className="text-sm text-slate-600">
              Ask questions about your dataset using natural language
            </p>
          </div>
          
          {/* Dataset Status Indicator */}
          {currentDataset && (
            <div className="flex-shrink-0">
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-green-800">Dataset Active</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Dataset Info Card - More Mobile Friendly */}
        {currentDataset && (
          <Card className="bg-purple-50 border-purple-200">
            <div className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-purple-900 truncate">{currentDataset.name}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-purple-600 mt-1">
                    <span>{currentDataset.rowCount?.toLocaleString() || 0} rows</span>
                    <span>{currentDataset.schema?.length || 0} columns</span>
                  </div>
                </div>
                <Database className="w-5 h-5 text-purple-500 flex-shrink-0" />
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Enhanced Chat Messages with Better Mobile Layout */}
      <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 mb-4 sm:mb-6 min-h-0">
        {chatHistory.length === 0 && !isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={BarChart3}
              title="Start Your Analysis"
              description="Ask questions about your data in natural language. I'll help you analyze and visualize the insights."
              variant="simple"
            />
          </div>
        )}

        {chatHistory.map((message, index) => (
          <div key={message.id || index} className="animate-fade-in">
            {message.type === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] sm:max-w-lg bg-purple-600 text-white rounded-2xl rounded-tr-md px-4 py-3">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-80" />
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-start">
                <div className="max-w-[95%] sm:max-w-4xl bg-white border border-slate-200 rounded-2xl rounded-tl-md shadow-sm">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <BarChart3 className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Enhanced Loading State for Chat */}
        {isLoading && loadingType === "analyzing" && (
          <div className="flex justify-start">
            <div className="max-w-lg bg-white border border-slate-200 rounded-2xl rounded-tl-md shadow-sm">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <ContextualLoading 
                      type="analyzing" 
                      size="sm"
                      message="Analyzing your query with AI..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error State Display in Main Interface */}
      {error && (
        <div className="mb-4">
          <ErrorState
            type={error.type}
            title={error.title}
            message={error.message}
            onRetry={error.retryAction}
            retryLabel="Try Again"
            className="max-w-md mx-auto"
          />
        </div>
      )}

      {/* Enhanced Query Input with Better Mobile UX */}
      <div className="border-t border-slate-200 pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask questions about your data..."
              disabled={isLoading || !currentDataset}
              className={cn(
                "pr-12 py-3 text-base border-slate-300 focus:border-purple-500 focus:ring-purple-500 rounded-xl",
                "placeholder:text-slate-400 resize-none"
              )}
            />
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !inputValue.trim() || !currentDataset}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-700 rounded-lg"
            >
              {isLoading && loadingType === "analyzing" ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {/* Helpful Suggestions for Empty Input */}
          {!isLoading && inputValue.trim().length === 0 && chatHistory.length === 0 && (
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-2">Try asking:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "What are the top costs by indication?",
                  "Show me treatment types",
                  "Count unique brand names"
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInputValue(suggestion)}
                    className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
