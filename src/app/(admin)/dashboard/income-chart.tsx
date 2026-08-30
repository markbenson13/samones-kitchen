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
        <CartesianGrid strokeDasharray="3 3" stroke="#e7d6ac" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value) => currencyFormatter.format(Number(value))}
        />
        <Legend />
        <Bar dataKey="sales" name="Sales" fill="#e8a93d" radius={[4, 4, 0, 0]} />
        <Bar
          dataKey="costs"
          name="Market costs"
          fill="#c1392b"
          radius={[4, 4, 0, 0]}
        />
        <Line
          type="monotone"
          dataKey="net"
          name="Net income"
          stroke="#3b2313"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
