import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Tabs,
    Tab,
    Paper,
    Typography,
    TextField,
    Button,
    FormControlLabel,
    Checkbox,
    Stack,
} from "@mui/material";

import NeoTableTab from "./NeoTableTab";
import Neo2DTab from "./Neo2DTab";
import Neo3DTab from "./Neo3DTab";

function isoToday() {
    return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
}

export default function NeoHomePage() {
    const [start, setStart] = useState(isoDaysAgo(6));
    const [end, setEnd] = useState(isoToday());
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [tab, setTab] = useState(0);
    // Shared Filters
    const [query, setQuery] = useState("");
    const [hazOnly, setHazOnly] = useState(false);

    async function fetchEvents() {
        setLoading(true);
        setError("");
        try {
            const resp = await fetch(`/api/neo?start=${start}&end=${end}`);
            const data = await resp.json();
            if (!resp.ok || data.error)
                throw new Error(
                    data.error || `Fetch Failed: HTTP ${resp.status}`,
                );
            setEvents(data.events ?? []);
        } catch (e) {
            setEvents([]);
            setError(e?.message || "Failed to fetch");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchEvents(); // initial load
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredEvents = useMemo(() => {
        let rows = [...events];

        if (hazOnly) rows = rows.filter((r) => r.is_hazardous);
        if (query.trim()) {
            const q = query.toLowerCase();
            rows = rows.filter((r) => {
                const name = String(r.name ?? "").toLowerCase();
                const id = String(r.neo_id ?? "").toLowerCase();
                return name.includes(q) || id.includes(q);
            });
        }
        return rows;
    }, [events, hazOnly, query]);

    const stats = useMemo(() => {
        const total = filteredEvents.length;
        const hazardous = filteredEvents.filter((r) => r.is_hazardous).length;
        return { total, hazardous };
    }, [filteredEvents]);

    return (
        <Box sx={{ maxWidth: 1200, mx: "auto", p: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                NEO Explorer
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                Select a date range → fetch once → explore via table, 2D chart,
                or 3D visualization.
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 3 }}>
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems={{ md: "flex-end" }}
                >
                    <TextField
                        label="Start date"
                        type="date"
                        value={start}
                        onChange={(e) => setStart(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                    />
                    <TextField
                        label="End date"
                        type="date"
                        value={end}
                        onChange={(e) => setEnd(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                    />
                    <Button
                        variant="contained"
                        onClick={fetchEvents}
                        disabled={loading}
                    >
                        {loading ? "Loading..." : "Fetch"}
                    </Button>
                    <TextField
                        label="Search (name or id)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        size="small"
                        sx={{ flex: 1, minWidth: 260 }}
                    />

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={hazOnly}
                                onChange={(e) => setHazOnly(e.target.checked)}
                            />
                        }
                        label="Hazardous only"
                    />
                </Stack>
                <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        Fetched <b>{stats.total}</b> events ({stats.hazardous}{" "}
                        hazardous)
                    </Typography>
                </Box>

                {error && (
                    <Typography
                        variant="body2"
                        sx={{ mt: 1, color: "error.main" }}
                    >
                        {error}
                    </Typography>
                )}
            </Paper>
            <Paper
                variant="outlined"
                sx={{ mt: 2, borderRadius: 3, overflow: "hidden" }}
            >
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    sx={{ borderBottom: 1, borderColor: "divider", px: 1 }}
                    centered
                >
                    <Tab label="Table" />
                    <Tab label="2D Visualization" />
                    <Tab label="Risk Bubble 3D" />
                </Tabs>

                <Box sx={{ p: 2 }}>
                    {tab === 0 && (
                        <NeoTableTab
                            events={filteredEvents}
                            loading={loading}
                        />
                    )}
                    {tab === 1 && (
                        <Neo2DTab events={filteredEvents} loading={loading} />
                    )}

                    {tab === 2 && (
                        <Neo3DTab events={filteredEvents} loading={loading} />
                    )}
                </Box>
            </Paper>
        </Box>
    );
}
