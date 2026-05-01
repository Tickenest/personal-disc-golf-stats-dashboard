import React, { useState, useEffect } from "react";
import CourseSummary from "./components/CourseSummary";
import ScoringTrend from "./components/ScoringTrend";
import HoleBreakdown from "./components/HoleBreakdown";
import WeatherCorrelation from "./components/WeatherCorrelation";
import RecentRounds from "./components/RecentRounds";
import ChatBox from "./components/ChatBox";
import config from "./config";
import "./App.css";

function fetchQuery(queryType, params = {}) {
    return fetch(`${config.apiUrl}/query`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
        },
        body: JSON.stringify({ query_type: queryType, params }),
    }).then((res) => res.json());
}

function App() {
    const [data, setData] = useState({
        courseSummary: null,
        scoringTrend: null,
        holeAveragesBrambleton: null,
        holeAveragesFranklin: null,
        weatherCorrelation: null,
        recentRounds: null,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        Promise.all([
            fetchQuery("course_summary"),
            fetchQuery("scoring_trend"),
            fetchQuery("hole_averages", { course: "Brambleton" }),
            fetchQuery("hole_averages", { course: "Franklin Park" }),
            fetchQuery("weather_correlation"),
            fetchQuery("recent_rounds", { limit: 5 }),
        ])
            .then(([
                courseSummary,
                scoringTrend,
                holeAveragesBrambleton,
                holeAveragesFranklin,
                weatherCorrelation,
                recentRounds,
            ]) => {
                setData({
                    courseSummary: courseSummary.data || [],
                    scoringTrend: scoringTrend.data || [],
                    holeAveragesBrambleton: holeAveragesBrambleton.data || [],
                    holeAveragesFranklin: holeAveragesFranklin.data || [],
                    weatherCorrelation: weatherCorrelation.data || [],
                    recentRounds: recentRounds.data || [],
                });
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="app">
                <header className="app-header">
                    <h1>⛳ Disc Golf Stats</h1>
                    <p className="subtitle">Personal performance dashboard</p>
                </header>
                <main className="app-main">
                    <div className="card">Loading dashboard...</div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="app">
                <header className="app-header">
                    <h1>⛳ Disc Golf Stats</h1>
                    <p className="subtitle">Personal performance dashboard</p>
                </header>
                <main className="app-main">
                    <div className="card">Error loading data: {error}</div>
                </main>
            </div>
        );
    }

    return (
        <div className="app">
            <header className="app-header">
                <h1>⛳ Disc Golf Stats</h1>
                <p className="subtitle">Personal performance dashboard</p>
            </header>
            <main className="app-main">
                <CourseSummary data={data.courseSummary} />
                <RecentRounds data={data.recentRounds} />
                <ScoringTrend data={data.scoringTrend} />
                <HoleBreakdown
                    brambleton={data.holeAveragesBrambleton}
                    franklin={data.holeAveragesFranklin}
                />
                <WeatherCorrelation data={data.weatherCorrelation} />
                <ChatBox />
            </main>
        </div>
    );
}

export default App;