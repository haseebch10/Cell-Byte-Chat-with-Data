"use client";

import React from "react";
import { Plus, Folder, BarChart3, User, Settings, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/components/data-provider";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { chatHistory, clearHistory } = useData();

  const recentQueries = chatHistory
    .filter(msg => msg.type === "user")
    .slice(-5)
    .reverse();

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
      {/* CellByte Logo/Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {/* Placeholder for logo - user will add icon here */}
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">CellByte</h1>
        </div>
      </div>

      {/* New Query Button */}
      <div className="p-4">
        <Button 
          onClick={clearHistory}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Query
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4">
        {/* Folders Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
            <Folder className="w-4 h-4" />
            <span>Folders</span>
          </div>
        </div>

        {/* Query History */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-900 mb-3">Query history</h3>
          <div className="space-y-1">
            {recentQueries.length > 0 ? (
              recentQueries.map((query, index) => (
                <div
                  key={query.id}
                  className="text-xs text-slate-600 p-2 rounded hover:bg-slate-100 cursor-pointer truncate"
                  title={query.content}
                >
                  {query.content}
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-400 italic">
                No recent queries
              </div>
            )}
          </div>
        </div>

        {/* Analysis Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
            <BarChart3 className="w-4 h-4" />
            <span>Analysis</span>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-slate-200">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="w-full justify-start text-sm">
            <HelpCircle className="w-4 h-4 mr-2" />
            Get started
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
        
        {/* User Section */}
        <div className="mt-4 flex items-center gap-2 text-sm">
          <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center">
            <User className="w-3 h-3" />
          </div>
          <span className="text-slate-600">user@cellbyte.com</span>
        </div>
      </div>
    </div>
  );
}
