import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { SAMPLE_GERMANY_DATA, SAMPLE_TREATMENT_COSTS_DATA, inferSchema } from "@/lib/sample-data";
import Papa from "papaparse";
import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { env } from "@/env";

// Simple in-memory store for datasets (in production, use Redis/Database)
const datasetStore = new Map<string, any[]>();

// Initialize OpenAI (only if API key is provided)
const openai = env.OPENAI_API_KEY ? new OpenAI({
  apiKey: env.OPENAI_API_KEY,
}) : null;



// Helper function to convert natural language to SQL using OpenAI
async function naturalLanguageToSQL(query: string, schema: any[]): Promise<{
  success: boolean;
  sql?: string;
  aggregationType?: string;
  groupByField?: string;
  aggregateField?: string;
  chartType?: "bar" | "line" | "pie";
  error?: string;
}> {
  if (!openai) {
    return {
      success: false,
      error: "OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.",
    };
  }

  // Create schema description for the LLM
  const schemaDescription = schema.map(col => 
    `${col.name} (${col.type}): ${col.sample}`
  ).join('\n');

  const prompt = `You are a SQL query generator for data analysis. Given this dataset schema and a natural language query, generate a SQL SELECT statement.

Dataset Schema:
${schemaDescription}

Natural Language Query: "${query}"

Requirements:
1. Generate a SQL SELECT statement that answers the question
2. Use table name "dataset"
3. Use appropriate aggregation (COUNT, SUM, AVG) when needed
4. Group by relevant columns for categorical analysis
5. Limit results to top 20 if using GROUP BY
6. Determine appropriate chart type based on query intent

Response format (JSON only, no explanation):
{
  "sql": "SELECT statement here",
  "aggregationType": "sum|avg|count",
  "groupByField": "column name or empty string",  
  "aggregateField": "column name or empty string",
  "chartType": "bar|line|pie"
}

Chart type rules:
- "line" for trends over time or continuous data
- "pie" for distribution/breakdown/percentage queries  
- "bar" for comparisons and aggregations (default)`;

  try {
    // Add timeout to prevent hanging
    const completionPromise = openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a SQL expert that returns only valid JSON responses." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    // Race with timeout (10 seconds)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('OpenAI request timeout after 10 seconds')), 10000)
    );

    const completion = await Promise.race([completionPromise, timeoutPromise]) as any;

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      return {
        success: false,
        error: "OpenAI returned an empty response. Please try rephrasing your query.",
      };
    }

    const parsed = JSON.parse(response);
    return {
      success: true,
      sql: parsed.sql || "SELECT * FROM dataset LIMIT 10",
      aggregationType: parsed.aggregationType || "count",
      groupByField: parsed.groupByField || "",
      aggregateField: parsed.aggregateField || "",
      chartType: parsed.chartType || "bar",
    };
  } catch (error) {
    console.error("OpenAI SQL generation error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage.includes("timeout")) {
      return {
        success: false,
        error: "OpenAI request timed out. Please try again with a simpler query.",
      };
    } else if (errorMessage.includes("JSON")) {
      return {
        success: false,
        error: "OpenAI returned invalid response format. Please try rephrasing your query.",
      };
    } else {
      return {
        success: false,
        error: `Failed to process your query: ${errorMessage}. Please try rephrasing your request.`,
      };
    }
  }
}

// Helper function to simulate basic SQL execution with JavaScript
function executeBasicSQL(dataset: any[], queryAnalysis: {
  aggregationType?: string;
  groupByField?: string;
  aggregateField?: string;
}): any[] {
  const { aggregationType = "count", groupByField = "", aggregateField = "" } = queryAnalysis;

  // If no grouping, return simple aggregation
  if (!groupByField) {
    if (aggregationType === "count") {
      return [{ count: dataset.length }];
    }
    if (aggregateField && aggregationType === "sum") {
      const sum = dataset.reduce((acc, row) => acc + (parseFloat(row[aggregateField]) || 0), 0);
      return [{ [`total_${aggregateField.toLowerCase()}`]: sum }];
    }
    if (aggregateField && aggregationType === "avg") {
      const sum = dataset.reduce((acc, row) => acc + (parseFloat(row[aggregateField]) || 0), 0);
      const avg = dataset.length > 0 ? sum / dataset.length : 0;
      return [{ [`avg_${aggregateField.toLowerCase()}`]: avg }];
    }
    return [{ count: dataset.length }];
  }

  // Group by field and aggregate
  const groups = new Map<string, { sum: number; count: number; items: any[] }>();

  dataset.forEach(row => {
    const groupValue = String(row[groupByField] || "Unknown");
    
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
  const result: any[] = [];
  groups.forEach((group, key) => {
    const resultRow: any = {};
    resultRow[groupByField] = key;
    
    if (aggregationType === "sum" && aggregateField) {
      resultRow[`total_${aggregateField.toLowerCase()}`] = group.sum;
    } else if (aggregationType === "avg" && aggregateField) {
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

  return result;
}

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
        
        // Get preview data (first 10 rows)
        const preview = data.slice(0, 10);

        // Generate a unique dataset ID and store the full dataset
        const datasetId = Math.random().toString(36).substr(2, 9);
        datasetStore.set(datasetId, data);

        return {
          success: true,
          schema,
          rowCount: data.length,
          preview,
          fullData: data.length <= 5000 ? data : undefined, // Include full data for filtering if dataset is reasonable size
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
              fullData: data.length <= 5000 ? data : undefined, // Include full data for filtering
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
          fullData: data, // Hardcoded data is small, always include for filtering
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

  // Process natural language query using OpenAI only
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
            error: "Dataset not found or empty. Please upload a dataset first.",
          };
        }

        // Get dataset schema for OpenAI
        const firstRow = dataset[0];
        const schema = Object.keys(firstRow).map(col => ({
          name: col,
          type: typeof firstRow[col] === 'number' ? 'number' : 
                typeof firstRow[col] === 'string' && /^\d{4}-\d{2}-\d{2}/.test(firstRow[col]) ? 'date' : 'string',
          sample: String(firstRow[col] || '').substring(0, 50)
        }));

        // Use OpenAI to analyze query
        const queryAnalysis = await naturalLanguageToSQL(input.query, schema);
        
        if (!queryAnalysis.success) {
          return {
            success: false,
            error: queryAnalysis.error,
            sql: "-- OpenAI query analysis failed",
          };
        }

        // For now, we'll simulate SQL execution with basic JavaScript aggregation
        // In a real implementation, you might want to use a SQL engine like sqlite
        const result = executeBasicSQL(dataset, queryAnalysis);

        // Determine display type based on result structure and query intent
        let displayType: "number" | "chart" | "table" = "chart";
        
        if (result.length === 1 && Object.keys(result[0]).length === 1) {
          displayType = "number";
        } else if (input.query.toLowerCase().includes("filter") || 
                   input.query.toLowerCase().includes("show me") ||
                   input.query.toLowerCase().includes("list") ||
                   input.query.toLowerCase().includes("find") ||
                   result.length > 10) {
          displayType = "table";
        } else {
          displayType = "chart";
        }

        return {
          success: true,
          interpretation: {
            aggregation: queryAnalysis.aggregationType || "count",
            groupBy: queryAnalysis.groupByField ? [queryAnalysis.groupByField] : [],
            filters: [],
            chartType: queryAnalysis.chartType || "bar",
            displayType,
          },
          sql: queryAnalysis.sql,
          result: result.slice(0, 20), // Limit results for performance
          displayType,
        };

      } catch (error) {
        console.error("Query processing error:", error);
        
        return {
          success: false,
          error: "Failed to process query",
          details: error instanceof Error ? error.message : "Unknown error",
          sql: "-- Query processing failed",
        };
      }
    }),
});
