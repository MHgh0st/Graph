import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Node, Edge } from "@xyflow/react";
import type { Path } from "src/types/types";
import PathFindingWorker from "../../../utils/pathFinding-worker?worker";

export const useGraphInteraction = (
  allNodes: Node[],
  allEdges: Edge[],
  setLayoutedNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setLayoutedEdges: React.Dispatch<React.SetStateAction<Edge[]>>
) => {
  const workerRef = useRef<Worker | null>(null);

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
  const [isPathfindingLoading, setIsPathfindingLoading] = useState(false);

  const outgoingEdgesMap = useMemo(() => {
    const map = new Map<string, Edge[]>();
    allEdges.forEach((edge) => {
      if (!map.has(edge.source)) {
        map.set(edge.source, []);
      }
      map.get(edge.source)!.push(edge);
    });
    return map;
  }, [allEdges]);

  const edgesMap = useMemo(() => {
    return new Map(allEdges.map((edge) => [edge.id, edge]));
  }, [allEdges]);

  const calculatePathDuration = useCallback(
    (path: Path) => {
      let totalDuration = 0;
      let edgeCount = 0;

      path.edges.forEach((edgeId) => {
        const edge = edgesMap.get(edgeId);
        if (edge && edge.data?.Mean_Duration_Seconds) {
          totalDuration += edge.data.Mean_Duration_Seconds;
          edgeCount++;
        }
      });

      return {
        totalDuration,
        averageDuration: edgeCount > 0 ? totalDuration / edgeCount : 0,
      };
    },
    [edgesMap]
  );

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

  const setupWorker = useCallback(() => {
    // اگر ورکر قبلی وجود داشت (در حال اجرا بود)، آن را خاتمه بده
    if (workerRef.current) {
      workerRef.current.terminate();
      console.log("Terminating previous worker.");
    }

    // ورکر جدید بساز
    const worker = new PathFindingWorker();
    workerRef.current = worker;

    // به پیام‌های ورکر جدید گوش بده
    worker.onmessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      if (type === "PATHS_FOUND") {
        setFoundPaths(payload); // نتایج را در state بگذار
        setIsPathfindingLoading(false); // لودینگ را تمام کن
        console.log("Main Thread: Received paths from worker.");
      }
    };
  }, [setFoundPaths, setIsPathfindingLoading]);

  useEffect(() => {
    setupWorker(); // ورکر را در اولین بارگذاری راه‌اندازی کن

    // در زمان unmount شدن کامپوننت، ورکر را ببند
    return () => {
      workerRef.current?.terminate();
    };
  }, [setupWorker]);

  useEffect(() => {
    console.log("founded paths: ", foundPaths);
  }, [foundPaths]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setActiveTooltipEdgeId(null);
      if (!isPathFinding) {
        const nodeLabel = (node.data?.label as string) || (node.id as string);
        setNodeTooltipData([]);
        const outgoingEdges = outgoingEdgesMap.get(node.id) || [];
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
        setIsPathfindingLoading(true);
        // const paths = findAllPaths(pathStartNodeId, endId);
        // setFoundPaths(paths);

        workerRef.current?.postMessage({
          type: "FIND_ALL_PATHS",
          payload: {
            allEdges: allEdges, // +++ ( مطمئن شوید allEdges را به هوک پاس می‌دهید)
            startNodeId: pathStartNodeId,
            endNodeId: endId,
          },
        });
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
      outgoingEdgesMap,
      pathEndNodeId,
      allEdges,
      allNodes,
      setLayoutedEdges,
      setLayoutedNodes,
      allEdges,
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
    setIsPathfindingLoading(false);
    setupWorker();
  };

  const onPaneClick = useCallback(() => {
    setActiveTooltipEdgeId(null); // تولتیپ یال فعال را می‌بندد
    closeNodeTooltip(); // تولتیپ نود (کارت) را هم می‌بندد
  }, [closeNodeTooltip]);

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
    isPathfindingLoading,
    handleEdgeSelect,
    handleSelectPath,
    handleNodeClick,
    closeNodeTooltip,
    setIsPathFinding,
    setCardContentFlag,
    resetPathfinding,
    calculatePathDuration,
    onPaneClick,
  };
};
