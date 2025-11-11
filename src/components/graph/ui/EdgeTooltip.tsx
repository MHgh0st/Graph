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
        {edgeTooltipData.map((item, index) => (
          <li key={index} className="flex justify-between text-xs">
            <span className="text-gray-600">{item.label}:</span>
            <span className="font-medium">{item.value}</span>
          </li>
        ))}
      </CardBody>
    </>
    // <div className="flex flex-col gap-y-2 w-[250px]">
    //   <div className="flex justify-between items-center">
    //     <h4 className="font-bold text-sm">
    //       {edgeTooltipTitle || "جزئیات یال"}
    //     </h4>
    //     <button
    //       onClick={onClose}
    //       className="p-1 rounded-full hover:bg-gray-200"
    //     >
    //       <X size={16} />
    //     </button>
    //   </div>
    //   <ul className="flex flex-col gap-y-1 max-h-[150px] overflow-y-auto">
    //     {edgeTooltipData.map((item, index) => (
    //       <li key={index} className="flex justify-between text-xs">
    //         <span className="text-gray-600">{item.label}:</span>
    //         <span className="font-medium">{item.value}</span>
    //       </li>
    //     ))}
    //     {edgeTooltipData.length === 0 && (
    //       <li className="text-xs text-gray-500">
    //         اطلاعاتی برای نمایش وجود ندارد.
    //       </li>
    //     )}
    //   </ul>
    // </div>
  );
}
