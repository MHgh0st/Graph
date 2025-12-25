import { useState, useEffect, useRef } from "react";
import { Node, Edge } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import LayoutWorker from "../../../utils/layout-worker.ts?worker";
import { colorPalettes } from "../../../constants/colorPalettes";

const elk = new ELK();

const layoutOptions = {
  algorithm: "layered",
  direction: "RIGHT",
  "layered.spacing.nodeNode": "150",
  "layered.spacing.layerLayer": "350",
  edgeRouting: "POLYLINE",
  "layered.nodePlacement.strategy": "SIMPLE",
  "layered.crossingMinimization.strategy": "LAYER_SWEEP",
  "layered.layering.strategy": "LONGEST_PATH",
  "elk.separateConnectedComponents": "true",
  "layered.cycleBreaking.strategy": "GREEDY",
  "spacing.edgeNode": "50",
  "spacing.edgeEdge": "50",
  "spacing.nodeNodeBetweenLayers": "50",
};

/**
 * Active path info for ghost elements computation
 * این اطلاعات از مسیر انتخاب شده می‌آید تا گره‌ها و یال‌های ghost محاسبه شوند
 */
interface ActivePathInfo {
  nodes: string[];
  edges: string[];
}

export const useGraphLayout = (
  data: any[] | null,
  colorPaletteKey: string,
  startEndNodes: {
    start: string[];
    end: string[];
  },
  filteredNodeIds: Set<string> = new Set(),
  filteredEdgeIds: Set<string> | null = null,
  activePathInfo?: ActivePathInfo
) => {
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);
  const [layoutedNodes, setLayoutedNodes] = useState<Node[]>([]);
  const [layoutedEdges, setLayoutedEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(
    "در حال بارگذاری داده‌ها..."
  );
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new LayoutWorker();
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent) => {
      const { type, payload } = event.data;
      if (type === "INITIAL_DATA_PROCESSED") {
        setAllNodes(payload.allNodes);
        setAllEdges(payload.allEdges);
        // setIsLoading(false);
      }
    };

    worker.onerror = (error: ErrorEvent) => {
      console.error("Web Worker error:", error);
      setIsLoading(false);
    };

    return () => {
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    if (!data || data.length === 0) {
      setLayoutedNodes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadingMessage("در حال پردازش اولیه داده‌ها...");
    workerRef.current?.postMessage({
      type: "PROCESS_INITIAL_DATA",
      payload: {
        graphData: data,
        startActivities: startEndNodes.start,
        endActivities: startEndNodes.end,
      },
    });
  }, [data, startEndNodes]);

  useEffect(() => {
    if (allNodes.length === 0 || allEdges.length === 0) return;

    setIsLoading(true);
    setLoadingMessage("در حال محاسبه چیدمان گراف...");

    // فیلتر کردن گره‌ها و یال‌ها اگر filteredNodeIds خالی نباشد
    let nodesToLayout = allNodes;
    let edgesToLayout = allEdges;

    if (filteredNodeIds.size > 0) {
      nodesToLayout = allNodes.filter((node) => filteredNodeIds.has(node.id));
      edgesToLayout = allEdges.filter(
        (edge) =>
          filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
      );
    }
    
    // فیلتر کردن خاص برای یال‌ها (اگر ست شده باشد)
    if (filteredEdgeIds && filteredEdgeIds.size > 0) {
       edgesToLayout = edgesToLayout.filter(edge => filteredEdgeIds.has(edge.id));
       
       // در حالت نمایش مسیر، فقط گره‌های متصل به این یال‌ها (یا گره‌های شروع/پایان) را نگه میداریم
       // اما چون filteredNodeIds هم از بالا پاس داده می‌شود، فرض بر این است که آن درست تنظیم شده.
       // پس فقط روی یال‌ها فیلتر اعمال می‌کنیم.
    }

    // اضافه کردن ghost nodes به لیست گره‌ها (قبل از اجرای ELK)
    // محاسبه گره‌های ghost از روی activePathInfo
    if (activePathInfo?.nodes && activePathInfo.nodes.length > 0) {
      const existingNodeIds = new Set(nodesToLayout.map(n => n.id));
      const ghostNodeIds = activePathInfo.nodes.filter(id => !existingNodeIds.has(id));
      const ghostNodes = ghostNodeIds.map((id: string) => ({
        id: id,
        type: "activity",
        position: { x: 0, y: 0 },
        data: { label: id, isGhost: true },
        style: {
          width: 250,
          border: "2px dashed #f59e0b",
          backgroundColor: "#fffbeb",
          color: "#b45309",
        },
        draggable: true,
      } as Node));
      nodesToLayout = [...nodesToLayout, ...ghostNodes];
    }

    // اضافه کردن ghost edges به لیست یال‌ها (قبل از اجرای ELK)
    // محاسبه یال‌های ghost از روی activePathInfo
    if (activePathInfo?.edges && activePathInfo.edges.length > 0) {
      const existingEdgeIds = new Set(edgesToLayout.map(e => e.id));
      const ghostEdgeIds = activePathInfo.edges.filter(id => !existingEdgeIds.has(id));
      const ghostEdges = ghostEdgeIds.map((edgeId: string) => {
        const [source, target] = edgeId.split('->');
        return {
          id: edgeId,
          source: source,
          target: target,
          type: "default",
          animated: false,
          label: "",
          style: {
            stroke: "#f59e0b",
            strokeDasharray: "5, 5",
            strokeWidth: 2,
          },
          data: { isGhost: true },
        } as Edge;
      });
      edgesToLayout = [...edgesToLayout, ...ghostEdges];
    }



    const nodeHeight = 50;
    const elkNodes = nodesToLayout.map((node: Node) => {
      const elkNode: any = {
        id: node.id,
        width: (node.style?.width as number) || 250,
        height: nodeHeight,
      };

      // اجبار گره شروع به لایه اول (سمت چپ)
      if (node.id === "START_NODE") {
        elkNode.layoutOptions = {
          "org.eclipse.elk.layered.layering.layerConstraint": "FIRST",
        };
      }

      // اجبار گره پایان به لایه آخر (سمت راست)
      if (node.id === "END_NODE") {
        elkNode.layoutOptions = {
          "org.eclipse.elk.layered.layering.layerConstraint": "LAST",
        };
      }

      return elkNode;
    });

    const elkEdges = edgesToLayout.map((edge: Edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    }));

    const graphToLayout = {
      id: "root",
      layoutOptions: layoutOptions,
      children: elkNodes,
      edges: elkEdges,
    };

    elk
      .layout(graphToLayout)
      .then((layoutedGraph: any) => {
        const newLayoutedNodes = nodesToLayout.map((node) => {
          const elkNode = layoutedGraph.children.find(
            (n: any) => n.id === node.id
          );
          return {
            ...node,
            position: { x: elkNode.x, y: elkNode.y },
          };
        });

        let minWeight = Infinity;
        let maxWeight = -Infinity;
        edgesToLayout.forEach((edge) => {
          const weight = (edge.data?.Weight_Value as number) || 0;
          if (weight < minWeight) minWeight = weight;
          if (weight > maxWeight) maxWeight = weight;
        });

        // جلوگیری از تقسیم بر صفر اگر همه وزن‌ها یکسان باشند
        if (minWeight === maxWeight) {
          maxWeight = minWeight + 1;
        }

        // ۲. گرفتن تابع رنگ بر اساس کلید پالت
        const getEdgeColor =
          colorPalettes[colorPaletteKey] || colorPalettes.default;

        // ۳. مپ کردن یال‌ها و اعمال رنگ
        const coloredEdges = edgesToLayout.map((edge) => {
          const weight = (edge.data?.Weight_Value as number) || 0;
          const color = getEdgeColor(weight, minWeight, maxWeight);

          return {
            ...edge,
            style: {
              ...edge.style,
              stroke: color, // رنگ استروک را اینجا ست می‌کنیم
            },
            data: {
              ...edge.data,
              originalStroke: color,
            },
          };
        });

        setLayoutedNodes(newLayoutedNodes);
        setLayoutedEdges(coloredEdges);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error("Component: ELK layout failed:", e);
        setIsLoading(false);
      });
  }, [allNodes, allEdges, colorPaletteKey, startEndNodes, filteredNodeIds, filteredEdgeIds, activePathInfo]);

  return {
    allNodes,
    allEdges,
    layoutedNodes,
    layoutedEdges,
    isLoading,
    loadingMessage,
    setLayoutedNodes,
    setLayoutedEdges,
  };
};
