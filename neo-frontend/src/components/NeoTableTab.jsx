import React from "react";
import { Box, Link, Chip, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

export default function NeoTableTab({ events, loading }) {
    const columns = [
        {
            field: "name",
            headerName: "Asteroid Name",
            width: 180,
            renderCell: (params) => (
                <Link
                    href={params.row.nasa_jpl_url}
                    target="_blank"
                    rel="noopener"
                >
                    {params.value}
                </Link>
            ),
        },
        {
            field: "is_hazardous",
            headerName: "Hazard",
            width: 110,
            renderCell: (params) => (
                <Chip
                    label={params.value ? "CRITICAL" : "SAFE"}
                    color={params.value ? "error" : "success"}
                    size="small"
                    variant="outlined"
                />
            ),
        },
        {
            field: "risk_score",
            headerName: "Risk Score",
            type: "number",
            width: 120,
            renderCell: (params) => (
                <Box
                    sx={{
                        fontWeight: "bold",
                        color:
                            params.value > 10 ? "error.main" : "text.primary",
                    }}
                >
                    {params.value.toFixed(2)}
                </Box>
            ),
        },
        {
            field: "close_approach_date",
            headerName: "Approach Date",
            width: 130,
        },
        {
            field: "miss_distance_lunar",
            headerName: "Dist. (Lunar)",
            type: "number",
            width: 130,
            valueFormatter: (value) => `${value.toFixed(1)} LD`,
        },
        {
            field: "relative_velocity_km_s",
            headerName: "Velocity (km/s)",
            type: "number",
            width: 140,
            valueFormatter: (value) => value.toFixed(2),
        },
        {
            field: "diameter_mean_km",
            headerName: "Avg Dia (km)",
            type: "number",
            width: 120,
            valueFormatter: (value) => value.toFixed(3),
        },
    ];
    if (loading) return <Typography>Loading…</Typography>;
    console.log(events);
    return (
        <>
            <DataGrid
                rows={events}
                columns={columns}
                getRowId={(row) => row.event_id}
                initialState={{
                    pagination: { paginationModel: { pageSize: 10 } },
                }}
                pageSizeOptions={[10, 25, 50]}
                disableRowSelectionOnClick
                sx={{
                    "& .MuiDataGrid-cell:hover": { color: "primary.main" },
                    backgroundColor: "background.paper",
                    borderRadius: 2,
                    boxShadow: 1,
                }}
            />
        </>
    );
}
