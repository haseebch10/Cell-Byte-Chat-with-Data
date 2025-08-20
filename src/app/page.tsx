import { DataProvider } from "@/components/data-provider";
import { Sidebar } from "@/components/sidebar";
import { QueryInterface } from "@/components/query-interface";
import { AnalysisPanel } from "@/components/analysis-panel";

export default function HomePage() {
  return (
    <DataProvider>
      <div className="min-h-screen bg-slate-50 flex">
        {/* Left Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Query Interface */}
          <div className="flex-1 p-6">
            <QueryInterface />
          </div>
          
          {/* Analysis Panel */}
          <div className="w-96 p-6 bg-white border-l border-slate-200">
            <AnalysisPanel />
          </div>
        </div>
      </div>
    </DataProvider>
  );
}
