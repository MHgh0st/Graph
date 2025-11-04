import { Card, CardBody, CardHeader } from "@heroui/card";

interface PaletteOption {
  key: string;
  label: string;
  gradient: string;
}

interface ColorPaletteCardProps {
  label: string;
  options: PaletteOption[];
  value: string; // کلیدِ پالتِ انتخاب شده
  onChange: (value: string) => void;
  className?: string;
}

export default function ColorPaletteCard({
  label,
  options,
  value,
  onChange,
  className,
}: ColorPaletteCardProps) {
  return (
    <Card className={`${className}`}>
      <CardHeader>{label}</CardHeader>
      <CardBody>
        <div role="radiogroup" aria-label={label} className="w-full space-y-2">
          {options.map((option) => {
            const isSelected = option.key === value;
            return (
              <div
                key={option.key}
                role="radio"
                aria-checked={isSelected}
                onClick={() => onChange(option.key)}
                className={`flex items-center p-2 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-300"
                    : "border-gray-300 bg-white hover:bg-gray-50"
                }`}
              >
                {/* دایره رادیویی کاستوم */}
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? "border-blue-600" : "border-gray-400"
                  }`}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </div>

                {/* نوار گرادیان */}
                <div
                  className="w-16 h-5 rounded-md mx-3 border border-gray-200"
                  style={{ background: option.gradient }}
                />

                {/* لیبل */}
                <span className="text-sm font-medium">{option.label}</span>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
