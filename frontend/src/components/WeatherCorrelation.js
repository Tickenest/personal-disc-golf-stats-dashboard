import React from "react";
import { tempColor, windColor, vsParColor } from "../utils/colors";

function WeatherCorrelation({ data }) {
    if (!data) return <div className="card">No weather data available.</div>;

    return (
        <div className="card">
            <h2>Performance by Weather</h2>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Temperature</th>
                        <th>Wind</th>
                        <th>Rounds</th>
                        <th>Avg vs Par</th>
                        <th>Best vs Par</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, idx) => {
                        const tempVal = row.temp_range.includes("<40") ? 35
                            : row.temp_range.includes("40-55") ? 47
                            : row.temp_range.includes("55-70") ? 62
                            : row.temp_range.includes("70-85") ? 77
                            : 90;
                        const windVal = row.wind_range.includes("<5") ? 3
                            : row.wind_range.includes("5-10") ? 7
                            : row.wind_range.includes("10-15") ? 12
                            : 18;
                        return (
                            <tr key={idx}>
                                <td style={tempColor(tempVal)}>{row.temp_range}</td>
                                <td style={windColor(windVal)}>{row.wind_range}</td>
                                <td>{row.rounds}</td>
                                <td style={vsParColor(row.avg_vs_par)}>
                                    +{row.avg_vs_par}
                                </td>
                                <td style={vsParColor(row.best_vs_par)}>
                                    {row.best_vs_par > 0 ? "+" : ""}{row.best_vs_par}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default WeatherCorrelation;