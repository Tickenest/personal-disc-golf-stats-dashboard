import React, { useState, useMemo } from "react";
import { scoreColor, tempColor, windColor, weatherColor } from "../utils/colors";

const HOLES = Array.from({ length: 18 }, (_, i) => i + 1);

const MONTHS = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
];

function RoundViewer({ data }) {
    const [courseFilter, setCourseFilter] = useState("all");
    const [yearFilter, setYearFilter] = useState("all");
    const [monthFilter, setMonthFilter] = useState("all");
    const [sortCol, setSortCol] = useState("date");
    const [sortDir, setSortDir] = useState("desc");

    const years = useMemo(() => {
        if (!data) return [];
        const unique = [...new Set(data.map((r) => r.date.substring(0, 4)))];
        return unique.sort().reverse();
    }, [data]);

    const filtered = useMemo(() => {
        if (!data) return [];
        return data.filter((r) => {
            const [year, month] = r.date.split("-");
            if (courseFilter !== "all" && r.course !== courseFilter) return false;
            if (yearFilter !== "all" && year !== yearFilter) return false;
            if (monthFilter !== "all" && String(parseInt(month)) !== monthFilter) return false;
            return true;
        });
    }, [data, courseFilter, yearFilter, monthFilter]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            let aVal = a[sortCol];
            let bVal = b[sortCol];
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            if (typeof aVal === "string") {
                return sortDir === "asc"
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }
            return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        });
    }, [filtered, sortCol, sortDir]);

    if (!data) return <div className="card">No rounds data available.</div>;

    function handleSort(col) {
        if (sortCol === col) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortCol(col);
            setSortDir("asc");
        }
    }

    function SortArrow({ col }) {
        if (sortCol !== col) return <span style={{ color: "#ccc" }}> ↕</span>;
        return <span> {sortDir === "asc" ? "↑" : "↓"}</span>;
    }

    function th(label, col) {
        return (
            <th
                onClick={() => handleSort(col)}
                style={{ cursor: "pointer", whiteSpace: "nowrap" }}
            >
                {label}<SortArrow col={col} />
            </th>
        );
    }

    return (
        <div className="card">
            <h2>All Rounds ({sorted.length})</h2>
            <div className="filter-row">
                <div className="filter-group">
                    <label>Course</label>
                    <select
                        value={courseFilter}
                        onChange={(e) => setCourseFilter(e.target.value)}
                    >
                        <option value="all">All Courses</option>
                        <option value="Brambleton">Brambleton</option>
                        <option value="Franklin Park">Franklin Park</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>Year</label>
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                    >
                        <option value="all">All Years</option>
                        {years.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Month</label>
                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                    >
                        <option value="all">All Months</option>
                        {MONTHS.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>
                <button
                    className="reset-button"
                    onClick={() => {
                        setCourseFilter("all");
                        setYearFilter("all");
                        setMonthFilter("all");
                    }}
                >
                    Reset
                </button>
            </div>
            <div className="table-scroll">
                <table className="data-table rounds-table">
                    <thead>
                        <tr>
                            {th("Date", "date")}
                            {th("Course", "course")}
                            {th("Score", "total_score")}
                            {th("Par", "total_par")}
                            {th("vs Par", "score_vs_par")}
                            {th("Front", "front_score")}
                            {th("F Par", "front_par")}
                            {th("F vs Par", "front_vs_par")}
                            {th("Back", "back_score")}
                            {th("B Par", "back_par")}
                            {th("B vs Par", "back_vs_par")}
                            {HOLES.map((h) => th(`H${h}`, `hole_${h}_score`))}
                            {th("Temp", "temp_f")}
                            {th("Wind", "wind_mph")}
                            <th>Weather</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((row, idx) => (
                            <tr key={idx}>
                                <td style={{ whiteSpace: "nowrap" }}>{row.date}</td>
                                <td style={{ whiteSpace: "nowrap" }}>{row.course}</td>
                                <td style={scoreColor(row.total_score, row.total_par)}>
                                    {row.total_score}
                                </td>
                                <td>{row.total_par}</td>
                                <td
                                    style={scoreColor(row.total_score, row.total_par)}
                                    className={row.score_vs_par <= 0 ? "good" : "over"}
                                >
                                    {row.score_vs_par > 0 ? "+" : ""}{row.score_vs_par}
                                </td>
                                <td style={scoreColor(row.front_score, row.front_par)}>
                                    {row.front_score}
                                </td>
                                <td>{row.front_par}</td>
                                <td
                                    style={scoreColor(row.front_score, row.front_par)}
                                    className={row.front_vs_par <= 0 ? "good" : "over"}
                                >
                                    {row.front_vs_par > 0 ? "+" : ""}{row.front_vs_par}
                                </td>
                                <td style={scoreColor(row.back_score, row.back_par)}>
                                    {row.back_score}
                                </td>
                                <td>{row.back_par}</td>
                                <td
                                    style={scoreColor(row.back_score, row.back_par)}
                                    className={row.back_vs_par <= 0 ? "good" : "over"}
                                >
                                    {row.back_vs_par > 0 ? "+" : ""}{row.back_vs_par}
                                </td>
                                {HOLES.map((h) => {
                                    const score = row[`hole_${h}_score`];
                                    const par = row[`hole_${h}_par`] ?? null;
                                    return (
                                        <td key={h} style={scoreColor(score, par)}>
                                            {score ?? "—"}
                                        </td>
                                    );
                                })}
                                <td style={tempColor(row.temp_f)}>
                                    {row.temp_f ? `${row.temp_f}°F` : "—"}
                                </td>
                                <td style={windColor(row.wind_mph)}>
                                    {row.wind_mph ? `${row.wind_mph} mph` : "—"}
                                </td>
                                <td style={{ ...weatherColor(row.weather_desc), whiteSpace: "nowrap" }}>
                                    {row.weather_desc || "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default RoundViewer;