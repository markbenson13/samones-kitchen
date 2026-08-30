"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartPoint = {
  date: string;
  sales: number;
  costs: number;
  net: number;
};

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export function IncomeChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value) => currencyFormatter.format(Number(value))}
        />
        <Legend />
        <Bar dataKey="sales" name="Sales" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar
          dataKey="costs"
          name="Market costs"
          fill="#f97316"
          radius={[4, 4, 0, 0]}
        />
        <Line
          type="monotone"
          dataKey="net"
          name="Net income"
          stroke="#171717"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
