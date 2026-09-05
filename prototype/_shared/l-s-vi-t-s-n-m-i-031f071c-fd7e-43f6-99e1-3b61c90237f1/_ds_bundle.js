/* @ds-bundle: {"format":4,"namespace":"DesignSystem_031f07","components":[{"name":"ArticleCard","sourcePath":"ds_src/Lá Số Việt hero update/components/cards/ArticleCard.jsx"},{"name":"InsightCard","sourcePath":"ds_src/Lá Số Việt hero update/components/cards/InsightCard.jsx"},{"name":"Button","sourcePath":"ds_src/Lá Số Việt hero update/components/core/Button.jsx"},{"name":"Icon","sourcePath":"ds_src/Lá Số Việt hero update/components/core/Icon.jsx"},{"name":"Seal","sourcePath":"ds_src/Lá Số Việt hero update/components/core/Seal.jsx"},{"name":"EvidenceDrawer","sourcePath":"ds_src/Lá Số Việt hero update/components/disclosure/EvidenceDrawer.jsx"},{"name":"FaqItem","sourcePath":"ds_src/Lá Số Việt hero update/components/disclosure/FaqItem.jsx"},{"name":"TocRow","sourcePath":"ds_src/Lá Số Việt hero update/components/lists/TocRow.jsx"},{"name":"TrustItem","sourcePath":"ds_src/Lá Số Việt hero update/components/lists/TrustItem.jsx"}],"sourceHashes":{"ds_src/Lá Số Việt hero update/components/cards/ArticleCard.jsx":"6d7a5970d453","ds_src/Lá Số Việt hero update/components/cards/InsightCard.jsx":"71920f651a04","ds_src/Lá Số Việt hero update/components/core/Button.jsx":"3b9ad9c89679","ds_src/Lá Số Việt hero update/components/core/Icon.jsx":"790283fde9bc","ds_src/Lá Số Việt hero update/components/core/Seal.jsx":"c29c537892f0","ds_src/Lá Số Việt hero update/components/disclosure/EvidenceDrawer.jsx":"98ea20aff28b","ds_src/Lá Số Việt hero update/components/disclosure/FaqItem.jsx":"22af943469d7","ds_src/Lá Số Việt hero update/components/lists/TocRow.jsx":"a24d7ff71cc8","ds_src/Lá Số Việt hero update/components/lists/TrustItem.jsx":"fd3139ca5587"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DesignSystem_031f07 = window.DesignSystem_031f07 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ds_src/Lá Số Việt hero update/components/cards/ArticleCard.jsx
try { (() => {
function ArticleCard({
  image,
  alt,
  title,
  body,
  href = "#",
  style
}) {
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    style: {
      display: "block",
      textDecoration: "none",
      color: "inherit",
      ...style
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: alt,
    style: {
      display: "block",
      width: "100%",
      height: 260,
      objectFit: "cover",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-md)"
    }
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "20px 0 0",
      fontFamily: "var(--font-display)",
      fontWeight: 400,
      fontSize: 24,
      lineHeight: 1.3,
      color: "var(--text-heading)"
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "10px 0 0",
      fontSize: 15,
      lineHeight: 1.65,
      color: "var(--text-muted)"
    }
  }, body));
}
Object.assign(__ds_scope, { ArticleCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ds_src/Lá Số Việt hero update/components/cards/ArticleCard.jsx", error: String((e && e.message) || e) }); }

// ds_src/Lá Số Việt hero update/components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const VARIANTS = {
  primary: {
    background: "var(--gradient-gold)",
    color: "var(--surface-deep)",
    border: "none"
  },
  secondary: {
    background: "none",
    color: "var(--text-body)",
    border: "1px solid var(--border-hairline)"
  },
  link: {
    background: "none",
    color: "var(--accent-gold)",
    border: "none",
    padding: 0,
    minHeight: "auto",
    textDecoration: "underline",
    textUnderlineOffset: 4
  }
};
function Button({
  variant = "primary",
  size = "md",
  href,
  onClick,
  children,
  style,
  ...rest
}) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: size === "sm" ? "0 20px" : "0 24px",
    borderRadius: "var(--radius-sm)",
    fontFamily: "var(--font-ui)",
    fontWeight: 600,
    fontSize: 15,
    textDecoration: "none",
    cursor: "pointer",
    transition: "filter 150ms ease, border-color 150ms ease, color 150ms ease"
  };
  const Tag = href ? "a" : "button";
  return /*#__PURE__*/React.createElement(Tag, _extends({
    href: href,
    onClick: onClick,
    type: href ? undefined : "button",
    style: {
      ...base,
      ...VARIANTS[variant],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ds_src/Lá Số Việt hero update/components/core/Button.jsx", error: String((e && e.message) || e) }); }

// ds_src/Lá Số Việt hero update/components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const PATHS = {
  menu: /*#__PURE__*/React.createElement("path", {
    d: "M3.5 6.5h17M3.5 12h17M3.5 17.5h17"
  }),
  close: /*#__PURE__*/React.createElement("path", {
    d: "M5.5 5.5l13 13M18.5 5.5l-13 13"
  }),
  "chevron-down": /*#__PURE__*/React.createElement("path", {
    d: "M5.5 9l6.5 6.5L18.5 9"
  }),
  "chevron-right": /*#__PURE__*/React.createElement("path", {
    d: "M9 5.5l6.5 6.5L9 18.5"
  }),
  "arrow-right": /*#__PURE__*/React.createElement("path", {
    d: "M3.5 12h17M13.5 5l7 7-7 7"
  }),
  "external-link": /*#__PURE__*/React.createElement("path", {
    d: "M14 3.5h6.5V10M20.5 3.5L11 13M18 13.5v5.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H11"
  }),
  search: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "10.8",
    cy: "10.8",
    r: "6.8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15.8 15.8l4.4 4.4"
  })),
  check: /*#__PURE__*/React.createElement("path", {
    d: "M4 12.8l5.2 5.2L20 6.4"
  }),
  "shield-lock": /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M12 3l7.5 3v5.6c0 4.4-3.2 7.1-7.5 8.4-4.3-1.3-7.5-4-7.5-8.4V6L12 3z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 12.6h4v3h-4z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10.9 12.6v-1.2a1.1 1.1 0 0 1 2.2 0v1.2"
  })),
  "refresh-off": /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M18.9 8.2A8 8 0 1 0 19.6 14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.4 3.6v4.8h-4.8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6.5 17.5L17.5 6.5"
  })),
  "calendar-day": /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "5.5",
    width: "16",
    height: "14.5",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.5v4M15.5 3.5v4M4 10.5h16"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M11.4 14.8h1.4"
  })),
  clock: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "8.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 7.4v5l3.2 2.1"
  })),
  "map-pin": /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M12 20.8s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "9.8",
    r: "2.5"
  })),
  user: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "8.4",
    r: "3.6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6"
  })),
  "help-circle": /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "8.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9.7 9.6a2.4 2.4 0 1 1 3.3 2.2c-.7.3-1 .9-1 1.6v.3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 16.8h.01"
  })),
  "book-open": /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M12 6.6C10.5 5.1 8.4 4.5 5 4.5v13c3.4 0 5.5.6 7 2 1.5-1.4 3.6-2 7-2v-13c-3.4 0-5.5.6-7 2.1z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 6.6v12.9"
  })),
  scroll: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M7 4h11.5v13a3 3 0 0 0 3 3H8a3 3 0 0 1-3-3V6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9.5 8.4h6.5M9.5 12.2h6.5"
  })),
  compass: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "8.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 9l-2.1 5.2-5.2 2.1 2.1-5.2L15 9z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "0.9",
    fill: "currentColor",
    stroke: "none"
  })),
  "user-circle": /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "8.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "2.8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6.6 18.6c1.2-2 3.1-3.1 5.4-3.1s4.2 1.1 5.4 3.1"
  })),
  download: /*#__PURE__*/React.createElement("path", {
    d: "M12 4v10.4M8 11l4 4 4-4M4.5 19.5h15"
  }),
  trash: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M4 7h16M9.2 7V4.8h5.6V7M6.2 7l1 12.2h9.6L17.8 7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10.4 11v5M13.6 11v5"
  })),
  pencil: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M4.5 19.5l3.2-1L18 8.2l-2.2-2.2L5.5 16.3l-1 3.2z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14.4 7.4l2.2 2.2"
  })),
  share: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "5.2",
    r: "2.6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6.4",
    cy: "12",
    r: "2.6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "18.8",
    r: "2.6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15.7 6.6L8.7 10.7M8.7 13.3l7 4.1"
  })),
  link: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", {
    d: "M10.2 14a4 4 0 0 1 0-5.7l2.1-2.1a4 4 0 0 1 5.7 5.7l-1 1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M13.8 10a4 4 0 0 1 0 5.7l-2.1 2.1a4 4 0 0 1-5.7-5.7l1-1"
  }))
};
function Icon({
  name,
  size = 20,
  color = "currentColor",
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    style: style
  }, rest), PATHS[name] || null);
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ds_src/Lá Số Việt hero update/components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// ds_src/Lá Số Việt hero update/components/core/Seal.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Dấu triện — the signature "seal" mark. Square, double-bordered, sharp corners
 * (the one deliberate exception to the round-jointed icon set). Appears beside
 * every "Vì sao có nhận định này?" prompt and evidence citation.
 */
function Seal({
  size = 22,
  stamped = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      position: "relative",
      width: size,
      height: size,
      display: "inline-block",
      flex: "none",
      border: "1.5px solid var(--accent-seal)",
      borderRadius: "var(--radius-sm)",
      transition: "transform 220ms ease, opacity 220ms ease",
      transform: stamped ? "scale(0.88) rotate(-3deg)" : "scale(1)",
      opacity: stamped ? 0.6 : 1,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      inset: 3,
      border: "1px solid var(--accent-seal)",
      borderRadius: 2,
      display: "block"
    }
  }));
}
Object.assign(__ds_scope, { Seal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ds_src/Lá Số Việt hero update/components/core/Seal.jsx", error: String((e && e.message) || e) }); }

// ds_src/Lá Số Việt hero update/components/cards/InsightCard.jsx
try { (() => {
function InsightCard({
  num,
  title,
  sub,
  stamped = false,
  onExplain,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      background: "var(--surface-panel)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-md)",
      padding: "24px 26px",
      boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 24,
      left: -1,
      width: 2,
      height: 34,
      background: "var(--accent-gold)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 10.5,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: "var(--text-faint)"
    }
  }, "Ghi ch\xFA b\xEAn l\u1EC1 \xB7 ", num), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "12px 0 0",
      fontFamily: "var(--font-display)",
      fontSize: 19,
      lineHeight: 1.45,
      color: "var(--text-heading)"
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: "10px 0 0",
      fontFamily: "var(--font-display)",
      fontStyle: "italic",
      fontSize: 15.5,
      lineHeight: 1.6,
      color: "var(--text-muted)"
    }
  }, sub), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onExplain,
    style: {
      marginTop: 18,
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      minHeight: 44,
      padding: "0 14px 0 0",
      background: "none",
      border: "none",
      color: "var(--text-body)",
      fontSize: 13.5,
      cursor: "pointer",
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Seal, {
    size: 22,
    stamped: stamped
  }), /*#__PURE__*/React.createElement("span", null, "V\xEC sao c\xF3 nh\u1EADn \u0111\u1ECBnh n\xE0y?")));
}
Object.assign(__ds_scope, { InsightCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ds_src/Lá Số Việt hero update/components/cards/InsightCard.jsx", error: String((e && e.message) || e) }); }

// ds_src/Lá Số Việt hero update/components/disclosure/EvidenceDrawer.jsx
try { (() => {
function EvidenceDrawer({
  claim,
  confidence = "Trung bình",
  rows = [],
  open = true,
  onToggle,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--surface-panel)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-lg)",
      padding: "32px 36px",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Seal, {
    size: 24,
    style: {
      marginTop: 6
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontSize: 22,
      lineHeight: 1.42,
      color: "var(--text-heading)"
    }
  }, claim)), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "20px 0 0",
      paddingLeft: 40,
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      padding: "5px 12px",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-pill)",
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--text-body)"
    }
  }, "Tin c\u1EADy: ", confidence), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onToggle,
    style: {
      minHeight: 44,
      padding: 0,
      background: "none",
      border: "none",
      color: "var(--accent-gold)",
      fontSize: 14,
      cursor: "pointer",
      textDecoration: "underline",
      textUnderlineOffset: 4
    }
  }, "V\xEC sao c\xF3 nh\u1EADn \u0111\u1ECBnh n\xE0y?")), open && /*#__PURE__*/React.createElement("dl", {
    style: {
      margin: "24px 0 0",
      padding: "24px 0 0",
      borderTop: "1px solid var(--border-hairline)",
      display: "grid",
      gridTemplateColumns: "minmax(0, 0.7fr) minmax(0, 1.3fr)"
    }
  }, rows.map((r, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, /*#__PURE__*/React.createElement("dt", {
    style: {
      padding: i === rows.length - 1 ? "14px 24px 0 0" : "14px 24px 14px 0",
      borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--border-hairline)",
      fontFamily: "var(--font-mono)",
      fontSize: 11.5,
      letterSpacing: "0.09em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, r.label), /*#__PURE__*/React.createElement("dd", {
    style: {
      margin: 0,
      padding: i === rows.length - 1 ? "14px 0 0" : "14px 0",
      borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--border-hairline)",
      fontSize: 15,
      lineHeight: 1.6,
      color: "var(--text-body)"
    }
  }, r.value)))));
}
Object.assign(__ds_scope, { EvidenceDrawer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ds_src/Lá Số Việt hero update/components/disclosure/EvidenceDrawer.jsx", error: String((e && e.message) || e) }); }

// ds_src/Lá Số Việt hero update/components/disclosure/FaqItem.jsx
try { (() => {
function FaqItem({
  num,
  question,
  answer,
  open = false,
  onToggle,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: "1px solid var(--border-hairline)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onToggle,
    style: {
      width: "100%",
      minHeight: 44,
      padding: "24px 0",
      display: "flex",
      alignItems: "baseline",
      gap: 20,
      background: "none",
      border: "none",
      textAlign: "left",
      cursor: "pointer",
      color: "var(--text-heading)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--gold-600)",
      flex: "none"
    }
  }, num), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontFamily: "var(--font-display)",
      fontSize: 20,
      lineHeight: 1.4
    }
  }, question), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 22,
    color: "var(--accent-gold)",
    style: {
      flex: "none",
      transition: "transform 220ms ease",
      transform: open ? "rotate(180deg)" : "rotate(0deg)"
    }
  })), open && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      padding: "0 44px 26px",
      maxWidth: 720,
      fontSize: 16,
      lineHeight: 1.7,
      color: "var(--text-body)"
    }
  }, answer));
}
Object.assign(__ds_scope, { FaqItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ds_src/Lá Số Việt hero update/components/disclosure/FaqItem.jsx", error: String((e && e.message) || e) }); }

// ds_src/Lá Số Việt hero update/components/lists/TocRow.jsx
try { (() => {
function TocRow({
  numeral,
  title,
  meta,
  price,
  priceNote = "Một lần",
  sampleHref = "#",
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "28px 0",
      borderBottom: "1px solid var(--border-hairline)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13.5,
      color: "var(--gold-600)",
      width: 34,
      flex: "none"
    }
  }, numeral), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 24,
      color: "var(--text-heading)"
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 40,
      height: 1,
      borderBottom: "1px dotted var(--border-hairline)",
      transform: "translateY(-4px)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 17,
      color: "var(--gold-400)"
    }
  }, price), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11.5,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, priceNote)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      paddingLeft: 54,
      display: "flex",
      flexWrap: "wrap",
      alignItems: "baseline",
      gap: "8px 24px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: "var(--text-body)"
    }
  }, meta), /*#__PURE__*/React.createElement("a", {
    href: sampleHref,
    style: {
      fontSize: 14,
      color: "var(--accent-gold)"
    }
  }, "Xem b\xE1o c\xE1o m\u1EABu")));
}
Object.assign(__ds_scope, { TocRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ds_src/Lá Số Việt hero update/components/lists/TocRow.jsx", error: String((e && e.message) || e) }); }

// ds_src/Lá Số Việt hero update/components/lists/TrustItem.jsx
try { (() => {
function TrustItem({
  icon,
  iconColor = "var(--accent-gold)",
  num,
  title,
  body,
  bordered = true,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 28,
      borderRight: bordered ? "1px solid var(--border-hairline)" : "none",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20,
    color: iconColor
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11,
      letterSpacing: "0.14em",
      color: "var(--gold-600)"
    }
  }, num)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      fontFamily: "var(--font-display)",
      fontSize: 18,
      color: "var(--text-heading)"
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      fontSize: 14,
      lineHeight: 1.6,
      color: "var(--text-muted)"
    }
  }, body));
}
Object.assign(__ds_scope, { TrustItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ds_src/Lá Số Việt hero update/components/lists/TrustItem.jsx", error: String((e && e.message) || e) }); }

__ds_ns.ArticleCard = __ds_scope.ArticleCard;

__ds_ns.InsightCard = __ds_scope.InsightCard;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Seal = __ds_scope.Seal;

__ds_ns.EvidenceDrawer = __ds_scope.EvidenceDrawer;

__ds_ns.FaqItem = __ds_scope.FaqItem;

__ds_ns.TocRow = __ds_scope.TocRow;

__ds_ns.TrustItem = __ds_scope.TrustItem;

})();
