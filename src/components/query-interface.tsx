"use client";

import React, { useState, useCallback } from "react";
import { Send, Upload, Database, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useData } from "@/components/data-provider";
import { cn } from "@/lib/utils";

// tRPC client (direct HTTP calls)
const tRPCClient = {
  async getSampleData(dataset: "germany_sample" | "treatment_costs") {
    // Queries use GET with proper tRPC query string format
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
    
    // Try different response structures based on the actual tRPC response format
    if (data[0]?.result?.data?.json) {
      // This is the correct structure for tRPC responses
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
      body: JSON.stringify({ "0": { "json": { csvData, filename } } }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json();
    return data[0]?.result?.data?.json || data.result.data.json;
  },
  
  async processQuery(query: string, datasetId: string) {
    const response = await fetch("/api/trpc/data.processQuery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "0": { "json": { query, datasetId } } }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json();
    return data[0]?.result?.data?.json || data.result.data.json;
  }
};

export function QueryInterface() {
  const { currentDataset, setCurrentDataset, addMessage, isLoading, setIsLoading } = useData();
  const [inputValue, setInputValue] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !currentDataset || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    addMessage({ type: "user", content: userMessage });

    try {
      const result = await tRPCClient.processQuery(userMessage, currentDataset.id);

      if (result.success) {
        addMessage({
          type: "assistant",
          content: `Here are the results for your query:\n\n**SQL Query:** \`${result.sql}\`\n\n**Results:**`,
          data: result.result,
          chartConfig: {
            type: result.interpretation.chartType as "bar" | "line" | "pie",
            xField: Object.keys(result.result[0] || {})[0] || "x",
            yField: Object.keys(result.result[0] || {})[1] || "y",
          },
        });
      } else {
        addMessage({ type: "assistant", content: `Query failed: ${(result as any).error || "Unknown error"}` });
      }
    } catch (err) {
      addMessage({ type: "assistant", content: `Error: ${err}` });
    } finally {
      setIsLoading(false);
    }
  };

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a CSV file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(`File too large. Limit is 5MB.`);
      return;
    }

    setUploadedFile(file);
    setIsLoading(true);

    try {
      const csvData = await file.text();
      const result = await tRPCClient.processCSV(csvData, file.name);

      if (result.success) {
        setCurrentDataset({
          id: Math.random().toString(36).substr(2, 9),
          name: result.filename || file.name,
          schema: result.schema || [],
          rowCount: result.rowCount || 0,
          preview: result.preview || [],
        });
      } else {
        alert(`Failed to process CSV: ${result.error}`);
      }
    } catch (error) {
      alert("Error processing file");
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentDataset, setIsLoading]);

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
      <div className="h-full flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              Select documents to chat with
            </h2>
            <p className="text-slate-600">
              Upload a CSV file or load sample data to start asking questions.
            </p>
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

          {/* Sample Data Option */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600 mb-4">Or try with sample data:</p>
            <Button
              onClick={async () => {
                setIsLoading(true);
                try {
                  const result = await tRPCClient.getSampleData("germany_sample");
                  if (result.success) {
                    setCurrentDataset({
                      id: "sample-germany",
                      name: "Germany Sample Dataset",
                      schema: result.schema || [],
                      rowCount: result.data?.length || 0,
                      preview: result.data || [],
                    });
                  } else {
                    alert("Failed to load sample data: " + result.error);
                  }
                } catch (error) {
                  alert("Error loading sample data: " + error);
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Database className="w-4 h-4 mr-2" />
              Load Germany Sample Dataset
            </Button>
          </div>

          {isLoading && (
            <div className="text-center mt-4">
              <div className="inline-flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                <span className="text-sm text-slate-600">Processing data...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Dataset Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-slate-200">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{currentDataset.name}</h3>
            <p className="text-sm text-slate-600">
              {currentDataset.rowCount.toLocaleString()} rows • {currentDataset.schema.length} columns
            </p>
          </div>
        </div>
      </div>

      {/* Query Input */}
      <div className="flex-1 flex flex-col">
        <form onSubmit={handleSubmit} className="mt-auto">
          <div className="relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask questions to extract insights from your data..."
              disabled={isLoading}
              className="pr-12 py-3 text-base border-slate-300 focus:border-purple-500 focus:ring-purple-500"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !inputValue.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
