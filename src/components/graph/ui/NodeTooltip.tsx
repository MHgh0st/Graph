import { CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Tooltip } from "@heroui/tooltip";
import { Chip } from "@heroui/chip"; // برای نمایش وزن زیباتر
import { Accordion, AccordionItem } from "@heroui/accordion";
import { 
  X, 
  Monitor, 
  ArrowRightFromLine, // آیکون خروجی
  ArrowLeftToLine,    // آیکون ورودی
  Activity
} from "lucide-react"; 
import type { NodeTooltipType } from "src/types/types";
import { useMemo } from "react";

// --- کامپوننت نمایش دهنده هر ردیف یال (خارج از کامپوننت اصلی) ---
interface EdgeRowProps {
  item: NodeTooltipType;
  onEdgeSelect: (edgeId: string) => void;
}

const EdgeRow = ({ item, onEdgeSelect }: EdgeRowProps) => {
  // تشخیص متن و آیکون بر اساس جهت یال
  const isIncoming = item.direction === "incoming";
  
  return (
    <div className="flex items-center justify-between p-3 mb-2 rounded-xl border-2 border-default-300 hover:bg-default-200 transition-colors bg-content2/50">
      <div className="flex items-center gap-3 overflow-hidden">
        {/* آیکون جهت دار */}
        <div className={`p-2 rounded-full ${isIncoming ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
           {isIncoming ? <ArrowLeftToLine size={18} /> : <ArrowRightFromLine size={18} />}
        </div>

        <div className="flex flex-col truncate">
          <span className="text-small text-default-500 text-right">
            {isIncoming ? "دریافت از:" : "ارسال به:"}
          </span>
          <span className="font-semibold text-small truncate" title={item.label}>
            {item.label} 
            {/* نکته: اینجا item.label همان نام نود مبدا (در ورودی) یا مقصد (در خروجی) است */}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* نمایش وزن یا تعداد */}
        {item.weight !== "N/A" && (
          <Tooltip content="تعداد" showArrow>
            <Chip size="sm" variant="flat" color="secondary" startContent={<Activity size={12}/>}>
            {item.weight}
          </Chip>
          </Tooltip>
        )}

        <Tooltip content="هایلایت کردن یال" showArrow>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            color="primary"
            onPress={() => onEdgeSelect(item.edgeId)}
          >
            <Monitor size={18} />
          </Button>
        </Tooltip>
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
      <CardHeader className="flex justify-end gap-x-2 items-center px-4 py-3 border-b border-default-100" dir="ltr">
        <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-bold text-medium truncate">
               {nodeTooltipTitle}
            </span>
        </div>
        <Button
          isIconOnly
          color="danger"
          size="sm"
          variant="light"
          onPress={onClose}
          className="min-w-8 w-8 h-8"
        >
          <X size={18} />
        </Button>
      </CardHeader>

      <CardBody className="px-2 py-2 overflow-y-auto max-h-[400px]">
        {nodeTooltipData.length === 0 ? (
          <div className="text-center py-8 text-default-400">
            <p>هیچ یالی متصل نیست.</p>
          </div>
        ) : (
          <Accordion 
          variant="splitted"
            selectionMode="multiple" 
            className="shadow-none"
            itemClasses={{
                title: "text-small font-bold",
                trigger: "px-2 py-2 ",
                content: "px-2 pb-2",
                base: 'shadow-none border-2 border-default-300 bg-default-100'
            }}
            
          >
            {/* لیست ورودی‌ها */}
            {incomingEdges.length > 0 && (
                <AccordionItem 
                    key="incoming" 
                    aria-label="Incoming Edges"
                    title={
                        <div className="flex items-center gap-2 text-success-600">
                            <ArrowLeftToLine size={16}/>
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
                        <div className="flex items-center gap-2 text-danger-600">
                            <ArrowRightFromLine size={16}/>
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
        )}
      </CardBody>
    </>
  );
};