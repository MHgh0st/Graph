import {
  getSmoothStepPath,
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  Position,
} from "@xyflow/react";
import type { CSSProperties } from "react";

// این اینترفیس از قبل وجود داشت
interface TooltipData {
  Source_Activity: string;
  Target_Activity: string;
  Weight_Value: number;
  Tooltip_Mean_Time: string;
  Tooltip_Total_Time: string;
}

// کامپوننت CustomEdgeLabel (بدون تغییر)
const CustomEdgeLabel = ({
  text,
  style,
  className,
}: {
  text: string;
  style?: CSSProperties;
  className?: string;
}) => (
  <div
    style={{
      background: "white",
      padding: "2px 6px",
      borderRadius: "4px",
      fontSize: "8px",
      fontWeight: "bold",
      color: "#000",
      border: "1px solid #ccc",
      whiteSpace: "nowrap",
      fontFamily: "Vazir, Tahoma, sans-serif",
      width: "max-content",
      ...style,
    }}
    className={className}
  >
    {text}
  </div>
);

// کامپوننت EdgeTooltip (بدون تغییر)
const EdgeTooltip = ({
  data,
  style,
}: {
  data: TooltipData;
  style?: CSSProperties;
}) => {
  return (
    <div
      dir="rtl"
      style={{
        position: "absolute",
        background: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "8px 12px",
        borderRadius: "6px",
        fontSize: "12px",
        fontFamily: "Vazir, Tahoma, sans-serif",
        width: "max-content",
        zIndex: 100,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        ...style,
      }}
      className="nodrag nopan"
    >
      <div>
        <strong>از :</strong> {data.Source_Activity}
      </div>
      <div>
        <strong>تا :</strong> {data.Target_Activity}
      </div>
      <hr style={{ margin: "4px 0", borderColor: "rgba(255,255,255,0.3)" }} />
      <div>
        <strong>تعداد : </strong> {data.Weight_Value}
      </div>
      <div>
        <strong>میانگین زمان:</strong> {data.Tooltip_Mean_Time}
      </div>
      <div>
        <strong>زمان کل:</strong> {data.Tooltip_Total_Time}
      </div>
    </div>
  );
};

// کامپوننت اصلی StyledSmoothStepEdge (اصلاح شده برای حلقه)
export const StyledSmoothStepEdge = (props: EdgeProps) => {
  const {
    id,
    data,
    label,
    style,
    source,
    target,
    sourceX,
    sourceY,
    markerEnd,
  } = props;

  const { onEdgeSelect, isTooltipVisible } = data || {};
  const isSelfLoop = source === target;

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (isSelfLoop) {
    // ابعاد و مرکز نود را از data بدهید تا مسیر همیشه بیرون بدنه بماند
    const nodeW = (data as any)?.nodeWidth ?? 230;
    const nodeH = (data as any)?.nodeHeight ?? 100;
    const cx = (data as any)?.nodeCenterX ?? sourceX;
    const cy = (data as any)?.nodeCenterY ?? sourceY;

    // فاصلهٔ حلقه از بدنه و طول پله‌ها
    const margin = (data as any)?.loopMargin ?? 24;
    const offsetDown = (data as any)?.loopDown ?? 12;
    const offsetUp = (data as any)?.loopUp ?? 12;

    // خروجی از پایین، ورودی از بالا
    const sx = cx; // خروج از پایین
    const sy = cy + nodeH / 2 - 50;
    const tx = cx; // ورود از بالا
    const ty = cy - nodeH / 2;

    // مسیرِ دور زدن از سمت چپ
    const leftX = cx - (nodeW / 2 + margin);

    // نسخهٔ ساده با گوشه‌های تیز (می‌توانید بعداً Q/C اضافه کنید)
    edgePath = [
      `M ${sx},${sy}`, // شروع: پایین نود
      `L ${sx},${sy + offsetDown}`, // کمی پایین
      `L ${leftX},${sy + offsetDown}`, // به چپ
      `L ${leftX},${ty - offsetUp}`, // بالا
      `L ${tx},${ty - offsetUp}`, // به راست، نزدیک ورودی
      `L ${tx},${ty}`, // ورود از بالا
    ].join(" ");

    // جای لیبل: وسطِ مسیرِ سمت چپ
    labelX = leftX - 6;
    labelY = cy;
  } else {
    // منطق برای یال‌های عادی (مثل قبل)
    const [path, lx, ly] = getSmoothStepPath(props);
    edgePath = path;
    labelX = lx;
    labelY = ly;
  }

  const handleClick = () => {
    if (onEdgeSelect && typeof onEdgeSelect === "function") {
      onEdgeSelect(id);
    }
  };

  return (
    <>
      <g onClick={handleClick} style={{ cursor: "pointer" }}>
        <BaseEdge
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            ...style,
            stroke: style?.stroke || "#3b82f6",
            strokeWidth: style?.strokeWidth || 2,
            strokeOpacity: style?.strokeOpacity ?? 1,
            fill: "none", // مهم: مطمئن شوید داخل مسیر رنگی نمی‌شود
          }}
        />
      </g>
      {label && (
        <EdgeLabelRenderer>
          <CustomEdgeLabel
            text={label as string}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
              position: "absolute",
            }}
            className="nodrag nopan"
          />
          {isTooltipVisible && data && (
            <EdgeTooltip
              data={data as unknown as TooltipData}
              style={{
                transform: `translate(-50%, -120%) translate(${labelX}px, ${labelY}px)`,
              }}
            />
          )}
        </EdgeLabelRenderer>
      )}
    </>
  );
};
