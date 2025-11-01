import {
  getSmoothStepPath,
  SmoothStepEdge as DefaultSmoothStepEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from "@xyflow/react";
import type { CSSProperties } from "react";

// This interface might be moved to a shared types file later
interface TooltipData {
  Source_Activity: string;
  Target_Activity: string;
  Weight_Value: number;
  Tooltip_Mean_Time: string;
  Tooltip_Total_Time: string;
}

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

export const StyledSmoothStepEdge = (props: EdgeProps) => {
  const { id, data, label, style, ...rest } = props;
  const [edgePath, labelX, labelY] = getSmoothStepPath(props);
  const { onEdgeSelect, isTooltipVisible } = data || {};

  const handleClick = () => {
    if (onEdgeSelect && typeof onEdgeSelect === "function") {
      onEdgeSelect(id);
    }
  };

  return (
    <>
      <g onClick={handleClick} style={{ cursor: "pointer" }}>
        <DefaultSmoothStepEdge
          {...rest}
          id={id}
          style={{
            ...style,
            stroke: style?.stroke || "#3b82f6",
            strokeWidth: style?.strokeWidth || 2,
            strokeOpacity: style?.strokeOpacity ?? 1,
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
