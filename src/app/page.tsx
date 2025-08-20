import { DataIngestion } from "@/components/data-ingestion";
import { ChatInterface } from "@/components/chat-interface";
import { DataProvider } from "@/components/data-provider";

export default function HomePage() {
  return (
    <DataProvider>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              CellByte - Chat with Data
            </h1>
            <p className="text-muted-foreground text-lg">
              Turn natural language questions into analytics over your tabular data
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Data Ingestion Panel */}
            <div className="lg:col-span-1">
              <DataIngestion />
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <ChatInterface />
            </div>
          </div>
        </div>
      </main>
    </DataProvider>
  );
}
