import React, { useMemo, useState } from "react";
import Plot from "react-plotly.js";
import {
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Switch,
    FormControlLabel,
    Typography,
} from "@mui/material";

function toNum(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
}

function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
}

function bubbleSize(diameterKm) {
    // diameter ranges can vary wildly; map to visually pleasant sizes
    const d = toNum(diameterKm) ?? 0.01;
    const scaled = 6 + Math.log10(1 + d * 1000) * 10; // km -> meters-ish
    return clamp(scaled, 6, 30);
}

export default function Neo2DTab({ events, loading, onPick }) {
    const [xKey, setXKey] = useState("miss_distance_au");
    const [yKey, setYKey] = useState("relative_velocity_km_s");
    const [logX, setLogX] = useState(true);
    const [logY, setLogY] = useState(false);

    const axisOptions = [
        { key: "miss_distance_au", label: "Miss Distance (AU)" },
        { key: "miss_distance_km", label: "Miss Distance (km)" },
        { key: "miss_distance_lunar", label: "Miss Distance (lunar)" },
        { key: "relative_velocity_km_s", label: "Velocity (km/s)" },
        { key: "risk_score", label: "Risk Score" },
        { key: "diameter_mean_km", label: "Diameter (km)" },
    ];

    const { xSafe, ySafe, bubble, hoverText, customdata, color } =
        useMemo(() => {
            const xs = [];
            const ys = [];
            const sizes = [];
            const texts = [];
            const custom = [];
            const colors = [];

            for (const e of events ?? []) {
                const xv = toNum(e?.[xKey]);
                const yv = toNum(e?.[yKey]);

                // log axes can't show <= 0
                if (xv === null || yv === null) continue;
                if (logX && xv <= 0) continue;
                if (logY && yv <= 0) continue;

                xs.push(xv);
                ys.push(yv);
                sizes.push(bubbleSize(e.diameter_mean_km));

                colors.push(e.is_hazardous ? 1 : 0);

                texts.push(
                    `${e.name}<br>` +
                        `Date: ${e.close_approach_date}<br>` +
                        `Miss: ${toNum(e.miss_distance_au)?.toFixed(4) ?? "—"} AU<br>` +
                        `Vel: ${toNum(e.relative_velocity_km_s)?.toFixed(2) ?? "—"} km/s<br>` +
                        `Diameter: ${toNum(e.diameter_mean_km)?.toFixed(4) ?? "—"} km<br>` +
                        `Risk: ${toNum(e.risk_score)?.toFixed(3) ?? "—"}`,
                );

                custom.push(e);
            }

            return {
                xSafe: xs,
                ySafe: ys,
                bubble: sizes,
                hoverText: texts,
                customdata: custom,
                color: colors,
            };
        }, [events, xKey, yKey, logX, logY]);

    const xLabel = axisOptions.find((o) => o.key === xKey)?.label ?? xKey;
    const yLabel = axisOptions.find((o) => o.key === yKey)?.label ?? yKey;

    if (loading) {
        return <Typography>Loading…</Typography>;
    }

    if (!events || events.length === 0) {
        return <Typography>No data for this range.</Typography>;
    }

    return (
        <Box>
            {/* Controls */}
            <Box
                sx={{
                    display: "flex",
                    gap: 2,
                    flexWrap: "wrap",
                    alignItems: "center",
                    mb: 2,
                }}
            >
                <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>X Axis</InputLabel>
                    <Select
                        value={xKey}
                        label="X Axis"
                        onChange={(e) => setXKey(e.target.value)}
                    >
                        {axisOptions.map((o) => (
                            <MenuItem key={o.key} value={o.key}>
                                {o.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>Y Axis</InputLabel>
                    <Select
                        value={yKey}
                        label="Y Axis"
                        onChange={(e) => setYKey(e.target.value)}
                    >
                        {axisOptions.map((o) => (
                            <MenuItem key={o.key} value={o.key}>
                                {o.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControlLabel
                    control={
                        <Switch
                            checked={logX}
                            onChange={(e) => setLogX(e.target.checked)}
                        />
                    }
                    label="Log X"
                />
                <FormControlLabel
                    control={
                        <Switch
                            checked={logY}
                            onChange={(e) => setLogY(e.target.checked)}
                        />
                    }
                    label="Log Y"
                />

                <Typography variant="caption" sx={{ opacity: 0.75 }}>
                    Tip: drag to zoom, double-click to reset, click a point to
                    select.
                </Typography>
            </Box>

            {/* Plot */}
            <Box
                sx={{
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 3,
                    overflow: "hidden",
                }}
            >
                <Plot
                    data={[
                        {
                            type: "scattergl",
                            mode: "markers",
                            x: xSafe,
                            y: ySafe,
                            text: hoverText,
                            hoverinfo: "text",
                            customdata,
                            marker: {
                                size: bubble,
                                opacity: 0.85,
                                color,
                                colorscale: [
                                    [0, "rgba(70,130,180,0.85)"], // non-hazardous
                                    [1, "rgba(255,80,80,0.9)"], // hazardous
                                ],
                            },
                        },
                    ]}
                    layout={{
                        height: 540,
                        margin: { l: 70, r: 20, t: 40, b: 60 },
                        title: "NEO Close Approaches (Interactive)",
                        xaxis: { title: xLabel, type: logX ? "log" : "linear" },
                        yaxis: { title: yLabel, type: logY ? "log" : "linear" },
                        hovermode: "closest",
                        legend: { orientation: "h" },
                    }}
                    config={{
                        displayModeBar: true,
                        responsive: true,
                    }}
                    style={{ width: "100%" }}
                    onClick={(ev) => {
                        const pt = ev?.points?.[0];
                        const picked = pt?.customdata;
                        if (picked && onPick) onPick(picked);
                    }}
                />
            </Box>
        </Box>
    );
}
