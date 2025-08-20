"use client";

import React, { useState } from "react";
import { Send, MessageSquare, Download, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useData } from "@/components/data-provider";
import { api } from "@/trpc/react";
import { cn, downloadAsCSV } from "@/lib/utils";
import { DataVisualization } from "@/components/data-visualization";

export function ChatInterface() {
  const { currentDataset, chatHistory, addMessage, isLoading, setIsLoading } = useData();
  const [inputValue, setInputValue] = useState("");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !currentDataset || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    // Add user message to chat
    addMessage({
      type: "user",
      content: userMessage,
    });

    // Process the query
    processQueryMutation.mutate({
      query: userMessage,
      datasetId: currentDataset.id,
    });
  };

  const exportResults = (messageData: any[], filename: string) => {
    downloadAsCSV(messageData, `${filename}-results.csv`);
  };

  if (!currentDataset) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat Interface
          </CardTitle>
          <CardDescription>
            Upload or select a dataset to start asking questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No dataset loaded</p>
            <p className="text-sm">Please upload a CSV file or load sample data to begin</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dataset Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{currentDataset.name}</CardTitle>
              <CardDescription>
                {currentDataset.rowCount.toLocaleString()} rows • {currentDataset.schema.length} columns
              </CardDescription>
            </div>
            <div className="text-xs text-muted-foreground">
              Schema: {currentDataset.schema.map(col => col.name).join(", ")}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Chat Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Ask Questions About Your Data
          </CardTitle>
          <CardDescription>
            Ask natural language questions like "What are the treatment costs for Cancer?" or "Show me costs by indication"
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Chat History */}
          <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
            {chatHistory.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Start by asking a question about your data!</p>
                <p className="text-sm mt-1">
                  Try: "Show me the total costs by treatment type" or "What's the average cost per indication?"
                </p>
              </div>
            )}
            
            {chatHistory.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                  message.type === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {/* Data Visualization */}
                {message.data && message.chartConfig && (
                  <div className="mt-2">
                    <DataVisualization
                      data={message.data}
                      chartConfig={message.chartConfig}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => exportResults(message.data!, `query-${message.id}`)}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Export CSV
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="bg-muted rounded-lg px-3 py-2 text-sm max-w-[80%]">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                  <span>Analyzing your question...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              placeholder="Ask a question about your data..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !inputValue.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
