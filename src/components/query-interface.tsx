"use client";

import React, { useState, useCallback } from "react";
import { Send, Upload, Database, FileText, User, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useData } from "@/components/data-provider";
import { cn } from "@/lib/utils";


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



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !currentDataset || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    addMessage({ type: "user", content: userMessage });

    try {
      if (!currentDataset.id) {
        throw new Error("Dataset ID is missing. Please reload the dataset.");
      }

      const result = await tRPCClient.processQuery(userMessage, currentDataset.id);

      // Handle response structure
      const data = result.json || result;
      
      if (data.success) {
        // Show generated SQL query
        let content = `Here are the results for your query:\n\n**Generated SQL:** \`${data.sql || "No SQL generated"}\`\n\n`;
        
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
        // Query failed - show detailed error
        const errorMsg = data.error || data.details || "Unknown error occurred";
        const sqlInfo = data.sql ? `\n\n**Generated SQL:** \`${data.sql}\`` : "";
        addMessage({ 
          type: "assistant", 
          content: `❌ Query failed: ${errorMsg}${sqlInfo}` 
        });
      }
    } catch (err) {
      addMessage({ type: "assistant", content: `Error: ${err instanceof Error ? err.message : "Unknown error"}` });
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
        const datasetId = result.datasetId || Math.random().toString(36).substr(2, 9);
        console.log("Setting dataset with ID:", datasetId);
        
        setCurrentDataset({
          id: datasetId,
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
              Load Your Dataset
            </h2>
            <p className="text-slate-600">
              Upload a CSV file or load sample data to start analyzing your data with natural language queries.
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Query Your Data</h1>
        <p className="text-sm text-slate-600">
          Ask questions about your dataset using natural language
        </p>
        {currentDataset && (
          <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm font-medium text-purple-900">Active Dataset:</p>
            <p className="text-sm text-purple-800">{currentDataset.name}</p>
            <p className="text-xs text-purple-600">
              {currentDataset.rowCount.toLocaleString()} rows • {currentDataset.schema.length} columns
            </p>
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-6">
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-2">Start by asking a question</p>
            <p className="text-sm text-slate-400">
              Try: &quot;What are the costs by indication?&quot; or &quot;Show me treatment types&quot;
            </p>
          </div>
        )}

        {chatHistory.map((message, index) => (
          <div key={message.id || index} className="space-y-3">
            {message.type === "user" ? (
              <div className="text-right">
                <div className="inline-block bg-purple-600 text-white rounded-lg px-4 py-2 max-w-lg">
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ) : (
              <div>
                <div className="bg-slate-100 rounded-lg p-4">
                  <div className="text-sm text-slate-800 whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="bg-slate-100 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              <span className="text-sm text-slate-600">Analyzing your data...</span>
            </div>
          </div>
        )}
      </div>

      {/* Query Input */}
      <form onSubmit={handleSubmit} className="border-t border-slate-200 pt-4">
        <div className="relative">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask questions about your data..."
            disabled={isLoading || !currentDataset}
            className="pr-12 py-3 text-base border-slate-300 focus:border-purple-500 focus:ring-purple-500"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isLoading || !inputValue.trim() || !currentDataset}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
      

    </div>
  );
}
