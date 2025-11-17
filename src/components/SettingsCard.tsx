import ColorPaletteCard from "./graph/ui/ColorPaletteCard";
import { PaletteOption } from "../types/types";
import { Divider } from "@heroui/divider";
interface Props {
  ColorPaletteProps: {
    options: PaletteOption[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
  };
  className?: string;
}

export default function SettingsCard({ ColorPaletteProps, className }: Props) {
  return (
    <div className={`flex flex-col gap-y-2 ${className}`}>
      <p className="text-lg font-semibold">انتخاب طیف رنگی</p>
      <ColorPaletteCard
        options={ColorPaletteProps.options}
        value={ColorPaletteProps.value}
        onChange={ColorPaletteProps.onChange}
        className={ColorPaletteProps.className}
      />

      <Divider className="my-4" />
    </div>
  );
}
