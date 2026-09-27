// Interactive report reader prototype (FD-104). Plain JS, no dependencies.
(function () {
  var C = LSV.CHART, P = C.palaces, PT = LSV.PORTRAIT, R = LSV.PALACE_READINGS;
  var curDec = C.decadal[C.currentDecadal];
  var SC = LSV.computeScores(C);
  var FS = [[0.92, "Nhỏ"], [1, "Vừa"], [1.1, "Lớn"]];
  var state = { mode: "new", sel: "Thìn", open: {}, read: {}, active: null, fs: 1, opener: null };
  LSV.PALACE_ORDER.slice(0, 2).forEach(function (b) { state.open[b] = true; });

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function ic(id) { return '<svg aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function rel(br) { var i = C.order.indexOf(br); return { opp: C.order[(i + 6) % 12], tri: [C.order[(i + 4) % 12], C.order[(i + 8) % 12]] }; }
  function firstSentence(t) { var m = t.match(/^(.+?[.!?])(\s|$)/); return m ? m[1] : t; }
  function isLegacy() { return state.mode === "legacy"; }

  /* ---------- Chart ---------- */
  // Layout follows a traditional printed lá số: stem-branch and palace name
  // on the top row, chính tinh in the middle with brightness, phụ tinh in two
  // columns, and vòng trường sinh along the bottom. Star colour follows ngũ
  // hành (LSV.STAR_ELEMENT); stars we are not sure about stay neutral.
  var BRIGHT_SHORT = { "Miếu": "M", "Vượng": "V", "Đắc": "Đ", "Bình": "B", "Hãm": "H", "Nhược": "N" };
  var decByBranch = {};
  C.decadal.forEach(function (d) { decByBranch[d.br] = d; });

  function mainText(p) { return p.main.length ? p.main.map(function (m) { return m[0]; }).join(", ") : "Vô chính diệu"; }
  function elClass(name) { var e = LSV.starElement(name); return e ? " el-" + e : ""; }
  function cellLabel(br) {
    var p = P[br], d = decByBranch[br];
    return "Cung " + p.name + ", " + p.can + " " + br
      + (p.menh ? ", cung Mệnh" : "") + (p.than ? ", cung Thân" : "")
      + ". " + (p.main.length
        ? p.main.map(function (m) { return m[0] + " " + m[1] + (m[2] ? " Hóa " + LSV.HOA_LABEL[m[2]] : ""); }).join(", ")
        : "Không có chính tinh")
      + (d ? ". Đại vận " + d.age[0] + " đến " + d.age[1] + " tuổi" : "");
  }
  function starMark(br) {
    var p = P[br], t = [];
    if (p.menh) t.push('<em class="mk-menh">Mệnh</em>');
    if (p.than) t.push('<em class="mk-than">Thân</em>');
    if (br === curDec.br) t.push('<em class="mk-dv">Đại vận</em>');
    if (br === C.annualBr) t.push('<em class="mk-ln">' + C.targetYear + '</em>');
    return t.join("");
  }
  function mainHtml(p, variant) {
    if (!p.main.length) return '<span class="c-main"><b class="none">Vô chính diệu</b></span>';
    if (variant === "compact") return '<span class="c-main"><b>' + mainText(p) + '</b></span>';
    return '<span class="c-main">' + p.main.map(function (m) {
      return '<b class="' + elClass(m[0]).slice(1) + '">' + m[0]
        + ' <i>' + (BRIGHT_SHORT[m[1]] || m[1]) + '</i>'
        + (m[2] ? ' <em class="hoa ' + m[2] + '">' + LSV.HOA_LABEL[m[2]] + '</em>' : '') + '</b>';
    }).join("") + '</span>';
  }
  function auxHtml(p) {
    if (!p.aux.length) return "";
    var half = Math.ceil(p.aux.length / 2);
    function col(list) {
      return '<span class="c-col">' + list.map(function (n) {
        return '<span class="' + elClass(n).slice(1) + '">' + n + '</span>';
      }).join("") + '</span>';
    }
    return '<span class="c-aux">' + col(p.aux.slice(0, half)) + col(p.aux.slice(half)) + '</span>';
  }
  function cellHtml(br, sel, variant, r) {
    var p = P[br], pos = C.pos[br], d = decByBranch[br];
    var cls = "cell" + (br === sel ? " is-sel" : "") + ((r.tri.indexOf(br) > -1 || br === r.opp) ? " is-rel" : "");
    var style = "grid-row:" + pos[0] + ";grid-column:" + pos[1];
    if (variant === "thumb") {
      return '<span class="' + cls + '" style="' + style + '" data-br="' + br + '"></span>';
    }
    var top = '<span class="c-top"><span class="c-sd">' + p.can + ' ' + br + '</span>'
      + '<span class="c-age">' + (d ? d.age[0] + "-" + d.age[1] : "") + '</span>'
      + '<span class="c-nm">' + p.name + '</span></span>';
    var bottom = '<span class="c-bot"><span class="c-mark">' + starMark(br) + '</span>'
      + '<span class="c-cyc">' + (LSV.CYCLE_STATE[br] || "") + '</span>'
      + '<span class="c-yrs">' + (d ? d.years[0] + "-" + d.years[1] : "") + '</span></span>';
    return '<button type="button" class="' + cls + '" style="' + style + '" data-br="' + br + '"'
      + ' aria-pressed="' + (br === sel) + '" aria-label="' + cellLabel(br) + '">'
      + top + mainHtml(p, variant) + (variant === "full" ? auxHtml(p) : "") + bottom + '</button>';
  }
  function centerHtml(variant, sel) {
    if (variant === "thumb") return '<span class="center"></span>';
    if (variant === "compact") return '<div class="center"><h3>' + P[sel].name + '</h3></div>';
    var m = C.meta;
    return '<div class="center">'
      + '<svg class="c-seal" aria-hidden="true"><use href="#logo"/></svg>'
      + '<p class="c-brand">Lá Số Việt</p><h3>Lá số Tử Vi</h3>'
      + '<dl><dt>Năm sinh</dt><dd>' + m.year + '</dd><dt>Giới tính</dt><dd>' + m.gender + '</dd>'
      + '<dt>Mệnh</dt><dd>' + m.menh + '</dd><dt>Cục</dt><dd>' + m.cuc + '</dd>'
      + '<dt>Thân cư</dt><dd>' + m.than + '</dd><dt>Năm xem</dt><dd>' + m.view + '</dd></dl>'
      + '<p class="c-note">Không hiện ngày giờ sinh.</p></div>';
  }
  function chartHtml(variant, sel) {
    var r = rel(sel);
    var h = '<div class="board' + (variant !== "full" ? " " + variant : "") + '" data-sel="' + sel + '">';
    C.order.forEach(function (br) { h += cellHtml(br, sel, variant, r); });
    h += centerHtml(variant, sel) + '<svg class="lines" aria-hidden="true"></svg></div>';
    if (variant === "full") {
      h += '<div class="board-key"><span class="bk-grp"><b>Độ sáng</b> M Miếu · V Vượng · Đ Đắc · B Bình · H Hãm</span>'
        + '<span class="bk-grp"><b>Ngũ hành</b>'
        + ["kim", "moc", "thuy", "hoa", "tho"].map(function (e) {
            return '<span class="bk-el el-' + e + '">' + LSV.ELEMENT_LABEL[e] + '</span>';
          }).join("")
        + '</span></div>';
    }
    return h;
  }
  function drawLines(board) {
    var sel = board.dataset.sel, r = rel(sel), svg = $(".lines", board), b = board.getBoundingClientRect();
    if (!b.width) return;
    function c(br) { var q = $('[data-br="' + br + '"]', board).getBoundingClientRect(); return [(q.left - b.left + q.width / 2).toFixed(1), (q.top - b.top + q.height / 2).toFixed(1)]; }
    var s = c(sel), t1 = c(r.tri[0]), t2 = c(r.tri[1]), o = c(r.opp);
    svg.setAttribute("viewBox", "0 0 " + b.width + " " + b.height);
    svg.innerHTML = '<polygon points="' + [s, t1, t2].map(function (p) { return p.join(","); }).join(" ") + '"/>'
      + '<line x1="' + s[0] + '" y1="' + s[1] + '" x2="' + o[0] + '" y2="' + o[1] + '"/><circle cx="' + s[0] + '" cy="' + s[1] + '" r="3.5"/>';
  }
  function drawAll() { $$(".board").forEach(drawLines); }

  function renderCharts(focusBr) {
    $("#heroChart").innerHTML = chartHtml("full", state.sel);
    $("#railChart").innerHTML = chartHtml("compact", state.sel);
    if (!$("#chartSheet").hidden) $("#sheetChart").innerHTML = chartHtml("full", state.sel);
    var p = P[state.sel];
    var text = isLegacy() ? firstSentence(LSV.LEGACY[state.sel] || R[state.sel].detail[0][1]) : R[state.sel].conclusion;
    $("#selCard").innerHTML = '<div><b>Cung ' + p.name + ' (' + p.can + ' ' + state.sel + ')</b><p>' + text + '</p></div><button type="button" class="btn btn-secondary" data-go-br="' + state.sel + '">Đọc cung này</button>';
    $$(".pcard").forEach(function (el) { el.classList.toggle("is-sel", el.dataset.br === state.sel); });
    drawAll();
    if (focusBr) { var f = $('#heroChart [data-br="' + focusBr + '"]'); if (f) f.focus(); }
  }
  function select(br, focusBr) { if (state.sel === br && !focusBr) return; state.sel = br; renderCharts(focusBr); }

  /* ---------- Content blocks ---------- */
  function starChip(s) {
    if (typeof s === "string") return '<li class="chip">' + s + '</li>';
    return '<li class="chip main">' + s[0] + (s[1] ? ' <small>' + s[1] + '</small>' : '') + (s[2] ? ' <span class="hoa ' + s[2] + '">' + LSV.HOA_LABEL[s[2]] + '</span>' : '') + '</li>';
  }
  function chips(arr) { return arr && arr.length ? '<ul class="chips" aria-label="Sao liên quan">' + arr.map(starChip).join("") + '</ul>' : ""; }
  function pointsHtml(pts) { return '<ol class="points" aria-label="Ý chính">' + pts.map(function (t, i) { return '<li><span aria-hidden="true">' + (i + 1) + '</span><div>' + t + '</div></li>'; }).join("") + '</ol>'; }
  function guideHtml(g) {
    return '<div class="guide"><div class="g-do"><h4>' + ic("ui-check") + 'Nên làm</h4><ul>' + g.do.map(function (t) { return "<li>" + t + "</li>"; }).join("") + '</ul></div>'
      + '<div class="g-no"><h4>' + ic("ui-close") + 'Nên tránh</h4><ul>' + g.avoid.map(function (t) { return "<li>" + t + "</li>"; }).join("") + '</ul></div></div>';
  }
  function whyHtml(basis) { return basis ? '<details class="why"><summary>Vì sao có nhận định này?</summary><p>Căn cứ trên lá số: ' + basis + '</p></details>' : ""; }
  function layered(o, key, flat) {
    var h = '<p class="concl">' + o.conclusion + '</p>' + pointsHtml(o.points);
    if (o.detail && o.detail.length) {
      var body = o.detail.map(function (d) { return '<h3>' + d[0] + '</h3><p>' + d[1] + '</p>'; }).join("");
      if (flat) h += '<div class="detail">' + body + '</div>';
      else {
        var words = o.detail.map(function (d) { return d[1]; }).join(" ").split(/\s+/).length;
        var min = Math.max(1, Math.round(words / 180));
        h += '<button type="button" class="more" aria-expanded="false" aria-controls="d-' + key + '" data-more><span>Đọc chi tiết</span> <small>' + o.detail.length + ' đoạn, khoảng ' + min + ' phút</small>' + ic("ui-chevron") + '</button>'
          + '<div class="detail" id="d-' + key + '" hidden>' + body + '</div>';
      }
    }
    if (o.guide) h += guideHtml(o.guide);
    return h + whyHtml(o.basis);
  }
  // Wave-1 splitter: blank lines first, else groups of 3 sentences.
  function splitLegacy(text) {
    if (/\n\s*\n/.test(text)) return text.split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    var s = text.split(/(?<=[.!?])\s+(?=\p{Lu})/u), out = [];
    for (var i = 0; i < s.length; i += 3) out.push(s.slice(i, i + 3).join(" "));
    return out;
  }
  function legacyHtml(text) {
    return '<div class="legacy">' + splitLegacy(text).map(function (p, i) {
      if (i === 0) { var f = firstSentence(p); return '<p><span class="lead-line">' + f + '</span>' + p.slice(f.length) + '</p>'; }
      return '<p>' + p + '</p>';
    }).join("") + '</div>';
  }
  function joined(o) { return (o.points || []).concat((o.detail || []).map(function (d) { return d[1]; })).join(" "); }
  function legacyText(key, o) { return LSV.LEGACY[key] || joined(o); }

  /* ---------- Độ mạnh cấu trúc ---------- */
  function radarHtml() {
    var size = 320, c = size / 2, r = 116, brs = LSV.PALACE_ORDER;
    function pt(i, v) {
      var a = (-90 + i * 30) * Math.PI / 180, d = (v / 100) * r;
      return [(c + d * Math.cos(a)).toFixed(1), (c + d * Math.sin(a)).toFixed(1)];
    }
    var rings = [20, 40, 60, 80, 100].map(function (v) {
      return '<polygon class="rd-ring" points="' + brs.map(function (_, i) { return pt(i, v).join(","); }).join(" ") + '"/>';
    }).join("");
    var axes = brs.map(function (_, i) {
      var e = pt(i, 100);
      return '<line class="rd-axis" x1="' + c + '" y1="' + c + '" x2="' + e[0] + '" y2="' + e[1] + '"/>';
    }).join("");
    var shape = brs.map(function (br, i) { return pt(i, SC[br].score).join(","); }).join(" ");
    var dots = brs.map(function (br, i) {
      var q = pt(i, SC[br].score);
      return '<circle class="rd-dot" cx="' + q[0] + '" cy="' + q[1] + '" r="3"><title>' + P[br].name + ": " + SC[br].score + '</title></circle>';
    }).join("");
    var labels = brs.map(function (br, i) {
      var a = (-90 + i * 30) * Math.PI / 180, d = r + 24;
      var x = c + d * Math.cos(a), y = c + d * Math.sin(a);
      var anchor = Math.abs(x - c) < 6 ? "middle" : (x > c ? "start" : "end");
      return '<text class="rd-lb" x="' + x.toFixed(1) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="' + anchor + '">' + P[br].name + '</text>';
    }).join("");
    return '<figure class="radar"><svg viewBox="-34 -6 ' + (size + 68) + ' ' + (size + 12) + '" role="img" aria-label="Độ mạnh cấu trúc của mười hai cung">'
      + rings + axes + '<polygon class="rd-shape" points="' + shape + '"/>' + dots + labels + '</svg>'
      + '<figcaption>Mỗi đỉnh là một cung. Càng xa tâm, bộ sao của cung đó càng thiên về hỗ trợ.</figcaption></figure>';
  }
  function scoreBadge(br) {
    var d = SC[br], b = LSV.scoreBand(d.score);
    return '<span class="sc sc-' + b.key + '" title="' + b.label + '">' + d.score + '</span>';
  }
  function scoreNote() {
    return '<details class="how"><summary>Điểm này tính thế nào?</summary>'
      + '<p>Điểm đo bộ sao của cung, không đo tốt xấu của cuộc đời bạn. Cùng một lá số thì lúc nào tính cũng ra đúng con số đó.</p>'
      + '<dl>' + LSV.SCORE_EXPLAIN.map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join("") + '</dl></details>';
  }

  /* ---------- Chapters ---------- */
  function head(ch) {
    var thumb = ch.br ? '<button type="button" class="thumb-btn" data-go-br="' + ch.br + '" aria-label="Mở cung ' + P[ch.br].name + '">' + chartHtml("thumb", ch.br) + '<span class="thumb-cap">Cung ' + P[ch.br].name + '</span></button>' : "";
    return '<div class="chap-head"><div><h2 id="h-' + ch.id + '">' + ch.title + '</h2>' + (ch.facts ? '<p class="facts">' + ch.facts + '</p>' : '') + chips(ch.stars) + '</div>' + thumb + '</div>';
  }
  function palaceBasis(br) {
    var p = P[br];
    return "Cung " + p.name + " tại " + p.can + " " + br + ": " + (p.main.length ? p.main.map(function (m) { return m[0] + " (" + m[1] + ")" + (m[2] ? " Hóa " + LSV.HOA_LABEL[m[2]] : ""); }).join(", ") : "không có chính tinh") + ". Phụ tinh: " + p.aux.join(", ") + ".";
  }
  function palaceCard(br) {
    var p = P[br], rd = R[br], open = !!state.open[br];
    var lt = isLegacy() ? legacyText(br, rd) : null;
    var tg = [];
    if (p.menh) tg.push("Mệnh"); if (p.than) tg.push("Thân");
    if (br === curDec.br) tg.push("Đại vận " + curDec.age[0] + "-" + curDec.age[1]);
    if (br === C.annualBr) tg.push("Lưu niên 2026");
    var body = chips(p.main.map(function (m) { return m; }).concat(p.aux)) + (lt ? legacyHtml(lt) : layered(rd, "p-" + p.id, true)) + whyHtml(palaceBasis(br));
    return '<article class="pcard' + (open ? ' open' : '') + (br === state.sel ? ' is-sel' : '') + '" id="p-' + p.id + '" data-br="' + br + '">'
      + '<div class="pc-head">' + chartHtml("thumb", br)
      + '<div><h3><button type="button" class="pc-btn" aria-expanded="' + open + '" aria-controls="pb-' + p.id + '" data-pc="' + br + '">' + p.name + '<small>' + p.can + ' ' + br + '</small></button>' + scoreBadge(br) + '</h3>'
      + '<p class="pc-band">' + LSV.scoreBand(SC[br].score).label + '</p>'
      + '<p class="pc-c">' + (lt ? firstSentence(lt) : rd.conclusion) + '</p>'
      + (tg.length ? '<div class="pc-tags">' + tg.map(function (t) { return '<span class="pill">' + t + '</span>'; }).join("") + '</div>' : '') + '</div>'
      + ic("ui-chevron") + '</div>'
      + '<div class="pc-body" id="pb-' + p.id + '"' + (open ? '' : ' hidden') + '>' + body + '</div></article>';
  }
  function hoaMap(ch) {
    return '<div class="hoa-map">' + ch.hoa.map(function (h) {
      var p = P[h[2]];
      return '<button type="button" class="hm" data-go-br="' + h[2] + '"><b>' + h[0] + ' <span class="hoa ' + h[1] + '">Hóa ' + LSV.HOA_LABEL[h[1]] + '</span></b><span>Nằm ở cung ' + p.name + ' (' + p.can + ' ' + h[2] + ')</span></button>';
    }).join("") + '</div>';
  }
  function chapter(ch) {
    var L = isLegacy(), h = head(ch);
    switch (ch.kind) {
      case "std": case "decadal": case "annual":
        h += L ? legacyHtml(legacyText(ch.id, ch)) + whyHtml(ch.basis) : layered(ch, ch.id); break;
      case "hoa":
        h += hoaMap(ch) + (L ? legacyHtml(legacyText(ch.id, ch)) + whyHtml(ch.basis) : layered(ch, ch.id)); break;
      case "palaces":
        var all = LSV.PALACE_ORDER.every(function (b) { return state.open[b]; });
        h += radarHtml() + scoreNote()
          + '<div class="pc-tools"><p>Bấm vào một cung, hoặc một ô trên lá số, để mở cung đó.</p><button type="button" class="more" id="pcAll" aria-pressed="' + all + '">' + (all ? "Thu gọn tất cả" : "Mở tất cả 12 cung") + '</button></div>'
          + '<div class="pc-list">' + LSV.PALACE_ORDER.map(palaceCard).join("") + '</div>'; break;
      case "themes":
        h += '<div class="theme-grid">' + ch.themes.map(function (t) {
          return '<article class="tcard" id="t-' + t.id + '"><h3>' + t.title + '</h3><div class="rel">' + t.rel.map(function (b) { return '<button type="button" data-go-br="' + b + '">Cung ' + P[b].name + '</button>'; }).join("") + '</div>'
            + (L ? legacyHtml(joined(t)) : layered(t, t.id)) + '</article>';
        }).join("") + '</div>'; break;
      case "sw":
        if (L) h += legacyHtml(ch.strengths.concat(ch.tensions).map(function (s) { return s[0] + " (" + s[1] + ")."; }).join(" ") + " " + ch.condition) + whyHtml(ch.basis);
        else h += '<p class="concl">' + ch.conclusion + '</p><div class="sw"><div><h3>Điểm mạnh</h3><ol>' + ch.strengths.map(function (s) { return '<li><b>' + s[0] + '</b><br><small>' + s[1] + '</small></li>'; }).join("") + '</ol></div><div><h3>Điểm vướng</h3><ol>' + ch.tensions.map(function (s) { return '<li><b>' + s[0] + '</b><br><small>' + s[1] + '</small></li>'; }).join("") + '</ol></div></div><p>' + ch.condition + '</p>' + whyHtml(ch.basis);
        break;
      case "sens":
        h += (L ? "" : '<p class="concl">' + ch.conclusion + '</p>') + '<div class="sens"><div class="s-stable"><h3>' + ch.stable[0] + '</h3><p>' + ch.stable[1] + '</p></div><div><h3>' + ch.sensitive[0] + '</h3><p>' + ch.sensitive[1] + '</p></div></div>'; break;
      case "acts":
        h += '<ol class="acts">' + ch.acts.map(function (a) { return '<li><h3>' + a[0] + '</h3><p><b>Vì sao:</b> ' + a[1] + '</p><p><b>Nên tránh:</b> ' + a[2] + '</p></li>'; }).join("") + '</ol>'; break;
    }
    return '<section class="chap" id="' + ch.id + '" data-chap aria-labelledby="h-' + ch.id + '">' + h + '</section>';
  }

  /* ---------- Hero, timeline, TOC ---------- */
  var META = '<b>Nam</b>, sinh năm Quý Dậu 1993. Mệnh <b>Bính Thìn</b>, Thân cư <b>Thiên Di</b>, <b>Thổ ngũ cục</b>.';
  function renderHero() {
    if (isLegacy()) {
      $("#heroCopy").innerHTML = '<div class="legacy-hero"><h1>Báo cáo luận giải toàn diện</h1><p class="meta">' + META + '</p>'
        + '<p class="proto-note">Báo cáo đã bán không có chân dung, kết luận và ý chính vì chữ cũ không có các phần này. Lá số, thẻ sao, dòng thời gian, tách đoạn và 12 cung mở/đóng vẫn có đủ.</p>'
        + '<div class="hero-cta"><a class="btn btn-primary" href="#tong-quan">Bắt đầu đọc</a></div></div>';
      return;
    }
    function items(arr) { return arr.map(function (s) { return '<li><button type="button" data-go="' + s.go + '"><b>' + s.t + '</b><small>' + s.b + '</small></button></li>'; }).join(""); }
    $("#heroCopy").innerHTML = '<p class="eyebrow">Báo cáo luận giải toàn diện</p><h1>' + PT.headline + '</h1><p class="meta">' + META + '</p>'
      + '<div class="pt-cols"><div class="pt-col plus"><h2>' + ic("ui-check") + 'Thế mạnh</h2><ul>' + items(PT.strengths) + '</ul></div>'
      + '<div class="pt-col minus"><h2>' + ic("ui-bell") + 'Cần để ý</h2><ul>' + items(PT.watchouts) + '</ul></div></div>'
      + '<div class="pt-year"><span class="yr">2026</span><p>' + PT.year + '</p></div>'
      + '<div class="hero-cta"><a class="btn btn-primary" href="#tong-quan">Bắt đầu đọc</a><button type="button" class="btn btn-secondary" data-open="shareSheet">' + ic("ui-share") + 'Tạo thẻ chia sẻ</button></div>';
  }
  function renderTimeline() {
    var pct = ((C.targetYear - curDec.years[0] + 0.5) / 10 * 100).toFixed(1);
    var strip = C.decadal.map(function (d, i) {
      var now = i === C.currentDecadal, past = i < C.currentDecadal;
      return '<div role="listitem"><button type="button" class="seg-c' + (now ? ' now' : '') + (past ? ' past' : '') + '" data-tl="' + i + '" aria-label="Chặng ' + d.age[0] + ' đến ' + d.age[1] + ' tuổi, năm ' + d.years[0] + ' đến ' + d.years[1] + ', cung ' + P[d.br].name + (now ? ', chặng hiện tại' : '') + '">'
        + (now ? '<span class="pill seal now-tag">Hiện tại, năm ' + C.targetYear + '</span>' : '')
        + '<span class="age">' + d.age[0] + '-' + d.age[1] + ' tuổi</span><span class="pal">' + P[d.br].name + ' (' + d.br + ')</span><span class="yrs">' + d.years[0] + '-' + d.years[1] + '</span>'
        + '<span class="bar">' + (now ? '<i style="left:' + pct + '%"></i>' : '') + '</span></button></div>';
    }).join("");
    var list = C.decadal.map(function (d, i) {
      var now = i === C.currentDecadal;
      return '<article class="dv-row' + (now ? ' now' : '') + '">'
        + '<h3>' + d.age[0] + '-' + d.age[1] + ' tuổi <small>' + d.years[0] + '-' + d.years[1] + ' · cung ' + P[d.br].name + '</small>'
        + (now ? ' <span class="pill seal">Đang sống</span>' : '') + '</h3>'
        + '<p>' + d.teaser + '</p>'
        + '<div class="dv-act">'
        + (now
            ? '<button type="button" class="btn btn-primary" data-go="dai-van">Đọc đầy đủ chặng này</button>'
            : '<button type="button" class="btn btn-secondary" data-go-br="' + d.br + '">Đọc cung ' + P[d.br].name + '</button>')
        + '</div></article>';
    }).join("");
    $("#tl").innerHTML = strip;
    $("#tlList").innerHTML = list;
  }
  function tocHtml() {
    return LSV.CHAPTERS.map(function (ch) {
      var done = !!state.read[ch.id];
      return '<li><a href="#' + ch.id + '" data-toc="' + ch.id + '"' + (state.active === ch.id ? ' aria-current="true"' : '') + '><span class="mk' + (done ? ' done' : '') + '">' + (done ? ic("ui-check") : '') + '</span>' + ch.toc + '</a></li>';
    }).join("");
  }
  function renderToc() {
    var n = Object.keys(state.read).length, total = LSV.CHAPTERS.length;
    $("#toc").innerHTML = tocHtml();
    $("#tocSheetList").innerHTML = tocHtml();
    $("#railCount").innerHTML = "Đã đọc <b>" + n + "/" + total + "</b> phần";
    $("#railTrack").style.width = (n / total * 100) + "%";
  }
  function renderArticle() { $("#article").innerHTML = LSV.CHAPTERS.map(chapter).join(""); }
  function renderShare() {
    $("#shareCard").innerHTML = '<div class="sc-brand"><svg aria-hidden="true"><use href="#logo"/></svg>Lá Số Việt</div><q>' + PT.headline + '</q><ul>' + PT.strengths.map(function (s) { return '<li>' + s.t + '</li>'; }).join("") + '</ul><small>lasoviet.net</small>';
  }
  function renderAll() { renderHero(); renderArticle(); renderTimeline(); renderCharts(); renderToc(); onScroll(); }

  /* ---------- Behaviour ---------- */
  function setCard(br, open) {
    state.open[br] = open;
    var card = $('.pcard[data-br="' + br + '"]'); if (!card) return;
    card.classList.toggle("open", open);
    $(".pc-body", card).hidden = !open;
    $(".pc-btn", card).setAttribute("aria-expanded", open);
    drawLines($(".board", card));
  }
  function goPalace(br) {
    closeSheets(true);
    select(br);
    setCard(br, true);
    var card = $('.pcard[data-br="' + br + '"]');
    card.scrollIntoView({ block: "start" });
    $(".pc-btn", card).focus({ preventScroll: true });
  }
  function goId(id) {
    var br = null; Object.keys(P).forEach(function (b) { if ("p-" + P[b].id === id) br = b; });
    if (br) return goPalace(br);
    var el = document.getElementById(id); if (el) el.scrollIntoView({ block: "start" });
  }

  var raf = 0;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var art = $("#article"), r = art.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
      $("#rb").style.width = (p * 100) + "%";
      $("#bbarPct").textContent = Math.round(p * 100) + "%";
      var line = innerHeight * 0.35, act = null, chaps = $$("[data-chap]");
      chaps.forEach(function (c) { if (c.getBoundingClientRect().top < line) act = c.id; });
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4 && chaps.length) act = chaps[chaps.length - 1].id;
      var changed = act !== state.active || (act && !state.read[act]);
      state.active = act; if (act) state.read[act] = true;
      if (changed) renderToc();
      // Lit palace follows the reading position.
      var follow = null;
      if (act === "muoi-hai-cung") $$(".pcard").forEach(function (c) { if (c.getBoundingClientRect().top < line) follow = c.dataset.br; });
      else { var ch = LSV.CHAPTERS.filter(function (c) { return c.id === act; })[0]; if (ch && ch.br) follow = ch.br; }
      if (follow && follow !== state.sel && r.top < 0) select(follow);
    });
  }

  function setFont(i) {
    state.fs = Math.max(0, Math.min(2, i));
    document.documentElement.style.setProperty("--rs", FS[state.fs][0]);
    $("#fszLabel").textContent = FS[state.fs][1];
    $("#fszDown").disabled = state.fs === 0; $("#fszUp").disabled = state.fs === 2;
    try { localStorage.setItem("lsv-font-idx", state.fs); } catch (e) {}
    requestAnimationFrame(drawAll);
  }
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    $$("[data-theme-btn]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.themeBtn === t); });
    try { localStorage.setItem("lasoviet:theme", t); } catch (e) {}
  }
  function setMode(m) {
    state.mode = m;
    $$("[data-mode]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.mode === m); });
    renderAll();
  }

  function openSheet(id, opener) {
    closeSheets(true);
    var w = document.getElementById(id); w.hidden = false; state.opener = opener || null;
    if (id === "chartSheet") { $("#sheetChart").innerHTML = chartHtml("full", state.sel); drawLines($("#sheetChart .board")); }
    var f = $("button, a", $(".sheet", w)); if (f) f.focus();
  }
  function closeSheets(silent) {
    $$(".sheet-wrap").forEach(function (w) { w.hidden = true; });
    if (!silent && state.opener) state.opener.focus();
    if (!silent) state.opener = null;
  }
  function doPrint() {
    var prev = JSON.stringify(state.open);
    LSV.PALACE_ORDER.forEach(function (b) { setCard(b, true); });
    $$(".detail[hidden]").forEach(function (d) { d.hidden = false; });
    window.print();
    state.open = JSON.parse(prev); renderArticle(); onScroll();
  }

  document.addEventListener("click", function (e) {
    var t = e.target, el;
    if ((el = t.closest("[data-mode]"))) return setMode(el.dataset.mode);
    if ((el = t.closest("[data-theme-btn]"))) return setTheme(el.dataset.themeBtn);
    if ((el = t.closest("[data-open]"))) return openSheet(el.dataset.open, el);
    if (t.closest("[data-close]")) return closeSheets();
    if ((el = t.closest("#heroChart .cell"))) return select(el.dataset.br, el.dataset.br);
    if ((el = t.closest("#railChart .cell, #sheetChart .cell"))) return goPalace(el.dataset.br);
    if ((el = t.closest("[data-go-br]"))) return goPalace(el.dataset.goBr);
    if ((el = t.closest("[data-go]"))) return goId(el.dataset.go);
    if ((el = t.closest("[data-pc]"))) { var br = el.dataset.pc; setCard(br, !state.open[br]); if (state.open[br]) select(br); return; }
    if ((el = t.closest(".pc-head"))) { var b2 = el.parentNode.dataset.br; setCard(b2, !state.open[b2]); if (state.open[b2]) select(b2); return; }
    if ((el = t.closest("[data-more]"))) {
      var d = document.getElementById(el.getAttribute("aria-controls")), open = d.hidden;
      d.hidden = !open; el.setAttribute("aria-expanded", open); $("span", el).textContent = open ? "Thu gọn" : "Đọc chi tiết"; return;
    }
    if ((el = t.closest("#pcAll"))) { var all = el.getAttribute("aria-pressed") !== "true"; LSV.PALACE_ORDER.forEach(function (b) { setCard(b, all); }); el.setAttribute("aria-pressed", all); el.textContent = all ? "Thu gọn tất cả" : "Mở tất cả 12 cung"; return; }
    if ((el = t.closest("[data-tl]"))) { var i = +el.dataset.tl; return i === C.currentDecadal ? goId("dai-van") : goPalace(C.decadal[i].br); }
    if ((el = t.closest("#tocSheetList a"))) { closeSheets(true); return; }
    if (t.closest("#fszDown")) return setFont(state.fs - 1);
    if (t.closest("#fszUp")) return setFont(state.fs + 1);
    if (t.closest("#printBtn, #printBtn2")) return doPrint();
    if ((el = t.closest("#copyLink"))) { try { navigator.clipboard.writeText(location.href); el.textContent = "Đã sao chép"; } catch (x) {} return; }
  });
  document.addEventListener("keydown", function (e) {
    var open = $(".sheet-wrap:not([hidden])");
    if (!open) return;
    if (e.key === "Escape") { e.preventDefault(); return closeSheets(); }
    if (e.key === "Tab") {
      var f = $$("button:not([disabled]), a[href]", open); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", function () { requestAnimationFrame(drawAll); });

  var fi = 1; try { var s = parseInt(localStorage.getItem("lsv-font-idx"), 10); if (s >= 0 && s <= 2) fi = s; } catch (e) {}
  setTheme(document.documentElement.dataset.theme || "dark");
  setFont(fi);
  renderShare();
  renderAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawAll);
})();
