import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Checkbox } from "@heroui/checkbox";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useReactFlow, Node } from "@xyflow/react";

interface Props {
  Nodes: Node[];
  selectedNodeIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  onFilteredNodesChange: React.Dispatch<React.SetStateAction<Node[]>>;
  className?: string;
}

export default function NodesFilterCard({
  Nodes,
  selectedNodeIds,
  onSelectionChange,
  onFilteredNodesChange,
  className,
}: Props) {
  const [searchedNodes, setSearchedNodes] = useState<Node[]>(Nodes);
  const [searchValue, setSearchValue] = useState<string>("");
  const { fitView } = useReactFlow();

  // هر وقت Nodes تغییر کرد، searchedNodes رو آپدیت کن
  useEffect(() => {
    if (!searchValue.trim()) {
      setSearchedNodes(Nodes);
    } else {
      setSearchedNodes(
        Nodes.filter((node) =>
          node.data.label.toLowerCase().includes(searchValue.toLowerCase())
        )
      );
    }
  }, [Nodes, searchValue]);

  // وقتی selection تغییر کرد، filtered nodes رو آپدیت کن
  useEffect(() => {
    if (selectedNodeIds.size === 0) {
      onFilteredNodesChange([]);
    } else {
      const filtered = Nodes.filter((node) => selectedNodeIds.has(node.id));
      onFilteredNodesChange(filtered);
    }
  }, [selectedNodeIds, Nodes, onFilteredNodesChange]);

  const handleNodeClick = (nodeId: string) => {
    fitView({
      nodes: [{ id: nodeId }],
      duration: 1500,
      padding: 0.2,
      maxZoom: 1.5,
    });
  };

  const handleCheckboxChange = (nodeId: string, isChecked: boolean) => {
    const newSelectedIds = new Set(selectedNodeIds);
    if (isChecked) {
      newSelectedIds.add(nodeId);
    } else {
      newSelectedIds.delete(nodeId);
    }
    onSelectionChange(newSelectedIds);
  };

  const handleSelectAll = () => {
    const allIds = new Set(searchedNodes.map((node) => node.id));
    onSelectionChange(new Set([...selectedNodeIds, ...allIds]));
  };

  const handleDeselectAll = () => {
    onSelectionChange(new Set());
  };

  return (
    <div className={`flex flex-col gap-y-2 ${className || ""}`}>
      <Input
        type="text"
        variant="faded"
        placeholder="جستجو بین راس ها"
        startContent={<Search size={24} />}
        value={searchValue}
        onChange={(e) => {
          setSearchValue(e.target.value);
        }}
      />

      {/* دکمه‌های انتخاب همه / لغو انتخاب همه */}
      {Nodes.length > 0 && (
        <div className="flex gap-2 px-2">
          <Button
            size="sm"
            color="primary"
            variant="flat"
            fullWidth
            onPress={handleSelectAll}
          >
            انتخاب همه
          </Button>
          <Button
            size="sm"
            color="danger"
            variant="flat"
            fullWidth
            onPress={handleDeselectAll}
          >
            لغو همه
          </Button>
        </div>
      )}

      {/* نمایش تعداد گره‌های انتخاب شده */}
      {selectedNodeIds.size > 0 && (
        <p className="text-sm text-gray-600 text-center py-1">
          {selectedNodeIds.size} گره انتخاب شده
        </p>
      )}

      {Nodes.length > 0 ? (
        <div className="flex flex-col gap-y-3 max-h-[670px] overflow-y-auto mt-4">
          {searchedNodes.map((node) => (
            <div key={node.id} className="flex items-center gap-1 px-2">
              <Checkbox
                size="lg"
                isSelected={selectedNodeIds.has(node.id)}
                onValueChange={(isChecked) =>
                  handleCheckboxChange(node.id, isChecked)
                }
              />
              <Button
                fullWidth
                color="primary"
                variant="flat"
                className="justify-start"
                onPress={() => handleNodeClick(node.id)}
              >
                {node.data.label}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500">
          هیچ گره ای برای نمایش وجود ندارد.
        </div>
      )}
    </div>
  );
}
