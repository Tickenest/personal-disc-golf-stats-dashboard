import React from "react";

function CourseSummary({ data }) {
    if (!data) return <div className="card">No course data available.</div>;

    return (
        <div className="card">
            <h2>Course Summary</h2>
            <div className="summary-grid">
                {data.map((course, idx) => (
                    <div key={idx} className="summary-box">
                        <h3>{course.course}</h3>
                        <div className="stat-row">
                            <span className="stat-label">Rounds Played</span>
                            <span className="stat-value">{course.rounds_played}</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Best Score</span>
                            <span className="stat-value good">{course.best_score}</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Avg Score</span>
                            <span className="stat-value">{course.avg_score}</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Best vs Par</span>
                            <span className="stat-value good">
                                {course.best_vs_par > 0 ? "+" : ""}{course.best_vs_par}
                            </span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Avg vs Par</span>
                            <span className="stat-value">
                                +{course.avg_vs_par}
                            </span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">First Round</span>
                            <span className="stat-value">{course.first_round}</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Last Round</span>
                            <span className="stat-value">{course.last_round}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default CourseSummary;