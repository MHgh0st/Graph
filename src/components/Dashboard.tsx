/**
 * @component Dashboard
 * @module components/Dashboard
 *
 * @description
 * Main layout component for the Process Mining Graph application.
 * Provides the three-column grid layout containing:
 * - Sidebar navigation (left)
 * - Card panel for active tab content (center)
 * - Graph visualization area (right)
 *
 * Connects to Zustand store for global state and orchestrates
 * data flow between graph hooks and UI components.
 *
 * @example
 * ```tsx
 * // Dashboard is rendered automatically when step === 2
 * // in the App component (renderer.tsx)
 * {step === 2 && <Dashboard />}
 * ```
 */

import { useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Node } from "@xyflow/react";
import { Activity } from "react";
import {
  SlidersHorizontal,
  LineSquiggle,
  Settings,
  Workflow,
  RouteOff,
  FolderSearch,
  Monitor,
} from "lucide-react";

// Hooks
import { useAppStore, useElectronAPI } from "../hooks";
import { useGraphLayout } from "./graph/hooks/useGraphLayout";
import { useGraphInteraction } from "./graph/hooks/useGraphInteraction";

// Components
import SideBar from "./SideBar";
import Graph from "./Graph";
import Filters from "./sideBarCards/Filters";
import { PathfindingCard } from "./sideBarCards/PathfindingCard";
import SettingsCard from "./sideBarCards/SettingsCard";
import OutliersCard from "./sideBarCards/OutliersCard";
import SearchCaseIdsCard from "./sideBarCards/SearchCaseIdsCard";

// Constants
import { paletteOptions } from "../constants/colorPalettes";

// Types
import type { FilterTypes, ProcessMiningData, SidebarTab } from "../types/types";

/**
 * Maps sidebar tabs to their display titles (Persian)
 */
const TAB_TITLES: Record<SidebarTab, string> = {
  Filter: "فیلترهای پیشرفته",
  Routing: "مسیریابی هوشمند",
  Settings: "تنظیمات نمودار",
  Outliers: "تحلیل ناهنجاری‌ها",
  SearchCaseIds: "جستجوی شناسه پرونده",
};

/**
 * Maps sidebar tabs to their icons
 */
const TAB_ICONS: Record<SidebarTab, React.ReactNode> = {
  Filter: <SlidersHorizontal className="text-slate-500" />,
  Routing: <LineSquiggle className="text-slate-500" />,
  Settings: <Settings className="text-slate-500" />,
  Outliers: <RouteOff className="text-slate-500" />,
  SearchCaseIds: <FolderSearch className="text-slate-500" />,
};

/**
 * Dashboard
 * 
 * The main application layout after file upload.
 * Renders sidebar, panel cards, and graph visualization.
 */
export default function Dashboard() {
  const { processData, getFileFormat } = useElectronAPI();

  // Zustand store state
  const {
    dataFilePath,
    graphData,
    variants,
    outliers,
    startEndNodes,
    filters,
    isLoading,
    sidebarActiveTab,
    isSideCardVisible,
    isSidebarCollapsed,
    selectedNodeIds,
    selectedPathNodes,
    selectedPathEdges,
    selectedPathIndex,
    selectedColorPalette,
    setFilters,
    setIsLoading,
    setProcessedData,
    setSelectedNodeIds,
    setSelectedPathNodes,
    setSelectedPathEdges,
    setSelectedPathIndex,
    setSelectedColorPalette,
    toggleSidebarCollapsed,
    handleSidebarTabClick,
    resetPathSelection,
  } = useAppStore();

  // Compute layout filters based on path selection
  // در حالت SearchCaseIds یا Outliers یا Routing با مسیر فعال، فیلتر گره‌ها را نادیده می‌گیریم
  const layoutFilters = useMemo(
    () => {
      // اگر در تب جستجوی پرونده یا تحلیل ناهنجاری‌ها یا مسیریابی هستیم و مسیری انتخاب شده، از فیلترهای تب فیلترها مستقل باشد
      if ((sidebarActiveTab === "SearchCaseIds" || sidebarActiveTab === "Outliers" || sidebarActiveTab === "Routing") && selectedPathNodes.size > 0) {
        return {
          nodes: selectedPathNodes,
          edges: selectedPathEdges,
        };
      }
      // در غیر این صورت، رفتار معمول
      return {
        nodes: selectedPathIndex !== null ? selectedPathNodes : selectedNodeIds,
        edges: selectedPathIndex !== null ? selectedPathEdges : null,
      };
    },
    [selectedPathIndex, selectedPathNodes, selectedNodeIds, selectedPathEdges, sidebarActiveTab]
  );

  // Compute active path info for ghost elements (SearchCaseIds, Outliers, and Routing modes)
  // محاسبه اطلاعات مسیر فعال برای ghost elements در هر سه تب
  const activePathInfo = useMemo(() => {
    // فقط در تب‌های جستجوی پرونده، تحلیل ناهنجاری‌ها و مسیریابی ghost elements فعال است
    if (sidebarActiveTab !== "SearchCaseIds" && sidebarActiveTab !== "Outliers" && sidebarActiveTab !== "Routing") return undefined;
    if (selectedPathNodes.size === 0) return undefined;
    
    // تبدیل Sets به آرایه‌ها
    const pathNodes = Array.from(selectedPathNodes);
    const pathEdges = Array.from(selectedPathEdges);
    
    // ساختن لیست یال‌ها بر اساس ترتیب گره‌ها (اگر edges خالی باشد)
    // این برای موردی است که یال‌ها از کاربر نیامده باشد
    if (pathEdges.length === 0 && pathNodes.length > 1) {
      const computedEdges: string[] = [];
      for (let i = 0; i < pathNodes.length - 1; i++) {
        computedEdges.push(`${pathNodes[i]}->${pathNodes[i + 1]}`);
      }
      return { nodes: pathNodes, edges: computedEdges };
    }
    
    return { nodes: pathNodes, edges: pathEdges };
  }, [sidebarActiveTab, selectedPathNodes, selectedPathEdges]);

  // Graph layout hook
  const {
    allNodes,
    allEdges,
    layoutedNodes,
    layoutedEdges,
    isLoading: isLayoutLoading,
    loadingMessage,
    setLayoutedNodes,
    setLayoutedEdges,
  } = useGraphLayout(
    graphData,
    selectedColorPalette,
    startEndNodes,
    layoutFilters.nodes,
    layoutFilters.edges,
    activePathInfo
  );

  // Graph interaction hook
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
    selectedEdgeId,
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
    handleSelectOutlier,
  } = useGraphInteraction(
    allNodes,
    allEdges,
    layoutedEdges,
    layoutedNodes,
    variants,
    setLayoutedNodes,
    setLayoutedEdges,
    selectedPathNodes,
    setSelectedPathNodes,
    selectedPathEdges,
    setSelectedPathEdges,
    selectedPathIndex,
    setSelectedPathIndex,
    selectedNodeIds
  );

  /**
   * Handles filter form submission.
   * Processes data via Python backend and updates store.
   */
  const handleFilterSubmit = useCallback(
    async (newFilters: FilterTypes) => {
      if (!dataFilePath) return;

      setIsLoading(true);
      setFilters(newFilters);

      try {
        const format = getFileFormat(dataFilePath);
        if (!format) {
          throw new Error("فرمت فایل نامعتبر است");
        }

        const data = await processData(format, dataFilePath, newFilters);
        setProcessedData(data as ProcessMiningData);
      } catch (error) {
        console.error("Failed to process data:", error);
        setIsLoading(false);
      }
    },
    [dataFilePath, processData, getFileFormat, setFilters, setIsLoading, setProcessedData]
  );

  // Effect: Handle routing tab activation
  // Note: resetPathfinding is excluded from deps to prevent infinite loop
  // as it internally causes state changes that would retrigger this effect
  useEffect(() => {
    if (sidebarActiveTab === "Routing" && graphData) {
      setIsPathFinding(true);
    } else {
      setIsPathFinding(false);
      // Only reset when NOT on routing tab (avoid cleanup loop)
      if (sidebarActiveTab !== "Routing") {
        resetPathfinding();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarActiveTab, graphData]);

  // Handle sidebar tab click with tooltip cleanup
  const handleTabClick = useCallback(
    (tab: SidebarTab) => {
      if(sidebarActiveTab !== tab){
        closeNodeTooltip();
        closeEdgeTooltip();
      }  
      handleSidebarTabClick(tab);
    },
    [closeNodeTooltip, closeEdgeTooltip, handleSidebarTabClick]
  );

  // Grid column layout calculation
  const sidebarFr = isSidebarCollapsed ? 1 : 3;
  const cardFr = isSideCardVisible ? 6 : 0;
  const mainFr = 24 - sidebarFr - cardFr;

  return (
    <div
      className="grid w-full h-screen p-3 gap-3 bg-slate-50 overflow-hidden"
      dir="rtl"
      style={{
        gridTemplateColumns: `${sidebarFr}fr ${cardFr}fr ${mainFr}fr`,
        transition: "grid-template-columns 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)",
      }}
    >
      {/* Sidebar */}
      <SideBar
        className="rounded-3xl h-[calc(100vh-24px)] overflow-hidden min-w-0"
        activeTab={sidebarActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebarCollapsed}
        onClickTab={handleTabClick}
      />

      {/* Card Panel */}
      <div className="h-full min-w-0 overflow-hidden">
        <Activity mode={isSideCardVisible ? "visible" : "hidden"}>
          <Card
            className="col-span-6 h-[calc(100vh-24px)] bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-sm rounded-3xl"
            shadow="none"
          >
            <CardHeader className="flex gap-x-3 items-center border-b border-slate-100 py-4 px-5">
              <div className="p-2 bg-slate-100 rounded-xl">
                {TAB_ICONS[sidebarActiveTab]}
              </div>
              <p className="text-lg font-bold text-slate-700">
                {TAB_TITLES[sidebarActiveTab]}
              </p>
            </CardHeader>

            <CardBody className="text-right p-0 overflow-hidden">
              <div className="h-full w-full overflow-y-auto px-4 py-2 scrollbar-hide">
                {/* Filters Tab */}
                <Activity mode={sidebarActiveTab === "Filter" ? "visible" : "hidden"}>
                  <Filters 
                    submit={handleFilterSubmit} 
                    isLoading={isLoading}
                    allNodes={allNodes}
                    selectedNodeIds={selectedNodeIds}
                    onSelectionChange={setSelectedNodeIds}
                  />
                </Activity>

                {/* Routing Tab (with data) */}
                <Activity
                  mode={sidebarActiveTab === "Routing" && graphData ? "visible" : "hidden"}
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

                {/* Routing Tab (no data) */}
                <div
                  className={`w-full h-full flex flex-col gap-4 justify-center items-center text-center p-8 ${
                    sidebarActiveTab === "Routing" && !graphData ? "" : "hidden"
                  }`}
                >
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-400">
                    <SlidersHorizontal size={32} />
                  </div>
                  <p className="text-slate-500 font-medium">
                    برای شروع مسیریابی، لطفاً ابتدا داده‌ها را از بخش فیلترها پردازش کنید.
                  </p>
                </div>

                {/* Settings Tab */}
                <SettingsCard
                  ColorPaletteProps={{
                    options: paletteOptions,
                    value: selectedColorPalette,
                    onChange: setSelectedColorPalette,
                  }}
                  className={sidebarActiveTab !== "Settings" ? "hidden" : ""}
                />

                {/* Outliers Tab */}
                <Activity mode={sidebarActiveTab === "Outliers" ? "visible" : "hidden"}>
                  <OutliersCard
                    outliers={outliers}
                    allNodes={allNodes}
                    selectedIndex={selectedPathIndex}
                    onSelectOutlier={handleSelectOutlier}
                    selectedNodeIds={selectedNodeIds}
                  />
                </Activity>

                {/* Search Case IDs Tab */}
                {sidebarActiveTab === "SearchCaseIds" && (
                  <SearchCaseIdsCard
                    filePath={dataFilePath}
                    filters={filters}
                    onCaseFound={handleSelectOutlier}
                  />
                )}
              </div>
            </CardBody>
          </Card>
        </Activity>
      </div>

      {/* Main Graph Area */}
      <main className="flex items-center justify-center relative min-w-0 overflow-hidden">
        <div className="w-full h-[calc(100vh-24px)] bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden relative">
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 z-50 flex flex-col gap-4 justify-center items-center bg-white/80 backdrop-blur-sm">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-600 font-medium animate-pulse">
                در حال پردازش داده‌ها...
              </p>
            </div>
          )}

          {/* Empty State: Data loaded but no nodes selected */}
          {/* در حالت SearchCaseIds/Outliers/Routing این پیام نمایش داده نمی‌شود */}
          {!isLoading &&
            graphData &&
            selectedNodeIds.size === 0 &&
            selectedPathNodes.size === 0 &&
            sidebarActiveTab !== "SearchCaseIds" &&
            sidebarActiveTab !== "Outliers" &&
            sidebarActiveTab !== "Routing" && (

              <div className="flex flex-col gap-4 justify-center items-center h-full text-center p-10">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                  <Workflow size={40} className="text-slate-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-700">
                  داده‌ها آماده نمایش هستند
                </h2>
                <p className="text-slate-500 max-w-md">
                  از بخش فیلترها، گره‌های مورد نظر خود را انتخاب
                  کنید تا گراف ترسیم شود.
                </p>
              </div>
            )}

          {/* Graph Visualization */}
          {/* در حالت SearchCaseIds/Outliers/Routing با مسیر فعال، گراف بدون نیاز به selectedNodeIds رندر می‌شود */}
          {!isLoading &&
            graphData &&
            (selectedNodeIds.size > 0 || selectedPathNodes.size > 0 || sidebarActiveTab === "SearchCaseIds" || sidebarActiveTab === "Outliers" || sidebarActiveTab === "Routing") && (

              <Graph
                activeSideBar={sidebarActiveTab}
                filteredNodeIds={selectedNodeIds}
                filePath={dataFilePath!}
                filters={filters!}
                className="w-full h-full bg-slate-50"
                utils={{
                  GraphLayout: {
                    allNodes,
                    layoutedNodes,
                    layoutedEdges,
                    isLoading: isLayoutLoading,
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
                    selectedEdgeId,
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

          {/* Empty State: No data yet */}
          {!isLoading && !graphData && (
            <div className="flex flex-col gap-4 justify-center items-center h-full text-center">
              <Monitor size={150} className="opacity-20 grayscale" />
              <p className="text-slate-400 font-medium">
                لطفاً برای شروع، فایل داده را بارگذاری و فیلتر کنید.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
