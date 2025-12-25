import { useMemo, useCallback, useState, useRef, memo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
  applyNodeChanges,
  NodeChange,
  OnMoveEnd,
  OnMoveStart,
  EdgeMouseHandler,
  NodeMouseHandler,
  NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card } from "@heroui/card";

import { StyledSmoothStepEdge } from "./graph/ui/StyledSmoothStepEdge";
import { NodeTooltip } from "./graph/ui/NodeTooltip";
import EdgeTooltip from "./graph/ui/EdgeTooltip";
import CustomNode from "./graph/ui/CustomNode";
import { formatDuration } from "../utils/formatDuration";
import type {
  Path,
  NodeTooltipType,
  ExtendedPath,
  SidebarTab,
  FilterTypes,
} from "../types/types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface GraphLayoutProps {
  allNodes: Node[];
  layoutedNodes: Node[];
  layoutedEdges: Edge[];
  isLoading: boolean;
  loadingMessage: string;
  setLayoutedNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setLayoutedEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

interface GraphInteractionProps {
  activeTooltipEdgeId: string | null;
  isNodeCardVisible: boolean;
  isEdgeCardVisible: boolean;
  nodeTooltipTitle: string | null;
  nodeTooltipData: NodeTooltipType[];
  edgeTooltipTitle: string | null;
  edgeTooltipData: Array<{ label: string; value: string | number }>;
  pathStartNodeId: string | null;
  pathEndNodeId: string | null;
  foundPaths: Path[];
  selectedPathNodes: Set<string>;
  selectedPathEdges: Set<string>;
  selectedPathIndex: number | null;
  isPathFinding: boolean;
  isPathfindingLoading: boolean;
  handleEdgeSelect: (id: string, overrides?: EdgeTooltipOverride) => void;
  handleSelectPath: (path: Path, index: number) => void;
  handleNodeClick: (event: React.MouseEvent, node: Node) => void;
  closeNodeTooltip: () => void;
  closeEdgeTooltip: () => void;
  setIsPathFinding: React.Dispatch<React.SetStateAction<boolean>>;
  setIsNodeCardVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setIsEdgeCardVisible: React.Dispatch<React.SetStateAction<boolean>>;
  resetPathfinding: () => void;
  calculatePathDuration: (path: Path) => {
    totalDuration: number;
    averageDuration: number;
  };
  onPaneClick: () => void;
}

interface UtilsProps {
  GraphLayout: GraphLayoutProps;
  GraphInteraction: GraphInteractionProps;
}

interface EdgeTooltipOverride {
  label?: string | number;
  meanTime?: string;
  totalTime?: string;
  rawDuration?: number;
}

/**
 * تایپ اختصاصی برای دیتای یال‌ها
 */
interface CustomEdgeData extends Record<string, unknown> {
  tooltipOverrideData?: EdgeTooltipOverride;
  isTooltipVisible?: boolean;
  isGhost?: boolean;
  onEdgeSelect?: (id: string) => void;
}

/**
 * تایپ اختصاصی برای دیتای گره‌ها
 */
interface CustomNodeData extends Record<string, unknown> {
  label: string;
  isGhost?: boolean;
  type?: string;
  subLabel?: string;
}

interface GraphProps {
  filePath: string;
  filters: FilterTypes;
  className?: string;
  utils: UtilsProps;
  filteredNodeIds?: Set<string>;
  activeSideBar?: SidebarTab;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_EDGE_OPTIONS = {
  markerEnd: {
    type: MarkerType.ArrowClosed,
    height: 7,
  },
  type: "default",
  animated: false,
} as const;

const EDGE_TYPES = {
  default: StyledSmoothStepEdge,
};

const NODE_TYPES: NodeTypes = {
  start: CustomNode,
  end: CustomNode,
  activity: CustomNode,
  default: CustomNode,
};

const EDGE_LABEL_ZOOM_THRESHOLD = 0.6;

// ============================================================================
// HELPERS
// ============================================================================

function calculateEdgeOverride(
  edge: Edge,
  activePath: ExtendedPath | null,
  isHighlighted: boolean
): { displayLabel: string; tooltipOverride?: EdgeTooltipOverride } | null {
  if (!activePath || !isHighlighted) return null;

  const pathEdges = activePath.edges || [];
  const edgeIndices: number[] = [];

  pathEdges.forEach((id: string, idx: number) => {
    if (id === edge.id) edgeIndices.push(idx);
  });

  if (
    activePath._specificEdgeDurations &&
    activePath._specificEdgeDurations[edge.id] !== undefined
  ) {
    const avgDuration = activePath._specificEdgeDurations[edge.id];
    const displayLabel = formatDuration(avgDuration);
    const tooltipMeanTime = `${displayLabel} (میانگین)`;

    const count = activePath._fullPathNodes
      ? activePath._fullPathNodes.filter((_, idx) => {
          if (idx >= activePath._fullPathNodes!.length - 1) return false;
          const src = activePath._fullPathNodes![idx];
          const trg = activePath._fullPathNodes![idx + 1];
          return `${src}->${trg}` === edge.id;
        }).length
      : 1;

    return {
      displayLabel,
      tooltipOverride: {
        label: 1,
        meanTime: tooltipMeanTime,
        totalTime: formatDuration(avgDuration * count),
        rawDuration: avgDuration,
      },
    };
  }

  if (
    edgeIndices.length > 0 &&
    activePath._variantTimings &&
    activePath._variantTimings.length > 0 &&
    typeof activePath._startIndex === "number"
  ) {
    let totalDuration = 0;
    let count = 0;

    edgeIndices.forEach((idx) => {
      const timeIndex = activePath._startIndex! + idx;
      const start = activePath._variantTimings![timeIndex];
      const end = activePath._variantTimings![timeIndex + 1];

      if (typeof start === "number" && typeof end === "number") {
        totalDuration += Math.max(0, end - start);
        count++;
      }
    });

    if (count > 0) {
      const displayLabel = formatDuration(totalDuration);
      const tooltipMeanTime =
        count > 1 ? `${displayLabel} (مجموع ${count} بار عبور)` : displayLabel;
      const frequency = activePath._frequency || 0;
      const tooltipTotalTime = formatDuration(totalDuration * frequency);

      return {
        displayLabel,
        tooltipOverride: {
          label: frequency,
          meanTime: tooltipMeanTime,
          totalTime: tooltipTotalTime,
        },
      };
    }
  }

  return null;
}

// ============================================================================
// COMPONENT
// ============================================================================

function Graph({
  className = "",
  utils,
  filteredNodeIds,
  activeSideBar,
  filePath,
  filters,
}: GraphProps): React.ReactElement {
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { layoutedNodes, layoutedEdges, isLoading, loadingMessage, setLayoutedNodes, setLayoutedEdges } =
    utils.GraphLayout;

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
    selectedPathNodes,
    selectedPathEdges,
    isPathFinding,
    selectedPathIndex,
    foundPaths,
    handleEdgeSelect,
    handleNodeClick,
    closeNodeTooltip,
    closeEdgeTooltip,
    onPaneClick,
  } = utils.GraphInteraction;

  const activePath = useMemo((): ExtendedPath | null => {
    if (selectedPathIndex !== null && foundPaths?.[selectedPathIndex]) {
      return foundPaths[selectedPathIndex] as ExtendedPath;
    }
    return null;
  }, [selectedPathIndex, foundPaths]);

  // Ghost elements are now handled in useGraphLayout hook
  // گره‌ها و یال‌های ghost اکنون در hook useGraphLayout مدیریت می‌شوند

  // ============================================================================
  // CALLBACKS
  // ============================================================================


  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setLayoutedNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setLayoutedNodes]
  );

  const onMoveStart: OnMoveStart = useCallback(() => {
    containerRef.current?.classList.add("is-interacting");
  }, []);

  const onMoveEnd: OnMoveEnd = useCallback((_event, viewport) => {
    containerRef.current?.classList.remove("is-interacting");
    setZoomLevel(viewport.zoom);
  }, []);

  const handlePaneClick = useCallback(() => {
    containerRef.current?.classList.remove("is-interacting");
    onPaneClick();
  }, [onPaneClick]);

  const handleNodeClickWrapper: NodeMouseHandler = useCallback(
    (event, node) => {
      containerRef.current?.classList.remove("is-interacting");
      handleNodeClick(event, node);
    },
    [handleNodeClick]
  );

  const handleEdgeClickWrapper: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      containerRef.current?.classList.remove("is-interacting");
      const data = edge.data as CustomEdgeData | undefined;
      const overrideData = data?.tooltipOverrideData;
      handleEdgeSelect(edge.id, overrideData);
    },
    [handleEdgeSelect]
  );

  // ============================================================================
  // MEMOIZED COMPUTATIONS
  // ============================================================================

  const nodesForRender = useMemo(() => {
    const isHighlighting = selectedPathNodes.size > 0;
    
    // فیلتر کردن گره‌ها بر اساس فیلتر سایدبار (اگر وجود داشته باشد)
    // Ghost nodes از طریق useEffect به layoutedNodes اضافه شده‌اند
    const sourceNodes =
      filteredNodeIds && filteredNodeIds.size > 0
        ? layoutedNodes.filter((node) => 
            filteredNodeIds.has(node.id) || 
            (node.data as CustomNodeData)?.isGhost ||
            selectedPathNodes.has(node.id)
          )
        : layoutedNodes;

    return sourceNodes.map((node) => {
      const isHighlighted = selectedPathNodes.has(node.id);
      const nodeType = (node.data?.type as string) || "activity";
      const isGhost = (node.data as CustomNodeData)?.isGhost;

      return {
        ...node,
        type: nodeType,
        data: {
          ...node.data,
          label: node.data?.label || node.id,
        },
        style: {
          ...node.style,
          opacity: isHighlighting && !isHighlighted && !isGhost ? 0.2 : 1,
          transition: "opacity 0.3s ease",
        },
      };
    });
  }, [layoutedNodes, selectedPathNodes, filteredNodeIds]);

  const edgesForRender = useMemo(() => {
    const isHighlighting = selectedPathEdges.size > 0;
    const showEdgeLabels = zoomLevel > EDGE_LABEL_ZOOM_THRESHOLD;

    // Ghost edges از طریق useEffect به layoutedEdges اضافه شده‌اند
    const processedEdges = layoutedEdges.map((edge) => {
      const edgeData = edge.data as CustomEdgeData | undefined;
      const isGhost = edgeData?.isGhost === true;
      
      const isHighlighted = selectedPathEdges.has(edge.id) || isGhost;
      const isTooltipActive = edge.id === activeTooltipEdgeId;

      const opacity =
        (isPathFinding || isHighlighting) && !isHighlighted
          ? 0.1
          : edge.style?.opacity ?? 1;

      const override = calculateEdgeOverride(edge, activePath, isHighlighted);
      const displayLabel = override?.displayLabel || (edge.label as string);
      const tooltipOverride = override?.tooltipOverride;
      const finalLabel = isHighlighted || showEdgeLabels ? displayLabel : "";

      return {
        ...edge,
        label: finalLabel,
        hidden: false,
        data: {
          ...edge.data,
          tooltipOverrideData: tooltipOverride,
          isTooltipVisible: isTooltipActive,
          isGhost: isGhost,
          // تزریق هندلر برای تولتیپ (مهم برای یال‌های Ghost)
          onEdgeSelect: (id: string) => {
             handleEdgeSelect(id, tooltipOverride);
          }
        } as CustomEdgeData,
        style: {
          ...(edge.style || {}),
          opacity,
          zIndex: isTooltipActive ? 1000 : isHighlighted ? 500 : 0,
          stroke: isGhost 
            ? (isTooltipActive ? "#FFC107" : "#6c6c6cff") 
            : edge.style?.stroke,
        },
        focusable: true,
      };
    });

    // مرتب‌سازی برای اینکه یال‌های فعال/انتخاب شده رو باشند
    return processedEdges.sort((a, b) => {
      if (a.id === activeTooltipEdgeId) return 1;
      if (b.id === activeTooltipEdgeId) return -1;
      
      const aData = a.data as CustomEdgeData;
      const bData = b.data as CustomEdgeData;
      
      if (aData?.isGhost && !bData?.isGhost) return 1;
      if (!aData?.isGhost && bData?.isGhost) return -1;

      const aSelected = selectedPathEdges.has(a.id);
      const bSelected = selectedPathEdges.has(b.id);
      if (aSelected && !bSelected) return 1;
      if (!aSelected && bSelected) return -1;
      return 0;
    });
  }, [
    layoutedEdges,
    activeTooltipEdgeId,
    selectedPathEdges,
    isPathFinding,
    activePath,
    zoomLevel,
    handleEdgeSelect
  ]);

  const edgeChartProps = useMemo(() => {
    if (activeSideBar !== "SearchCaseIds" || !activeTooltipEdgeId || !filePath || !filters) {
      return null;
    }

    const activeEdge = edgesForRender.find((e) => e.id === activeTooltipEdgeId);
    const activeEdgeData = activeEdge?.data as CustomEdgeData | undefined;
    const rawDuration = activeEdgeData?.tooltipOverrideData?.rawDuration;

    if (activeEdge && typeof rawDuration === "number") {
      return {
        source: activeEdge.source,
        target: activeEdge.target,
        duration: rawDuration,
        filePath,
        filters,
      };
    }
    return null;
  }, [activeTooltipEdgeId, activeSideBar, edgesForRender, filePath, filters]);

  // ============================================================================
  // EARLY RETURNS
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <h2 className="text-lg font-medium text-white/70">{loadingMessage}</h2>
      </div>
    );
  }

  if (layoutedNodes.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <h2 className="text-lg font-medium text-white/50">
          هیچ داده‌ای برای نمایش وجود ندارد.
        </h2>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div ref={containerRef} className={`${className} w-full h-full`}>
      <div className="relative w-full h-full">
        {/* Node Tooltip Card */}
        {isNodeCardVisible && (
          <Card className="absolute right-2 z-50 p-2 max-h-[250px] min-w-[40%] shadow-xl">
            <NodeTooltip
              nodeTooltipTitle={nodeTooltipTitle}
              nodeTooltipData={nodeTooltipData}
              onClose={closeNodeTooltip}
              onEdgeSelect={handleEdgeSelect}
            />
          </Card>
        )}

        {/* Edge Tooltip Card */}
        {isEdgeCardVisible && (
          <Card className="absolute z-10 top-0 left-0 min-w-[40%] shadow-xl">
            <EdgeTooltip
              edgeTooltipData={edgeTooltipData}
              edgeTooltipTitle={edgeTooltipTitle}
              onClose={closeEdgeTooltip}
              chartProps={edgeChartProps}
            />
          </Card>
        )}

        {/* React Flow Canvas */}
        <ReactFlow
          nodes={nodesForRender}
          edges={edgesForRender}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          onNodesChange={onNodesChange}
          onNodeClick={handleNodeClickWrapper}
          onEdgeClick={handleEdgeClickWrapper}
          onPaneClick={handlePaneClick}
          onMoveStart={onMoveStart}
          onMoveEnd={onMoveEnd}
          onlyRenderVisibleElements
          minZoom={0.05}
          maxZoom={4}
          defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
          nodesConnectable={false}
          nodesDraggable
          elementsSelectable
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

export default memo(Graph);