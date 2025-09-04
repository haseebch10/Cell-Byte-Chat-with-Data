/**
 * tRPC Client Functions
 */
export const tRPCClient = {
  async getSampleData(dataset: "germany_sample" | "treatment_costs") {
    const inputParam = JSON.stringify({
      "0": {
        "json": { dataset }
      }
    });
    
    const url = `/api/trpc/data.getSampleData?batch=1&input=${encodeURIComponent(inputParam)}`;
    
    const response = await fetch(url, {
      method: "GET",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json();
    
    if (data[0]?.result?.data?.json) {
      return data[0].result.data.json;
    } else if (data[0]?.result?.data) {
      return data[0].result.data;
    } else if (data[0]?.result) {
      return data[0].result;
    } else {
      throw new Error("Unexpected response structure");
    }
  },
  
  async processCSV(csvData: string, filename: string) {
    const response = await fetch("/api/trpc/data.processCSV", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "json": { csvData, filename } }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json();
    
    // Handle nested structure like getSampleData
    if (data.result?.data?.json) {
      return data.result.data.json;
    } else if (data.result?.data) {
      const resultData = data.result.data;
      if (resultData.json) {
        return resultData.json;
      } else {
        return resultData;
      }
    } else if (data.json) {
      return data.json;
    } else if (data.success !== undefined) {
      return data;
    }
    
    throw new Error("Unexpected response format from server");
  },

  async processQuery(query: string, datasetId: string) {
    const response = await fetch("/api/trpc/data.processQuery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "json": { query, datasetId } }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Handle response format
    if (data?.result?.data) {
      return data.result.data;
    } else if (data?.success !== undefined) {
      return data;
    } else {
      throw new Error("Unexpected response format from server");
    }
  },

  async generateChart(originalQuery: string, data: any[], schema: any[], chartType?: string) {
    console.log("tRPCClient: Generating chart with data length:", data.length, "schema:", schema.length);
    
    const response = await fetch("/api/trpc/data.generateChart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        "json": { 
          originalQuery, 
          data, 
          schema, 
          chartType 
        } 
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("tRPCClient: HTTP error:", response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log("tRPCClient: Raw response:", result);
    
    // Handle response format
    if (result?.result?.data?.json) {
      console.log("tRPCClient: Returning result.data.json:", result.result.data.json);
      return result.result.data.json;
    } else if (result?.result?.data) {
      console.log("tRPCClient: Returning result.data:", result.result.data);
      return result.result.data;
    } else if (result?.success !== undefined) {
      console.log("tRPCClient: Returning direct result:", result);
      return result;
    } else {
      console.error("tRPCClient: Unexpected response format:", result);
      throw new Error("Unexpected response format from server");
    }
  }
};
