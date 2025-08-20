import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { SAMPLE_GERMANY_DATA, SAMPLE_TREATMENT_COSTS_DATA, inferSchema } from "@/lib/sample-data";
import Papa from "papaparse";
import fs from "fs/promises";
import path from "path";

export const dataRouter = createTRPCRouter({
  // Upload and process CSV data
  processCSV: publicProcedure
    .input(z.object({
      csvData: z.string(),
      filename: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        // Parse CSV data using Papa Parse
        const parseResult = Papa.parse(input.csvData, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(), // Clean headers
        });

        if (parseResult.errors.length > 0) {
          console.error("CSV parsing errors:", parseResult.errors);
          return {
            success: false,
            error: "Failed to parse CSV file. Please check the format.",
            details: parseResult.errors[0]?.message || "Unknown parsing error",
          };
        }

        const data = parseResult.data as Record<string, any>[];
        
        if (data.length === 0) {
          return {
            success: false,
            error: "CSV file appears to be empty or has no valid data rows.",
          };
        }

        // Infer schema from actual data
        const schema = inferSchema(data);
        
        // Get preview data (first 5 rows)
        const preview = data.slice(0, 5);

        return {
          success: true,
          schema,
          rowCount: data.length,
          preview,
          filename: input.filename,
        };
      } catch (error) {
        console.error("Error processing CSV:", error);
        return {
          success: false,
          error: "An unexpected error occurred while processing the CSV file.",
          details: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  // Get sample data
  getSampleData: publicProcedure
    .input(z.object({
      dataset: z.enum(["germany_sample", "treatment_costs"]),
    }))
    .query(async ({ input }) => {
      try {
        // Try to load from CSV files first
        const filename = input.dataset === "germany_sample" 
          ? "case_study_germany_sample.csv"
          : "case_study_germany_treatment_costs_sample.csv";
        
        const filePath = path.join(process.cwd(), "data", "samples", filename);
        
        try {
          // Check if CSV file exists and load it
          const csvContent = await fs.readFile(filePath, "utf-8");
          
          const parseResult = Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
          });

          if (parseResult.errors.length > 0) {
            console.warn(`CSV parsing errors for ${filename}:`, parseResult.errors);
          }

          const data = parseResult.data as Record<string, any>[];
          
          if (data.length > 0) {
            return {
              success: true,
              data,
              schema: inferSchema(data),
              source: "csv_file",
              filename,
            };
          }
        } catch (fileError) {
          // CSV file doesn't exist or can't be read, fall back to hardcoded data
          console.log(`CSV file ${filename} not found, using hardcoded sample data`);
        }
        
        // Fallback to hardcoded data
        const data = input.dataset === "germany_sample" 
          ? SAMPLE_GERMANY_DATA 
          : SAMPLE_TREATMENT_COSTS_DATA;
        
        return {
          success: true,
          data,
          schema: inferSchema(data),
          source: "hardcoded",
        };
      } catch (error) {
        console.error("Error loading sample data:", error);
        return {
          success: false,
          error: "Failed to load sample data",
          details: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  // Process natural language query
  processQuery: publicProcedure
    .input(z.object({
      query: z.string(),
      datasetId: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Simple rule-based query processing (in production, use LLM)
      const query = input.query.toLowerCase();
      
      // Determine chart type and aggregation based on query
      let chartType: "bar" | "line" | "pie" = "bar";
      if (query.includes("trend") || query.includes("over time")) {
        chartType = "line";
      } else if (query.includes("distribution") || query.includes("breakdown")) {
        chartType = "pie";
      }

      // Sample aggregated results based on the sample data
      if (query.includes("indication") || query.includes("disease")) {
        return {
          success: true,
          interpretation: {
            aggregation: "sum",
            groupBy: ["indication"],
            filters: [],
            chartType,
          },
          sql: "SELECT indication, SUM(cost) as total_cost FROM dataset GROUP BY indication",
          result: [
            { indication: "Cancer", total_cost: 28000 },
            { indication: "Diabetes", total_cost: 685 },
            { indication: "Heart Disease", total_cost: 12300 },
          ],
        };
      } else if (query.includes("treatment")) {
        return {
          success: true,
          interpretation: {
            aggregation: "sum",
            groupBy: ["treatment"],
            filters: [],
            chartType,
          },
          sql: "SELECT treatment, SUM(cost) as total_cost FROM dataset GROUP BY treatment",
          result: [
            { treatment: "Chemotherapy", total_cost: 5000 },
            { treatment: "Radiation", total_cost: 8000 },
            { treatment: "Surgery", total_cost: 12000 },
            { treatment: "Insulin", total_cost: 150 },
            { treatment: "Metformin", total_cost: 85 },
            { treatment: "Medication", total_cost: 300 },
            { treatment: "Immunotherapy", total_cost: 15000 },
            { treatment: "GLP-1", total_cost: 450 },
          ],
        };
      } else {
        // Default response
        return {
          success: true,
          interpretation: {
            aggregation: "sum",
            groupBy: ["indication"],
            filters: [],
            chartType,
          },
          sql: "SELECT indication, SUM(cost) as total_cost FROM dataset GROUP BY indication",
          result: [
            { indication: "Cancer", total_cost: 28000 },
            { indication: "Diabetes", total_cost: 685 },
            { indication: "Heart Disease", total_cost: 12300 },
          ],
        };
      }
    }),
});
