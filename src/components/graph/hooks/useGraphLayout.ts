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

export const useGraphLayout = (data: any[] | null, colorPaletteKey: string) => {
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
      payload: data,
    });
  }, [data]);

  useEffect(() => {
    if (allNodes.length === 0 || allEdges.length === 0) return;

    setIsLoading(true);
    setLoadingMessage("در حال محاسبه چیدمان گراف...");

    const nodeHeight = 50;
    const elkNodes = allNodes.map((node: Node) => ({
      id: node.id,
      width: (node.style?.width as number) || 250,
      height: nodeHeight,
    }));

    const elkEdges = allEdges.map((edge: Edge) => ({
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
        const newLayoutedNodes = allNodes.map((node) => {
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
        allEdges.forEach((edge) => {
          const weight = edge.data?.Weight_Value || 0;
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
        const coloredEdges = allEdges.map((edge) => {
          const weight = edge.data?.Weight_Value || 0;
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
  }, [allNodes, allEdges, colorPaletteKey]);

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
