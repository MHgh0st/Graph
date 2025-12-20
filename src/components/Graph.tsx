/**
 * @component Graph
 * @module components/Graph
 *
 * @description
 * Main graph visualization component using React Flow.
 * Renders the interactive process mining graph with nodes and edges.
 *
 * Features:
 * - Node and edge rendering with dynamic styling
 * - Path highlighting for routing/pathfinding mode
 * - Zoom-dependent edge label visibility
 * - Node and edge tooltips on click
 * - Start/End special node handling
 *
 * @example
 * ```tsx
 * <Graph
 *   filePath="/path/to/data.csv"
 *   filters={currentFilters}
 *   utils={{ GraphLayout: layoutProps, GraphInteraction: interactionProps }}
 *   activeSideBar="Routing"
 * />
 * ```
 */

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

/**
 * Props passed from Dashboard containing graph layout state and methods
 */
interface GraphLayoutProps {
  allNodes: Node[];
  layoutedNodes: Node[];
  layoutedEdges: Edge[];
  isLoading: boolean;
  loadingMessage: string;
  setLayoutedNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setLayoutedEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

/**
 * Props passed from Dashboard containing graph interaction state and handlers
 */
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

/**
 * Combined utilities prop structure
 */
interface UtilsProps {
  GraphLayout: GraphLayoutProps;
  GraphInteraction: GraphInteractionProps;
}

/**
 * Override data for edge tooltips when in path mode
 */
interface EdgeTooltipOverride {
  label?: string | number;
  meanTime?: string;
  totalTime?: string;
  rawDuration?: number;
}

/**
 * Main component props
 */
interface GraphProps {
  /** Path to the data file */
  filePath: string;
  /** Current filter configuration */
  filters: FilterTypes;
  /** Additional CSS classes */
  className?: string;
  /** Layout and interaction utilities from parent */
  utils: UtilsProps;
  /** Set of currently filtered node IDs */
  filteredNodeIds?: Set<string>;
  /** Currently active sidebar tab */
  activeSideBar?: SidebarTab;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default edge styling options */
const DEFAULT_EDGE_OPTIONS = {
  markerEnd: {
    type: MarkerType.ArrowClosed,
    height: 7,
  },
  type: "default",
  animated: false,
} as const;

/** Custom edge type mapping */
const EDGE_TYPES = {
  default: StyledSmoothStepEdge,
};

/** Custom node type mapping */
const NODE_TYPES: NodeTypes = {
  start: CustomNode,
  end: CustomNode,
  activity: CustomNode,
  default: CustomNode,
};

/** Minimum zoom level to show edge labels */
const EDGE_LABEL_ZOOM_THRESHOLD = 0.6;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculates edge duration override for path visualization.
 * Handles both case search and variant pathfinding scenarios.
 */
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

  // Case search mode: use pre-calculated durations
  if (
    activePath._specificEdgeDurations &&
    activePath._specificEdgeDurations[edge.id] !== undefined
  ) {
    const avgDuration = activePath._specificEdgeDurations[edge.id];
    const displayLabel = formatDuration(avgDuration);
    const tooltipMeanTime = `${displayLabel} (میانگین)`;

    // Calculate total time for this edge in this case
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

  // Variant pathfinding mode: calculate from timings
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

/**
 * Graph component renders the React Flow visualization.
 */
function Graph({
  className = "",
  utils,
  filteredNodeIds,
  activeSideBar,
  filePath,
  filters,
}: GraphProps): React.ReactElement {
  // Local state
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Destructure layout utilities
  const { layoutedNodes, layoutedEdges, isLoading, loadingMessage, setLayoutedNodes } =
    utils.GraphLayout;

  // Destructure interaction utilities
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
      const overrideData = edge.data?.tooltipOverrideData as EdgeTooltipOverride | undefined;
      handleEdgeSelect(edge.id, overrideData);
    },
    [handleEdgeSelect]
  );

  // ============================================================================
  // MEMOIZED COMPUTATIONS
  // ============================================================================

  /** Nodes prepared for rendering with highlighting applied */
  const nodesForRender = useMemo(() => {
    const isHighlighting = selectedPathNodes.size > 0;
    const sourceNodes =
      filteredNodeIds && filteredNodeIds.size > 0
        ? layoutedNodes.filter((node) => filteredNodeIds.has(node.id))
        : layoutedNodes;

    return sourceNodes.map((node) => {
      const isHighlighted = selectedPathNodes.has(node.id);
      const nodeType = (node.data?.type as string) || "activity";

      return {
        ...node,
        type: nodeType,
        data: {
          ...node.data,
          label: node.data?.label || node.id,
        },
        style: {
          width: "fit-content",
          opacity: isHighlighting && !isHighlighted ? 0.2 : 1,
          transition: "opacity 0.3s ease",
        },
      };
    });
  }, [layoutedNodes, selectedPathNodes, pathStartNodeId, pathEndNodeId, filteredNodeIds]);

  /** Active path for edge calculations */
  const activePath = useMemo((): ExtendedPath | null => {
    if (selectedPathIndex !== null && foundPaths?.[selectedPathIndex]) {
      return foundPaths[selectedPathIndex] as ExtendedPath;
    }
    return null;
  }, [selectedPathIndex, foundPaths]);

  /** Edges prepared for rendering with styling and labels */
  const edgesForRender = useMemo(() => {
    const isHighlighting = selectedPathEdges.size > 0;
    const showEdgeLabels = zoomLevel > EDGE_LABEL_ZOOM_THRESHOLD;

    const processedEdges = layoutedEdges.map((edge) => {
      const isHighlighted = selectedPathEdges.has(edge.id);
      const isTooltipActive = edge.id === activeTooltipEdgeId;

      // Calculate opacity
      const opacity =
        (isPathFinding || isHighlighting) && !isHighlighted
          ? 0.1
          : edge.style?.opacity ?? 1;

      // Get override data for path mode
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
        },
        style: {
          ...(edge.style || {}),
          opacity,
          zIndex: isTooltipActive ? 1000 : isHighlighted ? 500 : 0,
        },
        focusable: true,
      };
    });

    // Sort edges: active tooltip on top, then highlighted, then others
    return processedEdges.sort((a, b) => {
      if (a.id === activeTooltipEdgeId) return 1;
      if (b.id === activeTooltipEdgeId) return -1;
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
  ]);

  /** Chart props for EdgeTooltip histogram */
  const edgeChartProps = useMemo(() => {
    if (activeSideBar !== "SearchCaseIds" || !activeTooltipEdgeId || !filePath || !filters) {
      return null;
    }

    const activeEdge = edgesForRender.find((e) => e.id === activeTooltipEdgeId);
    const rawDuration = activeEdge?.data?.tooltipOverrideData?.rawDuration;

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