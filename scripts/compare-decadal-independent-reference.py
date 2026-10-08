"""Compare frozen synthetic output with a pinned independent offline engine.

Usage: python3 scripts/compare-decadal-independent-reference.py /path/to/lasotuvi
The checkout must be doanguyen/lasotuvi at the pinned revision, without changes.
No installation, network, customer data, or production integration is involved.
"""

import csv
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys


REFERENCE_COMMIT = "ace8379a3ea033674e8a9096f5b98a9e2041eace"
ROOT = Path(__file__).resolve().parents[1]
REFERENCE = Path(sys.argv[1]).resolve()
SOURCE = ROOT / "plan/evidence/lsv88/decadal-vendor-parity-20.json"
OUT = ROOT / "plan/evidence/lsv88"


def git(*args):
    return subprocess.check_output(
        ["git", "-C", str(REFERENCE), *args], text=True
    ).strip()


assert git("rev-parse", "HEAD") == REFERENCE_COMMIT, "Reference revision changed"
assert not git("status", "--porcelain", "--untracked-files=no"), "Reference modified"
reference_hashes = {
    name: hashlib.sha256((REFERENCE / name).read_bytes()).hexdigest()
    for name in ["lasotuvi/AmDuong.py", "lasotuvi/DiaBan.py", "lasotuvi/Lich_HND.py"]
}
sys.path.insert(0, str(REFERENCE))
from lasotuvi.AmDuong import (  # noqa: E402
    diaChi, ngayThangNam, ngayThangNamCanChi, nguHanh, timCuc,
)
from lasotuvi.DiaBan import diaBan  # noqa: E402

PALACES = {
    "mệnh": "life", "phụ mẫu": "parents", "phúc đức": "fortune",
    "điền trạch": "property", "quan lộc": "career", "nô bộc": "friends",
    "thiên di": "travel", "tật ách": "health", "tài bạch": "wealth",
    "tử tức": "children", "phu thê": "spouse", "huynh đệ": "siblings",
}
BUREAUS = {2: "water2", 3: "wood3", 4: "metal4", 5: "earth5", 6: "fire6"}


def palace_id(palace):
    return "ziwei.palace." + PALACES[palace.cungChu.casefold()]


source_bytes = SOURCE.read_bytes()
source = json.loads(source_bytes)
assert source["sampleCount"] == len(source["cases"]) == 20
target_year = 2026
as_of_day, as_of_month, as_of_year = reversed(
    list(map(int, source["asOfDate"].split("-")))
)
as_of_lunar_year = ngayThangNam(
    as_of_day, as_of_month, as_of_year, True, 7
)[2]
assert as_of_lunar_year == target_year
cases, summary_rows, mismatches = [], [], []

for actual in source["cases"]:
    year, month, day = map(int, actual["birthDate"].split("-"))
    hour, minute = map(int, actual["birthTime"].split(":"))
    assert hour % 2 == 0 and minute == 30, "Only the frozen unambiguous hours"
    lunar_day, lunar_month, lunar_year, leap = ngayThangNam(
        day, month, year, True, 7
    )
    _, stem, branch = ngayThangNamCanChi(
        lunar_day, lunar_month, lunar_year, False, 7
    )
    board = diaBan(lunar_month, hour // 2 + 1)
    bureau = nguHanh(timCuc(board.cungMenh, stem))["cuc"]
    direction = (1 if actual["gender"] == "male" else -1) * diaChi[branch]["amDuong"]
    board.nhapDaiHan(bureau, direction)
    reference_cycles = []
    for ordinal, palace in enumerate(
        sorted(board.thapNhiCung[1:], key=lambda p: p.cungDaiHan)
    ):
        start_age = palace.cungDaiHan
        start_year = lunar_year + start_age - 1
        end_year = start_year + 9
        state = "future" if target_year < start_year else "past" if target_year > end_year else "current"
        annual_palaces = []
        for offset in range(10):
            annual_year = start_year + offset
            # Midyear is unambiguous for the reference normal lunar-year mode.
            _, _, annual_branch = ngayThangNamCanChi(1, 6, annual_year, False, 7)
            annual_palaces.append({
                "year": annual_year, "age": start_age + offset,
                "palaceId": palace_id(board.thapNhiCung[annual_branch]),
            })
        reference_cycles.append({
            "ordinal": ordinal, "palaceId": palace_id(palace),
            "startAge": start_age, "endAge": start_age + 9,
            "startYear": start_year, "endYear": end_year, "state": state,
            "annualPalaces": annual_palaces,
        })
    reference_current = next(
        (c["ordinal"] for c in reference_cycles if c["state"] == "current"), None
    )
    checks = {
        "bureau": actual["metadata"]["bureau"] == BUREAUS[bureau],
        "direction": actual["direction"] == ("forward" if direction == 1 else "reverse"),
        "currentOrdinal": actual["currentOrdinal"] == reference_current,
        "cycles": len(actual["cycles"]) == len(reference_cycles) == 12,
        "annualPalaces": True,
    }
    for expected, observed in zip(reference_cycles, actual["cycles"]):
        for key in ["ordinal", "palaceId", "startAge", "endAge", "startYear", "endYear", "state"]:
            if observed[key] != expected[key]:
                checks["cycles"] = False
                mismatches.append({"id": actual["id"], "ordinal": expected["ordinal"], "field": key,
                                   "actual": observed[key], "reference": expected[key]})
        projected = [{k: row[k] for k in ["year", "age", "palaceId"]}
                     for row in observed["annualPalaces"]]
        if projected != expected["annualPalaces"]:
            checks["annualPalaces"] = False
            mismatches.append({"id": actual["id"], "ordinal": expected["ordinal"], "field": "annualPalaces",
                               "actual": projected, "reference": expected["annualPalaces"]})
    for field in ["bureau", "direction", "currentOrdinal"]:
        if not checks[field]:
            mismatches.append({"id": actual["id"], "field": field})
    cases.append({
        "id": actual["id"], "birthDate": actual["birthDate"],
        "birthTime": actual["birthTime"], "gender": actual["gender"],
        "referenceLunarDate": [lunar_day, lunar_month, lunar_year, leap],
        "referenceBureau": BUREAUS[bureau],
        "referenceDirection": "forward" if direction == 1 else "reverse",
        "referenceCurrentOrdinal": reference_current, "checks": checks,
        "referenceCycles": reference_cycles,
    })
    summary_rows.append([
        actual["id"], actual["birthDate"], actual["birthTime"], actual["gender"],
        lunar_year, leap, BUREAUS[bureau], cases[-1]["referenceDirection"], reference_current,
        *[str(checks[k]).lower() for k in checks],
    ])

result = {
    "reference": {
        "url": "https://github.com/doanguyen/lasotuvi/tree/" + REFERENCE_COMMIT,
        "commit": REFERENCE_COMMIT, "sourceSha256": reference_hashes,
        "execution": "Unmodified standard-library-only calendar and board modules; no install or network",
    },
    "actualSource": {"path": str(SOURCE.relative_to(ROOT)), "sha256": hashlib.sha256(source_bytes).hexdigest()},
    "asOfDate": source["asOfDate"], "targetLunarYear": target_year, "timezoneOffsetMinutes": 420,
    "sampleCount": 20, "cycleCount": 240, "annualRowCount": 2400,
    "scope": "Bureau, direction, current ordinal, all cycle palace/age/year/state fields and annual year/age/palace fields",
    "excluded": ["Life/body masters", "Na-yin label", "Decadal/annual transformations", "Structural scores", "Prose quality", "Boundary cases outside frozen inputs"],
    "ownerManualAcceptance": "pending", "fullEngineAcceptance": False,
    "scopedComparisonPassed": all(all(c["checks"].values()) for c in cases),
    "mismatches": mismatches, "cases": cases,
}
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "decadal-independent-reference-20.json").write_text(
    json.dumps(result, ensure_ascii=False, indent=2) + "\n"
)
csv_output = io.StringIO(newline="")
writer = csv.writer(csv_output, lineterminator="\n")
writer.writerow(["id", "birthDate", "birthTime", "gender", "referenceLunarBirthYear", "referenceLeapMonth",
                 "referenceBureau", "referenceDirection", "referenceCurrentOrdinal",
                 "bureauMatch", "directionMatch", "currentOrdinalMatch", "all12CyclesMatch", "all120AnnualPalacesMatch"])
writer.writerows(summary_rows)
(OUT / "decadal-independent-reference-20.csv").write_text(csv_output.getvalue())
print(json.dumps({"sampleCount": 20, "cycleCount": 240, "annualRowCount": 2400,
                  "scopedComparisonPassed": result["scopedComparisonPassed"], "mismatchCount": len(mismatches)}))
sys.exit(0 if result["scopedComparisonPassed"] else 1)
