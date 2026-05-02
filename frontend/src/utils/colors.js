export function scoreColor(score, par) {
    if (score === null || score === undefined || par === null) return {};
    const diff = score - par;
    if (diff < 0) return { backgroundColor: "#d4edda", color: "#1a1a1a" };
    if (diff === 0) return { backgroundColor: "#fff3cd", color: "#1a1a1a" };
    if (diff === 1) return { backgroundColor: "#fde8e8", color: "#1a1a1a" };
    return { backgroundColor: "#f5c6cb", color: "#1a1a1a" };
}

export function tempColor(temp) {
    if (temp === null || temp === undefined) return {};
    if (temp < 40) return { backgroundColor: "#cce5ff", color: "#1a1a1a" };
    if (temp < 55) return { backgroundColor: "#d4edda", color: "#1a1a1a" };
    if (temp < 70) return { backgroundColor: "#fff3cd", color: "#1a1a1a" };
    if (temp < 85) return { backgroundColor: "#fde8e8", color: "#1a1a1a" };
    return { backgroundColor: "#f5c6cb", color: "#1a1a1a" };
}

export function windColor(wind) {
    if (wind === null || wind === undefined) return {};
    if (wind < 5) return { backgroundColor: "#d4edda", color: "#1a1a1a" };
    if (wind < 10) return { backgroundColor: "#fff3cd", color: "#1a1a1a" };
    if (wind < 15) return { backgroundColor: "#fde8e8", color: "#1a1a1a" };
    return { backgroundColor: "#f5c6cb", color: "#1a1a1a" };
}

export function weatherColor(desc) {
    if (!desc) return {};
    const lower = desc.toLowerCase();
    if (lower.includes("clear") || lower.includes("mainly clear"))
        return { backgroundColor: "#fff3cd", color: "#1a1a1a" };
    if (lower.includes("cloudy") || lower.includes("overcast"))
        return { backgroundColor: "#e2e3e5", color: "#1a1a1a" };
    if (lower.includes("rain") || lower.includes("drizzle") || lower.includes("shower"))
        return { backgroundColor: "#cce5ff", color: "#1a1a1a" };
    if (lower.includes("snow"))
        return { backgroundColor: "#d4edda", color: "#1a1a1a" };
    if (lower.includes("thunder"))
        return { backgroundColor: "#f5c6cb", color: "#1a1a1a" };
    if (lower.includes("fog"))
        return { backgroundColor: "#e2e3e5", color: "#1a1a1a" };
    return {};
}

export function vsParColor(value) {
    if (value === null || value === undefined) return {};
    if (value < 0) return { backgroundColor: "#d4edda", color: "#1a1a1a" };
    if (value === 0) return { backgroundColor: "#fff3cd", color: "#1a1a1a" };
    if (value <= 3) return { backgroundColor: "#fde8e8", color: "#1a1a1a" };
    return { backgroundColor: "#f5c6cb", color: "#1a1a1a" };
}