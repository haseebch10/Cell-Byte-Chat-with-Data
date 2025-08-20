# CellByte - Chat with Data

A full-stack application that turns natural language questions into analytics over tabular data with dynamic chart generation.

## 🚀 Features

### Core Functionality (MVP)
- ✅ **Data Ingestion**: Upload CSV files or load sample datasets
- ✅ **Schema Inference**: Automatically detect column types (numeric, categorical, date)
- ✅ **Natural Language Queries**: Ask questions about your data in plain English
- ✅ **Dynamic Charts**: Auto-generated visualizations (bar, line, pie charts)
- ✅ **Interactive Filtering**: Switch between chart types
- ✅ **Export Functionality**: Download results as CSV and charts as PNG
- ✅ **Responsive UI**: Clean, modern interface with loading states

### Architecture Highlights
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **tRPC** for type-safe API layer
- **Tailwind CSS** + **Radix UI** for styling
- **Recharts** for data visualization
- **React Context** for state management
- **Zod** for runtime type validation

## 📋 Requirements

- Node.js 18+ 
- npm or yarn

## 🛠️ Getting Started

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd cellbyte-chat-with-data
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Add your API keys if using LLM features (optional):
   ```env
   OPENAI_API_KEY=your-openai-api-key-here
   ANTHROPIC_API_KEY=your-anthropic-api-key-here
   NEXTAUTH_SECRET=your-secret-here
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📊 How to Use

1. **Load Data**:
   - Upload a CSV file by dragging and dropping or clicking "Choose File"
   - Or click "Load Germany Sample Dataset" to try with sample data

2. **Ask Questions**:
   - Type natural language questions like:
     - "What are the treatment costs for Cancer?"
     - "Show me the total costs by indication"
     - "What's the average cost per treatment type?"

3. **Interact with Results**:
   - Switch between bar, line, and pie chart views
   - Export results as CSV
   - Download charts as PNG (placeholder implementation)

## 🏗️ Project Structure

```
src/
├── app/                 # Next.js app router
│   ├── api/trpc/       # tRPC API endpoints
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
├── components/         # React components
│   ├── ui/            # Reusable UI components
│   ├── data-ingestion.tsx
│   ├── chat-interface.tsx
│   ├── data-visualization.tsx
│   └── data-provider.tsx
├── lib/               # Utility functions
├── server/            # tRPC server code
│   └── api/
├── styles/            # Global styles
└── trpc/              # tRPC client setup
```

## 🎯 What I Built

### Completed Features
1. **Data Pipeline**: Full CSV upload and processing flow
2. **Interactive Chat**: Real-time question processing with response streaming
3. **Smart Visualizations**: Context-aware chart type selection
4. **Export Capabilities**: CSV and image export functionality
5. **Responsive Design**: Works on desktop and mobile
6. **Error Handling**: Graceful error states and loading indicators

### Technical Decisions
- **tRPC over REST**: Type-safe APIs with better DX
- **Context for State**: Simple state management without Redux complexity
- **Recharts**: Reliable, customizable charting library
- **Tailwind + Radix**: Consistent design system with accessibility

## 🔄 Current Limitations & Next Steps

### Current Implementation
- **Mock Query Processing**: Uses rule-based parsing instead of LLM
- **In-Memory Storage**: No persistent database (data lost on refresh)
- **Basic Schema Inference**: Simple type detection
- **Limited Chart Export**: PNG export is placeholder

### Next Phase (6+ hours)
1. **LLM Integration**: OpenAI/Claude for natural language processing
2. **Database Layer**: PostgreSQL for data persistence
3. **Advanced Analytics**: Aggregations, joins, time-series analysis
4. **Multi-table Support**: CSV joins and relationships
5. **Sharing**: Shareable URLs with encoded queries
6. **Performance**: Caching, pagination for large datasets
7. **Advanced Charts**: More visualization types and customization

## 🔒 Security Considerations

- Input validation with Zod schemas
- CSV parsing with size limits
- No sensitive data logged
- Environment variables properly managed
- XSS protection through React's default escaping

## 🧪 Testing

Run type checking:
```bash
npm run type-check
```

Run linting:
```bash
npm run lint
```

## 📚 Tech Stack Deep Dive

- **Framework**: Next.js 14 (React 18, App Router)
- **Language**: TypeScript
- **API**: tRPC for end-to-end type safety
- **Database**: In-memory (PostgreSQL ready)
- **Styling**: Tailwind CSS + Radix UI primitives
- **Charts**: Recharts (D3.js wrapper)
- **State**: React Context + useState
- **Validation**: Zod schemas
- **Development**: ESLint, TypeScript compiler

## 🎨 Design Philosophy

- **User-First**: Intuitive workflows over technical complexity
- **Progressive Enhancement**: Works without JavaScript for core features
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Performance**: Lazy loading, optimistic updates, efficient re-renders
- **Maintainability**: Clear separation of concerns, typed interfaces

---

**Time Investment**: ~6 hours focused development
**Priority**: User experience and core functionality over advanced features
**Trade-offs**: Focused on MVP completeness rather than scale optimization

For questions or suggestions, please open an issue or reach out!
