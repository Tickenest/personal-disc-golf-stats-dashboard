import React from "react";

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
                    {data.map((row, idx) => (
                        <tr key={idx}>
                            <td>{row.temp_range}</td>
                            <td>{row.wind_range}</td>
                            <td>{row.rounds}</td>
                            <td className={row.avg_vs_par <= 5 ? "good" : "over"}>
                                +{row.avg_vs_par}
                            </td>
                            <td className={row.best_vs_par <= 0 ? "good" : ""}>
                                {row.best_vs_par > 0 ? "+" : ""}{row.best_vs_par}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default WeatherCorrelation;