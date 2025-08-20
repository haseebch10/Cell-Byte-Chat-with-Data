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
  }
};
