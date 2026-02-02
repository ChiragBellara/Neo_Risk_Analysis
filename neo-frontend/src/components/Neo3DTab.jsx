import React from "react";
import { Typography } from "@mui/material";

export default function Neo3DTab({ events, loading }) {
    if (loading) return <Typography>Loading…</Typography>;
    return (
        <Typography>3D viz tab: {events.length} events (R3F next).</Typography>
    );
}
