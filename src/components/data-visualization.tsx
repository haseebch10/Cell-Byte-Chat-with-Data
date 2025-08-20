"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";

import { cn } from "@/lib/utils";

type ChartConfig = {
  type: "bar" | "line" | "pie";
  xField: string;
  yField: string;
};

type Props = {
  data: any[];
  chartConfig: ChartConfig;
};

const COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#00ff00",
  "#ff00ff",
  "#00ffff",
  "#ff0000",
];

export function DataVisualization({ data, chartConfig }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground bg-muted/30 rounded">
        No data to visualize
      </div>
    );
  }

  const renderChart = () => {
    switch (chartConfig.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={chartConfig.xField} 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={chartConfig.yField} fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );

      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={chartConfig.xField} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={chartConfig.yField}
                stroke="#8884d8"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey={chartConfig.yField}
                nameKey={chartConfig.xField}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };



  return (
    <div className="space-y-4">
      <div 
        className="bg-background border rounded-lg p-4"
        data-chart="true"
      >
        {renderChart()}
      </div>

      <div className="text-xs text-muted-foreground">
        Showing {data.length} records • Fields: {chartConfig.xField} vs {chartConfig.yField}
      </div>
    </div>
  );
}
