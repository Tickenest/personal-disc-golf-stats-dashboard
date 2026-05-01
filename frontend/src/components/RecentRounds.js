import React from "react";
import { scoreColor, tempColor, windColor, weatherColor } from "../utils/colors";

function RecentRounds({ data }) {
    if (!data) return <div className="card">No recent rounds available.</div>;

    return (
        <div className="card">
            <h2>Recent Rounds</h2>
            <table className="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Course</th>
                        <th>Score</th>
                        <th>vs Par</th>
                        <th>Temp</th>
                        <th>Wind</th>
                        <th>Weather</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((round, idx) => (
                        <tr key={idx}>
                            <td>{round.date}</td>
                            <td>{round.course}</td>
                            <td style={scoreColor(round.total_score, round.total_par)}>
                                {round.total_score}
                            </td>
                            <td
                                style={scoreColor(round.total_score, round.total_par)}
                                className={round.score_vs_par <= 0 ? "good" : "over"}
                            >
                                {round.score_vs_par > 0 ? "+" : ""}{round.score_vs_par}
                            </td>
                            <td style={tempColor(round.temp_f)}>
                                {round.temp_f ? `${round.temp_f}°F` : "—"}
                            </td>
                            <td style={windColor(round.wind_mph)}>
                                {round.wind_mph ? `${round.wind_mph} mph` : "—"}
                            </td>
                            <td style={{ ...weatherColor(round.weather_desc), whiteSpace: "nowrap" }}>
                                {round.weather_desc || "—"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default RecentRounds;