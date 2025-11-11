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
import type { Path } from "src/types/types";

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
    cardContentFlag: "nodeTooltip" | "edgeTooltip" | null;
    nodeTooltipTitle: string | null;
    nodeTooltipData: Array<{ targetLabel: string; weight: string | number }>;
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
    handleEdgeSelect: (id: string) => void;
    handleSelectPath: (path: Path, index: number) => void;
    handleNodeClick: (_event: React.MouseEvent, node: Node) => void;
    closeNodeTooltip: () => void;
    setIsPathFinding: React.Dispatch<React.SetStateAction<boolean>>;
    setCardContentFlag: React.Dispatch<
      React.SetStateAction<"nodeTooltip" | "edgeTooltip" | null>
    >;
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
}

export default function Graph({ className, utils }: GraphProps) {
  const {
    layoutedNodes,
    layoutedEdges,
    isLoading,
    loadingMessage,
    setLayoutedNodes,
  } = utils.GraphLayout;

  const {
    activeTooltipEdgeId,
    cardContentFlag,
    nodeTooltipTitle,
    nodeTooltipData,
    edgeTooltipTitle,
    edgeTooltipData,
    pathStartNodeId,
    pathEndNodeId,
    selectedPathNodes,
    selectedPathEdges,
    isPathFinding,
    handleEdgeSelect,
    handleNodeClick,
    closeNodeTooltip,
    onPaneClick,
  } = utils.GraphInteraction;

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
    return layoutedNodes.map((node) => {
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
  ]);

  const edgesForRender = useMemo(() => {
    const isHighlighting = selectedPathEdges.size > 0;
    return layoutedEdges.map((edge) => {
      const isHighlighted = selectedPathEdges.has(edge.id);
      const opacity = isHighlighting && !isHighlighted ? 0.1 : 1;
      return {
        ...edge,
        data: {
          ...edge.data,
          onEdgeSelect: handleEdgeSelect,
          isTooltipVisible: edge.id === activeTooltipEdgeId,
        },
        onClick: () => handleEdgeSelect(edge.id),
        style: {
          ...(edge.style || {}),
          stroke: isHighlighted ? "#FFC107" : edge.style?.stroke,
          strokeWidth: isHighlighted ? 3 : edge.style?.strokeWidth,
          opacity: isPathFinding && !isHighlighted ? 0.2 : opacity,
          transition: "all 0.3s ease",
        },
      };
    });
  }, [
    layoutedEdges,
    handleEdgeSelect,
    activeTooltipEdgeId,
    selectedPathEdges,
    isPathFinding,
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
        {cardContentFlag && (
          <Card className="absolute right-2 z-100 p-2 max-h-[250px]">
            {cardContentFlag === "nodeTooltip" && (
              <NodeTooltip
                nodeTooltipTitle={nodeTooltipTitle}
                nodeTooltipData={nodeTooltipData}
                onClose={closeNodeTooltip}
              />
            )}
            {cardContentFlag === "edgeTooltip" && (
              <EdgeTooltip
                edgeTooltipData={edgeTooltipData}
                edgeTooltipTitle={edgeTooltipTitle}
                onClose={closeNodeTooltip}
              />
            )}
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
