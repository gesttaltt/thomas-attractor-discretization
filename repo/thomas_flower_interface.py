
"""
thomas_flower_interface.py
---------------------------------
Modular interface for ingesting Thomas Flower CSV parameter sets and exporting
configs consumable by a JS/p5 visualization (e.g., jcponce/calculus thomas.js variants).

CSV schema (columns):
- id: unique identifier for the configuration
- description: human-readable description
- b: Thomas attractor damping parameter (>0), typically ~0.19 for chaos
- dt: integration time-step (dimensionless)
- steps: total integration steps
- transient_steps: steps discarded before sampling/rendering
- seed_x, seed_y, seed_z: initial conditions
- projection_plane: 'xy'|'yz'|'zx'
- rotation_axis: 'x'|'y'|'z'
- rotation_angle_rad: rotation in radians applied before projection
- rhodonea_k, rhodonea_m, rhodonea_phi, rhodonea_a: rose curve params for r(θ)=a*cos(k*m*θ + φ)
- E_flower: radial RMS error of fit (nonnegative float)
- lambda_max: largest Lyapunov exponent (nonnegative float)
- FI_reported: optional—precomputed Flower Index
- notes: free text

Outputs:
- JSON config(s) suitable for JS: {id, b, dt, steps, transient, seed, projection, rotation, rhodonea, metrics}
- Enriched CSV: recomputed FI to verify or fill missing

Usage:
    python thomas_flower_interface.py --csv thomas_flower_params.csv \
        --json_out thomas_flower_js_config.json --csv_out thomas_flower_params_enriched.csv
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import math
from dataclasses import dataclass
from typing import Dict, Any, List, Optional

import pandas as pd


def flower_index(E_flower: float, lambda_max: float) -> float:
    """
    Compute Flower Index (FI) = (1 / (1 + E_flower)) * exp(-lambda_max)
    Returns NaN if inputs are invalid.
    """
    try:
        if E_flower is None or lambda_max is None:
            return float("nan")
        if E_flower < 0 or lambda_max < 0:
            return float("nan")
        return (1.0 / (1.0 + E_flower)) * math.exp(-lambda_max)
    except Exception:
        return float("nan")


@dataclass
class ThomasFlowerConfig:
    id: str
    description: str
    b: float
    dt: float
    steps: int
    transient_steps: int
    seed_x: float
    seed_y: float
    seed_z: float
    projection_plane: str
    rotation_axis: str
    rotation_angle_rad: float
    rhodonea_k: float
    rhodonea_m: float
    rhodonea_phi: float
    rhodonea_a: float
    E_flower: Optional[float] = None
    lambda_max: Optional[float] = None
    FI_reported: Optional[float] = None
    notes: str = ""

    @property
    def seed(self):
        return [self.seed_x, self.seed_y, self.seed_z]

    def compute_fi(self) -> float:
        return flower_index(self.E_flower, self.lambda_max)

    def rhodonea_r(self, theta: float) -> float:
        """Return radius r for given angle theta using r(θ) = a * cos(k*m*θ + φ)."""
        return self.rhodonea_a * math.cos(self.rhodonea_k * self.rhodonea_m * theta + self.rhodonea_phi)

    def to_js_config(self) -> Dict[str, Any]:
        """
        Construct a JSON-serializable configuration blob for use in a JS visualizer.
        """
        return {
            "id": self.id,
            "description": self.description,
            "model": {
                "b": self.b,
                "dt": self.dt,
                "steps": self.steps,
                "transient_steps": self.transient_steps,
                "seed": self.seed,
            },
            "projection": {
                "plane": self.projection_plane,
                "rotation": {"axis": self.rotation_axis, "angle_rad": self.rotation_angle_rad},
            },
            "rhodonea": {
                "k": self.rhodonea_k,
                "m": self.rhodonea_m,
                "phi": self.rhodonea_phi,
                "a": self.rhodonea_a,
                "formula": "r(theta) = a * cos(k*m*theta + phi)"
            },
            "metrics": {
                "E_flower": self.E_flower,
                "lambda_max": self.lambda_max,
                "FI_computed": self.compute_fi(),
                "FI_reported": self.FI_reported,
            },
            "notes": self.notes,
        }


def load_configs(csv_path: str) -> List[ThomasFlowerConfig]:
    df = pd.read_csv(csv_path)
    configs: List[ThomasFlowerConfig] = []
    for _, row in df.iterrows():
        cfg = ThomasFlowerConfig(
            id=str(row.get("id")),
            description=str(row.get("description", "")),
            b=float(row.get("b")),
            dt=float(row.get("dt")),
            steps=int(row.get("steps")),
            transient_steps=int(row.get("transient_steps")),
            seed_x=float(row.get("seed_x")),
            seed_y=float(row.get("seed_y")),
            seed_z=float(row.get("seed_z")),
            projection_plane=str(row.get("projection_plane")),
            rotation_axis=str(row.get("rotation_axis")),
            rotation_angle_rad=float(row.get("rotation_angle_rad")),
            rhodonea_k=float(row.get("rhodonea_k")),
            rhodonea_m=float(row.get("rhodonea_m")),
            rhodonea_phi=float(row.get("rhodonea_phi")),
            rhodonea_a=float(row.get("rhodonea_a")),
            E_flower=float(row.get("E_flower")) if not pd.isna(row.get("E_flower")) else None,
            lambda_max=float(row.get("lambda_max")) if not pd.isna(row.get("lambda_max")) else None,
            FI_reported=float(row.get("FI_reported")) if not pd.isna(row.get("FI_reported")) else None,
            notes=str(row.get("notes", "")),
        )
        configs.append(cfg)
    return configs


def export_js_config(configs: List[ThomasFlowerConfig], out_path: str) -> None:
    payload = [cfg.to_js_config() for cfg in configs]
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def enrich_csv_with_fi(csv_in: str, csv_out: str) -> None:
    df = pd.read_csv(csv_in)
    # Recompute FI (vectorized) and add columns
    def _fi(row):
        try:
            E = float(row["E_flower"])
            L = float(row["lambda_max"])
            return flower_index(E, L)
        except Exception:
            return float("nan")

    df["FI_computed"] = df.apply(_fi, axis=1)
    # Consistency check vs FI_reported, if present
    def _delta(row):
        try:
            r = float(row["FI_reported"])
            c = float(row["FI_computed"])
            return abs(r - c)
        except Exception:
            return float("nan")
    df["FI_delta"] = df.apply(_delta, axis=1)
    df.to_csv(csv_out, index=False)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, help="Input CSV of Thomas Flower parameter sets")
    parser.add_argument("--json_out", required=False, help="Output JSON config for JS")
    parser.add_argument("--csv_out", required=False, help="Output enriched CSV with FI_computed and FI_delta")
    args = parser.parse_args()

    configs = load_configs(args.csv)

    if args.csv_out:
        enrich_csv_with_fi(args.csv, args.csv_out)

    if args.json_out:
        export_js_config(configs, args.json_out)


if __name__ == "__main__":
    main()
