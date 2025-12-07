// src/components/graph/ui/EdgeTooltip.tsx (فایل جدید)
import { X } from "lucide-react"; // یا آیکون بستن خودتون
import { CardHeader, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";

interface EdgeTooltipProps {
  edgeTooltipTitle: string | null;
  edgeTooltipData: Array<{ label: string; value: string | number }>;
  onClose: () => void;
}

export default function EdgeTooltip({
  edgeTooltipTitle,
  edgeTooltipData,
  onClose,
}: EdgeTooltipProps) {
  return (
    <>
      <CardHeader className="text-lg font-bold flex gap-x-2">
        <Button
          isIconOnly
          color="danger"
          size="sm"
          variant="flat"
          onPress={onClose}
        >
          <X size={20} />
        </Button>
        {edgeTooltipTitle || "جزئیات یال"}
      </CardHeader>
      <CardBody>
        <div className="flex justify-between px-4">
          {edgeTooltipData.map((item, index) => (
          // <li key={index} className="flex justify-between text-xs">
          //   <span className="text-gray-600">{item.label}:</span>
          //   <span className="font-medium">{item.value}</span>
          // </li>
          <div className="flex flex-col gap-y-1 items-center text-sm">
            <span className="text-gray-600">{item.label}:</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
        </div>
      </CardBody>
    </>
  
  );
}
