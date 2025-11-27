import ReactDOM from "react-dom/client";
import "./index.css";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { X } from "lucide-react";
import { HeroUIProvider } from "@heroui/system";
import { ReactFlowProvider, Node } from "@xyflow/react";
import ProcessData from "./utils/ProcessData";
import FileUploader from "./components/FileUploader";
import Graph from "./components/Graph";
import Filters from "./components/Filters";
import {
  FilterTypes,
  SidebarTab,
  GraphData,
  Variant,
  ProcessMiningData,
} from "./types/types";
import SideBar from "./components/SideBar";
import { useGraphLayout } from "./components/graph/hooks/useGraphLayout";
import { useGraphInteraction } from "./components/graph/hooks/useGraphInteraction";
import { PathfindingCard } from "./components/graph/ui/PathfindingCard";
import SettingsCard from "./components/SettingsCard";
import NodesFilterCard from "./components/NodesFilterCard";
import { paletteOptions } from "./constants/colorPalettes";
function App() {
  const [dataFilePath, setDataFilePath] = useState<string | null>(null);
  const [isLoadingRenderer, setIsLoadingRenderer] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);
  const [graphData, setGraphData] = useState<GraphData[] | null>(null);
  const [variants, setVariants] = useState<Variant[] | null>(null);
  const [startEndNodes, setStartEndNodes] = useState<{
    start: string[];
    end: string[];
  }>(null);
  const [sideBarActiveTab, setSideBarActiveTab] =
    useState<SidebarTab>("Filter");
  const [isSideCardShow, setIsSideCardShow] = useState<boolean>(true);
  const [selectedColorPalette, setSelectedColorPalette] =
    useState<string>("default");
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(
    new Set()
  );
  const [filteredNodes, setFilteredNodes] = useState<Node[]>([]);
  const [filtersApplied, setFiltersApplied] = useState<boolean>(false);

  const {
    allNodes,
    layoutedNodes,
    layoutedEdges,
    isLoading,
    loadingMessage,
    setLayoutedNodes,
    setLayoutedEdges,
  } = useGraphLayout(graphData, selectedColorPalette, startEndNodes);
  const {
    activeTooltipEdgeId,
    cardContentFlag,
    nodeTooltipTitle,
    nodeTooltipData,
    edgeTooltipTitle,
    edgeTooltipData,
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
    variants,
    setLayoutedNodes,
    setLayoutedEdges
  );
  const submit = async (filters?: FilterTypes) => {
    switch (step) {
      case 1:
        setStep(2);
        break;
      case 2: {
        setIsLoadingRenderer(true);
        const data = (await ProcessData(
          dataFilePath,
          filters
        )) as ProcessMiningData;
        setGraphData(data.graphData);
        setVariants(data.variants);
        setStartEndNodes({
          start: data.startActivities,
          end: data.endActivities,
        });
        setFiltersApplied(true);
        setIsLoadingRenderer(false);
        break;
      }
    }
  };

  useEffect(() => {
    console.log("startEndNodes: ", startEndNodes);
  }, [startEndNodes]);

  useEffect(() => {
    if (sideBarActiveTab == "Routing" && graphData) {
      setIsPathFinding(true);
    } else {
      setIsPathFinding(false);
      resetPathfinding();
    }
  }, [sideBarActiveTab]);

  // وقتی گره‌هایی انتخاب شدن، فیلترها دیگر اعمال نشده محسوب میشن
  useEffect(() => {
    if (selectedNodeIds.size > 0 && filtersApplied) {
      setFiltersApplied(false);
    }
  }, [selectedNodeIds, filtersApplied]);

  return (
    <>
      <ReactFlowProvider>
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
                        // setSideBarActiveTab(null);
                        // setIsPathFinding(false);
                        // resetPathfinding();
                      }}
                    >
                      <X size={20} />
                    </Button>
                    <p className="text-2xl font-bold">
                      {sideBarActiveTab === "Filter" && "فیلتر ها"}
                      {sideBarActiveTab === "Routing" && "مسیر یابی بین دو یال"}
                      {sideBarActiveTab === "Settings" && "تنظیمات"}
                      {sideBarActiveTab === "Nodes" && "جستجو بین گره ها"}
                    </p>
                  </CardHeader>
                  <CardBody className="text-right">
                    <Filters
                      submit={submit}
                      isLoading={isLoadingRenderer}
                      className={`${sideBarActiveTab !== "Filter" && "hidden"}`}
                    />
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
                      className={`${(sideBarActiveTab !== "Routing" || !graphData) && "hidden"}`}
                    />
                    <div
                      className={`w-full h-full flex justify-center items-center text-center text-3xl font-bold leading-15 ${sideBarActiveTab === "Routing" && !graphData ? "" : "hidden"}`}
                    >
                      لطفا ابتدا داده ی گراف را از تب فیلتر ها انتخاب کنید.
                    </div>
                    <SettingsCard
                      ColorPaletteProps={{
                        options: paletteOptions,
                        value: selectedColorPalette,
                        onChange: (value) => {
                          setSelectedColorPalette(value);
                        },
                      }}
                      className={`${sideBarActiveTab !== "Settings" && "hidden"}`}
                    />
                    <NodesFilterCard
                      Nodes={allNodes}
                      selectedNodeIds={selectedNodeIds}
                      onSelectionChange={setSelectedNodeIds}
                      onFilteredNodesChange={setFilteredNodes}
                      className={`${sideBarActiveTab !== "Nodes" && "hidden"}`}
                    />
                  </CardBody>
                </Card>
              )}
              <main
                className={`${isSideCardShow ? "col-span-16" : "col-span-22"} flex items-center justify-center`}
              >
                {isLoadingRenderer && (
                  <p>در حال پردازش داده‌ها، لطفاً منتظر بمانید...</p>
                )}

                {/* اگر فیلترها اعمال شده ولی هنوز گره‌ای انتخاب نشده، متن مناسب نمایش داده شود */}
                {!isLoadingRenderer &&
                  graphData &&
                  filtersApplied &&
                  selectedNodeIds.size === 0 && (
                    <div className="flex justify-center items-center h-full">
                      <h2 className="text-xl font-bold text-center leading-15">
                        فیلترها اعمال شدند. لطفاً از تب "گره‌ها" گره‌های مورد
                        نظر خود را انتخاب کنید تا گراف نمایش داده شود.
                      </h2>
                    </div>
                  )}

                {!isLoadingRenderer && graphData && !filtersApplied && (
                  <Graph
                    filteredNodeIds={selectedNodeIds}
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
                        edgeTooltipTitle,
                        edgeTooltipData,
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
      </ReactFlowProvider>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
