"use client";

import React, { useState } from "react";
import { Database, Table, BarChart3, Download, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useData } from "@/components/data-provider";
import { DataVisualization } from "@/components/data-visualization";
import { downloadAsCSV } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function AnalysisPanel() {
  const { currentDataset, chatHistory } = useData();
  const [activeTab, setActiveTab] = useState<"explore" | "examine">("explore");

  // Get the latest assistant message with data
  const latestDataMessage = chatHistory
    .filter(msg => msg.type === "assistant" && msg.data)
    .slice(-1)[0];

  const exportResults = (messageData: any[], filename: string) => {
    downloadAsCSV(messageData, `${filename}-results.csv`);
  };

  const copyTable = () => {
    // Copy functionality can be implemented here
    console.log("Copy table functionality");
  };

  if (!currentDataset) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b border-slate-200 mb-6">
          <div className="flex space-x-8">
            <button className="pb-3 border-b-2 border-transparent text-slate-500">
              Explore
            </button>
            <button className="pb-3 border-b-2 border-transparent text-slate-400">
              Examine
            </button>
          </div>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Load a dataset to start analysis</p>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Query Results (when available) */}
      {latestDataMessage && (
        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">
              Latest Query Results ({latestDataMessage.data?.length || 0} records)
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportResults(latestDataMessage.data!, `query-${Date.now()}`)}
            >
              <Download className="w-3 h-3 mr-1" />
              Export CSV
            </Button>
          </div>

          {latestDataMessage.data && latestDataMessage.chartConfig && (
            <DataVisualization
              data={latestDataMessage.data}
              chartConfig={latestDataMessage.chartConfig}
            />
          )}
        </div>
      )}
    </div>
  );
}
