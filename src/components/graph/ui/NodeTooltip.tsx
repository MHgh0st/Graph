import { CardHeader, CardBody } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Button } from "@heroui/button";
import closeIcon from "../../../assets/close-icon.svg";

interface NodeTooltipProps {
  nodeTooltipTitle: string | null;
  nodeTooltipData: Array<{ targetLabel: string; weight: string | number }>;
  onClose: () => void;
}

export const NodeTooltip = ({
  nodeTooltipTitle,
  nodeTooltipData,
  onClose,
}: NodeTooltipProps) => {
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
