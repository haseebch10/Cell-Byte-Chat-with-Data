"use client";

import React from "react";
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
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  ReferenceLine,
} from "recharts";

type Props = {
  chartCode: string;
  data?: any[];
  className?: string;
};

export function DynamicChart({ chartCode, data, className = "" }: Props) {
  if (!chartCode) {
    return (
      <div className={`h-64 flex items-center justify-center text-muted-foreground bg-muted/30 rounded ${className}`}>
        No chart code available
      </div>
    );
  }

  try {
    // Execute the generated JavaScript function
    // The function takes (data, React, Recharts) as parameters
    const Recharts = {
      BarChart,
      Bar,
      XAxis,
      YAxis,
      CartesianGrid,
      Tooltip,
      Legend,
      ResponsiveContainer,
      LineChart: RechartsLineChart,
      Line,
      PieChart: RechartsPieChart,
      Pie,
      Cell,
      AreaChart,
      Area,
      ScatterChart,
      Scatter,
      RadarChart,
      Radar,
      PolarGrid,
      PolarAngleAxis,
      PolarRadiusAxis,
      ComposedChart,
      ReferenceLine,
    };
    
    const chartFunction = eval(`(${chartCode})`);
    const chartElement = chartFunction(data || [], React, Recharts);
    
    return (
      <div className={`w-full ${className}`} style={{ minHeight: "300px" }}>
        <div className="bg-background border rounded-lg p-4">
          {chartElement}
        </div>
      </div>
    );
  } catch (error) {
    console.error("DynamicChart: Error executing chart code:", error);
    return (
      <div className={`h-64 flex items-center justify-center text-red-600 bg-red-50 rounded ${className}`}>
        <div className="text-center">
          <p className="text-sm font-medium">Chart Generation Error</p>
          <p className="text-xs mt-1">Failed to execute dynamic chart code</p>
        </div>
      </div>
    );
  }
}
