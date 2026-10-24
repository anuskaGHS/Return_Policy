import math
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from app.models.explainer import AttributionInput, AttributionResult, SectorEffect

WEIGHT_TOLERANCE_PTS = 1.0
DRIVER_MIN_PTS = 0.5
MAX_DRIVERS = 3


def _round_1dp(x: float) -> float:
    d = Decimal(str(round(x, 9))).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
    val = float(d)
    return 0.0 if val == 0.0 else val


def _is_finite_number(val: Any) -> bool:
    if isinstance(val, bool) or not isinstance(val, (int, float)):
        return False
    return math.isfinite(val)


def calculate_attribution(data: AttributionInput) -> AttributionResult:
    # 1. fund or benchmark return not a finite number
    if not _is_finite_number(data.fund_return_pct) or not _is_finite_number(data.benchmark_return_pct):
        raise ValueError("Returns must be valid numbers.")

    # Any non-finite number inside the weights or sector_returns dicts
    if (
        any(not _is_finite_number(v) for v in data.fund_weights.values())
        or any(not _is_finite_number(v) for v in data.benchmark_weights.values())
        or any(not _is_finite_number(v) for v in data.sector_returns.values())
    ):
        raise ValueError("Returns must be valid numbers.")

    # 2. fund or benchmark return below -100
    if data.fund_return_pct < -100.0 or data.benchmark_return_pct < -100.0:
        raise ValueError("A return cannot be below -100%.")

    # 3. fund_weights or benchmark_weights empty
    if not data.fund_weights or not data.benchmark_weights:
        raise ValueError("Add the sector weights for the fund and its benchmark.")

    # 4. any weight below 0 or above 100 (either side)
    if any(w < 0.0 or w > 100.0 for w in data.fund_weights.values()) or any(
        w < 0.0 or w > 100.0 for w in data.benchmark_weights.values()
    ):
        raise ValueError("Sector weights must be between 0 and 100.")

    # 5. fund weights sum outside 100 +/- WEIGHT_TOLERANCE_PTS
    fund_sum = sum(data.fund_weights.values())
    if abs(fund_sum - 100.0) > WEIGHT_TOLERANCE_PTS + 1e-9:
        raise ValueError("The fund's sector weights should add up to about 100%.")

    # (then the same check for the benchmark)
    bm_sum = sum(data.benchmark_weights.values())
    if abs(bm_sum - 100.0) > WEIGHT_TOLERANCE_PTS + 1e-9:
        raise ValueError("The benchmark's sector weights should add up to about 100%.")

    # 6. a sector that has non-zero weight on either side but is missing from sector_returns
    active_sectors = {s for s, w in data.fund_weights.items() if w != 0.0} | {
        s for s, w in data.benchmark_weights.items() if w != 0.0
    }
    missing_returns = sorted(s for s in active_sectors if s not in data.sector_returns)
    if missing_returns:
        raise ValueError(f"Missing sector return for: {', '.join(missing_returns)}")

    sector_records = []
    for sector in active_sectors:
        fund_w = data.fund_weights.get(sector, 0.0)
        bm_w = data.benchmark_weights.get(sector, 0.0)
        sec_ret = data.sector_returns[sector]

        active_w = fund_w - bm_w
        rel_ret = sec_ret - data.benchmark_return_pct
        effect = (active_w / 100.0) * rel_ret

        sector_records.append({
            "sector": sector,
            "fund_weight": fund_w,
            "benchmark_weight": bm_w,
            "active_weight": active_w,
            "sector_return": sec_ret,
            "relative_return": rel_ret,
            "unrounded_effect": effect,
        })

    # Sectors sorted by absolute UNROUNDED effect, largest first; ties broken by sector name A to Z.
    sector_records.sort(key=lambda x: (-abs(x["unrounded_effect"]), x["sector"]))

    unrounded_gap = data.fund_return_pct - data.benchmark_return_pct
    unrounded_explained = sum(x["unrounded_effect"] for x in sector_records)
    unrounded_unexplained = unrounded_gap - unrounded_explained

    top_drivers: list[str] = []
    if unrounded_gap != 0.0:
        for x in sector_records:
            eff = x["unrounded_effect"]
            if ((eff > 0 and unrounded_gap > 0) or (eff < 0 and unrounded_gap < 0)) and abs(eff) >= DRIVER_MIN_PTS:
                top_drivers.append(x["sector"])
                if len(top_drivers) == MAX_DRIVERS:
                    break

    sectors = [
        SectorEffect(
            sector=x["sector"],
            fund_weight_pct=_round_1dp(x["fund_weight"]),
            benchmark_weight_pct=_round_1dp(x["benchmark_weight"]),
            active_weight_pct=_round_1dp(x["active_weight"]),
            sector_return_pct=_round_1dp(x["sector_return"]),
            relative_return_pct=_round_1dp(x["relative_return"]),
            effect_pts=_round_1dp(x["unrounded_effect"]),
        )
        for x in sector_records
    ]

    return AttributionResult(
        fund_return_pct=_round_1dp(data.fund_return_pct),
        benchmark_return_pct=_round_1dp(data.benchmark_return_pct),
        gap_pts=_round_1dp(unrounded_gap),
        explained_pts=_round_1dp(unrounded_explained),
        unexplained_pts=_round_1dp(unrounded_unexplained),
        sectors=sectors,
        top_drivers=top_drivers,
    )
