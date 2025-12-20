/**
 * Renderer Entry Point
 * 
 * This is the entry point for the React application running in the Electron renderer process.
 * It sets up providers and renders the root App component.
 * 
 * Architecture:
 * - State Management: Zustand (./hooks/useAppStore.ts)
 * - IPC Communication: Custom hooks (./hooks/useElectronAPI.ts)
 * - Layout: FileUploader (step 1) → Dashboard (step 2)
 * 
 * @module renderer
 */

import ReactDOM from "react-dom/client";
import "./index.css";

import { HeroUIProvider } from "@heroui/system";
import { ReactFlowProvider } from "@xyflow/react";

import { useAppStore } from "./hooks";
import FileUploader from "./components/FileUploader";
import Dashboard from "./components/Dashboard";

/**
 * App
 * 
 * Root application component.
 * Controls the main application flow based on step state:
 * - Step 1: File upload screen
 * - Step 2: Main dashboard with graph visualization
 */
function App() {
  const step = useAppStore((state) => state.step);

  return (
    <ReactFlowProvider>
      <HeroUIProvider locale="fa-IR">
        {step === 1 && <FileUploader />}
        {step === 2 && <Dashboard />}
      </HeroUIProvider>
    </ReactFlowProvider>
  );
}

// Mount the application
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);