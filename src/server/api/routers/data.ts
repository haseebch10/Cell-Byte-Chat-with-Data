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



// Generate dynamic chart code using OpenAI GPT-4 Turbo
// This function generates React/TypeScript code using Recharts
async function generateChartCode(
  originalQuery: string, 
  data: any[], 
  schema: any[], 
  chartType?: string
): Promise<{
  success: boolean;
  code?: string;
  error?: string;
}> {
  if (!openai) {
    return {
      success: false,
      error: "OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.",
    };
  }

  // Create data description for the LLM (only first 3 rows to save tokens)
  const dataDescription = data.slice(0, 3).map((row, i) => 
    `Row ${i + 1}: ${JSON.stringify(row)}`
  ).join('\n');

  const schemaDescription = schema.map(col => 
    `${col.name} (${col.type}): ${col.sample}`
  ).join('\n');

  const prompt = `Generate executable JavaScript code for a ${chartType || "chart"} using React.createElement and Recharts.

Data: ${JSON.stringify(data.slice(0, 3))}

REQUIREMENTS:
- Generate a JavaScript function that returns React.createElement calls
- Use React.createElement instead of JSX (no < > syntax)
- Function takes (data, React, Recharts) as parameters
- Use exact field names from the data
- Make it directly executable with eval()

AVAILABLE RECHARTS COMPONENTS:
- BarChart, Bar, LineChart, Line, PieChart, Pie, Cell
- AreaChart, Area, ScatterChart, Scatter, RadarChart, Radar
- XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
- PolarGrid, PolarAngleAxis, PolarRadiusAxis, ComposedChart, ReferenceLine

FOR HEATMAPS: Use ScatterChart with custom styling or BarChart with small bars

EXAMPLE FOR BAR CHART:
\`\`\`javascript
function(data, React, Recharts) {
  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;
  
  return React.createElement('div', { style: { width: '100%', height: 300 } },
    React.createElement(ResponsiveContainer, {},
      React.createElement(BarChart, { data: data },
        React.createElement(CartesianGrid, { strokeDasharray: '3 3' }),
        React.createElement(XAxis, { dataKey: 'name' }),
        React.createElement(YAxis, {}),
        React.createElement(Tooltip, {}),
        React.createElement(Legend, {}),
        React.createElement(Bar, { dataKey: 'value', fill: '#8884d8' })
      )
    )
  );
}
\`\`\`

EXAMPLE FOR PIE CHART:
\`\`\`javascript
function(data, React, Recharts) {
  const { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } = Recharts;
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];
  
  return React.createElement('div', { style: { width: '100%', height: 300 } },
    React.createElement(ResponsiveContainer, {},
      React.createElement(PieChart, {},
        React.createElement(Pie, { 
          data: data, 
          dataKey: 'value', 
          nameKey: 'category',
          cx: '50%', 
          cy: '50%', 
          outerRadius: 80, 
          fill: '#8884d8' 
        }, data.map((entry, index) => 
          React.createElement(Cell, { key: 'cell-' + index, fill: colors[index % colors.length] })
        )),
        React.createElement(Tooltip, {})
      )
    )
  );
}
\`\`\`

Generate executable JavaScript function for ${chartType || "requested"} chart using React.createElement.`;

  try {
    const completionPromise = openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // Using the latest GPT-4 Turbo for better performance
      messages: [
        { role: "system", content: "You are a React expert that generates executable JavaScript functions using React.createElement and Recharts. You MUST return ONLY the function code that can be executed with eval() - no JSX, no explanations." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 3000, // Token limit for chart generation
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('OpenAI request timeout after 20 seconds')), 20000)
    );

    const completion = await Promise.race([completionPromise, timeoutPromise]) as any;

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      return {
        success: false,
        error: "OpenAI returned an empty response. Please try rephrasing your query.",
      };
    }

    // Extract JavaScript code from markdown code blocks if present
    let code = response.trim();
    if (code.includes('```javascript')) {
      const codeMatch = code.match(/```javascript\n([\s\S]*?)\n```/);
      if (codeMatch) {
        code = codeMatch[1];
      }
    } else if (code.includes('```')) {
      const codeMatch = code.match(/```\n([\s\S]*?)\n```/);
      if (codeMatch) {
        code = codeMatch[1];
      }
    }

    if (!code || code.trim().length === 0) {
      return {
        success: false,
        error: "Generated response does not contain valid code.",
      };
    }

    return {
      success: true,
      code: code.trim(),
    };
  } catch (error) {
    console.error("OpenAI chart generation error:", error);
    
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
        error: `Failed to generate chart: ${errorMessage}. Please try rephrasing your request.`,
      };
    }
  }
}

// Convert natural language queries to SQL using OpenAI
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
      model: "gpt-4-turbo-preview", // Using GPT-4 Turbo for better SQL generation
      messages: [
        { role: "system", content: "You are a SQL expert that returns only valid JSON responses. You excel at generating accurate SQL queries for data analysis and visualization." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 800, // Increased token limit for more complex queries
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

    // Extract JSON from markdown code blocks if present
    let jsonString = response.trim();
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(jsonString);
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

// Execute SQL simulation with JavaScript aggregation
function executeBasicSQL(dataset: any[], queryAnalysis: {
  aggregationType?: string;
  groupByField?: string;
  aggregateField?: string;
  sql?: string; // Add SQL to extract LIMIT
}): any[] {
  const { aggregationType = "count", groupByField = "", aggregateField = "", sql = "" } = queryAnalysis;

  // Extract LIMIT from SQL query
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
  const limit = limitMatch ? parseInt(limitMatch[1]) : null;

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

  // Apply LIMIT if specified in SQL
  return limit ? result.slice(0, limit) : result;
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

        // Get dataset schema for OpenAI with detailed type detection explanations
        const firstRow = dataset[0];
        const schema = Object.keys(firstRow).map(col => {
          const value = firstRow[col];
          let type: string;
          let explanation: string;
          
          if (typeof value === 'number') {
            type = 'number';
            explanation = `Detected as numeric (value: ${value})`;
          } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            type = 'date';
            explanation = `Detected as date (pattern: YYYY-MM-DD, value: "${value}")`;
          } else if (typeof value === 'string' && /^\d+\.?\d*$/.test(value)) {
            type = 'number';
            explanation = `Detected as numeric string, will be parsed as number (value: "${value}")`;
          } else {
            type = 'string';
            explanation = `Detected as text/categorical (value: "${String(value).substring(0, 30)}${String(value).length > 30 ? '...' : ''}")`;
          }
          
          return {
            name: col,
            type,
            sample: String(value || '').substring(0, 50),
            explanation
          };
        });

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
        const result = executeBasicSQL(dataset, { ...queryAnalysis, sql: queryAnalysis.sql });

        // Determine display type based on result structure and query intent
        let displayType: "number" | "chart" | "table" = "chart";
        
        if (result.length === 1 && Object.keys(result[0]).length === 1) {
          // Single aggregated value - show as number
          displayType = "number";
        } else if (input.query.toLowerCase().includes("filter") && 
                   (input.query.toLowerCase().includes("show") || 
                    input.query.toLowerCase().includes("list") || 
                    input.query.toLowerCase().includes("give me all"))) {
          // Explicit request for filtering/listing results - show as table
          displayType = "table";
        } else if (queryAnalysis.groupByField && queryAnalysis.aggregationType) {
          // Grouped aggregation (top X, comparison, breakdown) - always show as chart
          displayType = "chart";
        } else if (result.length > 20) {
          // Large result set without grouping - show as table
          displayType = "table";
        } else {
          // Default to chart for analytical queries
          displayType = "chart";
        }

        // Generate detailed explanations for the analysis
        const explanations = [];
        
        // Skip column type detection - too verbose and not user-friendly
        
        // Explain query processing
        if (queryAnalysis.aggregationType && queryAnalysis.aggregateField) {
          explanations.push(`**Aggregation Choice:** Used ${queryAnalysis.aggregationType.toUpperCase()} on "${queryAnalysis.aggregateField}" because your query requested ${queryAnalysis.aggregationType === 'sum' ? 'total values' : queryAnalysis.aggregationType === 'avg' ? 'average values' : 'counting records'}`);
        }
        
        if (queryAnalysis.groupByField) {
          explanations.push(`**Grouping Logic:** Grouped results by "${queryAnalysis.groupByField}" to show breakdown across different ${queryAnalysis.groupByField.replace(/_/g, ' ')} values`);
        }
        
        // Explain chart type selection
        const chartExplanation = queryAnalysis.chartType === 'pie' ? 'pie chart for distribution/percentage view' :
                                queryAnalysis.chartType === 'line' ? 'line chart for trend/time-series data' :
                                'bar chart for comparison of values across categories';
        explanations.push(`**Visualization Choice:** Selected ${chartExplanation} based on query intent and data structure`);
        
        // Explain display type logic
        if (displayType === 'number') {
          explanations.push(`**Display Format:** Showing single number result because query returned one aggregated value`);
        } else if (displayType === 'table') {
          explanations.push(`**Display Format:** Using table view because query appears to be filtering/listing records (${result.length} rows returned)`);
        } else {
          explanations.push(`**Display Format:** Using chart visualization because query shows grouped/comparative data (${result.length} categories)`);
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
          explanations: explanations.join('\n\n'), // Add explanations to response
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

  // Generate dynamic chart HTML using OpenAI
  generateChart: publicProcedure
    .input(z.object({
      originalQuery: z.string(),
      data: z.array(z.record(z.any())),
      schema: z.array(z.object({
        name: z.string(),
        type: z.string(),
        sample: z.string(),
      })),
      chartType: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await generateChartCode(
          input.originalQuery,
          input.data,
          input.schema,
          input.chartType
        );

        if (!result.success) {
          return {
            success: false,
            error: result.error,
          };
        }

        return {
          success: true,
          code: result.code,
        };
      } catch (error) {
        console.error("Chart generation error:", error);
        
        return {
          success: false,
          error: "Failed to generate chart",
          details: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
});
