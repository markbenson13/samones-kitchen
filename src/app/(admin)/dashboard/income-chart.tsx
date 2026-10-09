"use client";

import { useState } from "react";
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
  expenses: number;
  net: number;
};

const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export function IncomeChart({ data }: { data: ChartPoint[] }) {
  // Off by default — expenses (gas, packaging, etc.) are a different kind of
  // cost than sales/market costs, and showing them by default made the chart
  // busier than the day-to-day "how's the food business doing" question
  // needs. Still togglable for whoever wants the fuller picture.
  const [showExpenses, setShowExpenses] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <label className="mb-2 flex items-center gap-2 self-end text-xs font-medium text-brand-brown-light">
        <input
          type="checkbox"
          checked={showExpenses}
          onChange={(e) => setShowExpenses(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-brand-tan text-brand-red focus:ring-brand-red"
        />
        Show expenses
      </label>
      <div className="flex-1">
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
            {showExpenses && (
              <Bar
                dataKey="expenses"
                name="Expenses"
                fill="#8a6d3b"
                radius={[4, 4, 0, 0]}
              />
            )}
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
      </div>
    </div>
  );
}
