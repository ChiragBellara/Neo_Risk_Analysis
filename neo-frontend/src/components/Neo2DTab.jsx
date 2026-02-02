import React from "react";
import { Typography } from "@mui/material";

export default function Neo2DTab({ events, loading }) {
    if (loading) return <Typography>Loading…</Typography>;
    return (
        <Typography>
            2D viz tab: {events.length} events (Plotly next).
        </Typography>
    );
}
