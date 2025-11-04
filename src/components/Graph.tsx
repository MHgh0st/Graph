import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  MarkerType,
  applyNodeChanges,
  NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card } from "@heroui/card";
import { Button } from "@heroui/button";

import { useGraphLayout } from "./graph/hooks/useGraphLayout";
import { useGraphInteraction } from "./graph/hooks/useGraphInteraction";
import { StyledSmoothStepEdge } from "./graph/ui/StyledSmoothStepEdge";
import { NodeTooltip } from "./graph/ui/NodeTooltip";
import { PathfindingCard } from "./graph/ui/PathfindingCard";
import ColorPaletteCard from "./graph/ui/ColorPaletteCard";
import { paletteOptions } from "../constants/colorPalettes";
import { useState } from "react";
import ColorIcon from "../assets/color-icon.svg";
import CloseIcon from "../assets/close-icon.svg";

interface GraphProps {
  data: any[] | null;
  className?: string;
}

export default function Graph({ data, className }: GraphProps) {
  const [showColorPaletteCard, setShowColorPaletteCard] =
    useState<boolean>(false);
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
  } = useGraphLayout(data, selectedColorPalette);

  const {
    activeTooltipEdgeId,
    cardContentFlag,
    nodeTooltipTitle,
    nodeTooltipData,
    isPathFinding,
    pathStartNodeId,
    pathEndNodeId,
    foundPaths,
    selectedPathNodes,
    selectedPathEdges,
    selectedPathIndex,
    handleEdgeSelect,
    handleSelectPath,
    handleNodeClick,
    closeNodeTooltip,
    setIsPathFinding,
    setCardContentFlag,
    resetPathfinding,
    calculatePathDuration,
  } = useGraphInteraction(
    allNodes,
    layoutedEdges,
    setLayoutedNodes,
    setLayoutedEdges
  );

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
      const isStartOrEnd =
        node.id === pathStartNodeId || node.id === pathEndNodeId;
      return {
        ...node,
        data: {
          ...node.data,
          label: node.data?.label || node.id,
        },
        style: {
          ...getNodeStyle(node),
          opacity: isHighlighting && !isHighlighted ? 0.2 : 1,
          boxShadow: isStartOrEnd ? "0 0 10px 3px #ef4444" : "none",
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
          stroke: isHighlighted ? "#10b981" : edge.style?.stroke,
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
            {cardContentFlag === "pathfinding" && (
              <PathfindingCard
                startNodeId={pathStartNodeId}
                endNodeId={pathEndNodeId}
                paths={foundPaths}
                allNodes={allNodes}
                onSelectPath={handleSelectPath}
                selectedIndex={selectedPathIndex}
                onClose={resetPathfinding}
                calculatePathDuration={calculatePathDuration}
              />
            )}
          </Card>
        )}

        <div className="absolute bottom-2 right-5 z-10 flex gap-x-2">
          <Button
            onPress={() => {
              const nextIsPathFinding = !isPathFinding;
              setIsPathFinding(nextIsPathFinding);
              if (nextIsPathFinding) {
                setCardContentFlag("pathfinding");
              } else {
                resetPathfinding();
              }
            }}
            color={isPathFinding ? "danger" : "success"}
          >
            {isPathFinding ? "لغو انتخاب مسیر" : "یافتن مسیر بین دو نود"}
          </Button>
          <Button
            isIconOnly
            variant="flat"
            color={showColorPaletteCard ? "danger" : "primary"}
            onPress={() => {
              setShowColorPaletteCard(!showColorPaletteCard);
            }}
          >
            <img
              src={showColorPaletteCard ? CloseIcon : ColorIcon}
              alt=""
              width={25}
            />
          </Button>
        </div>
        {showColorPaletteCard && (
          <ColorPaletteCard
            className="absolute bottom-2 left-15 z-10"
            options={paletteOptions}
            value={selectedColorPalette}
            onChange={(value) => {
              setSelectedColorPalette(value);
            }}
            label="انتخاب طیف رنگی یال ها"
          />
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
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
