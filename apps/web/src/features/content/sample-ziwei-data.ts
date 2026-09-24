import type {
  FreeIdentityPreviewV1,
  NormalizedZiweiChartV1,
  ZiweiBirthSummaryV1,
  ZiweiEvidenceViewV1,
} from "@lasoviet/contracts";

export const sampleBirthSummary: ZiweiBirthSummaryV1 = {
  "normalizedCalendar": {
    "kind": "solar",
    "date": "1992-06-15"
  },
  "normalizedTime": {
    "precision": "exact_minute",
    "localTime": "08:30"
  },
  "timezoneProvenance": {
    "source": "iana",
    "ianaZone": "Asia/Ho_Chi_Minh",
    "runtime": "Intl"
  },
  "placeLabel": "Hà Nội",
  "gender": "female",
  "displayName": "Bản mẫu"
};

export const sampleChart: NormalizedZiweiChartV1 = {
  "version": 1,
  "systemId": "ziwei",
  "palaces": [
    {
      "id": "ziwei.palace.life",
      "earthlyBranchId": "ziwei.branch.tiger",
      "heavenlyStemId": "ziwei.stem.ren",
      "isBodyPalace": false,
      "isOriginalPalace": true,
      "cycleStateId": "ziwei.cycle.adulthood",
      "stars": [
        {
          "id": "ziwei.star.tanlang",
          "brightness": "ziwei.brightness.unfavorable",
          "category": "major"
        },
        {
          "id": "ziwei.star.tianma",
          "brightness": "ziwei.brightness.neutral",
          "category": "minor"
        },
        {
          "id": "ziwei.star.lingxing",
          "brightness": "ziwei.brightness.exalted",
          "category": "minor"
        },
        {
          "id": "ziwei.star.fengge",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.jielu",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.tianxu",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.nianjie",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.dahao-dec",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.suiyi",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.dahao",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        }
      ]
    },
    {
      "id": "ziwei.palace.parents",
      "earthlyBranchId": "ziwei.branch.rabbit",
      "heavenlyStemId": "ziwei.stem.gui",
      "isBodyPalace": false,
      "isOriginalPalace": false,
      "cycleStateId": "ziwei.cycle.adolescence",
      "stars": [
        {
          "id": "ziwei.star.tianji",
          "brightness": "ziwei.brightness.prosperous",
          "category": "major"
        },
        {
          "id": "ziwei.star.jumen",
          "brightness": "ziwei.brightness.exalted",
          "category": "major"
        },
        {
          "id": "ziwei.star.tiankui",
          "brightness": "ziwei.brightness.neutral",
          "category": "minor"
        },
        {
          "id": "ziwei.star.dijie",
          "brightness": "ziwei.brightness.neutral",
          "category": "minor"
        },
        {
          "id": "ziwei.star.kongwang",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.bingfu",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.xiishen",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.longde-dec",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        }
      ]
    },
    {
      "id": "ziwei.palace.fortune",
      "earthlyBranchId": "ziwei.branch.dragon",
      "heavenlyStemId": "ziwei.stem.jia",
      "isBodyPalace": false,
      "isOriginalPalace": false,
      "cycleStateId": "ziwei.cycle.infancy",
      "stars": [
        {
          "id": "ziwei.star.ziwei",
          "brightness": "ziwei.brightness.favorable",
          "category": "major"
        },
        {
          "id": "ziwei.star.tianxiang",
          "brightness": "ziwei.brightness.favorable",
          "category": "major"
        },
        {
          "id": "ziwei.star.bazuo",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.huagai",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.feilian",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.xishen",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.huagai-dec",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.baihu",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        }
      ]
    },
    {
      "id": "ziwei.palace.property",
      "earthlyBranchId": "ziwei.branch.snake",
      "heavenlyStemId": "ziwei.stem.yi",
      "isBodyPalace": false,
      "isOriginalPalace": false,
      "cycleStateId": "ziwei.cycle.born",
      "stars": [
        {
          "id": "ziwei.star.tianliang",
          "brightness": "ziwei.brightness.weak",
          "category": "major"
        },
        {
          "id": "ziwei.star.tianyue",
          "brightness": "ziwei.brightness.neutral",
          "category": "minor"
        },
        {
          "id": "ziwei.star.tianyao",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.tianwu",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.tiande",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.feilian-dec",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.jiesha-dec",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.tiande-dec",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        }
      ]
    },
    {
      "id": "ziwei.palace.career",
      "earthlyBranchId": "ziwei.branch.horse",
      "heavenlyStemId": "ziwei.stem.bing",
      "isBodyPalace": false,
      "isOriginalPalace": false,
      "cycleStateId": "ziwei.cycle.molding",
      "stars": [
        {
          "id": "ziwei.star.qisha",
          "brightness": "ziwei.brightness.prosperous",
          "category": "major"
        },
        {
          "id": "ziwei.star.youbi",
          "brightness": "ziwei.brightness.neutral",
          "category": "minor"
        },
        {
          "id": "ziwei.star.wenchang",
          "brightness": "ziwei.brightness.weak",
          "category": "minor"
        },
        {
          "id": "ziwei.star.huoxing",
          "brightness": "ziwei.brightness.exalted",
          "category": "minor"
        },
        {
          "id": "ziwei.star.tianshou",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.fenggao",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.tianfu-adj",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.yinsha",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.zhoushu",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.zhaisha",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.diaoke",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        }
      ]
    },
    {
      "id": "ziwei.palace.friends",
      "earthlyBranchId": "ziwei.branch.goat",
      "heavenlyStemId": "ziwei.stem.ding",
      "isBodyPalace": false,
      "isOriginalPalace": false,
      "cycleStateId": "ziwei.cycle.embryo",
      "stars": [
        {
          "id": "ziwei.star.dikong",
          "brightness": "ziwei.brightness.neutral",
          "category": "minor"
        },
        {
          "id": "ziwei.star.hongluan",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.enguang",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.tianyue-adj",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.guasu",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.tianshang",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.jiangjun",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.tiansha",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.bingfu-sq",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        }
      ]
    },
    {
      "id": "ziwei.palace.travel",
      "earthlyBranchId": "ziwei.branch.monkey",
      "heavenlyStemId": "ziwei.stem.wu",
      "isBodyPalace": false,
      "isOriginalPalace": false,
      "cycleStateId": "ziwei.cycle.dissipated",
      "stars": [
        {
          "id": "ziwei.star.lianzhen",
          "brightness": "ziwei.brightness.exalted",
          "category": "major"
        },
        {
          "id": "ziwei.star.zuofu",
          "brightness": "ziwei.brightness.neutral",
          "category": "minor"
        },
        {
          "id": "ziwei.star.wenqu",
          "brightness": "ziwei.brightness.favorable",
          "category": "minor"
        },
        {
          "id": "ziwei.star.xiaohao",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.zhibei",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.suijian",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        }
      ]
    },
    {
      "id": "ziwei.palace.health",
      "earthlyBranchId": "ziwei.branch.rooster",
      "heavenlyStemId": "ziwei.stem.ji",
      "isBodyPalace": false,
      "isOriginalPalace": false,
      "cycleStateId": "ziwei.cycle.buried",
      "stars": [
        {
          "id": "ziwei.star.xianchi",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.tiangui",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.tianchu",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.tiankong",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.posui",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.tianshi",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.qinglong",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.xianchi-dec",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.huiqi",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        }
      ]
    },
    {
      "id": "ziwei.palace.wealth",
      "earthlyBranchId": "ziwei.branch.dog",
      "heavenlyStemId": "ziwei.stem.geng",
      "isBodyPalace": true,
      "isOriginalPalace": false,
      "cycleStateId": "ziwei.cycle.dead",
      "stars": [
        {
          "id": "ziwei.star.pojun",
          "brightness": "ziwei.brightness.prosperous",
          "category": "major"
        },
        {
          "id": "ziwei.star.tuoluo",
          "brightness": "ziwei.brightness.exalted",
          "category": "minor"
        },
        {
          "id": "ziwei.star.santai",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.tiancai",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.taifu",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.tianguan",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.xunkong",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.tianku",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.lishi",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.yuesha",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.sangmen",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        }
      ]
    },
    {
      "id": "ziwei.palace.children",
      "earthlyBranchId": "ziwei.branch.pig",
      "heavenlyStemId": "ziwei.stem.xin",
      "isBodyPalace": false,
      "isOriginalPalace": false,
      "cycleStateId": "ziwei.cycle.sick",
      "stars": [
        {
          "id": "ziwei.star.tiantong",
          "brightness": "ziwei.brightness.exalted",
          "category": "major"
        },
        {
          "id": "ziwei.star.lucun",
          "brightness": "ziwei.brightness.neutral",
          "category": "minor"
        },
        {
          "id": "ziwei.star.guchen",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.boshi",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.wangshen",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.guansuo",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        }
      ]
    },
    {
      "id": "ziwei.palace.spouse",
      "earthlyBranchId": "ziwei.branch.rat",
      "heavenlyStemId": "ziwei.stem.ren",
      "isBodyPalace": false,
      "isOriginalPalace": false,
      "cycleStateId": "ziwei.cycle.weak",
      "stars": [
        {
          "id": "ziwei.star.wuqu",
          "brightness": "ziwei.brightness.prosperous",
          "category": "major"
        },
        {
          "id": "ziwei.star.tianfu",
          "brightness": "ziwei.brightness.exalted",
          "category": "major"
        },
        {
          "id": "ziwei.star.qingyang",
          "brightness": "ziwei.brightness.weak",
          "category": "minor"
        },
        {
          "id": "ziwei.star.jieshen",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.longchi",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.guanfu",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.jiangxing",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.gwanfu",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        }
      ]
    },
    {
      "id": "ziwei.palace.siblings",
      "earthlyBranchId": "ziwei.branch.ox",
      "heavenlyStemId": "ziwei.stem.gui",
      "isBodyPalace": false,
      "isOriginalPalace": false,
      "cycleStateId": "ziwei.cycle.prime",
      "stars": [
        {
          "id": "ziwei.star.taiyang",
          "brightness": "ziwei.brightness.weak",
          "category": "major"
        },
        {
          "id": "ziwei.star.taiyin",
          "brightness": "ziwei.brightness.exalted",
          "category": "major"
        },
        {
          "id": "ziwei.star.tianxi",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.yuede",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.tianxing",
          "brightness": "ziwei.brightness.neutral",
          "category": "adjective"
        },
        {
          "id": "ziwei.star.fubing",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.panan",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        },
        {
          "id": "ziwei.star.xiaohao-sq",
          "brightness": "ziwei.brightness.neutral",
          "category": "decorative"
        }
      ]
    }
  ],
  "transformations": [
    {
      "starId": "ziwei.star.ziwei",
      "id": "ziwei.transformation.power"
    },
    {
      "starId": "ziwei.star.tianliang",
      "id": "ziwei.transformation.prosperity"
    },
    {
      "starId": "ziwei.star.zuofu",
      "id": "ziwei.transformation.fame"
    },
    {
      "starId": "ziwei.star.wuqu",
      "id": "ziwei.transformation.obstacle"
    }
  ],
  "soulPalaceId": "ziwei.palace.life",
  "bodyPalaceId": "ziwei.palace.wealth",
  "horoscopeCapabilities": [
    {
      "id": "ziwei.horoscope.decadal",
      "supported": true
    },
    {
      "id": "ziwei.horoscope.annual",
      "supported": true
    },
    {
      "id": "ziwei.horoscope.monthly",
      "supported": true
    },
    {
      "id": "ziwei.horoscope.daily",
      "supported": true
    }
  ],
  "warnings": [
    {
      "code": "ziwei.warning.no-true-solar-time-correction",
      "severity": "limitation"
    }
  ],
  "provenance": {
    "version": 1,
    "engineId": "ziwei.iztro",
    "engineVersion": "2.6.0",
    "adapterId": "ziwei.iztro-adapter",
    "adapterVersion": "1",
    "schemaId": "ziwei.chart.v1",
    "ruleSetId": "ziwei.default",
    "inputHash": "82c4c66eeae455df772d7855b846d3a073e3ce51b31079121a0c082e97033abd",
    "configHash": "5f35868099a323226fadac7d2e51207ddff2404f58bcfb957d5cf6ddec9d918f",
    "rawSnapshotHash": "1016e8c0ea543b3583181f56275cac4c56e0b4c7dcdd05e5114bf3326f6aa712",
    "calculatedAt": "2026-09-24T09:39:38.650+00:00",
    "limitations": [
      "IZTRO_NO_NATIVE_LOCATION_INPUT",
      "IZTRO_NO_NATIVE_TIMEZONE_INPUT",
      "IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION"
    ]
  }
};

export const samplePreview: FreeIdentityPreviewV1 = {
  "version": 1,
  "chartId": "sample-tu-vi",
  "chartVersionId": "sample-v1",
  "capabilityId": "ziwei.identity.p0",
  "summaryVersion": "ziwei.identity.free.v1",
  "insights": [
    {
      "id": "life-palace",
      "evidence": {
        "evidenceId": "ziwei.identity.life-palace",
        "factReferences": [
          "palaces.ziwei.palace.life.earthlyBranchId",
          "soulPalaceId"
        ],
        "confidence": "moderate",
        "interpretationBoundCodes": [
          "reflective_identity_only"
        ],
        "interpretationBounds": [
          "Use only as a reflective identity signal, not a deterministic outcome.",
          "Do not infer health, legal, financial, or relationship outcomes."
        ],
        "limitations": [
          "IZTRO_NO_NATIVE_LOCATION_INPUT",
          "IZTRO_NO_NATIVE_TIMEZONE_INPUT",
          "IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION",
          "ziwei.warning.no-true-solar-time-correction"
        ]
      }
    },
    {
      "id": "body-palace",
      "evidence": {
        "evidenceId": "ziwei.identity.body-palace",
        "factReferences": [
          "palaces.ziwei.palace.wealth.earthlyBranchId",
          "bodyPalaceId"
        ],
        "confidence": "moderate",
        "interpretationBoundCodes": [
          "reflective_identity_only"
        ],
        "interpretationBounds": [
          "Use only as a reflective identity signal, not a deterministic outcome.",
          "Do not infer health, legal, financial, or relationship outcomes."
        ],
        "limitations": [
          "IZTRO_NO_NATIVE_LOCATION_INPUT",
          "IZTRO_NO_NATIVE_TIMEZONE_INPUT",
          "IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION",
          "ziwei.warning.no-true-solar-time-correction"
        ]
      }
    },
    {
      "id": "transformations",
      "evidence": {
        "evidenceId": "ziwei.identity.transformations",
        "factReferences": [
          "transformations",
          "provenance.ruleSetId"
        ],
        "confidence": "moderate",
        "interpretationBoundCodes": [
          "reflective_identity_only"
        ],
        "interpretationBounds": [
          "Use only as a reflective identity signal, not a deterministic outcome.",
          "Do not infer health, legal, financial, or relationship outcomes."
        ],
        "limitations": [
          "IZTRO_NO_NATIVE_LOCATION_INPUT",
          "IZTRO_NO_NATIVE_TIMEZONE_INPUT",
          "IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION",
          "ziwei.warning.no-true-solar-time-correction"
        ]
      }
    }
  ],
  "strengthSignal": {
    "id": "life-palace-strength",
    "evidence": {
      "evidenceId": "ziwei.identity.life-palace",
      "factReferences": [
        "palaces.ziwei.palace.life.earthlyBranchId",
        "soulPalaceId"
      ],
      "confidence": "moderate",
      "interpretationBoundCodes": [
        "reflective_identity_only"
      ],
      "interpretationBounds": [
        "Use only as a reflective identity signal, not a deterministic outcome.",
        "Do not infer health, legal, financial, or relationship outcomes."
      ],
      "limitations": [
        "IZTRO_NO_NATIVE_LOCATION_INPUT",
        "IZTRO_NO_NATIVE_TIMEZONE_INPUT",
        "IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION",
        "ziwei.warning.no-true-solar-time-correction"
      ]
    }
  },
  "tensionSignal": {
    "id": "body-palace-transformations-tension",
    "evidence": [
      {
        "evidenceId": "ziwei.identity.body-palace",
        "factReferences": [
          "palaces.ziwei.palace.wealth.earthlyBranchId",
          "bodyPalaceId"
        ],
        "confidence": "moderate",
        "interpretationBoundCodes": [
          "reflective_identity_only"
        ],
        "interpretationBounds": [
          "Use only as a reflective identity signal, not a deterministic outcome.",
          "Do not infer health, legal, financial, or relationship outcomes."
        ],
        "limitations": [
          "IZTRO_NO_NATIVE_LOCATION_INPUT",
          "IZTRO_NO_NATIVE_TIMEZONE_INPUT",
          "IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION",
          "ziwei.warning.no-true-solar-time-correction"
        ]
      },
      {
        "evidenceId": "ziwei.identity.transformations",
        "factReferences": [
          "transformations",
          "provenance.ruleSetId"
        ],
        "confidence": "moderate",
        "interpretationBoundCodes": [
          "reflective_identity_only"
        ],
        "interpretationBounds": [
          "Use only as a reflective identity signal, not a deterministic outcome.",
          "Do not infer health, legal, financial, or relationship outcomes."
        ],
        "limitations": [
          "IZTRO_NO_NATIVE_LOCATION_INPUT",
          "IZTRO_NO_NATIVE_TIMEZONE_INPUT",
          "IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION",
          "ziwei.warning.no-true-solar-time-correction"
        ]
      }
    ]
  },
  "paidPreview": {
    "sku": "ZIWEI-IDENTITY-P0",
    "sectionId": "personal_summary",
    "coveragePercent": 12,
    "evidence": [
      {
        "evidenceId": "ziwei.identity.life-palace",
        "factReferences": [
          "palaces.ziwei.palace.life.earthlyBranchId",
          "soulPalaceId"
        ],
        "confidence": "moderate",
        "interpretationBoundCodes": [
          "reflective_identity_only"
        ],
        "interpretationBounds": [
          "Use only as a reflective identity signal, not a deterministic outcome.",
          "Do not infer health, legal, financial, or relationship outcomes."
        ],
        "limitations": [
          "IZTRO_NO_NATIVE_LOCATION_INPUT",
          "IZTRO_NO_NATIVE_TIMEZONE_INPUT",
          "IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION",
          "ziwei.warning.no-true-solar-time-correction"
        ]
      }
    ]
  }
};

export const sampleEvidenceMap: Record<string, ZiweiEvidenceViewV1> = {
  "ziwei.identity.life-palace": {
    "version": 1,
    "chartId": "sample-tu-vi",
    "chartVersionId": "sample-v1",
    "evidence": {
      "id": "ziwei.identity.life-palace",
      "factReferences": [
        "palaces.ziwei.palace.life.earthlyBranchId",
        "soulPalaceId"
      ],
      "confidence": "moderate",
      "interpretationBounds": [
        "Use only as a reflective identity signal, not a deterministic outcome.",
        "Do not infer health, legal, financial, or relationship outcomes."
      ],
      "interpretationBoundCodes": [
        "reflective_identity_only"
      ],
      "limitations": [
        "IZTRO_NO_NATIVE_LOCATION_INPUT",
        "IZTRO_NO_NATIVE_TIMEZONE_INPUT",
        "IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION",
        "ziwei.warning.no-true-solar-time-correction"
      ],
      "riskTags": [
        "identity",
        "determinism",
        "birth-time"
      ],
      "allowedActionCategories": [
        "reflect",
        "explore"
      ]
    }
  },
  "ziwei.identity.body-palace": {
    "version": 1,
    "chartId": "sample-tu-vi",
    "chartVersionId": "sample-v1",
    "evidence": {
      "id": "ziwei.identity.body-palace",
      "factReferences": [
        "palaces.ziwei.palace.wealth.earthlyBranchId",
        "bodyPalaceId"
      ],
      "confidence": "moderate",
      "interpretationBounds": [
        "Use only as a reflective identity signal, not a deterministic outcome.",
        "Do not infer health, legal, financial, or relationship outcomes."
      ],
      "interpretationBoundCodes": [
        "reflective_identity_only"
      ],
      "limitations": [
        "IZTRO_NO_NATIVE_LOCATION_INPUT",
        "IZTRO_NO_NATIVE_TIMEZONE_INPUT",
        "IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION",
        "ziwei.warning.no-true-solar-time-correction"
      ],
      "riskTags": [
        "identity",
        "determinism",
        "birth-time"
      ],
      "allowedActionCategories": [
        "reflect",
        "explore"
      ]
    }
  },
  "ziwei.identity.transformations": {
    "version": 1,
    "chartId": "sample-tu-vi",
    "chartVersionId": "sample-v1",
    "evidence": {
      "id": "ziwei.identity.transformations",
      "factReferences": [
        "transformations",
        "provenance.ruleSetId"
      ],
      "confidence": "moderate",
      "interpretationBounds": [
        "Use only as a reflective identity signal, not a deterministic outcome.",
        "Do not infer health, legal, financial, or relationship outcomes."
      ],
      "interpretationBoundCodes": [
        "reflective_identity_only"
      ],
      "limitations": [
        "IZTRO_NO_NATIVE_LOCATION_INPUT",
        "IZTRO_NO_NATIVE_TIMEZONE_INPUT",
        "IZTRO_NO_TRUE_SOLAR_TIME_CORRECTION",
        "ziwei.warning.no-true-solar-time-correction"
      ],
      "riskTags": [
        "identity",
        "determinism",
        "birth-time"
      ],
      "allowedActionCategories": [
        "reflect",
        "explore"
      ]
    }
  }
};
