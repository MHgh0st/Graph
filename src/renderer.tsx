import ReactDOM from "react-dom/client";
import "./index.css";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@heroui/card";
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
import { Activity } from "react";
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
  // --- Lifted State for Pathfinding ---
  const [selectedPathNodes, setSelectedPathNodes] = useState<Set<string>>(
    new Set()
  );
  const [selectedPathEdges, setSelectedPathEdges] = useState<Set<string>>(
    new Set()
  );
  const [selectedPathIndex, setSelectedPathIndex] = useState<number | null>(
    null
  );

  useEffect(()=>{
    console.log('variants: ',variants)
  },[variants])

  // --- Logic for filtering layout ---
  // If a path is selected (index !== null), we filter ONLY that path's nodes/edges.
  // Otherwise, we use the standard selectedNodeIds filter.
  const layoutFilters = {
    nodes: selectedPathIndex !== null ? selectedPathNodes : selectedNodeIds,
    edges: selectedPathIndex !== null ? selectedPathEdges : null,
  };
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
  } = useGraphLayout(graphData, selectedColorPalette, startEndNodes, layoutFilters.nodes, layoutFilters.edges);
  const {
    activeTooltipEdgeId,
    isEdgeCardVisible,
    isNodeCardVisible,
    nodeTooltipTitle,
    nodeTooltipData,
    edgeTooltipTitle,
    edgeTooltipData,
    pathStartNodeId,
    pathEndNodeId,
    foundPaths,
    isPathfindingLoading,
    isPathFinding,
    handleEdgeSelect,
    handleSelectPath,
    handleNodeClick,
    closeNodeTooltip,
    closeEdgeTooltip,
    setIsPathFinding,
    setIsEdgeCardVisible,
    setIsNodeCardVisible,
    resetPathfinding,
    calculatePathDuration,
    onPaneClick,
    removePath,
  } = useGraphInteraction(
    allNodes,
    layoutedEdges,
    variants,
    setLayoutedNodes,
    setLayoutedEdges,
    selectedPathNodes,
    setSelectedPathNodes,
    selectedPathEdges,
    setSelectedPathEdges,
    selectedPathIndex,
    setSelectedPathIndex,
    selectedNodeIds,
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
              className="grid grid-cols-24 w-full h-screen p-2 overflow-hidden"
              dir="rtl"
            >
              <SideBar
                className="col-span-2"
                activeTab={sideBarActiveTab}
                onClickTab={(name) => {
                  if (name === sideBarActiveTab && isSideCardShow) {
                    setIsSideCardShow(false);
                    // setSideBarActiveTab(null);
                  } else {
                    setSideBarActiveTab(name);
                    setIsSideCardShow(true);
                  }
                }}
              />

              <Activity mode={`${isSideCardShow ? "visible" : "hidden"}`}>
                <Card className="col-span-6 h-[98%]">
                  <CardHeader className="flex gap-x-3">
                    {/* <Button
                      isIconOnly
                      size="sm"
                      color="danger"
                      variant="flat"
                      onPress={() => {
                        setIsSideCardShow(false);
                      }}
                    >
                      <X size={20} />
                    </Button> */}
                    <p className="text-2xl font-bold">
                      {sideBarActiveTab === "Filter" && "فیلتر ها"}
                      {sideBarActiveTab === "Routing" && "مسیر یابی بین دو یال"}
                      {sideBarActiveTab === "Settings" && "تنظیمات"}
                      {sideBarActiveTab === "Nodes" && "جستجو بین گره ها"}
                    </p>
                  </CardHeader>
                  <CardBody className="text-right">
                    <Activity
                      mode={`${sideBarActiveTab === "Filter" ? "visible" : "hidden"}`}
                    >
                      <Filters submit={submit} isLoading={isLoadingRenderer} />
                    </Activity>

                    <Activity
                      mode={`${sideBarActiveTab === "Routing" && graphData ? "visible" : "hidden"}`}
                    >
                      <PathfindingCard
                        startNodeId={pathStartNodeId}
                        endNodeId={pathEndNodeId}
                        paths={foundPaths}
                        allNodes={allNodes}
                        selectedNodeIds={selectedNodeIds}
                        onSelectPath={handleSelectPath}
                        selectedIndex={selectedPathIndex}
                        calculatePathDuration={calculatePathDuration}
                        isLoading={isPathfindingLoading}
                        handleNodeClick={handleNodeClick}
                        resetPathfinding={() => {
                          resetPathfinding();
                          setIsPathFinding(true);
                        }}
                        removePath={removePath}
                      />
                    </Activity>
                    <div
                      className={`w-full h-full flex justify-center items-center text-center text-3xl font-bold leading-15 ${sideBarActiveTab === "Routing" && !graphData ? "" : "hidden"}`}
                    >
                      لطفا ابتدا داده ی گراف را از تب فیلتر ها انتخاب کنید.
                    </div>
                    <Activity
                      mode={`${sideBarActiveTab === "Nodes" ? "visible" : "hidden"}`}
                    >
                      <NodesFilterCard
                        Nodes={allNodes}
                        selectedNodeIds={selectedNodeIds}
                        onSelectionChange={setSelectedNodeIds}
                        onFilteredNodesChange={setFilteredNodes}
                      />
                    </Activity>
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
                  </CardBody>
                </Card>
              </Activity>
              <main
                className={`${isSideCardShow ? "col-span-16" : "col-span-22"} flex items-center justify-center`}
              >
                {isLoadingRenderer && (
                  <p>در حال پردازش داده‌ها، لطفاً منتظر بمانید...</p>
                )}

                {/* اگر فیلترها اعمال شده ولی هنوز گره‌ای انتخاب نشده، متن مناسب نمایش داده شود */}
                {!isLoadingRenderer &&
                  graphData &&
                  selectedNodeIds.size === 0 && (
                    <div className="flex justify-center items-center h-full">
                      <h2 className="text-xl font-bold text-center leading-15">
                        فیلترها اعمال شدند. لطفاً از تب "گره‌ها" گره‌های مورد
                        نظر خود را انتخاب کنید تا گراف نمایش داده شود.
                      </h2>
                    </div>
                  )}

                {!isLoadingRenderer && graphData && selectedNodeIds.size > 0 && (
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
                        
                        isNodeCardVisible,
                        isEdgeCardVisible,
                        nodeTooltipTitle,
                        nodeTooltipData,
                        edgeTooltipTitle,
                        edgeTooltipData,
                        pathStartNodeId,
    pathEndNodeId,
    foundPaths,
    isPathfindingLoading,
    isPathFinding,
    handleEdgeSelect,
    handleSelectPath, 
    handleNodeClick,
    selectedPathNodes,
    selectedPathEdges,
    selectedPathIndex,
                        closeNodeTooltip,
                        closeEdgeTooltip,
                        setIsPathFinding,
                        setIsNodeCardVisible,
                        setIsEdgeCardVisible,
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
