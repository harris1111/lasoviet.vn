#!/usr/bin/env python3
"""Export synthetic pillar expectations using sxtwl; never imports production code."""
import argparse
import importlib.metadata
import json
from datetime import datetime, timedelta
from pathlib import Path

import sxtwl

STEMS = ("jia", "yi", "bing", "ding", "wu", "ji", "geng", "xin", "ren", "gui")
BRANCHES = ("rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig")


def pair(value):
    return {"stemId": "bazi.stem." + STEMS[value.tg], "branchId": "bazi.branch." + BRANCHES[value.dz]}


def term_clock(jd):
    value = sxtwl.JD2DD(jd)
    return datetime(int(value.Y), int(value.M), int(value.D), int(value.h), int(value.m)) + timedelta(seconds=value.s)


def pillars(local, offset):
    # Independent astronomy is expressed in UTC+8; only year/month use that clock.
    china = local + timedelta(minutes=480 - offset)
    terms_day = sxtwl.fromSolar(china.year, china.month, china.day)
    if terms_day.hasJieQi() and terms_day.getJieQi() % 2 == 1:
        # Date-only GZ changes on the boundary date; compare the actual Jie instant.
        if china < term_clock(terms_day.getJieQiJD()):
            prior = china - timedelta(days=1)
            terms_day = sxtwl.fromSolar(prior.year, prior.month, prior.day)
    civil_day = sxtwl.fromSolar(local.year, local.month, local.day)
    return {"year": pair(terms_day.getYearGZ(False)), "month": pair(terms_day.getMonthGZ()),
            "day": pair(civil_day.getDayGZ()), "hour": pair(civil_day.getHourGZ(local.hour, True))}


def record(identifier, local, offset, unknown=False):
    input_value = {"localSolarDate": local.strftime("%Y-%m-%d"), "localTime": None if unknown else local.strftime("%H:%M"), "offsetMinutes": offset}
    candidates = [pillars(local.replace(hour=0, minute=0, second=0), offset),
                  pillars(local.replace(hour=23, minute=59, second=59), offset)] if unknown else [pillars(local, offset)]
    expected = {}
    for kind in ("year", "month", "day"):
        expected[kind] = []
        for candidate in candidates:
            if candidate[kind] not in expected[kind]:
                expected[kind].append(candidate[kind])
    expected["hour"] = None if unknown else candidates[0]["hour"]
    return {"id": identifier, "input": input_value, "expected": expected}


def export():
    if importlib.metadata.version("sxtwl") != "2.0.7":
        raise RuntimeError("Reference requires sxtwl==2.0.7")
    profiles = [record(f"synthetic-{i + 1:02}", datetime(1950 + i * 2, 1 + i % 12, 1 + i % 27, i % 24, 30),
                       (-300, 0, 330, 420, 480, 540)[i % 6]) for i in range(30)]
    # Twelve genuine monthly Jie boundaries, each side at three distinct offsets.
    terms = [item for item in sxtwl.getJieQiByYear(2027) if item.jqIndex % 2 == 1][:12]
    for item in terms:
        china = term_clock(item.jd)
        for offset in (420, 480, -300):
            local = china + timedelta(minutes=offset - 480)
            for delta in (-3, 3):
                minute = (local + timedelta(minutes=delta)).replace(second=0, microsecond=0)
                profiles.append(record(f"jie-{item.jqIndex:02}-{offset}-{delta}", minute, offset))
    for day in (datetime(1992, 6, 15), datetime(2027, 2, 4)):
        for hour, minute in ((22, 59), (23, 0), (23, 59), (0, 0)):
            local = day + timedelta(days=1 if hour == 0 else 0, hours=hour, minutes=minute)
            profiles.append(record(f"civil-{day:%Y%m%d}-{hour:02}{minute:02}", local, 420))
    for offset in (420, 480, -300):
        local = term_clock(terms[0].jd) + timedelta(minutes=offset - 480)
        profiles.append(record(f"unknown-li-chun-{offset}", local, offset, unknown=True))
    profiles.append(record("unknown-ordinary", datetime(1992, 6, 15), 420, unknown=True))
    return {"schemaVersion": 1, "synthetic": True, "reference": {"engine": "sxtwl", "version": "2.0.7",
            "source": "https://pypi.org/project/sxtwl/2.0.7/",
            "sourceArchiveSha256": "38b24472389f7f6f3521c2c99e4b5e86c0184c7d6eb02e5409c239d21f0a6512",
            "documentation": "https://github.com/yuangu/sxtwl_cpp/blob/master/python/README.md",
            "scope": "Four pillar stems/branches only; no hidden stems, ten gods, elements, luck cycles or empirical prediction.",
            "solarTermsOffsetMinutes": 480, "yearBoundary": "li-chun", "monthBoundary": "jie-instant", "dayBoundary": "local-midnight",
            "hourPolicy": "getHourGZ(hour, True); late-Zi hour uses the next stem while civil day remains unchanged"}, "profiles": profiles}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(export(), ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")
