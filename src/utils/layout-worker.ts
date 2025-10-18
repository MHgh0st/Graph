import dagre from "@dagrejs/dagre";
import { Node, Edge } from "@xyflow/react";

// <<< ۱. تعریف تایپ‌ها مطابق با خروجی جدید پایتون
interface GraphDataItem {
  Source_Activity: string;
  Target_Activity: string;
  Case_Count: number;
  Case_IDs: string[]; // تایپ شناسه‌ها رشته است
  Tooltip_Total_Time: string;
  Tooltip_Mean_Time: string;
}

interface ProcessedData {
  allCaseIds: string[];
  graphData: GraphDataItem[];
}

interface TooltipData {
  Source_Activity: string;
  Target_Activity: string;
  Case_Count: number;
  Tooltip_Mean_Time: string;
  Tooltip_Total_Time: string;
}

// این تابع زمانی اجرا می‌شود که از ترد اصلی پیامی دریافت کند
self.onmessage = (event: MessageEvent) => {
  const { type, payload } = event.data;

  switch (type) {
    // وظیفه جدید: فیلتر کردن بر اساس caseIDها و راس‌ها
    case "FILTER_AND_LAYOUT": {
      console.log("Worker: Filtering and calculating layout...");

      const {
        allNodes,
        allEdges,
        selectedCaseIds,
        selectedNodeIds,
        filterByNodes = false,
      } = payload;

      // اگر هیچ caseID انتخاب نشده باشد، نتیجه خالی برمی‌گردانیم
      if (selectedCaseIds.length === 0) {
        self.postMessage({
          type: "LAYOUT_CALCULATED",
          payload: { nodes: [], edges: [] },
        });
        return;
      }

      // فیلتر یال‌ها بر اساس caseIDها
      let filteredEdges = allEdges.filter((edge) =>
        (edge.data as any)?.Case_IDs?.some?.((id: string) =>
          selectedCaseIds.includes(id)
        )
      );

      // اگر گزینه فیلتر بر اساس راس‌ها فعال باشد، یال‌ها را بیشتر فیلتر می‌کنیم
      if (filterByNodes && selectedNodeIds.length > 0) {
        filteredEdges = filteredEdges.filter(
          (edge) =>
            selectedNodeIds.includes(edge.source) ||
            selectedNodeIds.includes(edge.target)
        );
      }

      if (filteredEdges.length === 0) {
        self.postMessage({
          type: "LAYOUT_CALCULATED",
          payload: { nodes: [], edges: [] },
        });
        return;
      }

      // پیدا کردن راس‌های مرتبط
      const relevantNodeIds = new Set(
        filteredEdges.flatMap((edge) => [edge.source, edge.target])
      );

      // اگر فیلتر بر اساس راس‌ها فعال باشد، فقط راس‌های انتخاب شده را نگه می‌داریم
      const baseNodes = allNodes.filter((node) => {
        if (filterByNodes && selectedNodeIds.length > 0) {
          return selectedNodeIds.includes(node.id);
        }
        return relevantNodeIds.has(node.id);
      });

      // محاسبه درجات ورودی و خروجی برای ساخت نودهای شروع و پایان
      const inDegree = new Map<string, number>();
      const outDegree = new Map<string, number>();

      baseNodes.forEach((node) => {
        inDegree.set(node.id, 0);
        outDegree.set(node.id, 0);
      });

      filteredEdges.forEach((edge) => {
        outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      });

      const startNodes = baseNodes.filter(
        (node) => (inDegree.get(node.id) || 0) === 0
      );
      const endNodes = baseNodes.filter(
        (node) => (outDegree.get(node.id) || 0) === 0
      );

      // ساخت نودهای شروع و پایان
      const startNode: Node = {
        id: "__START__",
        data: { label: "شروع", type: "start" },
        position: { x: 0, y: 0 },
        style: {
          backgroundColor: "#10b981",
        },
      };

      const endNode: Node = {
        id: "__END__",
        data: { label: "پایان", type: "end" },
        position: { x: 0, y: 0 },
        style: {
          backgroundColor: "#ef4444",
        },
      };

      // ساخت یال‌های مصنوعی
      const startEdges: Edge[] = startNodes.map((node, i) => ({
        id: `virtual-start-${i}`,
        source: "__START__",
        target: node.id,
        data: { isStructural: true },
        style: { stroke: "#10b981", strokeWidth: 2 },
        animated: false,
      }));

      const endEdges: Edge[] = endNodes.map((node, i) => ({
        id: `virtual-end-${i}`,
        source: node.id,
        target: "__END__",
        data: { isStructural: true },
        style: { stroke: "#ef4444", strokeWidth: 2 },
        animated: false,
      }));

      // ترکیب نهایی
      const finalNodes = [...baseNodes, startNode, endNode];
      const finalEdges = [...filteredEdges, ...startEdges, ...endEdges];

      // محاسبه چیدمان
      const nodeWidth = 250;
      const nodeHeight = 50;

      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      dagreGraph.setGraph({ rankdir: "LR" });

      finalNodes.forEach((node: Node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
      });

      finalEdges.forEach((edge: Edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
      });

      dagre.layout(dagreGraph);

      const layoutedNodes = finalNodes.map((node: Node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: (nodeWithPosition.y - nodeHeight / 2) * -1, // معکوس کردن محور Y
          },
        };
      });

      self.postMessage({
        type: "LAYOUT_CALCULATED",
        payload: { nodes: layoutedNodes, edges: finalEdges },
      });

      console.log("Worker: Filter and layout calculation finished.");
      break;
    }

    // وظیفه اول: پردازش اولیه کل دیتا
    case "PROCESS_INITIAL_DATA": {
      console.log("Worker: Processing initial raw data...");

      const { allCaseIds, graphData }: ProcessedData = payload;
      const nodeWidth = 250;

      const minCount = Math.min(...graphData.map((d) => d.Case_Count));
      const maxCount = Math.max(...graphData.map((d) => d.Case_Count));

      const scaleEdgeWidth = (count: number) => {
        const normalized = (count - minCount) / (maxCount - minCount + 1);
        // ضخامت بین 1 تا 6 پیکسل
        return 1 + normalized * 5;
      };

      const scaleEdgeColor = (count: number) => {
        const normalized = (count - minCount) / (maxCount - minCount || 1);
        // از آبی روشن (وزن کم) به آبی تیره (وزن زیاد)
        const intensity = Math.max(0.3, normalized); // حداقل شدت 0.3 برای دیده شدن
        return `rgba(59, 130, 246, ${intensity})`; // blue-500 با شفافیت متغیر
      };

      // ساخت نودهای اصلی
      const uniqueActivities = [...new Set()].map((name) => ({
        id: name,
        data: { label: name },
        position: { x: 0, y: 0 },
        style: { width: nodeWidth },
      }));

      const allNodes: Node[] = [
        ...new Set(
          graphData.flatMap((d) => [d.Source_Activity, d.Target_Activity])
        ),
      ].map((name) => ({
        id: name,

        data: { label: name },

        position: { x: 0, y: 0 },

        style: { width: nodeWidth },
      }));

      const allEdges: Edge[] = graphData.map((d, i) => {
        const edgeColor = scaleEdgeColor(d.Case_Count);
        const edgeWidth = scaleEdgeWidth(d.Case_Count);
        return {
          id: `e${i}`,
          source: d.Source_Activity,
          target: d.Target_Activity,
          label: `${d.Case_Count}`,
          data: {
            ...d,
            originalStroke: edgeColor,
            originalStrokeWidth: edgeWidth,
          } as any, // Type assertion برای حل مشکل تایپ
          style: {
            strokeWidth: scaleEdgeWidth(d.Case_Count),
            stroke: edgeColor,
          },
          animated: false,
        };
      });

      self.postMessage({
        type: "INITIAL_DATA_PROCESSED",
        payload: {
          allCaseIds,
          allNodes,
          allEdges,
        },
      });
      console.log("Worker: Initial data processing finished.");

      break;
    }

    // وظیفه دوم: محاسبه چیدمان (این بخش بدون تغییر باقی می‌ماند)
    case "CALCULATE_LAYOUT": {
      console.log("Worker: Calculating layout...");
      const { nodes, edges } = payload;
      const nodeWidth = 250;
      const nodeHeight = 50;

      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      dagreGraph.setGraph({ rankdir: "LR" });

      nodes.forEach((node: Node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
      });

      edges.forEach((edge: Edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
      });

      dagre.layout(dagreGraph);

      const layoutedNodes = nodes.map((node: Node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: (nodeWithPosition.y - nodeHeight / 2) * -1, // معکوس کردن محور Y
          },
        };
      });

      self.postMessage({
        type: "LAYOUT_CALCULATED",
        payload: { nodes: layoutedNodes, edges },
      });
      console.log("Worker: Layout calculation finished.");
      break;
    }
  }
};
