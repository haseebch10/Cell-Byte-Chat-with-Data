// Sample data for testing and development
// In production, these would be loaded from actual CSV files

export const SAMPLE_GERMANY_DATA = [
  {
    id: 1,
    indication: "Cancer",
    treatment: "Chemotherapy",
    cost: 5000,
    date: "2023-01-15",
    region: "North",
    age_group: "50-65"
  },
  {
    id: 2,
    indication: "Diabetes",
    treatment: "Insulin",
    cost: 150,
    date: "2023-01-20",
    region: "South",
    age_group: "35-50"
  },
  {
    id: 3,
    indication: "Heart Disease",
    treatment: "Surgery",
    cost: 12000,
    date: "2023-02-01",
    region: "East",
    age_group: "65+"
  },
  {
    id: 4,
    indication: "Cancer",
    treatment: "Radiation",
    cost: 8000,
    date: "2023-02-10",
    region: "West",
    age_group: "50-65"
  },
  {
    id: 5,
    indication: "Diabetes",
    treatment: "Metformin",
    cost: 85,
    date: "2023-02-15",
    region: "North",
    age_group: "35-50"
  },
  {
    id: 6,
    indication: "Heart Disease",
    treatment: "Medication",
    cost: 300,
    date: "2023-02-20",
    region: "South",
    age_group: "50-65"
  },
  {
    id: 7,
    indication: "Cancer",
    treatment: "Immunotherapy",
    cost: 15000,
    date: "2023-03-01",
    region: "East",
    age_group: "35-50"
  },
  {
    id: 8,
    indication: "Diabetes",
    treatment: "GLP-1",
    cost: 450,
    date: "2023-03-05",
    region: "West",
    age_group: "50-65"
  },
];

export const SAMPLE_TREATMENT_COSTS_DATA = [
  {
    treatment_id: 1,
    treatment_name: "Chemotherapy",
    indication: "Cancer",
    base_cost: 5000,
    additional_costs: 1200,
    total_cost: 6200,
    duration_weeks: 12,
    success_rate: 0.75
  },
  {
    treatment_id: 2,
    treatment_name: "Radiation",
    indication: "Cancer", 
    base_cost: 8000,
    additional_costs: 800,
    total_cost: 8800,
    duration_weeks: 8,
    success_rate: 0.82
  },
  {
    treatment_id: 3,
    treatment_name: "Surgery",
    indication: "Heart Disease",
    base_cost: 12000,
    additional_costs: 2000,
    total_cost: 14000,
    duration_weeks: 2,
    success_rate: 0.90
  },
  {
    treatment_id: 4,
    treatment_name: "Insulin",
    indication: "Diabetes",
    base_cost: 150,
    additional_costs: 50,
    total_cost: 200,
    duration_weeks: 52,
    success_rate: 0.95
  },
];

export function inferSchema(data: any[]) {
  if (!data.length) {
    return [];
  }
  
  const firstRow = data[0];
  const schema = Object.keys(firstRow).map(key => {
    const value = firstRow[key];
    let type: "string" | "number" | "date" | "boolean" = "string";
    
    if (typeof value === "number") {
      type = "number";
    } else if (typeof value === "boolean") {
      type = "boolean";
    } else if (typeof value === "string") {
      // Try to detect dates
      if (!isNaN(Date.parse(value)) && value.includes("-")) {
        type = "date";
      }
      // Try to detect numbers in string format
      else if (!isNaN(Number(value))) {
        type = "number";
      }
    }
    
    return {
      name: key,
      type,
      sample: String(value)
    };
  });
  
  return schema;
}
