import React, { useMemo, useState } from "react";
import { Box, Typography, FormControlLabel, Switch } from "@mui/material";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import * as THREE from "three";

function toNum(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
}

function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
}

// Deterministic hash -> [0,1)
function hash01(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    // Convert uint32 to [0,1)
    return (h >>> 0) / 4294967295;
}

// Spherical -> Cartesian
function toCartesian(r, theta, phi) {
    // theta: 0..2pi, phi: 0..pi
    const sinPhi = Math.sin(phi);
    return new THREE.Vector3(
        r * sinPhi * Math.cos(theta),
        r * Math.cos(phi),
        r * sinPhi * Math.sin(theta),
    );
}

// Map miss distance (AU) to scene radius
function radiusFromMissAU(missAu, earthRadius = 1) {
    // Keep it visually pleasing. Clamp huge distances.
    const au = clamp(missAu ?? 0.05, 0.003, 2.0);

    // Nonlinear mapping so near objects don't all sit on the same ring
    const scaled = Math.log10(1 + au * 60); // ~0..2-ish
    return earthRadius * (2.2 + scaled * 4.2); // ~2.2..~11
}

// Map risk score to bubble size
function sizeFromRisk(risk) {
    const r = clamp(risk ?? 0, 0, 15);
    // Smooth growth, with minimum size
    return clamp(0.1 + r * 0.06, 0.1, 0.55);
}

function Bubble({ event, earthRadius, onPick, showOrbits }) {
    const [hovered, setHovered] = useState(false);

    const pos = useMemo(() => {
        const id = String(event.event_id ?? event.neo_id ?? event.name ?? "");
        const a = hash01(id + "_a");
        const b = hash01(id + "_b");
        const theta = a * Math.PI * 2;
        const phi = Math.acos(2 * b - 1); // uniform over sphere
        const missAu = toNum(event.miss_distance_au);
        const r = radiusFromMissAU(missAu, earthRadius);
        return toCartesian(r, theta, phi);
    }, [event, earthRadius]);

    const bubbleSize = useMemo(
        () => sizeFromRisk(toNum(event.risk_score)),
        [event],
    );

    const color = event.is_hazardous
        ? new THREE.Color("rgba(255,80,80,1)")
        : new THREE.Color("rgba(70,130,180,1)");

    const orbitColor = event.is_hazardous
        ? new THREE.Color("#b11226")
        : new THREE.Color("#1f4ed8");

    // Optional orbit ring (same radius, centered at origin, oriented randomly)
    const ring = useMemo(() => {
        if (!showOrbits) return null;
        const id = String(event.event_id ?? "");
        const a = hash01(id + "_r1");
        const b = hash01(id + "_r2");
        const theta = a * Math.PI * 2;
        const phi = b * Math.PI;

        const missAu = toNum(event.miss_distance_au);
        const r = radiusFromMissAU(missAu, earthRadius);

        // Create ring in XY plane then rotate
        const geom = new THREE.RingGeometry(r - 0.01, r + 0.01, 128);
        const mat = new THREE.MeshStandardMaterial({
            color: orbitColor,
            transparent: true,
            opacity: 0.22,
            emissive: orbitColor,
            emissiveIntensity: 0.35,
            side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geom, mat);
        mesh.rotation.set(phi, theta, 0);
        return mesh;
    }, [showOrbits, event, earthRadius]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <group>
            {showOrbits && ring && <primitive object={ring} />}

            <mesh
                position={pos}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHovered(true);
                    document.body.style.cursor = "pointer";
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    setHovered(false);
                    document.body.style.cursor = "default";
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (onPick) onPick(event);
                }}
            >
                <sphereGeometry args={[bubbleSize, 18, 18]} />
                <meshStandardMaterial
                    color={color}
                    transparent
                    opacity={hovered ? 0.95 : 0.75}
                    emissive={color}
                    emissiveIntensity={hovered ? 0.55 : 0.25}
                />
                {hovered && (
                    <Html distanceFactor={10}>
                        <div
                            style={{
                                background: "rgba(0,0,0,0.75)",
                                color: "white",
                                padding: "8px 10px",
                                borderRadius: 10,
                                fontSize: 12,
                                width: 240,
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: 4 }}>
                                {event.name}
                            </div>
                            <div>
                                Close approach: {event.close_approach_date}
                            </div>
                            <div>
                                Miss:{" "}
                                {toNum(event.miss_distance_au)?.toFixed(4) ??
                                    "—"}{" "}
                                AU
                            </div>
                            <div>
                                Vel:{" "}
                                {toNum(event.relative_velocity_km_s)?.toFixed(
                                    2,
                                ) ?? "—"}{" "}
                                km/s
                            </div>
                            <div>
                                Risk:{" "}
                                {toNum(event.risk_score)?.toFixed(3) ?? "—"}
                            </div>
                            <div style={{ opacity: 0.8, marginTop: 6 }}>
                                Click for details
                            </div>
                        </div>
                    </Html>
                )}
            </mesh>
        </group>
    );
}

function Earth({ radius = 1 }) {
    return (
        <mesh>
            <sphereGeometry args={[radius, 48, 48]} />
            <meshStandardMaterial
                color={"#1e3a8a"} // darker blue
                roughness={0.9}
                metalness={0.05}
                emissive={"#081a3a"}
                emissiveIntensity={0.25}
            />
        </mesh>
    );
}

export default function Neo3DTab({ events, loading, onPick }) {
    const [showOrbits, setShowOrbits] = useState(false);

    const earthRadius = 1;

    const cleaned = useMemo(() => {
        // Filter out events missing key values (optional)
        return (events ?? []).filter((e) => toNum(e.miss_distance_au) !== null);
    }, [events]);

    if (loading) return <Typography>Loading…</Typography>;
    if (!events || events.length === 0)
        return <Typography>No data for this range.</Typography>;

    return (
        <Box>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                }}
            >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Risk Bubble 3D
                </Typography>

                <FormControlLabel
                    control={
                        <Switch
                            checked={showOrbits}
                            onChange={(e) => setShowOrbits(e.target.checked)}
                        />
                    }
                    label="Show orbit rings"
                />
            </Box>

            <Box
                sx={{
                    height: 600,
                    borderRadius: 3,
                    overflow: "hidden",
                    border: "1px solid rgba(0,0,0,0.12)",
                }}
            >
                <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
                    <ambientLight intensity={0.55} />
                    <directionalLight position={[5, 5, 5]} intensity={1.0} />
                    <Stars
                        radius={80}
                        depth={50}
                        count={1500}
                        factor={4}
                        fade
                    />

                    <Earth radius={earthRadius} />

                    {/* Bubbles */}
                    {cleaned.map((e) => (
                        <Bubble
                            key={e.event_id}
                            event={e}
                            earthRadius={earthRadius}
                            onPick={onPick}
                            showOrbits={showOrbits}
                        />
                    ))}

                    <OrbitControls
                        enablePan={false}
                        enableDamping
                        dampingFactor={0.08}
                    />
                </Canvas>
            </Box>

            <Typography
                variant="caption"
                sx={{ opacity: 0.75, mt: 1, display: "block" }}
            >
                Tip: drag to rotate, scroll to zoom, hover for tooltip, click a
                bubble for details.
            </Typography>
        </Box>
    );
}
