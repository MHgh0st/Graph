import ReactDOM from "react-dom/client";
import "./index.css";
import { useState, useEffect } from "react";
import { HeroUIProvider } from "@heroui/system";
import ProcessData from "./utils/ProcessData";
import FileUploader from "./components/FileUploader";
import Graph from "./components/Graph";
import Filters from "./components/Filters";
import { FilterTypes } from "./types/types";
function App() {
  const [dataFilePath, setDataFilePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);
  const [graphData, setGraphData] = useState<any[] | null>(null);
  const submit = async (filters?: FilterTypes) => {
    switch (step) {
      case 1:
        setStep(2);
        break;
      case 2:
        setIsLoading(true);
        setGraphData(await ProcessData(dataFilePath, filters));
        setIsLoading(false);
        break;
    }
  };

  useEffect(() => {
    console.log("graph data: ", graphData);
  }, [graphData]);
  return (
    <>
      <HeroUIProvider locale="fa-IR">
        {step === 1 && (
          <FileUploader setPythonPath={setDataFilePath} submit={submit} />
        )}
        {step === 2 && dataFilePath && (
          <div
            className="grid grid-cols-12 w-screen h-screen p-2 overflow-hidden"
            dir="rtl"
          >
            <Filters
              className="col-span-3"
              submit={submit}
              isLoading={isLoading}
            />
            <main className="col-span-9 flex items-center justify-center">
              {isLoading && <p>در حال پردازش داده‌ها، لطفاً منتظر بمانید...</p>}

              {!isLoading && graphData && (
                <Graph data={graphData} className="w-full h-full" />
              )}

              {!isLoading && !graphData && (
                <p>
                  برای مشاهده‌ی گراف، فیلترها را تنظیم کرده و دکمه "پردازش" را
                  بزنید.
                </p>
              )}
            </main>
          </div>
        )}
      </HeroUIProvider>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
