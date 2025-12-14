import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
  applyNodeChanges,
  NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card } from "@heroui/card";

import { StyledSmoothStepEdge } from "./graph/ui/StyledSmoothStepEdge";
import { NodeTooltip } from "./graph/ui/NodeTooltip";
import EdgeTooltip from "./graph/ui/EdgeTooltip";
import type { Path, NodeTooltipType, ExtendedPath } from "src/types/types";

interface UtilsProps {
  GraphLayout: {
    allNodes: Node[];
    layoutedNodes: Node[];
    layoutedEdges: Edge[];
    isLoading: boolean;
    loadingMessage: string;
    setLayoutedNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    setLayoutedEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  };

  GraphInteraction: {
    activeTooltipEdgeId: string | null;
    isNodeCardVisible: boolean;
    isEdgeCardVisible: boolean;
    nodeTooltipTitle: string | null;
    nodeTooltipData: Array<NodeTooltipType>;
    edgeTooltipTitle: string | null;
    edgeTooltipData: Array<{ label: string; value: string | number }>;
    pathStartNodeId: string | null;
    pathEndNodeId: string | null;
    foundPaths: Path[];
    selectedPathNodes: Set<string>;
    selectedPathEdges: Set<string>;
    selectedPathIndex: number | null;
    isPathfindingLoading: boolean;
    isPathFinding: boolean;
    handleEdgeSelect: (id: string, overrides?: any) => void;
    handleSelectPath: (path: Path, index: number) => void;
    handleNodeClick: (_event: React.MouseEvent, node: Node) => void;
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
  };
}

interface GraphProps {
  className?: string;
  utils: UtilsProps;
  filteredNodeIds?: Set<string>;
}

export default function Graph({
  className,
  utils,
  filteredNodeIds,
}: GraphProps) {
  const {
    layoutedNodes,
    layoutedEdges,
    isLoading,
    loadingMessage,
    setLayoutedNodes,
  } = utils.GraphLayout;

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

  const formatDuration = (seconds: number) => {
    return `${(seconds / 3600 / 24).toFixed(2)} روز`;
  };

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setLayoutedNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setLayoutedNodes]
  );

  const getNodeStyle = useCallback((node: Node) => {
    const baseStyle = {
      width: node.style?.width || 250,
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "14px",
      fontWeight: "bold",
      textAlign: "center" as const,
      padding: "10px",
      border: "2px solid",
    };

    switch (node.data?.type) {
      case "start":
        return {
          ...baseStyle,
          backgroundColor: "#10b981",
          color: "white",
          borderColor: "#059669",
        };
      case "end":
        return {
          ...baseStyle,
          backgroundColor: "#ef4444",
          color: "white",
          borderColor: "#dc2626",
        };
      case "activity":
      default:
        return {
          ...baseStyle,
          backgroundColor: "#3b82f6",
          color: "white",
          borderColor: "#2563eb",
        };
    }
  }, []);

  const nodesForRender = useMemo(() => {
    const isHighlighting = selectedPathNodes.size > 0;
    const nodesToShow =
      filteredNodeIds && filteredNodeIds.size > 0
        ? layoutedNodes.filter((node) => filteredNodeIds.has(node.id))
        : null;
    return nodesToShow?.map((node) => {
      const isHighlighted = selectedPathNodes.has(node.id);

      const isStart = node.id === pathStartNodeId;
      const isEnd = node.id === pathEndNodeId;
      return {
        ...node,
        data: {
          ...node.data,
          label: node.data?.label || node.id,
        },
        style: {
          ...getNodeStyle(node),
          opacity: isHighlighting && !isHighlighted ? 0.2 : 1,
          boxShadow: isStart
            ? "0 0 15px 3px #10b981"
            : isEnd
              ? "0 0 15px 3px #ef4444"
              : "",
          transition: "all 0.3s ease",
        },
        label: node.data?.label || node.id,
      };
    });
  }, [
    layoutedNodes,
    getNodeStyle,
    selectedPathNodes,
    pathStartNodeId,
    pathEndNodeId,
    filteredNodeIds,
  ]);

  const edgesForRender = useMemo(() => {
    const isHighlighting = selectedPathEdges.size > 0;

    let activePath: ExtendedPath | null = null;
    if (selectedPathIndex !== null && foundPaths && foundPaths[selectedPathIndex]) {
        activePath = foundPaths[selectedPathIndex] as ExtendedPath;
    }

    const processedEdges = layoutedEdges.map((edge) => {
      const isHighlighted = selectedPathEdges.has(edge.id);
      const isTooltipActive = activeTooltipEdgeId !== null && edge.id === activeTooltipEdgeId;
      
      const opacity = (utils.GraphInteraction.isPathFinding || isHighlighting) && !isHighlighted 
        ? 0.2 
        : (edge.style?.opacity ?? 1);

      let displayLabel = edge.label; 
      let tooltipMeanTime = (edge.data as any)?.Tooltip_Mean_Time;
      let tooltipTotalTime = (edge.data as any)?.Tooltip_Total_Time;
      // متغیر برای ذخیره دیتای جایگزین تولتیپ
      let tooltipOverride = undefined;

      if (activePath && isHighlighted) {
         const pathEdges = activePath.edges || [];
         const edgeIndices: number[] = [];
         
         pathEdges.forEach((id: string, idx: number) => {
             if (id === edge.id) edgeIndices.push(idx);
         });
         
         if (edgeIndices.length > 0 && 
             activePath._variantTimings && 
             activePath._variantTimings.length > 0 &&
             typeof activePath._startIndex === 'number') {
             
             let totalDuration = 0;
             let count = 0;
             
             edgeIndices.forEach(idx => {
                 const timeIndex = activePath._startIndex! + idx;
                 const start = activePath._variantTimings![timeIndex];
                 const end = activePath._variantTimings![timeIndex + 1];
                 
                 if (typeof start === 'number' && typeof end === 'number') {
                     totalDuration += Math.max(0, end - start);
                     count++;
                 }
             });
             
             if (count > 0) {
                 const formatted = formatDuration(totalDuration);
                 displayLabel = formatted;
                 tooltipMeanTime = count > 1 ? `${formatted} (مجموع ${count} بار عبور)` : formatted;

                 const frequency = activePath._frequency || 0;
                 const totalVariantDuration = totalDuration * frequency;
                 tooltipTotalTime = formatDuration(totalVariantDuration);
                 
                 // ساخت آبجکت جایگزین برای تولتیپ
                 tooltipOverride = {
                     label: (foundPaths[selectedPathIndex] as ExtendedPath)._frequency!, // نمایش تعداد دفعات عبور به جای فرکانس کل
                     meanTime: tooltipMeanTime,
                     totalTime: tooltipTotalTime
                 };
             }
         }
      }

      // استایل دهی
      let finalStroke = edge.style?.stroke;
      let finalStrokeWidth = edge.style?.strokeWidth;

      

      return {
        ...edge,
        label: displayLabel,
        data: {
          ...edge.data,
          // پاس دادن تابع با wrapper برای استفاده در جاهای دیگر اگر لازم شد
          onEdgeSelect: (id: string) => handleEdgeSelect(id, tooltipOverride),
          isTooltipVisible: isTooltipActive,
          Tooltip_Mean_Time: tooltipMeanTime,
        },
        // --- تغییر مهم: پاس دادن tooltipOverride هنگام کلیک ---
        onClick: () => handleEdgeSelect(edge.id, tooltipOverride),
        style: {
          ...(edge.style || {}),
          stroke: finalStroke,
          strokeWidth: finalStrokeWidth,
          opacity: opacity,
          transition: "all 0.3s ease",
          zIndex: isTooltipActive ? 1000 : (edge.selected || isHighlighted) ? 500 : undefined,
        },
      };
    });

    return processedEdges.sort((a, b) => {
      if (activeTooltipEdgeId) {
        if (a.id === activeTooltipEdgeId) return 1;
        if (b.id === activeTooltipEdgeId) return -1;
      }
      if (a.selected && !b.selected) return 1;
      if (!a.selected && b.selected) return -1;
      return 0;
    });

  }, [
    layoutedEdges,
    handleEdgeSelect,
    activeTooltipEdgeId,
    selectedPathEdges,
    utils.GraphInteraction.isPathFinding,
    selectedPathIndex,
    foundPaths,
  ]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <h2>{loadingMessage}</h2>
      </div>
    );
  }

  if (layoutedNodes.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <h2>هیچ داده‌ای برای نمایش وجود ندارد.</h2>
      </div>
    );
  }

  return (
    <div className={`${className} w-full h-full`}>
      <div className="relative w-full h-full">
        {isNodeCardVisible && (
          <Card className="absolute right-2 z-100 p-2 max-h-[250px] min-w-[600px]">
              <NodeTooltip
                nodeTooltipTitle={nodeTooltipTitle}
                nodeTooltipData={nodeTooltipData}
                onClose={closeNodeTooltip}
                onEdgeSelect={handleEdgeSelect}
              />
          </Card>
          )}
          {isEdgeCardVisible && (
          <Card className="absolute z-1 bottom-4 w-[98%] right-3">
              <EdgeTooltip
                edgeTooltipData={edgeTooltipData}
                edgeTooltipTitle={edgeTooltipTitle}
                onClose={closeEdgeTooltip}
              />
          </Card>
          )}

        <ReactFlow
          nodes={nodesForRender}
          edges={edgesForRender}
          fitView
          nodesDraggable
          edgeTypes={{
            default: StyledSmoothStepEdge,
          }}
          defaultEdgeOptions={{
            markerEnd: {
              type: MarkerType.ArrowClosed,
              height: 7,
            },
          }}
          minZoom={0.05}
          onNodesChange={onNodesChange}
          nodesConnectable={false}
          onNodeClick={handleNodeClick}
          onPaneClick={onPaneClick}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
