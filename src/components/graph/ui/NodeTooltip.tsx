import { CardHeader, CardBody } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Button } from "@heroui/button";
import { Tooltip } from "@heroui/tooltip";
import { X, Monitor } from "lucide-react"; // یا آیکون بستن خودتون

interface NodeTooltipProps {
  nodeTooltipTitle: string | null;
  nodeTooltipData: Array<{edgeId: string; targetLabel: string; weight: string | number }>;
  onClose: () => void;
  onEdgeSelect: (edgeId: string) => void;
}

export const NodeTooltip = ({
  nodeTooltipTitle,
  nodeTooltipData,
  onClose,
  onEdgeSelect
}: NodeTooltipProps) => {
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
        <p>یال های خارج شده از {nodeTooltipTitle}</p>
      </CardHeader>
      <CardBody className="text-right">
        {nodeTooltipData.length === 0 ? (
          <p>هیچ یالی وجود ندارد.</p>
        ) : (
          nodeTooltipData.map((item, index) => (
            <div key={index}>
              <div className="py-2 flex justify-between items-center">
                <div>
                  <p>یال به: {item.targetLabel}</p>
                {item.weight !== "N/A" && <p>تعداد: {item.weight}</p>}
                </div>
                <Tooltip content="مشاهده یال">
                  <Button
                  color="primary"
                  size="sm"
                  variant="flat"
                  isIconOnly
                  onPress={() => onEdgeSelect(item.edgeId)}
                >
                  <Monitor size={16}/>
                </Button>
                </Tooltip>
              </div>
              {index !== nodeTooltipData.length - 1 && <Divider />}
            </div>
          ))
        )}
      </CardBody>
    </>
  );
};
