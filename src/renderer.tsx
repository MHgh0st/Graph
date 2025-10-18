import ReactDOM from "react-dom/client";
import "./index.css";
import { useState, useEffect } from "react";
import { HeroUIProvider } from "@heroui/system";

import FileUploader from "./components/FileUploader";
import Graph from "./components/Graph";
function App() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [step, setStep] = useState<number>(1);
  useEffect(() => {
    if (filePath) {
      console.log("parent output path: ", filePath);
      setStep(2);
    }
  }, [filePath]);
  return (
    <>
      <HeroUIProvider>
        {step === 1 && <FileUploader setOutputPath={setFilePath} />}
        {step === 2 && filePath && <Graph path={filePath} />}
      </HeroUIProvider>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
