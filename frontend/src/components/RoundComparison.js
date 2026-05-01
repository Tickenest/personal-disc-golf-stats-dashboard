import React, { useState, useMemo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";

const HOLES = Array.from({ length: 18 }, (_, i) => i + 1);

function RoundComparison({ allRounds, holeAveragesBrambleton, holeAveragesFranklin }) {
    const [selectedRoundIdx, setSelectedRoundIdx] = useState(0);

    const selectedRound = useMemo(() => {
        if (!allRounds || allRounds.length === 0) return null;
        return allRounds[selectedRoundIdx];
    }, [allRounds, selectedRoundIdx]);

    const courseAverages = useMemo(() => {
        if (!selectedRound) return null;
        return selectedRound.course === "Brambleton"
            ? holeAveragesBrambleton
            : holeAveragesFranklin;
    }, [selectedRound, holeAveragesBrambleton, holeAveragesFranklin]);

    const chartData = useMemo(() => {
        if (!selectedRound || !courseAverages) return [];
        return HOLES.map((h) => {
            const score = selectedRound[`hole_${h}_score`];
            const avgObj = courseAverages.find((a) => a.hole === h);
            const avg = avgObj ? Number(avgObj.avg_score) : null;
            return {
                hole: `H${h}`,
                "This Round": score ?? null,
                "Course Avg": avg !== null ? Number(avg.toFixed(2)) : null,
            };
        });
    }, [selectedRound, courseAverages]);

    const gains = useMemo(() => {
        if (!selectedRound || !courseAverages) return [];
        return HOLES.filter((h) => {
            const score = selectedRound[`hole_${h}_score`];
            const avgObj = courseAverages.find((a) => a.hole === h);
            if (!avgObj || score === null) return false;
            return score < avgObj.avg_score;
        });
    }, [selectedRound, courseAverages]);

    const losses = useMemo(() => {
        if (!selectedRound || !courseAverages) return [];
        return HOLES.filter((h) => {
            const score = selectedRound[`hole_${h}_score`];
            const avgObj = courseAverages.find((a) => a.hole === h);
            if (!avgObj || score === null) return false;
            return score > avgObj.avg_score;
        });
    }, [selectedRound, courseAverages]);

    if (!allRounds || !holeAveragesBrambleton || !holeAveragesFranklin) {
        return <div className="card">No data available for comparison.</div>;
    }

    if (!selectedRound) {
        return <div className="card">No rounds available for comparison.</div>;
    }

    const allValues = chartData
        .flatMap((d) => [d["This Round"], d["Course Avg"]])
        .filter((v) => v !== null && v !== undefined);
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const yMin = Math.max(0, minVal - 1);
    const yMax = maxVal + 1;

    const roundOptions = allRounds.map((r, idx) => ({
        idx,
        label: `${r.date} — ${r.course} — ${r.total_score} (${r.score_vs_par > 0 ? "+" : ""}${r.score_vs_par})`,
    }));

    return (
        <div className="card">
            <h2>Round Comparison</h2>
            <p className="chat-intro">
                Compare a round's hole-by-hole scores against your average at that course.
            </p>
            <div className="filter-row">
                <div className="filter-group" style={{ flex: 1 }}>
                    <label>Select Round</label>
                    <select
                        value={selectedRoundIdx}
                        onChange={(e) => setSelectedRoundIdx(Number(e.target.value))}
                        style={{ width: "100%" }}
                    >
                        {roundOptions.map((opt) => (
                            <option key={opt.idx} value={opt.idx}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="comparison-summary">
                <div className="summary-box" style={{ flex: 1 }}>
                    <div className="stat-row">
                        <span className="stat-label">Date</span>
                        <span className="stat-value">{selectedRound.date}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Course</span>
                        <span className="stat-value">{selectedRound.course}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Score</span>
                        <span className="stat-value">{selectedRound.total_score}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">vs Par</span>
                        <span className={`stat-value ${selectedRound.score_vs_par <= 0 ? "good" : "over"}`}>
                            {selectedRound.score_vs_par > 0 ? "+" : ""}{selectedRound.score_vs_par}
                        </span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Weather</span>
                        <span className="stat-value">
                            {selectedRound.temp_f ? `${selectedRound.temp_f}°F` : "—"}
                            {selectedRound.wind_mph ? `, ${selectedRound.wind_mph} mph` : ""}
                            {selectedRound.weather_desc ? `, ${selectedRound.weather_desc}` : ""}
                        </span>
                    </div>
                </div>
                <div className="summary-box" style={{ flex: 1 }}>
                    <div className="stat-row">
                        <span className="stat-label">Holes Better Than Avg</span>
                        <span className="stat-value good">{gains.length}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Holes Worse Than Avg</span>
                        <span className="stat-value over">{losses.length}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Holes At Avg</span>
                        <span className="stat-value">{18 - gains.length - losses.length}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Best Holes</span>
                        <span className="stat-value good">
                            {gains.length > 0 ? gains.map((h) => `H${h}`).join(", ") : "—"}
                        </span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Worst Holes</span>
                        <span className="stat-value over">
                            {losses.length > 0 ? losses.map((h) => `H${h}`).join(", ") : "—"}
                        </span>
                    </div>
                </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="hole" tick={{ fontSize: 11 }} />
                    <YAxis
                        tick={{ fontSize: 11 }}
                        domain={[yMin, yMax]}
                        allowDecimals={false}
                        tickCount={yMax - yMin + 1}
                    />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine y={0} stroke="#666" />
                    <Bar dataKey="This Round" fill="#4a90d9" />
                    <Bar dataKey="Course Avg" fill="#e67e22" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export default RoundComparison;