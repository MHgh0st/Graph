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
import { useGraphLayout } from "./components/graph/hooks/useGraphLayout";
import { useGraphInteraction } from "./components/graph/hooks/useGraphInteraction";
import { PathfindingCard } from "./components/graph/ui/PathfindingCard";
import ColorPaletteCard from "./components/graph/ui/ColorPaletteCard";
import { paletteOptions } from "./constants/colorPalettes";
function App() {
  const [dataFilePath, setDataFilePath] = useState<string | null>(null);
  const [isLoadingRenderer, setIsLoadingRenderer] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);
  const [graphData, setGraphData] = useState<any[] | null>(null);
  const [sideBarActiveTab, setSideBarActiveTab] = useState<
    "Filter" | "Routing" | "ColorPalette"
  >("Filter");
  const [isSideCardShow, setIsSideCardShow] = useState<boolean>(true);
  const [selectedColorPalette, setSelectedColorPalette] =
    useState<string>("default");

  const {
    allNodes,
    layoutedNodes,
    layoutedEdges,
    isLoading,
    loadingMessage,
    setLayoutedNodes,
    setLayoutedEdges,
  } = useGraphLayout(graphData, selectedColorPalette);
  const {
    activeTooltipEdgeId,
    cardContentFlag,
    nodeTooltipTitle,
    nodeTooltipData,
    pathStartNodeId,
    pathEndNodeId,
    foundPaths,
    selectedPathNodes,
    selectedPathEdges,
    selectedPathIndex,
    isPathfindingLoading,
    isPathFinding,
    handleEdgeSelect,
    handleSelectPath,
    handleNodeClick,
    closeNodeTooltip,
    setIsPathFinding,
    setCardContentFlag,
    resetPathfinding,
    calculatePathDuration,
    onPaneClick,
  } = useGraphInteraction(
    allNodes,
    layoutedEdges,
    setLayoutedNodes,
    setLayoutedEdges
  );
  const submit = async (filters?: FilterTypes) => {
    switch (step) {
      case 1:
        setStep(2);
        break;
      case 2:
        setIsLoadingRenderer(true);
        setGraphData(await ProcessData(dataFilePath, filters));
        setIsLoadingRenderer(false);
        break;
    }
  };

  useEffect(() => {
    console.log("graph data: ", graphData);
  }, [graphData]);

  useEffect(() => {
    if (sideBarActiveTab == "Routing" && graphData) {
      setIsPathFinding(true);
    } else {
      setIsPathFinding(false);
      resetPathfinding();
    }
  }, [sideBarActiveTab]);

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
                      setIsPathFinding(false);
                      resetPathfinding();
                    }}
                  >
                    <X size={20} />
                  </Button>
                  <p className="text-2xl font-bold">
                    {sideBarActiveTab === "Filter" && "فیلتر ها"}
                    {sideBarActiveTab === "Routing" && "مسیر یابی بین دو یال"}
                    {sideBarActiveTab === "ColorPalette" && "انتخاب ظیف رنگی"}
                  </p>
                </CardHeader>
                <CardBody className="text-right">
                  {sideBarActiveTab === "Filter" ? (
                    <Filters submit={submit} isLoading={isLoadingRenderer} />
                  ) : sideBarActiveTab === "Routing" ? (
                    graphData ? (
                      <PathfindingCard
                        startNodeId={pathStartNodeId}
                        endNodeId={pathEndNodeId}
                        paths={foundPaths}
                        allNodes={allNodes}
                        onSelectPath={handleSelectPath}
                        selectedIndex={selectedPathIndex}
                        calculatePathDuration={calculatePathDuration}
                        isLoading={isPathfindingLoading}
                        handleNodeClick={handleNodeClick}
                      />
                    ) : (
                      <div className="w-full h-full flex justify-center items-center text-center text-3xl font-bold leading-15">
                        لطفا ابتدا داده ی گراف را از تب فیلتر ها انتخاب کنید.
                      </div>
                    )
                  ) : (
                    sideBarActiveTab === "ColorPalette" && (
                      <ColorPaletteCard
                        options={paletteOptions}
                        value={selectedColorPalette}
                        onChange={(value) => {
                          setSelectedColorPalette(value);
                        }}
                      />
                    )
                  )}
                </CardBody>
              </Card>
            )}
            <main
              className={`${isSideCardShow ? "col-span-16" : "col-span-22"} flex items-center justify-center`}
            >
              {isLoadingRenderer && (
                <p>در حال پردازش داده‌ها، لطفاً منتظر بمانید...</p>
              )}

              {!isLoadingRenderer && graphData && (
                <Graph
                  className="w-full h-full"
                  utils={{
                    GraphLayout: {
                      allNodes,
                      layoutedNodes,
                      layoutedEdges,
                      isLoading,
                      loadingMessage,
                      setLayoutedNodes,
                      setLayoutedEdges,
                    },
                    GraphInteraction: {
                      activeTooltipEdgeId,
                      cardContentFlag,
                      nodeTooltipTitle,
                      nodeTooltipData,
                      pathStartNodeId,
                      pathEndNodeId,
                      foundPaths,
                      selectedPathNodes,
                      selectedPathEdges,
                      selectedPathIndex,
                      isPathfindingLoading,
                      isPathFinding,
                      handleEdgeSelect,
                      handleSelectPath,
                      handleNodeClick,
                      closeNodeTooltip,
                      setIsPathFinding,
                      setCardContentFlag,
                      resetPathfinding,
                      calculatePathDuration,
                      onPaneClick,
                    },
                  }}
                />
              )}

              {!isLoadingRenderer && !graphData && (
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
