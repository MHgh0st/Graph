import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  type CSSProperties,
} from "react";
import {
  ReactFlow,
  Background,
  Controls,
  getSmoothStepPath,
  SmoothStepEdge as DefaultSmoothStepEdge,
  Node,
  Edge,
  MarkerType,
  type EdgeProps,
  EdgeLabelRenderer,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import LayoutWorker from "../utils/layout-worker.ts?worker";
import { List, type RowComponentProps } from "react-window";

// Define the electron API type
declare global {
  interface Window {
    electronAPI: {
      processData: (
        formatType: "csv" | "pkl",
        inputPath: string,
      ) => Promise<any>;
      openFileDialog: () => Promise<any>;
      readProcessedFiles: () => Promise<any>;
      readJsonFile: (filePath: string) => Promise<any>;
    };
  }
}

interface GraphProps {
  path: string;
}

interface TooltipData {
  Source_Activity: string;
  Target_Activity: string;
  Case_Count: number;
  Tooltip_Mean_Time: string;
  Tooltip_Total_Time: string;
}

export default function Graph({ path }: GraphProps) {
  const [allCaseIds, setAllCaseIds] = useState<string[]>([]);
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);

  const [layoutedNodes, setLayoutedNodes] = useState<Node[]>([]);
  const [layoutedEdges, setLayoutedEdges] = useState<Edge[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(
    "در حال بارگذاری داده‌ها...",
  );
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(
    new Set(),
  );
  const [activeTooltipEdgeId, setActiveTooltipEdgeId] = useState<string | null>(
    null,
  );
  const [relevantNodesForFilter, setRelevantNodesForFilter] = useState<Node[]>(
    [],
  );

  const workerRef = useRef<Worker>(null);
  const fetchData = async (filePath: string) => {
    if (!window.electronAPI?.readJsonFile) {
      throw new Error("electronAPI.readJsonFile is not available");
    }
    const jsonData = await window.electronAPI.readJsonFile(filePath);
    return jsonData;
  };

  const handleEdgeSelect = useCallback(
    (edgeId: string) => {
      setLayoutedEdges((prevEdges) => {
        // مرحله ۱: استایل‌دهی به یال‌ها با حفظ استایل‌های قبلی
        const styledEdges = prevEdges.map((edge) => {
          const isSelected = edge.id === edgeId;
          // اگر یال انتخاب شده، رنگ آبی پررنگ، در غیر این صورت رنگ اصلی خودش
          const originalStroke =
            (edge.data as any)?.originalStroke ||
            (edge.style?.stroke?.includes("rgba")
              ? edge.style.stroke
              : edge.style?.stroke || "#3b82f6"); // رنگ آبی پیش‌فرض

          const originalStrokeWidth =
            (edge.data as any)?.originalStrokeWidth || 2;

          return {
            ...edge,
            selected: isSelected,
            style: {
              ...(edge.style || {}), // <<< این خط حیاتی است: استایل‌های قبلی را حفظ می‌کند
              strokeWidth: isSelected ? 4 : originalStrokeWidth, // ضخامت بیشتر برای انتخابی
              stroke: isSelected ? "#ef4444" : originalStroke, // رنگ قرمز برای انتخابی (متضاد با آبی)
              strokeOpacity: isSelected
                ? 1
                : originalStroke.includes("rgba")
                  ? parseFloat(originalStroke.split(",")[3])
                  : 1, // شفافیت اصلی
            },
          };
        });

        // مرحله ۲: مرتب‌سازی مجدد آرایه برای آوردن یال انتخابی به رو
        const selectedEdge = styledEdges.find((edge) => edge.selected);

        if (selectedEdge) {
          const otherEdges = styledEdges.filter((edge) => !edge.selected);
          return [...otherEdges, selectedEdge];
        }

        return styledEdges;
      });
      setActiveTooltipEdgeId((currentActiveId) =>
        currentActiveId === edgeId ? null : edgeId,
      );
      // برای تجربه کاربری بهتر، همه نودها را از انتخاب خارج می‌کنیم
      setLayoutedNodes((prevNodes) =>
        prevNodes.map((node) => ({
          ...node,
          selected: false,
        })),
      );
    },
    [setLayoutedEdges, setLayoutedNodes],
  );

  // ۱. راه‌اندازی Worker
  useEffect(() => {
    const worker = new LayoutWorker();
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent) => {
      const { type, payload } = event.data;

      if (type === "INITIAL_DATA_PROCESSED") {
        setAllCaseIds([...payload.allCaseIds]);
        setAllNodes([...payload.allNodes]);
        setAllEdges([...payload.allEdges]);
        setIsLoading(false);
      } else if (type === "LAYOUT_CALCULATED") {
        setLayoutedNodes(payload.nodes);
        setLayoutedEdges(payload.edges);
        setIsLoading(false);
      }
    };

    worker.onerror = (error: ErrorEvent) => {
      console.error("Web Worker error:", error);
      setIsLoading(false);
    };

    return () => worker.terminate();
  }, []);

  useEffect(() => {
    if (!path) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadingMessage("در حال بارگذاری و پردازش اولیه داده‌ها...");

    fetchData(path).then((rawData) => {
      workerRef.current?.postMessage({
        type: "PROCESS_INITIAL_DATA",
        payload: rawData,
      });
    });
  }, [path]);

  useEffect(() => {
    if (allEdges.length === 0) return;

    if (selectedCaseIds.size === 0) {
      setLayoutedNodes([]);
      setLayoutedEdges([]);
      return;
    }

    setIsLoading(true);
    setLoadingMessage("در حال فیلتر و محاسبه چیدمان گراف...");

    // ارسال داده‌ها به worker برای فیلتر و محاسبه چیدمان
    workerRef.current?.postMessage({
      type: "FILTER_AND_LAYOUT",
      payload: {
        allNodes,
        allEdges,
        selectedCaseIds: Array.from(selectedCaseIds),
        selectedNodeIds: Array.from(selectedNodeIds),
        filterByNodes: selectedNodeIds.size > 0, // اگر راس‌هایی انتخاب شده باشند، فیلتر فعال می‌شود
      },
    });
  }, [selectedCaseIds, selectedNodeIds, allNodes, allEdges]);

  useEffect(() => {
    // اگر هیچ Case ID انتخاب نشده باشد، لیست راس‌های مرتبط خالی است
    if (selectedCaseIds.size === 0 || allEdges.length === 0) {
      setRelevantNodesForFilter([]);
      return;
    }

    // ۱. یال‌ها را بر اساس Case ID های انتخاب شده فیلتر کن
    const filteredEdges = allEdges.filter((edge) =>
      (edge.data as any)?.Case_IDs?.some?.((id: string) =>
        selectedCaseIds.has(id),
      ),
    );

    // ۲. از یال‌های فیلتر شده، ID های منحصر به فرد راس‌ها را استخراج کن
    const relevantNodeIds = new Set(
      filteredEdges.flatMap((edge) => [edge.source, edge.target]),
    );

    // ۳. آبجکت کامل راس‌های مرتبط را از allNodes پیدا کن
    const relevantNodes = allNodes.filter((node) =>
      relevantNodeIds.has(node.id),
    );

    // ۴. state جدید را آپدیت کن
    setRelevantNodesForFilter(relevantNodes);

    // ۵. (اختیاری ولی مهم برای تجربه کاربری)
    // انتخاب‌های فعلی در فیلتر راس‌ها را پاک کن تا با لیست جدید تداخل نداشته باشد
    setSelectedNodeIds(new Set());
  }, [selectedCaseIds, allNodes, allEdges]);

  // انتخاب و فیلتر
  const handleCheckboxChange = (caseId: string) => {
    setSelectedCaseIds((prev) => {
      const newSet = new Set(prev);
      newSet.has(caseId) ? newSet.delete(caseId) : newSet.add(caseId);
      return newSet;
    });
  };

  const handleSelectAll = (isChecked: boolean) => {
    setSelectedCaseIds(isChecked ? new Set(allCaseIds) : new Set());
  };

  const handleNodeCheckboxChange = (nodeId: string) => {
    setSelectedNodeIds((prev) => {
      const newSet = new Set(prev);
      newSet.has(nodeId) ? newSet.delete(nodeId) : newSet.add(nodeId);
      return newSet;
    });
  };

  const handleSelectAllNodes = (isChecked: boolean) => {
    if (isChecked) {
      // انتخاب همه راس‌ها
      const relevantNodeIds = relevantNodesForFilter.map((node) => node.id);
      setSelectedNodeIds(new Set(relevantNodeIds));
    } else {
      // عدم انتخاب همه راس‌ها
      setSelectedNodeIds(new Set());
    }
  };

  const CaseIdFilter = ({
    index,
    style,
    allCaseIds,
  }: RowComponentProps<{
    allCaseIds: string[];
  }>) => {
    return (
      <>
        <div
          style={style}
          key={allCaseIds[index]}
          className="flex items-center justify-between my-1"
        >
          <label
            htmlFor={allCaseIds[index]}
            className="truncate"
            title={allCaseIds[index]}
          >
            {allCaseIds[index]}
          </label>
          <input
            type="checkbox"
            id={allCaseIds[index]}
            checked={selectedCaseIds.has(allCaseIds[index])}
            onChange={() => handleCheckboxChange(allCaseIds[index])}
            className="w-4 h-4"
          />
        </div>
      </>
    );
  };

  const NodeFilter = ({
    index,
    style,
    allNodes,
  }: RowComponentProps<{
    allNodes: Node[];
  }>) => {
    const node = allNodes[index];
    return (
      <>
        <div
          style={style}
          key={node.id}
          className="flex items-center justify-between my-1"
        >
          <label
            htmlFor={node.id}
            className="truncate"
            title={node.data?.label || node.id}
          >
            {node.data?.label || node.id}
          </label>
          <input
            type="checkbox"
            id={node.id}
            checked={selectedNodeIds.has(node.id)}
            onChange={() => handleNodeCheckboxChange(node.id)}
            className="w-4 h-4"
          />
        </div>
      </>
    );
  };

  const edgesForRender = useMemo(() => {
    return layoutedEdges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        onEdgeSelect: handleEdgeSelect, // تابع را به آبجکت data اضافه می‌کنیم
        isTooltipVisible: edge.id === activeTooltipEdgeId,
      },
      // اضافه کردن رویداد کلیک مستقیم به یال
      onClick: () => handleEdgeSelect(edge.id),
    }));
  }, [layoutedEdges, handleEdgeSelect]);

  // تابع برای تعیین استایل نود بر اساس نوعش
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
          backgroundColor: "#10b981", // سبز
          color: "white",
          borderColor: "#059669",
        };
      case "end":
        return {
          ...baseStyle,
          backgroundColor: "#ef4444", // قرمز
          color: "white",
          borderColor: "#dc2626",
        };
      case "activity":
      default:
        return {
          ...baseStyle,
          backgroundColor: "#3b82f6", // آبی
          color: "white",
          borderColor: "#2563eb",
        };
    }
  }, []);

  const nodesForRender = useMemo(() => {
    return layoutedNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        label: node.data?.label || node.id,
      },
      style: getNodeStyle(node),
      // اضافه کردن ویژگی label برای نمایش درست در ReactFlow
      label: node.data?.label || node.id,
    }));
  }, [layoutedNodes, getNodeStyle]);

  const CustomEdgeLabel = ({
    text,
    style,
    className,
  }: {
    text: string;
    style?: CSSProperties;
    className?: string;
  }) => (
    <div
      style={{
        background: "white",
        padding: "2px 6px",
        borderRadius: "4px",
        fontSize: "8px",
        fontWeight: "bold",
        color: "#000",
        border: "1px solid #ccc",
        whiteSpace: "nowrap",
        fontFamily: "Vazir, Tahoma, sans-serif",
        width: "max-content",
        ...style,
      }}
      className={className}
    >
      {text}
    </div>
  );

  const EdgeTooltip = ({
    data,
    style,
  }: {
    data: TooltipData;
    style?: CSSProperties;
  }) => {
    return (
      <div
        dir="rtl"
        style={{
          position: "absolute",
          background: "rgba(0, 0, 0, 0.8)",
          color: "white",
          padding: "8px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontFamily: "Vazir, Tahoma, sans-serif",
          width: "max-content",
          zIndex: 100, // برای اطمینان از اینکه روی همه چیز نمایش داده می‌شود
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          ...style,
        }}
        className="nodrag nopan" // این کلاس‌ها باعث می‌شوند که دراگ و پن گراف غیرفعال شود
      >
        <div>
          <strong>مبدا:</strong> {data.Source_Activity}
        </div>
        <div>
          <strong>مقصد:</strong> {data.Target_Activity}
        </div>
        <hr style={{ margin: "4px 0", borderColor: "rgba(255,255,255,0.3)" }} />
        <div>
          <strong>وزن (تعداد):</strong> {data.Case_Count}
        </div>
        <div>
          <strong>میانگین زمان:</strong> {data.Tooltip_Mean_Time}
        </div>
        <div>
          <strong>زمان کل:</strong> {data.Tooltip_Total_Time}
        </div>
      </div>
    );
  };

  const StyledSmoothStepEdge = (props: EdgeProps) => {
    // id و data را از props بگیرید
    const { id, data, label, style, ...rest } = props;
    const [edgePath, labelX, labelY] = getSmoothStepPath(props);
    // تابع onEdgeSelect را از آبجکت data استخراج کنید
    const { onEdgeSelect, isTooltipVisible } = data || {};
    const handleClick = () => {
      // اگر تابع وجود داشت، آن را با id همین یال فراخوانی کنید
      if (onEdgeSelect && typeof onEdgeSelect === "function") {
        onEdgeSelect(id);
      }
    };

    return (
      // یال را درون یک گروه SVG قرار دهید تا قابل کلیک شود
      <>
        <g onClick={handleClick} style={{ cursor: "pointer" }}>
          <DefaultSmoothStepEdge
            {...rest}
            id={id}
            style={{
              ...style,
              stroke: style?.stroke || "#3b82f6",
              strokeWidth: style?.strokeWidth || 2,
              strokeOpacity: style?.strokeOpacity ?? 1,
            }}
          />
        </g>
        {label && (
          <EdgeLabelRenderer>
            <CustomEdgeLabel
              text={label}
              style={{
                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                pointerEvents: "all",
                position: "absolute",
              }}
              className="nodrag nopan"
            />
            {isTooltipVisible && data && (
              <EdgeTooltip
                data={data}
                style={{
                  transform: `translate(-50%, -120%) translate(${labelX}px, ${labelY}px)`,
                }}
              />
            )}
          </EdgeLabelRenderer>
        )}
      </>
    );
  };

  return (
    <div
      className="grid grid-cols-12 overflow-hidden"
      style={{ width: "100%", height: "100vh" }}
    >
      <div className="col-span-10">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <h2>{loadingMessage}</h2>
          </div>
        ) : layoutedNodes.length === 0 &&
          selectedCaseIds.size > 0 &&
          selectedNodeIds.size > 0 ? (
          <div className="flex justify-center items-center h-full">
            <h2>هیچ مسیری برای راس‌های انتخاب‌شده یافت نشد.</h2>
          </div>
        ) : layoutedNodes.length === 0 && selectedCaseIds.size > 0 ? (
          <div className="flex justify-center items-center h-full">
            <h2>هیچ مسیری برای CaseID های انتخاب‌شده یافت نشد.</h2>
          </div>
        ) : layoutedNodes.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <h2>
              برای نمایش گراف، یک یا چند CaseID را از پنل فیلتر انتخاب کنید.
            </h2>
          </div>
        ) : (
          <div className="w-full h-full">
            <ReactFlow
              nodes={nodesForRender}
              edges={edgesForRender}
              fitView
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
              onPaneClick={() => setActiveTooltipEdgeId(null)}
            >
              <Background />
              <Controls />
            </ReactFlow>
          </div>
        )}
      </div>
      <div className="col-span-2 flex flex-col text-right p-3 m-2 border border-gray-300 rounded-lg h-[97vh]">
        <p className="text-2xl font-bold">:فیلترها</p>
        <hr className="my-4" />

        {/* تب‌ها برای فیلترهای مختلف */}
        <div className="flex border-b mb-4">
          <button
            className={`px-4 py-2 font-semibold ${
              !selectedNodeIds.size
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setSelectedNodeIds(new Set())}
          >
            Case ID ها ({allCaseIds.length})
          </button>
          <button
            className={`px-4 py-2 font-semibold ${
              selectedNodeIds.size > 0
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => {
              if (selectedCaseIds.size === 0) {
                alert("لطفاً ابتدا حداقل یک Case ID انتخاب کنید.");
                return;
              }
              const relevantNodeIds = relevantNodesForFilter.map(
                (node) => node.id,
              );
              setSelectedNodeIds(new Set(relevantNodeIds));
            }}
          >
            راس‌ها ({allNodes.length})
          </button>
        </div>

        {/* بخش فیلتر Case ID ها */}
        {!selectedNodeIds.size && (
          <>
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <label htmlFor="selectAll" className="font-semibold">
                انتخاب همه Case ID ها
              </label>
              <input
                type="checkbox"
                id="selectAll"
                checked={
                  allCaseIds.length > 0 &&
                  selectedCaseIds.size === allCaseIds.length
                }
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-5 h-5"
              />
            </div>
            <div className="flex-grow overflow-y-auto">
              <List
                rowHeight={40}
                rowCount={allCaseIds.length}
                rowProps={{ allCaseIds }}
                rowComponent={CaseIdFilter}
              />
            </div>
          </>
        )}

        {/* بخش فیلتر راس‌ها */}
        {selectedNodeIds.size > 0 && (
          <>
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <label htmlFor="selectAllNodes" className="font-semibold">
                انتخاب همه راس‌ها
              </label>
              <input
                type="checkbox"
                id="selectAllNodes"
                checked={
                  relevantNodesForFilter.length > 0 &&
                  selectedNodeIds.size === relevantNodesForFilter.length
                }
                onChange={(e) => handleSelectAllNodes(e.target.checked)}
                className="w-5 h-5"
              />
            </div>
            <div className="flex-grow overflow-y-auto">
              <List
                rowHeight={40}
                rowCount={relevantNodesForFilter.length}
                rowProps={{ allNodes: relevantNodesForFilter }}
                rowComponent={NodeFilter}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
