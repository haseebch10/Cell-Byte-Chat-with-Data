"use client";

import React, { useState } from "react";
import { Filter, Calendar, ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useData } from "@/components/data-provider";
import { DataVisualization } from "@/components/data-visualization";
import { downloadAsCSV } from "@/lib/utils";

export function AnalysisPanel() {
  const { currentDataset, chatHistory } = useData();
  const [selectedFilters, setSelectedFilters] = useState({
    brandName: "",
    activeSubstance: "",
    indication: "",
    documentType: ""
  });

  // Get the latest assistant message with data
  const latestDataMessage = chatHistory
    .filter(msg => msg.type === "assistant" && msg.data)
    .slice(-1)[0];

  const exportResults = (messageData: any[], filename: string) => {
    downloadAsCSV(messageData, `${filename}-results.csv`);
  };

  if (!currentDataset) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Filter className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Load a dataset to start analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Filter Documents Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filter Documents
          </CardTitle>
          <p className="text-sm text-slate-600">
            Refine your document search by selecting values from filters below
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Select Filter */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Select Filter
            </label>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs text-slate-600">Brand name</label>
                <div className="relative">
                  <select className="w-full p-2 border border-slate-300 rounded-md text-sm appearance-none bg-white">
                    <option>Kisplyx</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-slate-600">Active substance</label>
                <div className="relative">
                  <select className="w-full p-2 border border-slate-300 rounded-md text-sm appearance-none bg-white">
                    <option>Select substances</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600">Indication</label>
                <div className="relative">
                  <select className="w-full p-2 border border-slate-300 rounded-md text-sm appearance-none bg-white">
                    <option>Select a indication</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* G-BA indication and Therapeutic area */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-slate-600">G-BA indication</label>
              <div className="relative">
                <select className="w-full p-2 border border-slate-300 rounded-md text-sm appearance-none bg-white">
                  <option>Select substances</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-600">Therapeutic area</label>
              <div className="relative">
                <select className="w-full p-2 border border-slate-300 rounded-md text-sm appearance-none bg-white">
                  <option>Select a indication</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-600">Document type</label>
              <div className="relative">
                <select className="w-full p-2 border border-slate-300 rounded-md text-sm appearance-none bg-white">
                  <option>Tragende Gründe (G-BA)</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Keyword search */}
          <div>
            <label className="text-xs text-slate-600 mb-1 block">Keyword search</label>
            <Input
              placeholder="Search document by keyword"
              className="text-sm"
            />
          </div>

          {/* G-BA resolution date */}
          <div>
            <label className="text-xs text-slate-600 mb-1 block">G-BA resolution date</label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Start date"
                className="text-sm"
              />
              <span className="text-slate-400">→</span>
              <Input
                placeholder="End date"
                className="text-sm"
              />
            </div>
          </div>

          {/* Search Button */}
          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
            <Filter className="w-4 h-4 mr-2" />
            Search
          </Button>
        </CardContent>
      </Card>

      {/* Documents Found Section */}
      {latestDataMessage && (
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Documents found: {latestDataMessage.data?.length || 0}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportResults(latestDataMessage.data!, `analysis-${Date.now()}`)}
              >
                <Download className="w-3 w-3 mr-1" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {latestDataMessage.data && latestDataMessage.chartConfig && (
              <DataVisualization
                data={latestDataMessage.data}
                chartConfig={latestDataMessage.chartConfig}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
