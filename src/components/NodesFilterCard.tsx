import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Checkbox } from "@heroui/checkbox";
import { Search, CheckSquare, Square } from "lucide-react";
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
    if (isChecked) newSelectedIds.add(nodeId);
    else newSelectedIds.delete(nodeId);
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
    <div className={`flex flex-col gap-y-4 h-full ${className || ""}`}>
      {/* هدر جستجو */}
      <div className="sticky top-0 z-20 bg-white/50 backdrop-blur-md pb-2 space-y-2">
          <Input
            type="text"
            variant="flat"
            placeholder="جستجوی نام فعالیت..."
            startContent={<Search size={18} className="text-slate-400" />}
            value={searchValue}
            classNames={{
                inputWrapper: "bg-slate-100 hover:bg-slate-200/70 focus-within:bg-white shadow-none border border-transparent focus-within:border-blue-500/50 transition-all rounded-xl",
            }}
            onChange={(e) => {
              const value = e.target.value.replace('ی', 'ي');
              setSearchValue(value);
            }}
          />

          {Nodes.length > 0 && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-blue-50 text-blue-600 font-medium flex-1 rounded-lg"
                startContent={<CheckSquare size={14} />}
                onPress={handleSelectAll}
              >
                انتخاب همه
              </Button>
              <Button
                size="sm"
                className="bg-rose-50 text-rose-600 font-medium flex-1 rounded-lg"
                startContent={<Square size={14} />}
                onPress={handleDeselectAll}
              >
                لغو همه
              </Button>
            </div>
          )}
          
          {selectedNodeIds.size > 0 && (
            <div className="text-xs text-center font-medium bg-slate-50 py-1.5 rounded-lg text-slate-500 border border-slate-100">
              {selectedNodeIds.size} مورد انتخاب شده
            </div>
          )}
      </div>

      {/* لیست گره‌ها */}
      {Nodes.length > 0 ? (
        <div className="flex flex-col gap-y-2 overflow-y-auto pr-1 pb-10 scrollbar-hide">
          {searchedNodes.map((node) => {
             const isSelected = selectedNodeIds.has(node.id);
             return (
                <div 
                    key={node.id} 
                    className={`
                        group flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer
                        ${isSelected 
                            ? "bg-blue-50 border-blue-200 shadow-sm" 
                            : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm"
                        }
                    `}
                    onClick={() => handleCheckboxChange(node.id, !isSelected)}
                >
                  <Checkbox
                    isSelected={isSelected}
                    radius="md"
                    color="primary"
                    classNames={{ wrapper: "before:border-slate-300" }}
                    onValueChange={(isChecked) => handleCheckboxChange(node.id, isChecked)}
                  />
                  
                  <div className="flex-1 flex flex-col items-start gap-0.5" onClick={(e) => {
                      e.stopPropagation(); // جلوگیری از تریگر شدن چک‌باکس وقتی روی دکمه زوم می‌زنیم
                      handleNodeClick(node.id);
                  }}>
                      <span className={`text-sm font-medium ${isSelected ? "text-blue-700" : "text-slate-700"}`}>
                        {node.data.label}
                      </span>
                      <span className="text-[10px] text-slate-400 group-hover:text-blue-400 transition-colors">
                        کلیک برای مشاهده روی گراف
                      </span>
                  </div>
                </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2 opacity-60">
            <Search size={32} />
            <span className="text-sm">موردی یافت نشد</span>
        </div>
      )}
    </div>
  );
}