import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { SAMPLE_GERMANY_DATA, SAMPLE_TREATMENT_COSTS_DATA, inferSchema } from "@/lib/sample-data";
import Papa from "papaparse";
import fs from "fs/promises";
import path from "path";

// Simple in-memory store for datasets (in production, use Redis/Database)
const datasetStore = new Map<string, any[]>();

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
          delimiter: "", // Auto-detect delimiter (handles both comma and semicolon)
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
        
        // Get preview data (first 10 rows, but limit data processing for very large files)
        const preview = data.slice(0, 10);

        // Generate a unique dataset ID and store the full dataset
        const datasetId = Math.random().toString(36).substr(2, 9);
        datasetStore.set(datasetId, data);

        return {
          success: true,
          schema,
          rowCount: data.length,
          preview,
          filename: input.filename,
          datasetId, // Return the ID so frontend can use it for queries
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
            delimiter: "", // Auto-detect delimiter (handles both comma and semicolon)
            transformHeader: (header) => header.trim(),
          });

          if (parseResult.errors.length > 0) {
            console.warn(`CSV parsing errors for ${filename}:`, parseResult.errors);
          }

          const data = parseResult.data as Record<string, any>[];
          
          if (data.length > 0) {
            const schema = inferSchema(data);
            
            // Store sample data with a known ID
            datasetStore.set("sample-germany", data);
            
            return {
              success: true,
              data,
              schema: schema,
              source: "csv_file",
              filename,
            };
          }
        } catch (fileError) {
          // CSV file doesn't exist or can't be read, fall back to hardcoded data
        }
        
        // Fallback to hardcoded data
        const data = input.dataset === "germany_sample" 
          ? SAMPLE_GERMANY_DATA 
          : SAMPLE_TREATMENT_COSTS_DATA;
        
        const schema = inferSchema(data);
        
        // Store hardcoded sample data with a known ID
        datasetStore.set("sample-germany", data);
        
        return {
          success: true,
          data,
          schema: schema,
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
      try {
        // Get the actual dataset from our store
        const dataset = datasetStore.get(input.datasetId);
        if (!dataset || dataset.length === 0) {
          return {
            success: false,
            error: "Dataset not found or empty",
          };
        }

        const query = input.query.toLowerCase();
        
        // Determine chart type based on query
        let chartType: "bar" | "line" | "pie" = "bar";
        if (query.includes("trend") || query.includes("over time") || query.includes("time")) {
          chartType = "line";
        } else if (query.includes("distribution") || query.includes("breakdown") || query.includes("pie")) {
          chartType = "pie";
        }

        // Get dataset columns to work with
        const firstRow = dataset[0];
        const columns = Object.keys(firstRow);
        
        // Basic query parsing - find relevant columns
        let groupByField = "";
        let aggregateField = "";
        let aggregateType = "count";

        // Look for cost/value fields
        const costFields = columns.filter(col => 
          col.toLowerCase().includes("cost") || 
          col.toLowerCase().includes("price") || 
          col.toLowerCase().includes("value") ||
          col.toLowerCase().includes("amount")
        );

        // Look for categorical fields based on query
        const categoryFields = columns.filter(col => 
          col.toLowerCase().includes("indication") || 
          col.toLowerCase().includes("treatment") || 
          col.toLowerCase().includes("type") || 
          col.toLowerCase().includes("category") ||
          col.toLowerCase().includes("brand") ||
          col.toLowerCase().includes("substance")
        );

        // Match query to fields
        if (query.includes("indication") && columns.some(col => col.toLowerCase().includes("indication"))) {
          groupByField = columns.find(col => col.toLowerCase().includes("indication")) || "";
        } else if (query.includes("treatment") && columns.some(col => col.toLowerCase().includes("treatment"))) {
          groupByField = columns.find(col => col.toLowerCase().includes("treatment")) || "";
        } else if (query.includes("type") && columns.some(col => col.toLowerCase().includes("type"))) {
          groupByField = columns.find(col => col.toLowerCase().includes("type")) || "";
        } else if (categoryFields.length > 0) {
          groupByField = categoryFields[0];
        }

        // Determine aggregation
        if (query.includes("cost") || query.includes("sum") || query.includes("total")) {
          aggregateType = "sum";
          aggregateField = costFields[0] || "";
        } else if (query.includes("average") || query.includes("avg")) {
          aggregateType = "avg";
          aggregateField = costFields[0] || "";
        } else if (query.includes("count") || query.includes("number")) {
          aggregateType = "count";
        }

        // Perform aggregation
        const result: any[] = [];
        const groups = new Map<string, { sum: number; count: number; items: any[] }>();

        // Group data
        dataset.forEach(row => {
          const groupValue = groupByField ? String(row[groupByField] || "Unknown") : "All";
          
          if (!groups.has(groupValue)) {
            groups.set(groupValue, { sum: 0, count: 0, items: [] });
          }
          
          const group = groups.get(groupValue)!;
          group.count += 1;
          group.items.push(row);
          
          if (aggregateField && row[aggregateField]) {
            const value = parseFloat(row[aggregateField]) || 0;
            group.sum += value;
          }
        });

        // Generate results
        groups.forEach((group, key) => {
          const resultRow: any = {};
          
          if (groupByField) {
            resultRow[groupByField] = key;
          }
          
          if (aggregateType === "sum" && aggregateField) {
            resultRow[`total_${aggregateField.toLowerCase()}`] = group.sum;
          } else if (aggregateType === "avg" && aggregateField) {
            resultRow[`avg_${aggregateField.toLowerCase()}`] = group.count > 0 ? group.sum / group.count : 0;
          } else {
            resultRow["count"] = group.count;
          }
          
          result.push(resultRow);
        });

        // Sort results by value (descending)
        if (result.length > 0) {
          const valueKey = Object.keys(result[0]).find(key => key !== groupByField);
          if (valueKey) {
            result.sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0));
          }
        }

        // Generate SQL representation
        const sqlParts = ["SELECT"];
        if (groupByField) {
          sqlParts.push(groupByField);
        }
        if (aggregateType === "sum" && aggregateField) {
          sqlParts.push(`${groupByField ? ", " : ""}SUM(${aggregateField}) as total_${aggregateField.toLowerCase()}`);
        } else if (aggregateType === "avg" && aggregateField) {
          sqlParts.push(`${groupByField ? ", " : ""}AVG(${aggregateField}) as avg_${aggregateField.toLowerCase()}`);
        } else {
          sqlParts.push(`${groupByField ? ", " : ""}COUNT(*) as count`);
        }
        sqlParts.push("FROM dataset");
        if (groupByField) {
          sqlParts.push(`GROUP BY ${groupByField}`);
        }

        return {
          success: true,
          interpretation: {
            aggregation: aggregateType,
            groupBy: groupByField ? [groupByField] : [],
            filters: [],
            chartType,
          },
          sql: sqlParts.join(" "),
          result: result.slice(0, 20), // Limit to top 20 results
        };

      } catch (error) {
        console.error("Error processing query:", error);
        return {
          success: false,
          error: "Failed to process query",
          details: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
});
