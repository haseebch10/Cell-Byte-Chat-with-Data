import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { SAMPLE_GERMANY_DATA, SAMPLE_TREATMENT_COSTS_DATA, inferSchema } from "@/lib/sample-data";

export const dataRouter = createTRPCRouter({
  // Upload and process CSV data
  processCSV: publicProcedure
    .input(z.object({
      csvData: z.string(),
      filename: z.string(),
    }))
    .mutation(async ({ input }) => {
      // For now, return mock schema inference
      // TODO: Implement actual CSV parsing and schema inference
      return {
        success: true,
        schema: [
          { name: "id", type: "number", sample: "1" },
          { name: "name", type: "string", sample: "Sample" },
          { name: "value", type: "number", sample: "100" },
          { name: "date", type: "date", sample: "2023-01-01" },
        ],
        rowCount: 1000,
        preview: [
          { id: 1, name: "Sample 1", value: 100, date: "2023-01-01" },
          { id: 2, name: "Sample 2", value: 200, date: "2023-01-02" },
          { id: 3, name: "Sample 3", value: 150, date: "2023-01-03" },
        ],
      };
    }),

  // Get sample data
  getSampleData: publicProcedure
    .input(z.object({
      dataset: z.enum(["germany_sample", "treatment_costs"]),
    }))
    .query(async ({ input }) => {
      const data = input.dataset === "germany_sample" 
        ? SAMPLE_GERMANY_DATA 
        : SAMPLE_TREATMENT_COSTS_DATA;
      
      return {
        success: true,
        data,
        schema: inferSchema(data),
      };
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
