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
        <div className="flex-1 p-6">
          <div className="h-full grid grid-cols-2 gap-6">
            {/* Insights Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <QueryInterface />
            </div>
            
            {/* Results Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <AnalysisPanel />
            </div>
          </div>
        </div>
      </div>
    </DataProvider>
  );
}
