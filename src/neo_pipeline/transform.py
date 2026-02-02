import json
import math
import pandas as pd
from typing import List, Dict, Any
from dataclasses import dataclass

from neo_pipeline import config
import neo_pipeline.utils.utils as utils
import neo_pipeline.logging as logging

logger = logging.setup_logger('transform_pipeline')


@dataclass
class TransformOutputs:
    neos: pd.DataFrame
    close_approaches: pd.DataFrame


class Transformer:
    def __init__(self) -> None:
        self.in_dir = config.RAW_DIR
        utils.ensure_dir(config.SILVER_DIR)

    def _parse_json_feed(self, feed: Dict[str, Any]) -> TransformOutputs | None:
        neos_rows: List[Dict[str, Any]] = []
        close_approache_rows: List[Dict[str, Any]] = []

        neos_by_day = feed.get('near_earth_objects', {})
        for day, neos in neos_by_day.items():
            for neo_data in neos:
                neo_id = str(neo_data.get('id'))

                km = (neo_data.get("estimated_diameter")
                      or {}).get("kilometers") or {}
                dmin = utils._safe_float(km.get("estimated_diameter_min"))
                dmax = utils._safe_float(km.get("estimated_diameter_max"))
                dmean = None
                if dmin is not None and dmax is not None:
                    dmean = 0.5 * (dmin + dmax)

                neos_rows.append(
                    {
                        "neo_id": neo_id,
                        "name": neo_data.get("name"),
                        "absolute_magnitude_h": utils._safe_float(neo_data.get("absolute_magnitude_h")),
                        "is_potentially_hazardous_asteroid": bool(
                            neo_data.get(
                                "is_potentially_hazardous_asteroid", False)
                        ),
                        "is_sentry_object": bool(neo_data.get("is_sentry_object", False)),
                        "nasa_jpl_url": neo_data.get("nasa_jpl_url"),
                        "diameter_min_km": dmin,
                        "diameter_max_km": dmax,
                        "diameter_mean_km": dmean,
                    }
                )

                for ca in neo_data.get("close_approach_data", []) or []:
                    rv = (ca.get("relative_velocity") or {}).get(
                        "kilometers_per_second")
                    md = (ca.get("miss_distance") or {}).get("kilometers")

                    close_approache_rows.append(
                        {
                            "neo_id": neo_id,
                            "feed_date": day,  # the key date in the feed
                            "close_approach_date": ca.get("close_approach_date"),
                            "close_approach_date_full": ca.get("close_approach_date_full"),
                            "epoch_date_close_approach": ca.get("epoch_date_close_approach"),
                            "orbiting_body": ca.get("orbiting_body"),
                            "relative_velocity_km_s": utils._safe_float(rv),
                            "miss_distance_km": utils._safe_float(md),
                            "miss_distance_lunar": utils._safe_float(
                                (ca.get("miss_distance") or {}).get("lunar")
                            ),
                            "miss_distance_au": utils._safe_float(
                                (ca.get("miss_distance") or {}).get(
                                    "astronomical")
                            ),
                        }
                    )

            neos_df = pd.DataFrame(neos_rows).drop_duplicates(
                subset=["neo_id"], keep="last")
            ca_df = pd.DataFrame(close_approache_rows)

            if not neos_df.empty:
                pass

            if not ca_df.empty:
                ca_df["feed_date"] = pd.to_datetime(
                    ca_df["feed_date"], errors="coerce").dt.date
                ca_df["close_approach_date"] = pd.to_datetime(
                    ca_df["close_approach_date"], errors="coerce"
                ).dt.date

            logger.info(
                f"Read {neos_df.shape} Neos and {ca_df.shape} Close Approaches entries")
            return TransformOutputs(neos=neos_df, close_approaches=ca_df)

    def _transform(self, start_date):
        json_files = sorted(self.in_dir.glob("*.json"))
        if not json_files:
            logger.error(f"No JSON files found in {self.in_dir}")
            return

        logger.info(f"Read {len(json_files)} JSON files.")
        all_neos = []
        all_close_approaches = []

        all_feed = []
        for fp in json_files:
            feed = json.loads(fp.read_text(encoding='utf-8'))
            # out = self._parse_json_feed(feed)
            out = self._flatten_json_feed(feed, start_date)
            all_feed.extend(out)

        logger.info(f"Completed reading the Neos and Close Approaches")
        # neos_dataframe = pd.concat(all_neos, ignore_index=True).drop_duplicates(
        #     subset=["neo_id"], keep="last")
        # closed_approached_dataframe = pd.concat(
        #     all_close_approaches, ignore_index=True)

        # neos_dataframe.to_parquet(
        #     config.SILVER_DIR / "neos.parquet", index=False)
        # closed_approached_dataframe.to_parquet(
        #     config.SILVER_DIR / "close_approaches.parquet", index=False)
        return all_feed

    def _flatten_json_feed(self, feed: Dict[str, Any], start_date) -> List[Dict[str, Any]]:
        """
        Return event rows the 3D viz can render.
        One row per close approach event.
        """
        out: List[Dict[str, Any]] = []

        by_day = feed.get("near_earth_objects", {})
        for _, neos in by_day.items():
            for neo in neos:
                neo_id = str(neo.get("id"))
                name = neo.get("name")
                jpl = neo.get("nasa_jpl_url")
                hazardous = bool(
                    neo.get("is_potentially_hazardous_asteroid", False))
                sentry = bool(neo.get("is_sentry_object", False))

                km = (neo.get("estimated_diameter")
                      or {}).get("kilometers") or {}
                dmin = utils._safe_float(km.get("estimated_diameter_min"))
                dmax = utils._safe_float(km.get("estimated_diameter_max"))
                dmean = (0.5 * (dmin + dmax)
                         ) if (dmin is not None and dmax is not None) else None

                for ca in neo.get("close_approach_data", []) or []:
                    if ca.get("close_approach_date") >= start_date:
                        miss_km = utils._safe_float(
                            (ca.get("miss_distance") or {}).get("kilometers"))
                        vel_kms = utils._safe_float(
                            (ca.get("relative_velocity") or {}).get("kilometers_per_second"))

                        # Simple risk score (optional)
                        risk_score = None
                        if miss_km and vel_kms is not None:
                            risk_score = (
                                math.log1p(1e8 / miss_km)
                                + 1.2 * math.log1p((dmean or 0) * 1e3)
                                + 0.8 * math.log1p(vel_kms)
                                + (0.75 if hazardous else 0.0)
                            )

                        epoch = ca.get("epoch_date_close_approach")
                        out.append(
                            {
                                "event_id": f"{neo_id}_{epoch or ca.get('close_approach_date')}",
                                "neo_id": neo_id,
                                "name": name,
                                "nasa_jpl_url": jpl,
                                "is_hazardous": hazardous,
                                "is_sentry_object": sentry,
                                "diameter_mean_km": dmean,
                                "close_approach_date": ca.get("close_approach_date"),
                                "close_approach_date_full": ca.get("close_approach_date_full"),
                                "epoch_date_close_approach": epoch,
                                "orbiting_body": ca.get("orbiting_body"),
                                "relative_velocity_km_s": vel_kms,
                                "miss_distance_km": miss_km,
                                "miss_distance_lunar": utils._safe_float((ca.get("miss_distance") or {}).get("lunar")),
                                "miss_distance_au": utils._safe_float((ca.get("miss_distance") or {}).get("astronomical")),
                                "risk_score": risk_score,
                            }
                        )

        return out
