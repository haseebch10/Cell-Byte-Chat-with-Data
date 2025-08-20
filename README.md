# CellByte - Chat with Your Data

A full-stack "chat with your data" application that transforms natural language questions into analytics over tabular data, with dynamic charts and interactive visualizations.

## ✅ **MVP Status - COMPLETED**

### **Core Features Implemented**
- **✅ Data Ingestion**: Upload CSV files or use sample datasets
- **✅ Schema Inference**: Auto-detect column types (numeric, categorical, date)
- **✅ Natural Language Queries**: Convert questions to SQL with OpenAI integration
- **✅ Dynamic Charts**: Bar, line, and pie charts with interactive switching
- **✅ Data Export**: CSV downloads and PNG chart exports
- **✅ Professional UI**: Clean interface with proper loading states

### **LLM Integration** 🚀
- **OpenAI GPT-3.5**: Converts natural language to SQL queries
- **Smart Fallbacks**: Rule-based processing when OpenAI unavailable
- **Context-Aware**: Uses actual dataset schema for accurate query generation

## 🚀 **Quick Start**

### Prerequisites
- Node.js 18+
- OpenAI API Key (for enhanced query processing)

### Installation
```bash
# Clone and install
git clone <repository>
cd cellbyte-chat-with-data
npm install

# Setup environment
cp env.example .env
# Add your OpenAI API key to .env:
# OPENAI_API_KEY="your-api-key-here"

# Run development server
npm run dev
```

Visit `http://localhost:3000` to start chatting with your data!

## 💻 **How to Use**

1. **Load Data**: Upload a CSV file or use the Germany sample dataset
2. **Ask Questions**: Use natural language like:
   - "What are the treatment costs by indication?"
   - "Show me the distribution of drugs by therapeutic area"
   - "Average costs per treatment type"
3. **View Results**: Get instant charts and data visualizations
4. **Export**: Download results as CSV or charts as PNG

## 🏗️ **Architecture**

### **Tech Stack**
- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: tRPC, OpenAI API
- **Charts**: Recharts
- **Data Processing**: PapaParse for CSV handling

### **Key Components**
- `QueryInterface`: Natural language input and chat interface
- `AnalysisPanel`: Data preview, schema display, and results
- `DataVisualization`: Interactive charts with type switching
- `Sidebar`: Navigation and query history

## 📊 **Sample Queries**

Try these questions with the sample dataset:

```
"What are the total costs by indication?"
"Show me treatments over time"
"Average cost per drug brand"
"Distribution of treatments by therapeutic area"
"Compare costs between different indications"
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Required for enhanced query processing
OPENAI_API_KEY="your-openai-api-key"

# App configuration
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

## 🎯 **Features in Detail**

### **Data Processing**
- **CSV Upload**: Drag & drop or file picker
- **Schema Detection**: Automatic column type inference
- **Data Preview**: First 5 rows with full schema
- **In-Memory Storage**: Fast query processing

### **Query Processing**
- **OpenAI Integration**: GPT-3.5 for natural language → SQL
- **Intelligent Parsing**: Context-aware field detection
- **Rule-Based Fallback**: Works without OpenAI API key
- **Result Aggregation**: SUM, AVG, COUNT operations

### **Visualizations**
- **Dynamic Charts**: Auto-select appropriate chart type
- **Interactive**: Switch between bar, line, and pie charts
- **Export Ready**: PNG download for presentations
- **Responsive**: Clean design across devices

## 🚧 **Future Enhancements**

- [ ] **Advanced Filters**: Date ranges, multi-select categories
- [ ] **Multi-table Joins**: Support for related datasets
- [ ] **Persistent Storage**: Database integration
- [ ] **Sharing**: URL-based query sharing
- [ ] **More Chart Types**: Scatter plots, heatmaps
- [ ] **Claude API**: Alternative to OpenAI

## 📈 **Performance**

- **Fast Queries**: In-memory processing for sub-second responses
- **Efficient Parsing**: Optimized CSV processing
- **Caching**: Query result caching for repeated requests
- **Scalable**: Handles datasets up to 50k rows efficiently

## 🔒 **Security**

- **Input Validation**: Safe CSV parsing and query sanitization
- **API Key Protection**: Server-side OpenAI integration
- **Error Handling**: Graceful fallbacks and user-friendly messages

---

**Built with ❤️ for the CellByte coding challenge**

Transform your data into insights with natural language - no SQL knowledge required!