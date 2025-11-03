import { useState, useCallback } from "react";
import { Node, Edge } from "@xyflow/react";
import type { Path } from "src/types/types";

export const useGraphInteraction = (
  allNodes: Node[],
  allEdges: Edge[],
  setLayoutedNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setLayoutedEdges: React.Dispatch<React.SetStateAction<Edge[]>>
) => {
  const [activeTooltipEdgeId, setActiveTooltipEdgeId] = useState<string | null>(
    null
  );
  const [cardContentFlag, setCardContentFlag] = useState<
    "nodeTooltip" | "pathfinding" | null
  >(null);
  const [nodeTooltipTitle, setNodeTooltipTitle] = useState<string | null>(null);
  const [nodeTooltipData, setNodeTooltipData] = useState<
    Array<{ targetLabel: string; weight: string | number }>
  >([]);
  const [isPathFinding, setIsPathFinding] = useState(false);
  const [pathStartNodeId, setPathStartNodeId] = useState<string | null>(null);
  const [pathEndNodeId, setPathEndNodeId] = useState<string | null>(null);
  const [foundPaths, setFoundPaths] = useState<Path[]>([]);
  const [selectedPathNodes, setSelectedPathNodes] = useState<Set<string>>(
    new Set()
  );
  const [selectedPathEdges, setSelectedPathEdges] = useState<Set<string>>(
    new Set()
  );
  const [selectedPathIndex, setSelectedPathIndex] = useState<number | null>(
    null
  );

  const calculatePathDuration = (path: Path) => {
    let totalDuration = 0;
    let edgeCount = 0;

    path.edges.forEach((edgeId) => {
      const edge = allEdges.find((e) => e.id === edgeId);
      if (edge && edge.data?.Mean_Duration_Seconds) {
        totalDuration += edge.data.Mean_Duration_Seconds;
        edgeCount++;
      }
    });

    return {
      totalDuration,
      averageDuration: edgeCount > 0 ? totalDuration / edgeCount : 0,
    };
  };

  const handleEdgeSelect = useCallback(
    (edgeId: string) => {
      setLayoutedEdges((prevEdges) => {
        const styledEdges = prevEdges.map((edge) => {
          const isSelected = edge.id === edgeId;
          const originalStroke =
            (edge.data as any)?.originalStroke ||
            (edge.style?.stroke?.includes("rgba")
              ? edge.style.stroke
              : edge.style?.stroke || "#3b82f6");
          const originalStrokeWidth =
            (edge.data as any)?.originalStrokeWidth || 2;

          return {
            ...edge,
            selected: isSelected,
            style: {
              ...(edge.style || {}),
              strokeWidth: isSelected ? 4 : originalStrokeWidth,
              stroke: isSelected ? "#ef4444" : originalStroke,
              strokeOpacity: isSelected
                ? 1
                : originalStroke.includes("rgba")
                  ? parseFloat(originalStroke.split(",")[3])
                  : 1,
            },
          };
        });

        const selectedEdge = styledEdges.find((edge) => edge.selected);
        if (selectedEdge) {
          const otherEdges = styledEdges.filter((edge) => !edge.selected);
          return [...otherEdges, selectedEdge];
        }
        return styledEdges;
      });
      setActiveTooltipEdgeId((currentActiveId) =>
        currentActiveId === edgeId ? null : edgeId
      );
      setLayoutedNodes((prevNodes) =>
        prevNodes.map((node) => ({ ...node, selected: false }))
      );
    },
    [setLayoutedEdges, setLayoutedNodes]
  );

  const handleSelectPath = (path: Path, index: number) => {
    setSelectedPathNodes(new Set(path.nodes));
    setSelectedPathEdges(new Set(path.edges));
    setSelectedPathIndex(index);
  };

  const findAllPaths = (startId: string, endId: string): Path[] => {
    const allPaths: Path[] = [];
    const stack: Array<[string, string[], string[]]> = [
      [startId, [startId], []],
    ];

    while (stack.length > 0) {
      const [currentNodeId, currentPathNodes, currentPathEdges] = stack.pop()!;

      if (currentNodeId === endId) {
        allPaths.push({ nodes: currentPathNodes, edges: currentPathEdges });
        continue;
      }

      const outgoingEdges = allEdges.filter((e) => e.source === currentNodeId);

      for (const edge of outgoingEdges) {
        const neighborId = edge.target;
        if (!currentPathNodes.includes(neighborId)) {
          stack.push([
            neighborId,
            [...currentPathNodes, neighborId],
            [...currentPathEdges, edge.id],
          ]);
        }
      }
    }
    return allPaths;
  };

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!isPathFinding) {
        const nodeLabel = (node.data?.label as string) || (node.id as string);
        setNodeTooltipData([]);
        const outgoingEdges = allEdges.filter(
          (edge) => edge.source === node.id
        );
        const outgoingEdgeIds = new Set(outgoingEdges.map((e) => e.id));
        const tooltipData = outgoingEdges.map((edge) => {
          const targetNode = allNodes.find((n) => n.id === edge.target);
          return {
            targetLabel:
              (targetNode?.data?.label as string) || (edge.target as string),
            weight: (edge.label as string) || "N/A",
          };
        });

        setCardContentFlag("nodeTooltip");
        setNodeTooltipData(tooltipData);
        setNodeTooltipTitle(nodeLabel);
        setLayoutedNodes((nds) =>
          nds.map((n) => ({ ...n, selected: n.id === node.id }))
        );
        setActiveTooltipEdgeId(null);
        setLayoutedEdges((prevEdges) =>
          prevEdges.map((edge) => {
            const originalStroke =
              (edge.data as any)?.originalStroke ||
              (edge.style?.stroke?.includes("rgba")
                ? edge.style.stroke
                : edge.style?.stroke || "#3b82f6");
            const originalStrokeWidth =
              (edge.data as any)?.originalStrokeWidth || 2;
            const originalOpacity = originalStroke.includes("rgba")
              ? parseFloat(originalStroke.split(",")[3])
              : 1;
            const isOutgoing = outgoingEdgeIds.has(edge.id);
            return {
              ...edge,
              selected: isOutgoing,
              style: {
                ...(edge.style || {}),
                stroke: isOutgoing ? "#ef4444" : originalStroke,
                strokeWidth: isOutgoing ? 4 : originalStrokeWidth,
                strokeOpacity: isOutgoing ? 1 : originalOpacity,
              },
            };
          })
        );
        return;
      }

      setCardContentFlag("pathfinding");
      setActiveTooltipEdgeId(null);

      if (!pathStartNodeId) {
        setPathStartNodeId(node.id);
        setPathEndNodeId(null);
        setFoundPaths([]);
        setSelectedPathNodes(new Set([node.id]));
        setSelectedPathEdges(new Set());
        return;
      }

      if (pathStartNodeId && !pathEndNodeId && node.id !== pathStartNodeId) {
        const endId = node.id;
        setPathEndNodeId(endId);
        const paths = findAllPaths(pathStartNodeId, endId);
        setFoundPaths(paths);
        setSelectedPathNodes(new Set([pathStartNodeId, endId]));
        setSelectedPathEdges(new Set());
        return;
      }
      setPathStartNodeId(node.id);
      setPathEndNodeId(null);
      setFoundPaths([]);
      setSelectedPathNodes(new Set([node.id]));
      setSelectedPathEdges(new Set());
    },
    [
      isPathFinding,
      pathStartNodeId,
      pathEndNodeId,
      allEdges,
      allNodes,
      setLayoutedEdges,
      setLayoutedNodes,
    ]
  );

  const closeNodeTooltip = () => {
    setCardContentFlag(null);
    setNodeTooltipTitle(null);
    setLayoutedNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    setLayoutedEdges((prevEdges) =>
      prevEdges.map((edge) => {
        const originalStroke =
          (edge.data as any)?.originalStroke ||
          (edge.style?.stroke?.includes("rgba")
            ? edge.style.stroke
            : edge.style?.stroke || "#3b82f6");
        const originalStrokeWidth =
          (edge.data as any)?.originalStrokeWidth || 2;
        const originalOpacity = originalStroke.includes("rgba")
          ? parseFloat(originalStroke.split(",")[3])
          : 1;
        return {
          ...edge,
          selected: false,
          style: {
            ...(edge.style || {}),
            stroke: originalStroke,
            strokeWidth: originalStrokeWidth,
            strokeOpacity: originalOpacity,
          },
        };
      })
    );
  };

  const resetPathfinding = () => {
    setIsPathFinding(false);
    setCardContentFlag(null);
    setPathStartNodeId(null);
    setPathEndNodeId(null);
    setFoundPaths([]);
    setSelectedPathNodes(new Set());
    setSelectedPathEdges(new Set());
    setSelectedPathIndex(null);
  };

  return {
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
  };
};
