"use client";

import React, { useCallback, useState } from "react";
import { Upload, FileText, Database } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useData } from "@/components/data-provider";
import { api } from "@/trpc/react";
import { cn, formatBytes } from "@/lib/utils";

export function DataIngestion() {
  const { setCurrentDataset, setIsLoading, isLoading } = useData();
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const processCSVMutation = api.data.processCSV.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setCurrentDataset({
          id: Math.random().toString(36).substr(2, 9),
          name: uploadedFile?.name || "Uploaded Dataset",
          schema: data.schema,
          rowCount: data.rowCount,
          preview: data.preview,
        });
      }
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
    },
  });

  const sampleDataQuery = api.data.getSampleData.useQuery(
    { dataset: "germany_sample" },
    { enabled: false }
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setUploadedFile(file);
        processFile(file);
      } else {
        alert("Please upload a CSV file");
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    const csvData = await file.text();
    processCSVMutation.mutate({
      csvData,
      filename: file.name,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Ingestion
        </CardTitle>
        <CardDescription>
          Upload a CSV file or load sample data to get started
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Area */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            dragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25",
            isLoading && "opacity-50 pointer-events-none"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop your CSV file here, or click to browse
          </p>
          <Label htmlFor="file-upload">
            <Button variant="outline" className="cursor-pointer" disabled={isLoading}>
              Choose File
            </Button>
          </Label>
          <Input
            id="file-upload"
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
            disabled={isLoading}
          />
        </div>

        {uploadedFile && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">{uploadedFile.name}</span>
            <span className="text-xs text-muted-foreground">
              ({formatBytes(uploadedFile.size)})
            </span>
          </div>
        )}

        {/* Sample Data Option */}
        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-2">
            Or try with sample data:
          </p>
          <Button
            variant="secondary"
            onClick={loadSampleData}
            disabled={isLoading}
            className="w-full"
          >
            Load Germany Sample Dataset
          </Button>
        </div>

        {isLoading && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm text-muted-foreground">Processing data...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
