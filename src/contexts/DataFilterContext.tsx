"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type DataSourceFilter = "all" | "legacy" | "new";

interface DataFilterContextType {
  dataSource: DataSourceFilter;
  setDataSource: (value: DataSourceFilter) => void;
  includeLegacy: boolean; // Convenience getter
  includeNew: boolean; // Convenience getter
}

const DataFilterContext = createContext<DataFilterContextType | undefined>(undefined);

export function DataFilterProvider({ children }: { children: ReactNode }) {
  const [dataSource, setDataSourceState] = useState<DataSourceFilter>("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem("dataSourceFilter");
    if (stored && ["all", "legacy", "new"].includes(stored)) {
      setDataSourceState(stored as DataSourceFilter);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    // Save to localStorage when changed (only after mount)
    if (mounted) {
      localStorage.setItem("dataSourceFilter", dataSource);
    }
  }, [dataSource, mounted]);

  const setDataSource = (value: DataSourceFilter) => setDataSourceState(value);

  // Convenience getters for API calls
  const includeLegacy = dataSource === "all" || dataSource === "legacy";
  const includeNew = dataSource === "all" || dataSource === "new";

  return (
    <DataFilterContext.Provider value={{ dataSource, setDataSource, includeLegacy, includeNew }}>
      {children}
    </DataFilterContext.Provider>
  );
}

export function useDataFilter() {
  const context = useContext(DataFilterContext);
  if (context === undefined) {
    throw new Error("useDataFilter must be used within a DataFilterProvider");
  }
  return context;
}

// Helper to build query params for API calls
export function getDataSourceParam(dataSource: DataSourceFilter): string {
  if (dataSource === "legacy") return "source=LEGACY_IMPORT";
  if (dataSource === "new") return "source=MANUAL,CAMPAIGN";
  return ""; // "all" - no filter
}
