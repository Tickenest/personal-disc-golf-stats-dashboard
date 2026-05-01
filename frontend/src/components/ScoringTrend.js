import React, { useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";

function ScoringTrend({ data }) {
    const [courseFilter, setCourseFilter] = useState("all");

    if (!data) return <div className="card">No scoring data available.</div>;

    const filtered = courseFilter === "all"
        ? data
        : data.filter((r) => r.course === courseFilter);

    const formatted = filtered.map((row) => ({
        ...row,
        score_vs_par: Number(row.score_vs_par),
        rolling_avg_vs_par: row.rolling_avg_vs_par
            ? Number(row.rolling_avg_vs_par).toFixed(1)
            : null,
    }));

    return (
        <div className="card">
            <div className="card-header">
                <h2>Scoring Trend</h2>
                <div className="filter-buttons">
                    {["all", "Brambleton", "Franklin Park"].map((c) => (
                        <button
                            key={c}
                            className={courseFilter === c ? "active" : ""}
                            onClick={() => setCourseFilter(c)}
                        >
                            {c === "all" ? "All Courses" : c}
                        </button>
                    ))}
                </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart
                    data={formatted}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        interval={Math.floor(formatted.length / 8)}
                    />
                    <YAxis
                        tickFormatter={(v) => (v > 0 ? `+${v}` : v)}
                        tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                        formatter={(value, name) => [
                            value > 0 ? `+${value}` : value,
                            name === "score_vs_par" ? "Score vs Par" : "5-Round Avg",
                        ]}
                        labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <ReferenceLine y={0} stroke="#666" strokeDasharray="4 4" />
                    <Line
                        type="monotone"
                        dataKey="score_vs_par"
                        stroke="#4a90d9"
                        dot={{ r: 3 }}
                        name="Score vs Par"
                        strokeWidth={1.5}
                    />
                    <Line
                        type="monotone"
                        dataKey="rolling_avg_vs_par"
                        stroke="#e67e22"
                        dot={false}
                        name="5-Round Avg"
                        strokeWidth={2.5}
                        strokeDasharray="5 2"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export default ScoringTrend;