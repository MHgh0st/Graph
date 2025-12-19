import ReactDOM from "react-dom/client";
import "./index.css";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { HeroUIProvider } from "@heroui/system";
import { ReactFlowProvider, Node } from "@xyflow/react";
import ProcessData from "./utils/ProcessData";
import FileUploader from "./components/FileUploader";
import Graph from "./components/Graph";
import Filters from "./components/sideBarCards/Filters";
import {
  FilterTypes,
  SidebarTab,
  GraphData,
  Variant,
  ProcessMiningData,
  SearchCaseIdsData
} from "./types/types";
import SideBar from "./components/SideBar";
import { useGraphLayout } from "./components/graph/hooks/useGraphLayout";
import { useGraphInteraction } from "./components/graph/hooks/useGraphInteraction";
import { PathfindingCard } from "./components/sideBarCards/PathfindingCard";
import SettingsCard from "./components/sideBarCards/SettingsCard";
import NodesFilterCard from "./components/sideBarCards/NodesFilterCard";
import { paletteOptions } from "./constants/colorPalettes";
import { Activity } from "react"; // فرض بر این است که این کامپوننت انیمیشن شماست
import OutliersCard from "./components/sideBarCards/OutliersCard";
import { SlidersHorizontal, LineSquiggle, Settings, Workflow, RouteOff, FolderSearch, Monitor } from "lucide-react";
import SearchCaseIdsCard from "./components/sideBarCards/SearchCaseIdsCard";

function App() {
  // ... (تمام استیت‌ها و لاجیک‌های قبلی بدون تغییر باقی می‌مانند)
  const [dataFilePath, setDataFilePath] = useState<string | null>(null);
  const [isLoadingRenderer, setIsLoadingRenderer] = useState<boolean>(false);
  const [step, setStep] = useState<number>(1);
  const [graphData, setGraphData] = useState<GraphData[] | null>(null);
  const [variants, setVariants] = useState<Variant[] | null>(null);
  const [outliers, setOutliers] = useState<Variant[] | null>(null);
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
  
  const [selectedPathNodes, setSelectedPathNodes] = useState<Set<string>>(
    new Set()
  );
  const [selectedPathEdges, setSelectedPathEdges] = useState<Set<string>>(
    new Set()
  );
  const [selectedPathIndex, setSelectedPathIndex] = useState<number | null>(
    null
  );

  const [filters, setFilters] = useState<FilterTypes>();

  const layoutFilters = {
    nodes: selectedPathIndex !== null ? selectedPathNodes : selectedNodeIds,
    edges: selectedPathIndex !== null ? selectedPathEdges : null,
  };
  const [filteredNodes, setFilteredNodes] = useState<Node[]>([]);
  const [filtersApplied, setFiltersApplied] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

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
    handleSelectOutlier
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
        setFilters(filters);
        const data = (await ProcessData(
          dataFilePath,
          filters
        )) as ProcessMiningData;
        setGraphData(data.graphData);
        setVariants(data.variants);
        setOutliers(data.outliers);
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

  useEffect(()=>{
    // console.log('outliers: ', outliers)
  }, [outliers])

  useEffect(() => {
    if (sideBarActiveTab == "Routing" && graphData) {
      setIsPathFinding(true);
    } else {
      setIsPathFinding(false);
      resetPathfinding();
    }
  }, [sideBarActiveTab]);

  useEffect(() => {
    if (selectedNodeIds.size > 0 && filtersApplied) {
      setFiltersApplied(false);
    }
  }, [selectedNodeIds, filtersApplied]);

  // آیکون مربوط به هر تب برای هدر کارت
  const getHeaderIcon = () => {
    switch (sideBarActiveTab) {
        case "Filter": return <SlidersHorizontal className="text-slate-500" />;
        case "Routing": return <LineSquiggle className="text-slate-500" />;
        case "Settings": return <Settings className="text-slate-500" />;
        case "Nodes": return <Workflow className="text-slate-500" />;
        case "Outliers": return <RouteOff className="text-slate-500" />;
        case 'SearchCaseIds': return <FolderSearch className="text-slate-500" />;
        default: return null;
    }
  };

const sidebarFr = isSidebarCollapsed ? 1 : 3;
const cardFr = isSideCardShow ? 6 : 0;
const mainFr = 24 - sidebarFr - cardFr;

  return (
    <>
      <ReactFlowProvider>
        <HeroUIProvider locale="fa-IR">
          {step === 1 && (
            <FileUploader setPythonPath={setDataFilePath} submit={submit} />
          )}
          {step === 2 && dataFilePath && (
            <div
              className="grid w-full h-screen p-3 gap-3 bg-slate-50 overflow-hidden"
              dir="rtl"
              style={{
                // تعریف ستون‌ها: سایدبار | کارت | گراف
                gridTemplateColumns: `${sidebarFr}fr ${cardFr}fr ${mainFr}fr`,
                // انیمیشن نرم روی تغییر سایز ستون‌ها
                transition: 'grid-template-columns 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)'
              }}
            >
              {/* سایدبار با کمی فاصله از لبه‌ها */}
              <SideBar
                className="rounded-3xl h-[calc(100vh-24px)] overflow-hidden min-w-0" // min-w-0 برای جلوگیری از سرریز
                activeTab={sideBarActiveTab}
                isCollapsed={isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                onClickTab={(name) => {
                  closeNodeTooltip();
                  closeEdgeTooltip();
                  if (name === sideBarActiveTab && isSideCardShow) {
                    setIsSideCardShow(false);
                  } else {
                    setSideBarActiveTab(name);
                    setIsSideCardShow(true);
                  }
                }}
              />

              <div className="h-full min-w-0 overflow-hidden">
                <Activity mode={`${isSideCardShow ? "visible" : "hidden"}`}>
                {/* استایل جدید کارت: سفید، سایه نرم، بوردر محو */}
                <Card 
                    className="col-span-6 h-[calc(100vh-24px)] bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm rounded-3xl"
                    shadow="none"
                >
                  <CardHeader className="flex gap-x-3 items-center border-b border-slate-100 py-4 px-5">
                    <div className="p-2 bg-slate-100 rounded-xl">
                        {getHeaderIcon()}
                    </div>
                    <p className="text-lg font-bold text-slate-700">
                      {sideBarActiveTab === "Filter" && "فیلترهای پیشرفته"}
                      {sideBarActiveTab === "Routing" && "مسیریابی هوشمند"}
                      {sideBarActiveTab === "Settings" && "تنظیمات نمودار"}
                      {sideBarActiveTab === "Nodes" && "جستجوی گره‌ها"}
                      {sideBarActiveTab === 'Outliers' && "تحلیل ناهنجاری‌ها"}
                      {sideBarActiveTab === 'SearchCaseIds' && "جستجوی شناسه پرونده"}
                    </p>
                  </CardHeader>
                  
                  <CardBody className="text-right p-0 overflow-hidden">
                    <div className="h-full w-full overflow-y-auto px-4 py-2 scrollbar-hide">
                        <Activity mode={`${sideBarActiveTab === "Filter" ? "visible" : "hidden"}`}>
                          <Filters submit={submit} isLoading={isLoadingRenderer} />
                        </Activity>

                        <Activity mode={`${sideBarActiveTab === "Routing" && graphData ? "visible" : "hidden"}`}>
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

                        <div className={`w-full h-full flex flex-col gap-4 justify-center items-center text-center p-8 ${sideBarActiveTab === "Routing" && !graphData ? "" : "hidden"}`}>
                          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-400">
                             <SlidersHorizontal size={32} />
                          </div>
                          <p className="text-slate-500 font-medium">
                              برای شروع مسیریابی، لطفاً ابتدا داده‌ها را از بخش فیلترها پردازش کنید.
                          </p>
                        </div>

                        <Activity mode={`${sideBarActiveTab === "Nodes" ? "visible" : "hidden"}`}>
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
                            onChange: (value) => setSelectedColorPalette(value),
                          }}
                          className={`${sideBarActiveTab !== "Settings" && "hidden"}`}
                        />
                        
                        <Activity mode={`${sideBarActiveTab === "Outliers" ? "visible" : "hidden"}`}>
                          <OutliersCard outliers={outliers} allNodes={allNodes} selectedIndex={selectedPathIndex} onSelectOutlier={handleSelectOutlier} selectedNodeIds={selectedNodeIds}/>
                        </Activity>
                        {sideBarActiveTab === "SearchCaseIds" && <SearchCaseIdsCard filePath={dataFilePath} filters={filters} onCaseFound={handleSelectOutlier}/>}
                    </div>
                  </CardBody>
                </Card>
              </Activity>
              </div>

              <main className="flex items-center justify-center relative min-w-0 overflow-hidden">
                 <div className="w-full h-[calc(100vh-24px)] bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden relative">
                    {isLoadingRenderer && (
                    <div className="absolute inset-0 z-50 flex flex-col gap-4 justify-center items-center bg-white/80 backdrop-blur-sm">
                         {/* لودینگ کاستوم */}
                         <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-600 font-medium animate-pulse">در حال پردازش داده‌ها...</p>
                    </div>
                    )}

                    {!isLoadingRenderer && graphData && selectedNodeIds.size === 0 && (
                        <div className="flex flex-col gap-4 justify-center items-center h-full text-center p-10">
                             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                                <Workflow size={40} className="text-slate-400" />
                             </div>
                            <h2 className="text-xl font-bold text-slate-700">داده‌ها آماده نمایش هستند</h2>
                            <p className="text-slate-500 max-w-md">
                                از منوی "جستجوی گره‌ها" یا "فیلترها"، گره‌های مورد نظر خود را انتخاب کنید تا گراف ترسیم شود.
                            </p>
                        </div>
                    )}

                    {!isLoadingRenderer && graphData && selectedNodeIds.size > 0 && (
                        <Graph
                            activeSideBar={sideBarActiveTab}
                            filteredNodeIds={selectedNodeIds}
                            filePath={dataFilePath}
                            filters={filters}
                            className="w-full h-full bg-slate-50" // پس زمینه گراف
                            utils={{
                                GraphLayout: { allNodes, layoutedNodes, layoutedEdges, isLoading, loadingMessage, setLayoutedNodes, setLayoutedEdges },
                                GraphInteraction: { activeTooltipEdgeId, isNodeCardVisible, isEdgeCardVisible, nodeTooltipTitle, nodeTooltipData, edgeTooltipTitle, edgeTooltipData, pathStartNodeId, pathEndNodeId, foundPaths, isPathfindingLoading, isPathFinding, handleEdgeSelect, handleSelectPath, handleNodeClick, selectedPathNodes, selectedPathEdges, selectedPathIndex, closeNodeTooltip, closeEdgeTooltip, setIsPathFinding, setIsNodeCardVisible, setIsEdgeCardVisible, resetPathfinding, calculatePathDuration, onPaneClick },
                            }}
                        />
                    )}

                    {!isLoadingRenderer && !graphData && (
                        <div className="flex flex-col gap-4 justify-center items-center h-full text-center">
                            {/* <img src="./src/assets/display-icon.svg" className="w-32 h-32 opacity-20 grayscale" alt="Empty" /> */}
                            <Monitor size={150} className="opacity-20 grayscale"/>
                            <p className="text-slate-400 font-medium">لطفاً برای شروع، فایل داده را بارگذاری و فیلتر کنید.</p>
                        </div>
                    )}
                 </div>
              </main>
            </div>
          )}
        </HeroUIProvider>
      </ReactFlowProvider>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);