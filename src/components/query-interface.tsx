"use client";

import React, { useState } from "react";
import { Send, Upload, Database, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useData } from "@/components/data-provider";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

export function QueryInterface() {
  const { currentDataset, setCurrentDataset, addMessage, isLoading, setIsLoading } = useData();
  const [inputValue, setInputValue] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const processQueryMutation = api.data.processQuery.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        addMessage({
          type: "assistant",
          content: `Here are the results for your query. I interpreted your question and generated the following analysis:

**SQL Query:** \`${data.sql}\`

**Results:**`,
          data: data.result,
          chartConfig: {
            type: data.interpretation.chartType as "bar" | "line" | "pie",
            xField: Object.keys(data.result[0] || {})[0] || "x",
            yField: Object.keys(data.result[0] || {})[1] || "y",
          },
        });
      }
      setIsLoading(false);
    },
    onError: (error) => {
      addMessage({
        type: "assistant",
        content: `Sorry, I encountered an error processing your query: ${error.message}`,
      });
      setIsLoading(false);
    },
  });

  const sampleDataQuery = api.data.getSampleData.useQuery(
    { dataset: "germany_sample" },
    { enabled: false }
  );

  const processCSVMutation = api.data.processCSV.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setCurrentDataset({
          id: Math.random().toString(36).substr(2, 9),
          name: data.filename || uploadedFile?.name || "Uploaded Dataset",
          schema: data.schema,
          rowCount: data.rowCount,
          preview: data.preview,
        });
      } else {
        // Handle CSV parsing errors
        console.error("CSV processing failed:", data.error);
        alert(`Failed to process CSV: ${data.error}`);
      }
      setIsLoading(false);
    },
    onError: (error) => {
      console.error("CSV processing error:", error);
      alert(`Error processing CSV: ${error.message}`);
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !currentDataset || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    addMessage({
      type: "user",
      content: userMessage,
    });

    processQueryMutation.mutate({
      query: userMessage,
      datasetId: currentDataset.id,
    });
  };

  const loadSampleData = async () => {
    setIsLoading(true);
    try {
      const result = await sampleDataQuery.refetch();
      if (result.data?.success) {
        setCurrentDataset({
          id: "sample-germany",
          name: "Germany Sample Dataset",
          schema: result.data.schema,
          rowCount: result.data.data.length,
          preview: result.data.data,
        });
      }
    } catch (error) {
      console.error("Failed to load sample data:", error);
    }
    setIsLoading(false);
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setUploadedFile(file);
    setIsLoading(true);
    
    const csvData = await file.text();
    processCSVMutation.mutate({
      csvData,
      filename: file.name,
    });
  };

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const handleDrag = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
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
              Ask questions to extract insights directly from industry documents.
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
            <p className="text-sm text-slate-600 mb-2">Or try with sample data:</p>
            <Button
              onClick={loadSampleData}
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
              placeholder="Ask questions to extract insights directly from industry documents."
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
