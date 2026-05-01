import React, { useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Cell,
} from "recharts";

function HoleBreakdown({ brambleton, franklin }) {
    const [courseFilter, setCourseFilter] = useState("Brambleton");

    const data = courseFilter === "Brambleton" ? brambleton : franklin;

    if (!data) return <div className="card">No hole data available.</div>;

    const formatted = data.map((row) => ({
        hole: `H${row.hole}`,
        avg_vs_par: Number(row.avg_vs_par).toFixed(3),
        avg_score: Number(row.avg_score).toFixed(3),
    }));

    return (
        <div className="card">
            <div className="card-header">
                <h2>Hole Breakdown — Avg vs Par</h2>
                <div className="filter-buttons">
                    {["Brambleton", "Franklin Park"].map((c) => (
                        <button
                            key={c}
                            className={courseFilter === c ? "active" : ""}
                            onClick={() => setCourseFilter(c)}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart
                    data={formatted}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="hole" tick={{ fontSize: 11 }} />
                    <YAxis
                        tickFormatter={(v) => (v > 0 ? `+${v}` : v)}
                        tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                        formatter={(value) => [
                            value > 0 ? `+${value}` : value,
                            "Avg vs Par",
                        ]}
                    />
                    <ReferenceLine y={0} stroke="#666" />
                    <Bar dataKey="avg_vs_par" name="Avg vs Par">
                        {formatted.map((entry, idx) => (
                            <Cell
                                key={idx}
                                fill={
                                    Number(entry.avg_vs_par) <= 0
                                        ? "#27ae60"
                                        : Number(entry.avg_vs_par) <= 0.5
                                        ? "#4a90d9"
                                        : Number(entry.avg_vs_par) <= 1
                                        ? "#e67e22"
                                        : "#e74c3c"
                                }
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <p className="chart-legend">
                <span style={{ color: "#27ae60" }}>■</span> Under par &nbsp;
                <span style={{ color: "#4a90d9" }}>■</span> 0–0.5 over &nbsp;
                <span style={{ color: "#e67e22" }}>■</span> 0.5–1.0 over &nbsp;
                <span style={{ color: "#e74c3c" }}>■</span> 1.0+ over
            </p>
        </div>
    );
}

export default HoleBreakdown;