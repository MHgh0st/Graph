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
  applyNodeChanges,
  NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import LayoutWorker from "../utils/layout-worker.ts?worker";
import ELK from "elkjs/lib/elk.bundled.js";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Button } from "@heroui/button";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Tooltip } from "@heroui/tooltip";
import closeIcon from "../assets/close-icon.svg";
import displayIcon from "../assets/display-icon.svg";
interface GraphProps {
  data: any[] | null;
  className?: string;
}

interface TooltipData {
  Source_Activity: string;
  Target_Activity: string;
  Weight_Value: number;
  Tooltip_Mean_Time: string;
  Tooltip_Total_Time: string;
}

const elk = new ELK();

const layoutOptions = {
  algorithm: "layered",
  direction: "RIGHT",
  "layered.spacing.nodeNode": "150",
  "layered.spacing.layerLayer": "350",
  edgeRouting: "ORTHOGONAL",
  "layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  "layered.crossingMinimization.strategy": "LAYER_SWEEP",
  "layered.cycleBreaking.strategy": "GREEDY",
  "spacing.edgeNode": "50",
  "spacing.edgeEdge": "50",
  "spacing.nodeNodeBetweenLayers": "50",
};

export default function Graph({ data, className }: GraphProps) {
  const [allNodes, setAllNodes] = useState<Node[]>([]);
  const [allEdges, setAllEdges] = useState<Edge[]>([]);

  const [layoutedNodes, setLayoutedNodes] = useState<Node[]>([]);
  const [layoutedEdges, setLayoutedEdges] = useState<Edge[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(
    "در حال بارگذاری داده‌ها..."
  );
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

  interface Path {
    nodes: string[];
    edges: string[];
  }
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

  const workerRef = useRef<Worker>(null);

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
        currentActiveId === edgeId ? null : edgeId
      );
      // برای تجربه کاربری بهتر، همه نودها را از انتخاب خارج می‌کنیم
      setLayoutedNodes((prevNodes) =>
        prevNodes.map((node) => ({
          ...node,
          selected: false,
        }))
      );
    },
    [setLayoutedEdges, setLayoutedNodes]
  );

  const handleSelectPath = (path: Path, index: number) => {
    setSelectedPathNodes(new Set(path.nodes));
    setSelectedPathEdges(new Set(path.edges));
    setSelectedPathIndex(index);
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
          nds.map((n) => ({
            ...n,
            selected: n.id === node.id,
          }))
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

            // بررسی کن که آیا این یال، جزو یال‌های خروجی است یا نه
            const isOutgoing = outgoingEdgeIds.has(edge.id);

            return {
              ...edge,
              selected: isOutgoing, // وضعیت انتخاب را تنظیم کن
              style: {
                ...(edge.style || {}),
                // اگر یال خروجی است، قرمز و ضخیم (هایلایت)، وگرنه استایل اصلی
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
        setSelectedPathNodes(new Set([node.id])); // فقط نود شروع را هایلایت کن
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
      allEdges,
      allNodes,
      pathEndNodeId,
      setLayoutedEdges,
      setLayoutedNodes,
    ]
  );

  // ۱. راه‌اندازی Worker
  useEffect(() => {
    const worker = new LayoutWorker();
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent) => {
      const { type, payload } = event.data;

      if (type === "INITIAL_DATA_PROCESSED") {
        setAllNodes([...payload.allNodes]);
        setAllEdges([...payload.allEdges]);
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
    if (!data || data.length === 0) {
      setLayoutedNodes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadingMessage("در حال پردازش اولیه داده‌ها...");

    // داده‌های خام را برای پردازش اولیه به Worker ارسال کن
    workerRef.current?.postMessage({
      type: "PROCESS_INITIAL_DATA",
      payload: data, // 🔽 از prop ورودی استفاده می‌کنیم
    });
  }, [data]);

  // محاسبه چیدمان بعد از پردازش اولیه داده‌ها
  useEffect(() => {
    if (allNodes.length === 0 || allEdges.length === 0) return;

    setIsLoading(true);
    setLoadingMessage("در حال محاسبه چیدمان گراف...");

    const nodeHeight = 50;
    const elkNodes = allNodes.map((node: Node) => ({
      id: node.id,
      width: node.style?.width || 250,
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
      .then((layoutedGraph) => {
        const newLayoutedNodes = allNodes.map((node) => {
          const elkNode = layoutedGraph.children.find(
            (n: any) => n.id === node.id
          );
          return {
            ...node,
            position: { x: elkNode.x, y: elkNode.y },
          };
        });

        setLayoutedNodes(newLayoutedNodes);
        setLayoutedEdges(allEdges);
        setIsLoading(false);
        console.log("Component: ELK Layout finished.");
      })
      .catch((e) => {
        console.error("Component: ELK layout failed:", e);
        setIsLoading(false);
      });
  }, [allNodes, allEdges]);

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
        // اضافه کردن رویداد کلیک مستقیم به یال
        onClick: () => handleEdgeSelect(edge.id),
        style: {
          ...(edge.style || {}),
          stroke: isHighlighted ? "#10b981" : edge.style?.stroke,
          strokeWidth: isHighlighted ? 3 : edge.style?.strokeWidth,
          opacity: isPathFinding && !isHighlighted ? 0.2 : opacity,
          transition: "all 1s ease",
        },
      };
    });
  }, [layoutedEdges, handleEdgeSelect, activeTooltipEdgeId, selectedPathEdges]);

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
          <strong>از :</strong> {data.Source_Activity}
        </div>
        <div>
          <strong>تا :</strong> {data.Target_Activity}
        </div>
        <hr style={{ margin: "4px 0", borderColor: "rgba(255,255,255,0.3)" }} />
        <div>
          <strong>تعداد : </strong> {data.Weight_Value}
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
    const { id, data, label, style, ...rest } = props;
    const [edgePath, labelX, labelY] = getSmoothStepPath(props);
    const { onEdgeSelect, isTooltipVisible } = data || {};

    const handleClick = () => {
      if (onEdgeSelect && typeof onEdgeSelect === "function") {
        onEdgeSelect(id);
      }
    };

    return (
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
                data={data as TooltipData}
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

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setLayoutedNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const closeNodeTooltip = () => {
    setCardContentFlag(null);
    setNodeTooltipTitle(null); // vvv کد جدید از اینجا شروع می‌شود vvv

    // ۱. تمام نودها را از حالت انتخاب خارج کن
    setLayoutedNodes((nds) => nds.map((n) => ({ ...n, selected: false })));

    // ۲. تمام یال‌ها را به استایل اصلی برگردان
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

  const NodeTooltip = () => {
    return (
      <>
        <CardHeader className="text-lg font-bold flex gap-x-2">
          <Button
            isIconOnly
            color="danger"
            size="sm"
            variant="light"
            onPress={closeNodeTooltip}
          >
            <img src={closeIcon} width={25} alt="" />
          </Button>
          <p>یال های خارج شده از {nodeTooltipTitle}</p>
        </CardHeader>
        <CardBody className="text-right">
          {nodeTooltipData.length === 0 ? (
            <p>هیچ یالی وجود ندارد.</p>
          ) : (
            nodeTooltipData.map((item, index) => (
              <div key={index}>
                <div className="py-2">
                  <p>یال به: {item.targetLabel}</p>
                  {item.weight !== "N/A" && <p>تعداد: {item.weight}</p>}
                </div>
                {index !== nodeTooltipData.length - 1 && <Divider />}
              </div>
            ))
          )}
        </CardBody>
      </>
    );
  };

  const PathfindingCard = ({
    startNodeId,
    endNodeId,
    paths,
    allNodes,
    onSelectPath,
    onClose,
    selectedIndex,
  }: {
    startNodeId: string | null;
    endNodeId: string | null;
    paths: Path[];
    allNodes: Node[];
    onSelectPath: (path: Path, index: number) => void;
    onClose: () => void;
    selectedIndex: number | null;
  }) => {
    const getNodeLabel = (id: string) =>
      allNodes.find((n) => n.id === id)?.data?.label || id;

    return (
      <>
        <CardHeader className="text-lg font-bold flex gap-x-2">
          <Button
            isIconOnly
            color="danger"
            size="sm"
            variant="light"
            onPress={onClose}
          >
            <img src={closeIcon} width={25} alt="Close" />
          </Button>
          <p>یافتن مسیر</p>
        </CardHeader>
        <CardBody className="text-right w-[500px]">
          {!startNodeId && <p>. لطفاً نود شروع را روی گراف انتخاب کنید...</p>}
          {startNodeId && !endNodeId && (
            <>
              <p>
                نود شروع: <strong>{getNodeLabel(startNodeId)}</strong>
              </p>
              <p> لطفاً نود پایان را روی گراف انتخاب کنید...</p>
            </>
          )}
          {startNodeId && endNodeId && (
            <div>
              <p>
                <strong>{paths.length}</strong> مسیر از{" "}
                <strong>{getNodeLabel(startNodeId)}</strong> به{" "}
                <strong>{getNodeLabel(endNodeId)}</strong> یافت شد:
              </p>
              <Divider className="my-2" />
              {paths.length === 0 ? (
                <p>هیچ مسیر مستقیمی یافت نشد.</p>
              ) : (
                <div className="flex gap-x-2">
                  <Accordion className="p-0" variant="splitted" isCompact>
                    {paths.map((path, index) => (
                      <AccordionItem
                        className={`shadow-none ${selectedIndex === index ? "bg-success/20" : "bg-default/40"}`}
                        classNames={{
                          indicator: "cursor-pointer",
                        }}
                        key={index}
                        title={`مسیر ${index + 1} ( دارای ${path.nodes.length - 2} راس و ${path.edges.length} یال)`}
                      >
                        {/* <p className="text-xs text-gray-500 rtl">
                          {path.nodes.map(getNodeLabel).join(" → ")}{" "}
                        </p> */}
                        {path.nodes.map((id, index) => (
                          <p
                            key={index}
                            className="text-sm text-gray-500 leading-6"
                          >{`${index} - ${getNodeLabel(id)}`}</p>
                        ))}
                      </AccordionItem>
                    ))}
                  </Accordion>
                  <div className="flex flex-col gap-y-2">
                    {paths.map((path, index) => (
                      <Tooltip
                        content={`مشخص کردن مسیر ${index + 1}`}
                        showArrow
                        key={index}
                      >
                        <Button
                          isIconOnly
                          color={
                            selectedIndex === index ? "success" : "default"
                          }
                          variant="flat"
                          onPress={() => onSelectPath(path, index)}
                        >
                          <img src={displayIcon} alt="" width={20} />
                        </Button>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </>
    );
  };

  const findAllPaths = (startId: string, endId: string): Path[] => {
    const allPaths: Path[] = [];
    const stack: Array<[string, string[], string[]]> = [
      [startId, [startId], []],
    ];

    while (stack.length > 0) {
      const [currentNodeId, currentPathNodes, currentPathEdges] = stack.pop()!;

      if (currentNodeId === endId) {
        // به مقصد رسیدیم. این مسیر کامل را به لیست اضافه کن
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
    return allPaths; // لیست تمام مسیرها را برگردان
  };

  return (
    <div className={`${className} w-full h-full`}>
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <h2>{loadingMessage}</h2>
        </div>
      ) : layoutedNodes.length === 0 ? (
        <div className="flex justify-center items-center h-full">
          <h2>هیچ داده‌ای برای نمایش وجود ندارد.</h2>
        </div>
      ) : (
        <div className="relative w-full h-full">
          {cardContentFlag && (
            <Card className="absolute right-2 z-100 p-2 max-h-[250px]">
              {cardContentFlag === "nodeTooltip" && <NodeTooltip />}
              {cardContentFlag === "pathfinding" && (
                <PathfindingCard
                  startNodeId={pathStartNodeId}
                  endNodeId={pathEndNodeId}
                  paths={foundPaths}
                  allNodes={allNodes}
                  onSelectPath={handleSelectPath}
                  selectedIndex={selectedPathIndex}
                  onClose={() => {
                    // دکمه بستن کارت، کل عملیات را لغو می‌کند
                    setIsPathFinding(false);
                    setCardContentFlag(null);
                    setPathStartNodeId(null);
                    setPathEndNodeId(null);
                    setFoundPaths([]);
                    setSelectedPathNodes(new Set());
                    setSelectedPathEdges(new Set());
                    setSelectedPathIndex(null);
                  }}
                />
              )}
            </Card>
          )}

          <Button
            onPress={() => {
              const nextIsPathFinding = !isPathFinding;
              setIsPathFinding(nextIsPathFinding);

              if (nextIsPathFinding) {
                setCardContentFlag("pathfinding");
                setActiveTooltipEdgeId(null);
              } else {
                setCardContentFlag(null);
              }
              setPathStartNodeId(null);
              setPathEndNodeId(null);
              setFoundPaths([]);
              setSelectedPathNodes(new Set());
              setSelectedPathEdges(new Set());
              setSelectedPathIndex(null);
            }}
            color={isPathFinding ? "danger" : "success"}
            className="absolute bottom-2 right-5 z-10"
          >
            {isPathFinding ? "لغو انتخاب مسیر" : "یافتن مسیر بین دو نود"}
          </Button>
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
      )}
    </div>
  );
}
