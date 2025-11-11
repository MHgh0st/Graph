import { Node } from "@xyflow/react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Search } from "lucide-react";
import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
interface Props {
  Nodes: Node[];
}

export default function NodesFilterCard({ Nodes }: Props) {
  const [searchedNodes, setSearchedNodes] = useState<Node[]>(Nodes);
  const { fitView } = useReactFlow();

  const handleNodeClick = (nodeId: string) => {
    fitView({
      nodes: [{ id: nodeId }], // نودی که میخواهیم روی آن فوکوس کنیم
      duration: 1500, // انیمیشن زوم (به میلی‌ثانیه)
      padding: 0.2, // کمی فاصله دور نود
      maxZoom: 1.5, // حداکثر زوم
    });
  };
  return (
    <div className="flex flex-col gap-y-2">
      <Input
        type="text"
        variant="faded"
        placeholder="جستجو بین راس ها"
        startContent={<Search size={24} />}
        onChange={(e) => {
          const value = e.target.value.toLowerCase();

          if (!value.trim()) {
            setSearchedNodes(Nodes);
            return;
          }
          setSearchedNodes(
            Nodes.filter((node) =>
              node.data.label.toLowerCase().includes(value)
            )
          );
        }}
      />
      {Nodes.length > 0 ? (
        searchedNodes.map((node) => (
          <Button
            fullWidth
            color="primary"
            variant="flat"
            onPress={() => handleNodeClick(node.id)}
          >
            {node.data.label}
          </Button>
        ))
      ) : (
        <div className="text-center text-gray-500">
          هیچ گره ای برای نمایش وجود ندارد.
        </div>
      )}
    </div>
  );
}
