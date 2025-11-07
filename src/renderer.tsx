import ReactDOM from "react-dom/client";
import "./index.css";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { X } from "lucide-react";
import { HeroUIProvider } from "@heroui/system";
import ProcessData from "./utils/ProcessData";
import FileUploader from "./components/FileUploader";
import Graph from "./components/Graph";
import Filters from "./components/Filters";
import { FilterTypes } from "./types/types";
import SideBar from "./components/SideBar";
function App() {
  const [dataFilePath, setDataFilePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);
  const [graphData, setGraphData] = useState<any[] | null>(null);
  const [sideBarActiveTab, setSideBarActiveTab] = useState<
    "Filter" | "Routing"
  >("Filter");
  const [isSideCardShow, setIsSideCardShow] = useState<boolean>(true);

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
            className="grid grid-cols-24 w-screen h-screen p-2 overflow-hidden"
            dir="rtl"
          >
            <SideBar
              className="col-span-2"
              activeTab={sideBarActiveTab}
              onClickTab={(name) => {
                setSideBarActiveTab(name);
                setIsSideCardShow(true);
              }}
            />

            {isSideCardShow && (
              <Card className="col-span-6">
                <CardHeader className="flex gap-x-3">
                  <Button
                    isIconOnly
                    size="sm"
                    color="danger"
                    variant="flat"
                    onPress={() => {
                      setIsSideCardShow(false);
                      setSideBarActiveTab(null);
                    }}
                  >
                    <X size={20} />
                  </Button>
                  <p className="text-2xl font-bold">
                    {sideBarActiveTab === "Filter" ? "فیلتر ها" : ""}
                  </p>
                </CardHeader>
                <CardBody>
                  {sideBarActiveTab === "Filter" && (
                    <Filters submit={submit} isLoading={isLoading} />
                  )}
                </CardBody>
              </Card>
            )}
            <main
              className={`${isSideCardShow ? "col-span-16" : "col-span-22"} flex items-center justify-center`}
            >
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
