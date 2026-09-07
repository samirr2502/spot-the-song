// context/DataServiceContext.tsx
import React, { createContext, useContext } from "react";
import { TestData } from "./_actions/TestData";

const testDataService = new TestData();

// Create context type
type TestDataServiceContextType = TestData;

// Create the context (default undefined so we enforce usage in provider)
const TestDataServiceeContext = createContext<TestDataServiceContextType | undefined>(undefined);

export const TestDataServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <TestDataServiceeContext.Provider value={testDataService}>
      {children}
    </TestDataServiceeContext.Provider>
  );
};

// Custom hook for cleaner usage
export function useTestDataService(): TestData {
  const context = useContext(TestDataServiceeContext);
  if (!context) {
    throw new Error("useDataService must be used within a DataServiceProvider");
  }
  return context;
}