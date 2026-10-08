"""Compare versioned deterministic engine projections with an offline reference."""
import csv
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys

COMMIT = "ace8379a3ea033674e8a9096f5b98a9e2041eace"
ROOT = Path(__file__).resolve().parents[1]
REFERENCE = Path(sys.argv[1]).resolve()
assert subprocess.check_output(["git", "-C", str(REFERENCE), "rev-parse", "HEAD"], text=True).strip() == COMMIT
assert not subprocess.check_output(["git", "-C", str(REFERENCE), "status", "--porcelain", "--untracked-files=no"], text=True).strip()
reference_hashes = {p: hashlib.sha256((REFERENCE / p).read_bytes()).hexdigest()
                    for p in ["lasotuvi/AmDuong.py", "lasotuvi/DiaBan.py", "lasotuvi/Lich_HND.py"]}
sys.path.insert(0, str(REFERENCE))
from lasotuvi.AmDuong import diaChi, ngayThangNam, ngayThangNamCanChi, nguHanh, timCuc
from lasotuvi.DiaBan import diaBan

PALACES = {"mệnh":"life", "phụ mẫu":"parents", "phúc đức":"fortune", "điền trạch":"property", "quan lộc":"career",
           "nô bộc":"friends", "thiên di":"travel", "tật ách":"health", "tài bạch":"wealth", "tử tức":"children", "phu thê":"spouse", "huynh đệ":"siblings"}
BUREAUS = {2:"water2", 3:"wood3", 4:"metal4", 5:"earth5", 6:"fire6"}
def palace_id(p): return "ziwei.palace." + PALACES[p.cungChu.casefold()]
def digest(value): return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()

input_bytes = sys.stdin.buffer.read()
actual = json.loads(input_bytes)
assert actual["chartCount"] == 30 and len(actual["dates"]) >= 4 and actual["invariantAssertionCount"] >= 200
assert len(actual["cases"]) == 30 * len(actual["dates"])
assert len({c["id"] for c in actual["cases"]}) == 30
cases, mismatches = [], []
for observed in actual["cases"]:
    year, month, day = map(int, observed["birthDate"].split("-"))
    hour, minute = map(int, observed["birthTime"].split(":"))
    assert hour % 2 == 0 and minute == 30
    lunar_day, lunar_month, lunar_year, leap = ngayThangNam(day, month, year, True, 7)
    _, stem, branch = ngayThangNamCanChi(lunar_day, lunar_month, lunar_year, False, 7)
    board = diaBan(lunar_month, hour // 2 + 1)
    bureau = nguHanh(timCuc(board.cungMenh, stem))["cuc"]
    direction = (1 if observed["gender"] == "male" else -1) * diaChi[branch]["amDuong"]
    board.nhapDaiHan(bureau, direction)
    eval_year, eval_month, eval_day = map(int, observed["asOfDate"].split("-"))
    target = ngayThangNam(eval_day, eval_month, eval_year, True, 7)[2]
    cycles = []
    for ordinal, palace in enumerate(sorted(board.thapNhiCung[1:], key=lambda p:p.cungDaiHan)):
        age = palace.cungDaiHan
        start = lunar_year + age - 1
        annual = []
        for offset in range(10):
            _, _, annual_branch = ngayThangNamCanChi(1, 6, start + offset, False, 7)
            annual.append({"year":start+offset,"age":age+offset,"palaceId":palace_id(board.thapNhiCung[annual_branch])})
        cycles.append({"ordinal":ordinal,"palaceId":palace_id(palace),"startAge":age,"endAge":age+9,"startYear":start,"endYear":start+9,
                       "state":"future" if target<start else "past" if target>start+9 else "current", "annualPalaces":annual})
    expected = {"targetYear":target,"bureau":BUREAUS[bureau],"direction":"forward" if direction == 1 else "reverse",
                "currentOrdinal":next((c["ordinal"] for c in cycles if c["state"] == "current"),None),"cycles":cycles}
    projected = {k:observed[k] for k in expected}
    checks = {k:projected[k] == expected[k] for k in expected}
    for field, matches in checks.items():
        if not matches: mismatches.append({"id":observed["id"],"asOfDate":observed["asOfDate"],"field":field,"actual":projected[field],"reference":expected[field]})
    cases.append({k:observed[k] for k in ["id","birthDate","birthTime","gender","asOfDate"]} |
                 {"targetLunarYear":target,"referenceLunarBirthYear":lunar_year,"referenceLeapMonth":leap,"bureau":expected["bureau"],
                  "direction":expected["direction"],"currentOrdinal":expected["currentOrdinal"],"checks":checks,
                  "actualProjectionSha256":digest(projected),"referenceProjectionSha256":digest(expected)})
result = {"reference":{"url":"https://github.com/doanguyen/lasotuvi/tree/"+COMMIT,"commit":COMMIT,"sourceSha256":reference_hashes,
                        "execution":"Unmodified offline standard-library calendar/board modules; no install/network"},
          "actual":{"inputSha256":hashlib.sha256(input_bytes).hexdigest(),"engineVersion":actual["engineVersion"],"calendarVersion":actual["calendarVersion"],"sourceSha256":actual["sourceSha256"]},
          "chartCount":30,"evaluationDates":actual["dates"],"evaluationCount":len(cases),"cycleComparisonCount":len(cases)*12,"annualRowComparisonCount":len(cases)*120,
          "invariantAssertionCount":actual["invariantAssertionCount"],"timezoneOffsetMinutes":420,
          "scope":"Target lunar year, bureau, direction, current ordinal, all cycle palace/age/year/state and annual year/age/palace fields",
          "excluded":["Life/body masters","Na-yin","Transformations","Structural scores","Prose quality","Other birth/timezone uncertainty cases"],
          "ownerManualAcceptance":"pending","fullEngineAcceptance":False,"scopedComparisonPassed":not mismatches,"mismatches":mismatches,"cases":cases}
output = ROOT / "plan/evidence/lsv88"
output.mkdir(parents=True,exist_ok=True)
(output / "decadal-boundary-reference-30.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
table = io.StringIO(newline="")
writer = csv.writer(table,lineterminator="\n")
writer.writerow(["id","birthDate","birthTime","gender","asOfDate","targetLunarYear","referenceLunarBirthYear","bureau","direction","currentOrdinal","allScopedFieldsMatch"])
writer.writerows([[c[k] for k in ["id","birthDate","birthTime","gender","asOfDate","targetLunarYear","referenceLunarBirthYear","bureau","direction","currentOrdinal"]]+[str(all(c["checks"].values())).lower()] for c in cases])
(output / "decadal-boundary-reference-30.csv").write_text(table.getvalue())
print(json.dumps({k:result[k] for k in ["chartCount","evaluationCount","cycleComparisonCount","annualRowComparisonCount","invariantAssertionCount","scopedComparisonPassed"]} | {"mismatchCount":len(mismatches)}))
sys.exit(0 if not mismatches else 1)
