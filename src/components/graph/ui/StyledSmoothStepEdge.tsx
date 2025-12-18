import {
  getSmoothStepPath,
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from "@xyflow/react";
import type { CSSProperties } from "react";

// کامپوننت لیبل (همان کدی که قبلاً اصلاح کردیم و درست بود)
const CustomEdgeLabel = ({
  text,
  style,
}: {
  text: string;
  style?: CSSProperties;
}) => (
  <div
    style={{
      ...style,
      pointerEvents: "all",
      position: "absolute",
    }}
    className="nodrag nopan flex items-center justify-center hover:z-50 z-10 hover:z-[1000]"
  >
    <div 
      className="
        px-2 py-1 
        bg-zinc-900/90 backdrop-blur-sm 
        border border-zinc-700/50 
        text-zinc-300 text-[10px] 
        rounded-lg shadow-lg 
        font-mono tracking-tighter 
        cursor-pointer 
        transition-transform duration-200 ease-out
        hover:scale-125 hover:bg-zinc-800 hover:text-white hover:border-zinc-500
      "
    >
      {text}
    </div>
  </div>
);

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
    targetX,
    targetY,
    markerEnd,
  } = props;

  const { onEdgeSelect } = data || {};
  const isSelfLoop = source === target;

  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (isSelfLoop) {
    // --- 🔄 منطق رسم حلقه (Self Loop) ---
    
    // ۱. تنظیم ابعاد حلقه
    const loopHeight = 60; // ارتفاع حلقه از بالای گره
    const loopWidthOffset = 30; // فاصله افقی از لبه‌ها
    const cornerRadius = 10; // شعاع گردی گوشه‌ها

    // ۲. محاسبه نقاط کلیدی
    // فرض بر این است که در گراف چپ-به-راست، سورس سمت راست و تارگت سمت چپ نود است
    // اما برای اطمینان، ما یک حلقه U شکل بالای نود می‌سازیم
    
    // شروع از هندل خروجی (معمولا راست)
    const sX = sourceX;
    const sY = sourceY;
    // پایان به هندل ورودی (معمولا چپ)
    const tX = targetX;
    const tY = targetY;

    // بالاترین نقطه Y (چون در SVG محور Y به سمت پایین زیاد می‌شود، باید کم کنیم)
    // اینجا فرض می‌کنیم نود حدود ۵۰ پیکسل ارتفاع دارد، پس از وسط نود بالا می‌رویم
    const topY = Math.min(sY, tY) - loopHeight;

    // ۳. ساخت مسیر (Path)
    // حرکت: راست -> بالا -> چپ (تا بالای تارگت) -> پایین
    edgePath = `
      M ${sX} ${sY}
      L ${sX + loopWidthOffset} ${sY}
      Q ${sX + loopWidthOffset + cornerRadius} ${sY} ${sX + loopWidthOffset + cornerRadius} ${sY - cornerRadius}
      L ${sX + loopWidthOffset + cornerRadius} ${topY + cornerRadius}
      Q ${sX + loopWidthOffset + cornerRadius} ${topY} ${sX + loopWidthOffset} ${topY}
      L ${tX - loopWidthOffset} ${topY}
      Q ${tX - loopWidthOffset - cornerRadius} ${topY} ${tX - loopWidthOffset - cornerRadius} ${topY + cornerRadius}
      L ${tX - loopWidthOffset - cornerRadius} ${tY - cornerRadius}
      Q ${tX - loopWidthOffset - cornerRadius} ${tY} ${tX - loopWidthOffset} ${tY}
      L ${tX} ${tY}
    `;

    // ۴. محاسبه مکان لیبل (وسط خط بالای حلقه)
    labelX = (sX + tX) / 2;
    labelY = topY;
    
  } else {
    // --- ➡️ منطق یال‌های معمولی ---
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
      {/* ناحیه نامرئی برای کلیک راحت‌تر (Hit Area) */}
      <BaseEdge
        path={edgePath}
        style={{ strokeWidth: 20, stroke: "transparent", cursor: "pointer", fill: "none" }}
        onClick={handleClick}
      />
      
      {/* خط اصلی */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: style?.stroke || "#52525b",
          strokeWidth: style?.strokeWidth || 1.5,
          fill: "none", // بسیار مهم: داخل حلقه رنگ نشود
        }}
      />
      
      {/* لیبل */}
      {label && (
        <EdgeLabelRenderer>
          <CustomEdgeLabel
            text={label as string}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          />
        </EdgeLabelRenderer>
      )}
    </>
  );
};