import { useMemo } from "react";
import { CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Tooltip } from "@heroui/tooltip";
import { Chip } from "@heroui/chip";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { 
  X, 
  Monitor, 
  ArrowRightFromLine, 
  ArrowLeftToLine, 
  Activity,
  Network,
  Hash
} from "lucide-react"; 
import type { NodeTooltipType } from "src/types/types";

// --- کامپوننت نمایش دهنده هر ردیف یال ---
interface EdgeRowProps {
  item: NodeTooltipType;
  onEdgeSelect: (edgeId: string) => void;
}

const EdgeRow = ({ item, onEdgeSelect }: EdgeRowProps) => {
  const isIncoming = item.direction === "incoming";
  
  return (
    <div className="group flex items-center justify-between p-3 mb-2 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200">
      <div className="flex items-center gap-3 overflow-hidden">
        {/* آیکون جهت دار */}
        <div className={`
            p-2 rounded-lg shrink-0 transition-colors
            ${isIncoming 
                ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100" 
                : "bg-rose-50 text-rose-600 group-hover:bg-rose-100"
            }
        `}>
           {isIncoming ? <ArrowLeftToLine size={16} /> : <ArrowRightFromLine size={16} />}
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-[10px] text-slate-400 font-medium">
            {isIncoming ? "دریافت از:" : "ارسال به:"}
          </span>
          <span className="text-xs font-bold text-slate-700 truncate font-vazir" title={item.label}>
            {item.label} 
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-1">
        {/* نمایش وزن یا تعداد */}
        {item.weight !== "N/A" && (
          <Chip 
            size="sm" 
            variant="flat" 
            classNames={{
                base: "bg-slate-100 border border-slate-200 h-6 px-1",
                content: "text-[10px] font-mono font-bold text-slate-600 flex items-center gap-1"
            }}
          >
            <Hash size={10} className="text-slate-400" />
            {item.weight}
          </Chip>
        )}

        <div>
            <Tooltip content="مشاهده روی گراف" showArrow color="primary" className="text-xs">
            <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => onEdgeSelect(item.edgeId)}
                className="text-slate-300 hover:text-blue-500 hover:bg-blue-50 min-w-8 w-8 h-8 rounded-lg"
            >
                <Monitor size={16} />
            </Button>
            </Tooltip>
        </div>
      </div>
    </div>
  );
};

// --- کامپوننت اصلی ---
interface NodeTooltipProps {
  nodeTooltipTitle: string | null;
  nodeTooltipData: Array<NodeTooltipType>;
  onClose: () => void;
  onEdgeSelect: (edgeId: string) => void;
}

export const NodeTooltip = ({
  nodeTooltipTitle,
  nodeTooltipData,
  onClose,
  onEdgeSelect
}: NodeTooltipProps) => {

  const incomingEdges = useMemo(() => {
    return nodeTooltipData.filter((item) => item.direction === "incoming");
  }, [nodeTooltipData]);

  const outgoingEdges = useMemo(() => {
    return nodeTooltipData.filter((item) => item.direction === "outgoing");
  }, [nodeTooltipData]);

  return (
    <>
      <CardHeader className="flex justify-between items-center px-4 py-3 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg shadow-sm">
                <Activity size={18} />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold">فعالیت انتخاب شده</span>
                <span className="font-bold text-sm text-slate-800 text-nowrap " title={nodeTooltipTitle || ""}>
                    {nodeTooltipTitle}
                </span>
            </div>
        </div>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onPress={onClose}
          className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <X size={18} />
        </Button>
      </CardHeader>

      <CardBody className="p-0 overflow-hidden bg-slate-50/50">
        {nodeTooltipData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2 opacity-60">
            <Network size={32} />
            <p className="text-xs font-medium">هیچ یالی متصل نیست.</p>
          </div>
        ) : (
          <ScrollShadow className="h-full max-h-[400px] p-2">
            <Accordion 
                selectionMode="multiple" 
                defaultExpandedKeys={["incoming", "outgoing"]}
                className="flex flex-col gap-2"
                itemClasses={{
                    base: "group bg-transparent shadow-none border-none p-0",
                    trigger: "px-2 py-2 rounded-lg hover:bg-slate-200/50 transition-colors",
                    title: "text-xs font-bold text-slate-600",
                    content: "pt-2 pb-1 px-1",
                    indicator: "text-slate-400"
                }}
            >
                {/* لیست ورودی‌ها */}
                {incomingEdges.length > 0 && (
                    <AccordionItem 
                        key="incoming" 
                        aria-label="Incoming Edges"
                        title={
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>ورودی‌ها ({incomingEdges.length})</span>
                            </div>
                        }
                    >
                        {incomingEdges.map((item) => (
                        <EdgeRow key={item.edgeId} item={item} onEdgeSelect={onEdgeSelect} />
                        ))}
                    </AccordionItem>
                )}

                {/* لیست خروجی‌ها */}
                {outgoingEdges.length > 0 && (
                    <AccordionItem 
                        key="outgoing" 
                        aria-label="Outgoing Edges"
                        title={
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                <span>خروجی‌ها ({outgoingEdges.length})</span>
                            </div>
                        }
                    >
                        {outgoingEdges.map((item) => (
                        <EdgeRow key={item.edgeId} item={item} onEdgeSelect={onEdgeSelect} />
                        ))}
                    </AccordionItem>
                )}
            </Accordion>
          </ScrollShadow>
        )}
      </CardBody>
    </>
  );
};