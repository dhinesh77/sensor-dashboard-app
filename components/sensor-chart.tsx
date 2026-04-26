import { useMemo } from "react";
import { View, Text } from "react-native";
import Svg, { Polyline, Line, Text as SvgText, Rect, Defs, LinearGradient, Stop, ClipPath } from "react-native-svg";
import { useColors } from "@/hooks/use-colors";

interface DataPoint {
  value: number;
  label: string;
}

interface SensorChartProps {
  data: DataPoint[];
  color: string;
  unit: string;
  title: string;
  height?: number;
}

export function SensorChart({ data, color, unit, title, height = 200 }: SensorChartProps) {
  const colors = useColors();
  const padding = { top: 24, right: 48, bottom: 32, left: 48 };
  const chartWidth = 320;
  const chartHeight = height - padding.top - padding.bottom;

  const { minValue, maxValue, yTicks, xLabels, points, gradientPoints } = useMemo(() => {
    if (data.length === 0) {
      return { minValue: 0, maxValue: 100, yTicks: [], xLabels: [], points: "", gradientPoints: "" };
    }

    const values = data.map((d) => d.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const range = rawMax - rawMin || 1;
    const minValue = Math.floor(rawMin - range * 0.1);
    const maxValue = Math.ceil(rawMax + range * 0.1);
    const valueRange = maxValue - minValue;

    const tickCount = 4;
    const yTicks: number[] = [];
    for (let i = 0; i <= tickCount; i++) {
      yTicks.push(minValue + (valueRange * i) / tickCount);
    }

    const maxLabels = 6;
    const step = Math.max(1, Math.floor(data.length / maxLabels));
    const xLabels: { index: number; label: string }[] = [];
    for (let i = 0; i < data.length; i += step) {
      xLabels.push({ index: i, label: data[i].label });
    }
    if (data.length > 0 && xLabels[xLabels.length - 1]?.index !== data.length - 1) {
      xLabels.push({ index: data.length - 1, label: data[data.length - 1].label });
    }

    const points = data
      .map((d, i) => {
        const x = padding.left + (i / Math.max(data.length - 1, 1)) * (chartWidth - padding.left - padding.right);
        const y = padding.top + chartHeight - ((d.value - minValue) / valueRange) * chartHeight;
        return `${x},${y}`;
      })
      .join(" ");

    const gradientPoints =
      points +
      ` ${padding.left + ((data.length - 1) / Math.max(data.length - 1, 1)) * (chartWidth - padding.left - padding.right)},${padding.top + chartHeight} ${padding.left},${padding.top + chartHeight}`;

    return { minValue, maxValue, yTicks, xLabels, points, gradientPoints };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- padding is a constant
  }, [data, chartHeight]);

  if (data.length === 0) {
    return (
      <View className="bg-surface rounded-2xl p-6 border border-border items-center justify-center" style={{ height }}>
        <Text className="text-sm text-muted">No data available</Text>
      </View>
    );
  }

  return (
    <View className="bg-surface rounded-2xl p-4 border border-border">
      <Text className="text-sm font-semibold text-foreground mb-2">{title}</Text>
      <Svg width={chartWidth} height={height}>
        <Defs>
          <LinearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.3" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
          <ClipPath id={`clip-${title}`}>
            <Rect x={padding.left} y={padding.top} width={chartWidth - padding.left - padding.right} height={chartHeight} />
          </ClipPath>
        </Defs>

        {yTicks.map((tick, i) => {
          const y = padding.top + chartHeight - ((tick - minValue) / (maxValue - minValue)) * chartHeight;
          return (
            <View key={i}>
              <Line
                x1={padding.left}
                y1={y}
                x2={chartWidth - padding.right}
                y2={y}
                stroke={colors.border}
                strokeWidth="0.5"
                strokeDasharray="4,4"
              />
              <SvgText
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fill={colors.muted}
                fontSize="10"
              >
                {tick.toFixed(0)}
              </SvgText>
            </View>
          );
        })}

        <Polyline
          points={gradientPoints}
          fill={`url(#gradient-${title})`}
          clipPath={`url(#clip-${title})`}
        />

        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {xLabels.map(({ index, label }) => {
          const x = padding.left + (index / Math.max(data.length - 1, 1)) * (chartWidth - padding.left - padding.right);
          return (
            <SvgText
              key={index}
              x={x}
              y={height - 4}
              textAnchor="middle"
              fill={colors.muted}
              fontSize="9"
            >
              {label}
            </SvgText>
          );
        })}

        <SvgText
          x={chartWidth - padding.right + 8}
          y={padding.top + 4}
          fill={colors.muted}
          fontSize="10"
        >
          {unit}
        </SvgText>
      </Svg>
    </View>
  );
}
