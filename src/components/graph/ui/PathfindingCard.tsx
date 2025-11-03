import { Edge, Node } from "@xyflow/react";
import { CardHeader, CardBody } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Button } from "@heroui/button";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { Tooltip } from "@heroui/tooltip";
import closeIcon from "../../../assets/close-icon.svg";
import displayIcon from "../../../assets/display-icon.svg";
import type { Path } from "src/types/types";

interface PathfindingCardProps {
  startNodeId: string | null;
  endNodeId: string | null;
  paths: Path[];
  allNodes: Node[];
  onSelectPath: (path: Path, index: number) => void;
  onClose: () => void;
  selectedIndex: number | null;
  calculatePathDuration: (path: Path) => {
    totalDuration: number;
    averageDuration: number;
  };
}

export const PathfindingCard = ({
  startNodeId,
  endNodeId,
  paths,
  allNodes,
  onSelectPath,
  onClose,
  selectedIndex,
  calculatePathDuration,
}: PathfindingCardProps) => {
  const getNodeLabel = (id: string) =>
    allNodes.find((n) => n.id === id)?.data?.label || id;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)} ثانیه`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)} دقیقه`;
    return `${(seconds / 3600).toFixed(1)} ساعت`;
  };

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
                  {paths.map((path, index) => {
                    const duration = calculatePathDuration(path);

                    return (
                      <AccordionItem
                        className={`shadow-none ${
                          selectedIndex === index
                            ? "bg-success/20"
                            : "bg-default/40"
                        }`}
                        classNames={{
                          indicator: "cursor-pointer",
                        }}
                        key={index}
                        title={`مسیر ${index + 1} ( دارای ${
                          path.nodes.length - 2
                        } راس و ${path.edges.length} یال)`}
                      >
                        <div className="text-sm text-gray-500">
                          میانگین زمان:{" "}
                          {formatDuration(duration.averageDuration)} | کل زمان:{" "}
                          {formatDuration(duration.totalDuration)}
                        </div>
                        {path.nodes.map((id, index) => (
                          <p
                            key={index}
                            className="text-sm text-gray-500 leading-6"
                          >{`${index} - ${getNodeLabel(id)}`}</p>
                        ))}
                      </AccordionItem>
                    );
                  })}
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
                        color={selectedIndex === index ? "success" : "default"}
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
