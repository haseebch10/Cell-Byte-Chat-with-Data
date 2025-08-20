import { DataProvider } from "@/components/data-provider";
import { Sidebar } from "@/components/sidebar";
import { QueryInterface } from "@/components/query-interface";
import { AnalysisPanel } from "@/components/analysis-panel";

export default function HomePage() {
  return (
    <DataProvider>
      <div className="h-screen bg-slate-50 flex overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 p-6 min-h-0">
          <div className="h-full grid grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6 min-h-0 flex flex-col">
              <QueryInterface />
            </div>
            
            <div className="bg-white rounded-lg border border-slate-200 p-6 min-h-0 flex flex-col">
              <AnalysisPanel />
            </div>
          </div>
        </div>
      </div>
    </DataProvider>
  );
}
