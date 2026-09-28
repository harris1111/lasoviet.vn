// Free result page prototype v2 (FD-105 funnel, FD-107 scores, FD-108 reveal).
// Spec: docs/superpowers/specs/2026-09-28-free-result-page-design.md
// Mobile-first: below 1024px one scrolling page in beat order; from 1024px
// the same sections are grouped into six tabs beside a sticky chart.
// Plain JS, no dependencies. Every purchase and payment is simulated.
(function () {
  var C = LSV.CHART, P = C.palaces, R = LSV.PALACE_READINGS;
  var SC = LSV.computeScores(C);
  var curDec = C.decadal[C.currentDecadal];
  var DESK = window.matchMedia("(min-width: 1024px)");

  var PRICE = { palace: 120, banmenh: 240, trondoi: 960, homnay: 60, vanhan: 480, topic: 480, hopdoi: 600 };
  // Illustrative top-up packs (FD-066 names; totals from the FD-105 §5.1 table).
  var PACKS = [
    { id: "nhap-mon", name: "Nhập Môn", la: 300, vnd: "29.000đ" },
    { id: "khoi-doc", name: "Khởi Đọc", la: 1100, vnd: "99.000đ", tag: "Hay chọn" },
    { id: "kham-pha", name: "Khám Phá", la: 3000, vnd: "249.000đ" },
    { id: "tang-thu", name: "Tàng Thư", la: 8000, vnd: "599.000đ" },
  ];
  var TABS = [
    ["la-so", "Lá số"], ["tong-quan", "Tổng quan"], ["nam-nay", "Năm nay"],
    ["12-cung", "12 cung"], ["chu-de", "Chủ đề"], ["can-cu", "Căn cứ"],
  ];
  var BANMENH_PALACES = ["Thìn", "Tuất"]; // Mệnh and Thân: the scope of Bản mệnh in this sample.

  var state = {
    signed: false, balance: 0, tab: "la-so", sel: "Thìn",
    unlocked: {}, previewed: {}, spentNatal: 0, banmenh: false, trondoi: false,
    homnay: false, vanhan: false, topics: {}, fb: {}, pending: null, opener: null,
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function ic(id) { return '<svg aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function fmt(n) { return n.toLocaleString("vi-VN"); }
  function rel(br) { var i = C.order.indexOf(br); return { opp: C.order[(i + 6) % 12], tri: [C.order[(i + 4) % 12], C.order[(i + 8) % 12]] }; }
  function band(br) { return LSV.scoreBand(SC[br].score); }
  function badge(br) { var b = band(br); return '<span class="sc sc-' + b.key + '" title="' + b.label + '">' + SC[br].score + '</span>'; }

  var ranked = LSV.PALACE_ORDER.slice().sort(function (a, b) { return SC[b].score - SC[a].score; });
  var STRONG = ranked[0], WEAK = ranked[ranked.length - 1];

  /* ---------- Content written for this page (beginner-first voice) ---------- */
  var INSIGHT1 = {
    title: "Bạn là người giữ nền, cho mình và cho cả những người quanh mình.",
    body: [
      "Cung Mệnh của bạn có Thiên Phủ, ngôi sao trông coi kho, và nó đứng ở vị trí sáng nhất. Người có Thiên Phủ sáng ở Mệnh mang sẵn một phản xạ lo trước: tiêu thì nghĩ đến phần còn lại, nhận việc thì nghĩ đến lúc phải trả.",
      "Đi cùng là Liêm Trinh, sao của phép tắc. Vì thế bạn giữ lời rất chặt, khó chịu khi người khác làm ẩu, và người ta thường giao việc cho bạn rồi thôi, không phải dặn lại. Cái giá là bạn hay ôm nhiều hơn phần mình, và ít khi chịu nhờ ai.",
    ],
    why: "Cung Mệnh tại Bính Thìn: Thiên Phủ (Miếu), Liêm Trinh (Bình). Phụ tinh: Âm Sát, Bệnh Phù, Thiên Sát, Long Đức.",
  };
  var INSIGHT2 = {
    concern: "Công việc, sự nghiệp",
    title: "Bạn hợp với những việc được giao quyền giữ tiền, giữ người.",
    body: [
      "Cung Quan Lộc, nơi xem đường công việc, là cung mạnh nhất lá số của bạn. Ở đây có Vũ Khúc, sao của tiền bạc và sự dứt khoát, đi cùng Thiên Tướng, sao của người đứng ra gánh vác và giữ chữ tín.",
      "Hai sao này ghép lại hợp với vai trò quản lý: quản tiền, quản người, quản quy trình. Nơi nào trả công cho sự chỉn chu, nơi đó bạn lên nhanh. Còn chỗ chỉ chuộng ăn nói hay chạy theo phong trào thì bạn sẽ thấy mình bị đánh giá thấp.",
    ],
    why: "Cung Quan Lộc tại Canh Thân: Vũ Khúc (Đắc), Thiên Tướng (Miếu), Tả Phù. Điểm cấu trúc 83, cao nhất trong 12 cung.",
  };
  var YEAR = { han: 2, thuan: 3, nearest: 10, thuanMonths: [2, 5, 7], hanMonths: [4, 10] };
  var TOPICS = [
    { id: "cong-viec", name: "Công việc và tài lộc", price: PRICE.topic, teaser: "Vì sao tiền của bạn đến chậm mà chắc, và giai đoạn nào nên mở rộng, giai đoạn nào nên giữ.", rel: ["Thân", "Tý", "Tuất"], match: true },
    { id: "tinh-duyen", name: "Tình duyên và hôn nhân", price: PRICE.topic, teaser: "Người đồng hành của bạn là người có chí riêng. Phần này nói rõ đi cùng thế nào để không thành giằng co.", rel: ["Dần", "Thân", "Tuất"] },
    { id: "van-han", name: "Vận hạn năm 2026", price: PRICE.vanhan, teaser: "Hai tháng cần chú ý năm nay rơi vào chuyện gì, và chuẩn bị ra sao cho từng tháng.", rel: ["Ngọ"] },
    { id: "hop-doi", name: "Hợp đôi", price: PRICE.hopdoi, teaser: "Đặt lá số của bạn cạnh lá số người ấy: chỗ hai người bù cho nhau, chỗ dễ vướng.", rel: ["Dần"] },
  ];

  /* ---------- Chart (same drawing as the report reader, FD-106a) ---------- */
  var BRIGHT_SHORT = { "Miếu": "M", "Vượng": "V", "Đắc": "Đ", "Bình": "B", "Hãm": "H", "Nhược": "N" };
  var decByBranch = {}; C.decadal.forEach(function (d) { decByBranch[d.br] = d; });
  function elClass(name) { var e = LSV.starElement(name); return e ? "el-" + e : ""; }
  function starMark(br) {
    var p = P[br], t = [];
    if (p.menh) t.push('<em class="mk-menh">Mệnh</em>');
    if (p.than) t.push('<em class="mk-than">Thân</em>');
    if (br === curDec.br) t.push('<em class="mk-dv">Đại vận</em>');
    if (br === C.annualBr) t.push('<em class="mk-ln">' + C.targetYear + '</em>');
    return t.join("");
  }
  function cellHtml(br, sel, r) {
    var p = P[br], pos = C.pos[br], d = decByBranch[br];
    var cls = "cell" + (br === sel ? " is-sel" : "") + ((r.tri.indexOf(br) > -1 || br === r.opp) ? " is-rel" : "");
    var main = p.main.length
      ? '<span class="c-main">' + p.main.map(function (m) {
          return '<b class="' + elClass(m[0]) + '">' + m[0] + ' <i>' + (BRIGHT_SHORT[m[1]] || m[1]) + '</i>'
            + (m[2] ? ' <em class="hoa ' + m[2] + '">' + LSV.HOA_LABEL[m[2]] + '</em>' : '') + '</b>';
        }).join("") + '</span>'
      : '<span class="c-main"><b class="none">Vô chính diệu</b></span>';
    var half = Math.ceil(p.aux.length / 2);
    function col(list) { return '<span class="c-col">' + list.map(function (n) { return '<span class="' + elClass(n) + '">' + n + '</span>'; }).join("") + '</span>'; }
    var aux = p.aux.length ? '<span class="c-aux">' + col(p.aux.slice(0, half)) + col(p.aux.slice(half)) + '</span>' : "";
    return '<button type="button" class="' + cls + '" style="grid-row:' + pos[0] + ';grid-column:' + pos[1] + '" data-br="' + br + '"'
      + ' aria-label="Cung ' + p.name + ', ' + p.can + ' ' + br + ', điểm ' + SC[br].score + '">'
      + '<span class="c-top"><span class="c-sd">' + p.can + ' ' + br + '</span><span class="c-age">' + (d ? d.age[0] + "-" + d.age[1] : "") + '</span>'
      + '<span class="c-nm">' + p.name + '</span></span>'
      + main + aux
      + '<span class="c-bot"><span class="c-mark">' + starMark(br) + '</span><span class="c-cyc">' + (LSV.CYCLE_STATE[br] || "") + '</span>'
      + '<span class="c-score sc-' + band(br).key + '">' + SC[br].score + '</span></span></button>';
  }
  function chartHtml(sel, variant) {
    var r = rel(sel), m = C.meta;
    var h = '<div class="board' + (variant ? " " + variant : "") + '" data-sel="' + sel + '">';
    C.order.forEach(function (br) { h += cellHtml(br, sel, r); });
    h += variant === "thumb" ? '<span class="center"></span>'
      : '<div class="center"><span class="c-seal" aria-hidden="true"></span><p class="c-brand">Lá Số Việt</p><h3>Lá số Tử Vi</h3>'
        + '<dl><dt>Năm sinh</dt><dd>' + m.year + '</dd><dt>Giới tính</dt><dd>' + m.gender + '</dd><dt>Mệnh</dt><dd>' + m.menh + '</dd>'
        + '<dt>Cục</dt><dd>' + m.cuc + '</dd><dt>Thân cư</dt><dd>' + m.than + '</dd><dt>Năm xem</dt><dd>' + m.view + '</dd></dl></div>';
    return h + '<svg class="lines" aria-hidden="true"></svg></div>';
  }
  function drawLines(board) {
    if (!board) return;
    var sel = board.dataset.sel, r = rel(sel), svg = $(".lines", board), b = board.getBoundingClientRect();
    if (!b.width) return;
    function c(br) { var q = $('[data-br="' + br + '"]', board).getBoundingClientRect(); return [(q.left - b.left + q.width / 2).toFixed(1), (q.top - b.top + q.height / 2).toFixed(1)]; }
    var s = c(sel), t1 = c(r.tri[0]), t2 = c(r.tri[1]), o = c(r.opp);
    svg.setAttribute("viewBox", "0 0 " + b.width + " " + b.height);
    svg.innerHTML = '<polygon points="' + [s, t1, t2].map(function (p) { return p.join(","); }).join(" ") + '"/>'
      + '<line x1="' + s[0] + '" y1="' + s[1] + '" x2="' + o[0] + '" y2="' + o[1] + '"/><circle cx="' + s[0] + '" cy="' + s[1] + '" r="3.5"/>';
  }
  function renderChart() {
    $("#chartMain").innerHTML = chartHtml(state.sel) + '<div class="legend" aria-hidden="true"><span><i class="l-sel"></i>Cung đang xem</span><span><i class="l-rel"></i>Tam hợp, đối cung</span><span>Số góc ô: điểm cấu trúc</span></div>';
    requestAnimationFrame(function () { drawLines($("#chartMain .board")); });
  }

  /* ---------- Small builders ---------- */
  // Editorial spine: 03 ——————— MIỄN PHÍ. The numeral gives the long scroll
  // something to hold on to, the same device the paid reader uses.
  function secHead(id, num, label, title, sub) {
    return '<p class="fr-eyebrow">' + (num ? '<b>' + num + '</b>' : '') + '<i></i>' + (label ? '<span>' + label + '</span>' : '') + '</p>'
      + '<h2 id="' + id + '">' + title + '</h2>' + (sub ? '<p class="fr-sub">' + sub + '</p>' : '');
  }
  function why(t) { return '<details class="why"><summary>Vì sao có nhận định này?</summary><p>Căn cứ trên lá số: ' + t + '</p></details>'; }
  function feedback(key) {
    var v = state.fb[key];
    return '<div class="fr-fb" role="group" aria-label="Nhận định này có đúng với bạn không?"><span>Có đúng với bạn không?</span>'
      + [["dung", "Đúng"], ["mot-phan", "Một phần"], ["khong", "Không đúng"]].map(function (o) {
          return '<button type="button" data-fb="' + key + ':' + o[0] + '" aria-pressed="' + (v === o[0]) + '">' + o[1] + '</button>';
        }).join("") + '</div>';
  }
  // Placeholder bars are generated from a length hint. No locked text is in
  // the payload, so this is a picture of writing, not the writing.
  function blurLines(n, note) {
    var w = [96, 88, 92, 70, 94, 83, 90, 60];
    var h = '<div class="fr-blur" aria-hidden="true">';
    for (var i = 0; i < n; i++) h += '<i style="width:' + w[i % w.length] + '%"></i>';
    h += '</div>';
    if (note) h += '<p class="fr-lockchip">' + ic("ui-lock") + note + '</p>';
    return h;
  }
  function excerpt(br) {
    // Server-side clip in production: first sentence plus the start of the next, cut mid-thought.
    var t = R[br].detail[0], m = t.match(/^(.+?[.!?])\s+(.*)$/);
    if (!m) return t.split(" ").slice(0, 24).join(" ") + "…";
    return m[1] + " " + m[2].split(" ").slice(0, 9).join(" ") + "…";
  }
  function wordCount(br) { return R[br].detail.join(" ").split(/\s+/).length; }
  function palaceState(br) {
    if (isOpen(br)) return ["read", "Đã mở"];
    if (state.previewed[br]) return ["peek", "Đã xem trước"];
    return ["new", "Chưa mở"];
  }
  function isOpen(br) { return state.trondoi || state.unlocked[br] || (state.banmenh && BANMENH_PALACES.indexOf(br) > -1); }
  function openCount() { return LSV.PALACE_ORDER.filter(isOpen).length; }
  function trondoiPrice() { return Math.max(0, PRICE.trondoi - state.spentNatal); }

  /* ---------- Beats ---------- */
  function renderTop() {
    $("#frMeta").innerHTML = "<b>Nam</b>, sinh năm Quý Dậu 1993 · Mệnh <b>Bính Thìn</b> · Thân cư <b>Thiên Di</b> · <b>Thổ ngũ cục</b>";
    $("#guestNote").hidden = state.signed;
    $("#headRight").innerHTML = state.signed
      ? '<span class="fr-bal" aria-label="Số Lá">' + fmt(state.balance) + ' Lá</span><span class="fr-avatar" aria-hidden="true">B</span>'
      : '<button type="button" class="btn btn-secondary fr-login" data-save>Đăng nhập</button>';
  }
  function renderTabs() {
    $("#tabs").innerHTML = TABS.map(function (t) {
      var extra = t[0] === "nam-nay" ? ' <span class="count">' + YEAR.han + ' tháng hạn</span>' : "";
      return '<button role="tab" type="button" data-tab-btn="' + t[0] + '" aria-selected="' + (state.tab === t[0]) + '">' + t[1] + extra + '</button>';
    }).join("");
    $$("#frMain > .fr-sec").forEach(function (s) {
      s.classList.toggle("on", s.dataset.tab === state.tab);
    });
  }
  function renderInsight() {
    $("#s-insight").innerHTML = secHead("insightTitle", "02", "Miễn phí, đọc trọn vẹn", "Điều đầu tiên lá số nói về bạn")
      + '<div class="fr-letter"><p class="fr-lead">' + INSIGHT1.title + '</p>'
      + INSIGHT1.body.map(function (p) { return "<p>" + p + "</p>"; }).join("")
      + why(INSIGHT1.why) + feedback("i1") + '</div>';
  }
  function renderScores() {
    var s = SC[STRONG].score, w = SC[WEAK].score;
    $("#s-scores").innerHTML = secHead("scoresTitle", "03", "Miễn phí", "Mười hai cung của bạn mạnh yếu ra sao", "Mỗi cung được chấm theo bộ sao đang đóng trong đó và các cung chiếu tới. Cùng một lá số thì lúc nào tính cũng ra đúng con số đó.")
      + radarHtml()
      + '<div class="fr-extremes">'
      + '<button type="button" class="fr-ext is-strong" data-palace="' + STRONG + '"><small>Mạnh nhất</small><b>' + P[STRONG].name + ' ' + badge(STRONG) + '</b><span>' + band(STRONG).label + '</span></button>'
      + '<button type="button" class="fr-ext is-weak" data-palace="' + WEAK + '"><small>Cần để ý nhất</small><b>' + P[WEAK].name + ' ' + badge(WEAK) + '</b><span>' + band(WEAK).label + '</span></button>'
      + '</div>'
      + '<div class="fr-seal-card"><q>Vì sao cung ' + P[WEAK].name + ' của bạn chỉ ' + w + ' điểm?</q>'
      + '<p>Hai sao mạnh và cứng đang đóng ở đây, lại không có chính tinh giữ nhịp. Phần luận giải cung ' + P[WEAK].name + ' nói rõ chuyện này ảnh hưởng tới con cái và người cấp dưới của bạn ra sao, kèm việc nên làm.</p>'
      + '<button type="button" class="btn btn-primary" data-palace="' + WEAK + '">Xem cung ' + P[WEAK].name + '</button></div>'
      + '<details class="how"><summary>Điểm này tính thế nào?</summary><p>Điểm đo bộ sao của cung, không đo tốt xấu của cuộc đời bạn. Cung ' + P[STRONG].name + ' được ' + s + ' điểm, cung ' + P[WEAK].name + ' được ' + w + ' điểm.</p><dl>'
      + LSV.SCORE_EXPLAIN.map(function (x) { return "<dt>" + x[0] + "</dt><dd>" + x[1] + "</dd>"; }).join("") + '</dl></details>';
  }
  function radarHtml() {
    var size = 320, c = size / 2, r = 108, brs = LSV.PALACE_ORDER;
    function pt(i, v) { var a = (-90 + i * 30) * Math.PI / 180, d = (v / 100) * r; return [(c + d * Math.cos(a)).toFixed(1), (c + d * Math.sin(a)).toFixed(1)]; }
    var rings = [25, 50, 75, 100].map(function (v) { return '<polygon class="rd-ring" points="' + brs.map(function (_, i) { return pt(i, v).join(","); }).join(" ") + '"/>'; }).join("");
    var axes = brs.map(function (_, i) { var e = pt(i, 100); return '<line class="rd-axis" x1="' + c + '" y1="' + c + '" x2="' + e[0] + '" y2="' + e[1] + '"/>'; }).join("");
    var shape = brs.map(function (br, i) { return pt(i, SC[br].score).join(","); }).join(" ");
    var dots = brs.map(function (br, i) {
      var q = pt(i, SC[br].score), k = br === STRONG ? " is-strong" : br === WEAK ? " is-weak" : "";
      return '<circle class="rd-dot' + k + '" cx="' + q[0] + '" cy="' + q[1] + '" r="' + (k ? 5.5 : 3.2) + '"/>';
    }).join("");
    var labels = brs.map(function (br, i) {
      var a = (-90 + i * 30) * Math.PI / 180, d = r + 26, x = c + d * Math.cos(a), y = c + d * Math.sin(a);
      var anchor = Math.abs(x - c) < 8 ? "middle" : (x > c ? "start" : "end");
      var k = br === STRONG ? " is-strong" : br === WEAK ? " is-weak" : "";
      return '<text class="rd-lb' + k + '" x="' + x.toFixed(1) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="' + anchor + '">' + P[br].name + ' <tspan>' + SC[br].score + '</tspan></text>';
    }).join("");
    return '<figure class="radar fr-radar"><svg viewBox="-74 -14 ' + (size + 148) + ' ' + (size + 28) + '" role="img" aria-label="Điểm cấu trúc của 12 cung">'
      + '<defs><radialGradient id="frShapeFill" cx="50%" cy="50%" r="50%">'
      + '<stop offset="0%" stop-color="rgba(201,164,77,.42)"/><stop offset="100%" stop-color="rgba(201,164,77,.10)"/>'
      + '</radialGradient></defs>'
      + rings + axes + '<polygon class="rd-shape" points="' + shape + '"/>' + dots + labels + '</svg></figure>';
  }
  function renderYear() {
    var months = "";
    for (var m = 1; m <= 12; m++) {
      var han = YEAR.hanMonths.indexOf(m) > -1, thuan = YEAR.thuanMonths.indexOf(m) > -1;
      var shown = state.vanhan || state.trondoi || (state.signed && m === YEAR.nearest);
      if (han && shown) months += '<li class="m-han"><b>T' + m + '</b><span>Cần chú ý</span></li>';
      else if (han) months += '<li class="m-plain"><b>T' + m + '</b>' + ic("ui-lock") + '</li>';
      else if (thuan) months += '<li class="m-thuan"><b>T' + m + '</b><span>Thuận</span></li>';
      else months += '<li class="m-plain"><b>T' + m + '</b><span>&nbsp;</span></li>';
    }
    var hidden = YEAR.han - (state.vanhan || state.trondoi ? YEAR.han : (state.signed ? 1 : 0));
    var locked = hidden > 0
      ? '<p class="fr-year-lock">' + ic("ui-lock") + '<span>' + (state.signed ? "Còn " + hidden + " tháng cần chú ý chưa hiện." : YEAR.han + " tháng cần chú ý đang ẩn.") + ' Mở để biết đúng tháng nào, chuyện gì, chuẩn bị ra sao.</span></p>'
      : "";
    var nearestNote = state.signed && !(state.vanhan || state.trondoi)
      ? '<p class="fr-year-near"><b>Tháng ' + YEAR.nearest + ' âm lịch</b> là tháng cần chú ý gần nhất của bạn. Chuyện nổi lên trong tháng này và cách chuẩn bị nằm trong phần Vận hạn năm 2026.</p>' : "";
    $("#s-year").innerHTML = secHead("yearTitle", "04", "Năm " + C.targetYear, "Năm Bính Ngọ của bạn", "34 tuổi âm · lưu niên đi qua cung " + P[C.annualBr].name + ".")
      + '<p class="fr-year-sum">Năm nay có <b>' + YEAR.han + ' tháng cần chú ý</b> và <b>' + YEAR.thuan + ' tháng thuận</b>.</p>'
      + '<ol class="fr-months" aria-label="12 tháng âm lịch năm ' + C.targetYear + '">' + months + '</ol>'
      + nearestNote + locked
      + (state.vanhan || state.trondoi ? '<p class="fr-done">' + ic("ui-check") + 'Bạn đã mở Vận hạn năm 2026.</p>'
        : '<button type="button" class="btn btn-primary fr-wide" data-buy="vanhan">Mở Vận hạn năm 2026 · ' + PRICE.vanhan + ' Lá</button>');
  }
  function renderSave() {
    var s = $("#s-save");
    s.hidden = state.signed;
    if (state.signed) { s.innerHTML = ""; return; }
    s.innerHTML = '<div class="fr-panel fr-save">' + secHead("saveTitle", "05", "", "Lá số còn điều thứ hai muốn nói với bạn")
      + '<p>Điều thứ hai được chọn theo chuyện bạn đang bận tâm nhất. Lưu lá số miễn phí để đọc, và nhận <b>60 Lá tặng</b> để mở phần đầu tiên.</p>'
      + blurLines(3, "Điều thứ hai đang khoá")
      + '<button type="button" class="btn btn-primary fr-wide" data-save>' + '<span class="g-dot" aria-hidden="true">G</span>Lưu lá số và đọc tiếp</button>'
      + '<p class="fr-fine">Chưa lưu thì lá số tự xoá sau 24 giờ.</p></div>';
  }
  function renderMember() {
    var s = $("#s-member");
    s.hidden = !state.signed;
    if (!state.signed) { s.innerHTML = ""; return; }
    var bm = state.banmenh || state.trondoi;
    var menh = R["Thìn"];
    var hom = state.homnay
      ? '<div class="fr-panel fr-today"><p class="fr-kicker">Hôm nay của bạn</p><p>Ngày Kỷ Hợi chạm vào cung Tử Tức của bạn. Hôm nay hợp để nói chuyện với người nhỏ tuổi hơn bằng câu hỏi, không hợp để ra quyết định thay họ. Việc giấy tờ nên để buổi sáng.</p></div>'
      : (state.balance >= PRICE.homnay
        ? '<div class="fr-balance-hook"><p>Bạn đang có <b>' + fmt(state.balance) + ' Lá</b>. Vừa đủ để mở <b>Hôm nay của bạn</b>: hôm nay lá số của bạn gặp ngày gì, nên làm gì, nên tránh gì.</p><button type="button" class="btn btn-secondary" data-buy="homnay">Mở Hôm nay · ' + PRICE.homnay + ' Lá</button></div>' : "");
    s.innerHTML = secHead("memberTitle", "05", "Điều thứ hai, theo điều bạn quan tâm: " + INSIGHT2.concern, INSIGHT2.title)
      + '<div class="fr-letter">' + INSIGHT2.body.map(function (p) { return "<p>" + p + "</p>"; }).join("") + why(INSIGHT2.why) + feedback("i2") + '</div>'
      + hom
      + '<article class="fr-panel fr-banmenh"><p class="fr-kicker">Bản mệnh · 4 phần</p><h3>Con người bạn, đọc từ cung Mệnh và cung Thân</h3>'
      + (bm
        ? '<p class="concl">' + menh.conclusion + '</p>' + menh.detail.map(function (p) { return "<p>" + p + "</p>"; }).join("")
        : '<p>' + menh.detail[0] + '</p><p>' + menh.detail[1].split(" ").slice(0, 14).join(" ") + '…</p>' + blurLines(6, "Còn 4 phần đang khoá")
          + '<p class="fr-counts">Còn 4 phần: tính cách, điểm mạnh, điểm yếu, hướng đi · khoảng 2.400 chữ</p>'
          + '<button type="button" class="btn btn-primary fr-wide" data-buy="banmenh">Mở Bản mệnh · ' + PRICE.banmenh + ' Lá</button>')
      + '</article>';
  }
  function renderPalaces() {
    var n = openCount();
    var order = ["Thân", "Tý", "Tuất"].concat(LSV.PALACE_ORDER.filter(function (b) { return ["Thân", "Tý", "Tuất"].indexOf(b) < 0; }));
    $("#s-palaces").innerHTML = secHead("palacesTitle", "06", "12 cung", "Đọc tiếp theo điều bạn quan tâm", "Các cung liên quan tới công việc đứng đầu vì bạn chọn “Công việc, sự nghiệp”.")
      + '<div class="fr-progress"><span>Bạn đã mở <b>' + n + '/12</b> cung</span><i><b style="width:' + (n / 12 * 100) + '%"></b></i></div>'
      + '<ul class="fr-plist">' + order.map(function (br) {
          var st = palaceState(br);
          return '<li><button type="button" class="fr-prow" data-palace="' + br + '">'
            + '<span class="fr-seal-score sc-' + band(br).key + '">' + SC[br].score + '</span>'
            + '<span class="fr-ptop"><span class="fr-pname">' + P[br].name + '</span>'
            + '<span class="fr-pstate st-' + st[0] + '">' + (st[0] === "read" ? ic("ui-check") : st[0] === "new" ? ic("ui-lock") : "") + st[1] + '</span></span>'
            + '<span class="fr-pline">' + R[br].conclusion + '</span>'
            + '</button></li>';
        }).join("") + '</ul>';
  }
  function renderTopics() {
    $("#s-topics").innerHTML = secHead("topicsTitle", "07", "Chủ đề", "Đọc theo điều bạn đang bận tâm")
      + '<div class="fr-topics">' + TOPICS.map(function (t) {
          var done = state.topics[t.id] || (t.id === "van-han" && (state.vanhan || state.trondoi));
          return '<article class="fr-panel fr-topic' + (t.match ? " is-match" : "") + '">'
            + (t.match ? '<span class="pill">Theo điều bạn chọn</span>' : "")
            + '<h3>' + t.name + '</h3><p>' + t.teaser + '</p>'
            + '<p class="fr-rel">' + t.rel.map(function (b) { return '<button type="button" data-palace="' + b + '">Cung ' + P[b].name + '</button>'; }).join("") + '</p>'
            + (done ? '<p class="fr-done">' + ic("ui-check") + 'Đã mở</p>'
              : '<button type="button" class="btn btn-secondary" data-buy="topic:' + t.id + '">Mở · ' + t.price + ' Lá</button>')
            + '</article>';
        }).join("") + '</div>';
  }
  function ladderHtml(idSuffix) {
    var price = trondoiPrice();
    if (state.trondoi) {
      return '<div class="fr-panel fr-ladder"><h2 id="ladderTitle' + idSuffix + '">Bạn đã mở Tử Vi trọn đời</h2><p>Đủ 12 cung, 8 chặng đại vận, từng tháng năm nay. 7 ngày Hôm nay của bạn bắt đầu từ sáng mai.</p>'
        + '<a class="btn btn-primary fr-wide" href="doc-bao-cao-tuong-tac.html">Đọc báo cáo</a></div>';
    }
    return '<div class="fr-ladder">' + secHead("ladderTitle" + idSuffix, "08", "Các gói", "Đọc trọn lá số của bạn")
      + '<article class="fr-offer is-anchor"><span class="pill seal">Gợi ý</span><h3>Tử Vi trọn đời</h3>'
      + '<p class="fr-price">' + (price < PRICE.trondoi ? '<s>' + fmt(PRICE.trondoi) + '</s> ' : '') + '<b>' + fmt(price) + ' Lá</b></p>'
      + (state.spentNatal ? '<p class="fr-roll">Bạn đã dùng ' + state.spentNatal + ' Lá cho lá số này trong 7 ngày, được trừ lại.</p>' : '')
      + '<ul><li>Đủ 12 cung và các chủ đề đời sống</li><li>Chặng đại vận đang sống, đọc đầy đủ, và 7 chặng còn lại</li><li>Từng tháng cần chú ý năm 2026</li><li>Đọc lại trọn đời, tải PDF</li><li>Tặng 7 ngày Hôm nay của bạn</li></ul>'
      + '<button type="button" class="btn btn-primary fr-wide" data-buy="trondoi">Mở Tử Vi trọn đời · ' + fmt(price) + ' Lá</button></article>'
      + (state.banmenh ? "" : '<article class="fr-offer"><h3>Bản mệnh</h3><p class="fr-price"><b>' + PRICE.banmenh + ' Lá</b></p><p>4 phần về con người bạn. Nâng lên Tử Vi trọn đời trong 7 ngày được trừ lại ' + PRICE.banmenh + ' Lá.</p><button type="button" class="btn btn-secondary fr-wide" data-buy="banmenh">Mở Bản mệnh</button></article>')
      + '<article class="fr-offer is-slim"><h3>Mở từng cung</h3><p class="fr-price"><b>' + PRICE.palace + ' Lá</b> mỗi cung</p><p>Chạm một cung trên lá số để mở riêng cung đó.</p></article>'
      + '<p class="fr-member">Hội viên: Hôm nay của bạn mỗi sáng và giảm 20% khi mở luận giải. <a href="#">Xem Hội viên</a></p>'
      + '</div>';
  }
  function renderLadder() {
    $("#s-ladder").innerHTML = ladderHtml("");
    $("#s-ladder-side").innerHTML = ladderHtml("Side");
  }
  function renderBasis() {
    var rows = [
      ["Lịch", "Năm Quý Dậu 1993, đổi sang âm lịch", "Đã tính"],
      ["Múi giờ", "Asia/Ho_Chi_Minh", "Đã tính"],
      ["Cục", "Thổ ngũ cục", "Đã tính"],
      ["Tứ hóa", "Phá Quân Lộc, Cự Môn Quyền, Thái Âm Khoa, Tham Lang Kỵ", "Đã tính"],
      ["Đại vận", "Nghịch hành từ cung Mệnh, chặng hiện tại 25-34 tuổi tại cung Phu Thê", "Đã tính"],
      ["Giờ sinh", "Nằm giữa khung giờ, không sát ranh", "Tin cậy cao"],
    ];
    $("#s-basis").innerHTML = '<details class="fr-basis"><summary><h2 id="basisTitle">Căn cứ</h2><span>Mọi nhận định trên trang đi từ các yếu tố này. Máy tính lá số trước, rồi mới viết thành lời.</span></summary>'
      + '<dl>' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd><dd class="ok">' + r[2] + '</dd></div>'; }).join("") + '</dl></details>';
  }
  function renderSticky() {
    var s = $("#sticky"), h, note;
    if (!state.signed) {
      h = '<button type="button" class="btn btn-primary" data-save><span class="g-dot" aria-hidden="true">G</span>Lưu lá số · nhận 60 Lá</button>';
      note = "Miễn phí. Chưa lưu thì lá số tự xoá sau 24 giờ.";
    } else if (state.trondoi) {
      h = '<a class="btn btn-primary" href="doc-bao-cao-tuong-tac.html">Đọc báo cáo Tử Vi trọn đời</a>';
      note = "Báo cáo lưu trọn đời trong thư viện của bạn.";
    } else if (state.lastPalace && !isOpen(state.lastPalace)) {
      h = '<button type="button" class="btn btn-primary" data-buy="palace:' + state.lastPalace + '">Mở cung ' + P[state.lastPalace].name + ' · ' + PRICE.palace + ' Lá</button>';
      note = "Bạn đang có " + fmt(state.balance) + " Lá.";
    } else if (state.balance >= PRICE.homnay && !state.homnay) {
      h = '<button type="button" class="btn btn-primary" data-buy="homnay">Mở Hôm nay của bạn · ' + PRICE.homnay + ' Lá</button>';
      note = "Bạn đang có " + fmt(state.balance) + " Lá, vừa đủ.";
    } else {
      h = '<button type="button" class="btn btn-primary" data-go="s-ladder">Đọc trọn lá số · ' + fmt(trondoiPrice()) + ' Lá</button>';
      note = state.spentNatal ? "Đã trừ " + fmt(state.spentNatal) + " Lá bạn dùng cho lá số này." : "Đủ 12 cung, 8 chặng đại vận, từng tháng năm nay.";
    }
    s.innerHTML = h + '<p class="fr-sticky-note">' + note + '</p>';
  }
  function renderAll() {
    renderTop(); renderTabs(); renderChart(); renderInsight(); renderScores(); renderYear();
    renderSave(); renderMember(); renderPalaces(); renderTopics(); renderLadder(); renderBasis(); renderSticky();
  }

  /* ---------- Palace sheet ---------- */
  function palaceBody(br) {
    var p = P[br], rd = R[br], open = isOpen(br);
    var stars = p.main.map(function (m) { return '<li class="chip main">' + m[0] + ' <small>' + m[1] + '</small>' + (m[2] ? ' <span class="hoa ' + m[2] + '">' + LSV.HOA_LABEL[m[2]] + '</span>' : '') + '</li>'; }).join("")
      + p.aux.map(function (a) { return '<li class="chip">' + a + '</li>'; }).join("");
    var h = '<div class="fr-ps-head">' + chartHtml(br, "thumb")
      + '<div><p class="fr-ps-score">' + badge(br) + ' <span>' + band(br).label + '</span></p><p class="fr-ps-sd">' + p.can + ' ' + br + (p.main.length ? "" : " · không có chính tinh") + '</p></div></div>'
      + '<ul class="chips">' + stars + '</ul>'
      + '<p class="concl">' + rd.conclusion + '</p>';
    if (open) {
      h += '<ol class="points">' + rd.points.map(function (t, i) { return '<li><span aria-hidden="true">' + (i + 1) + '</span><div>' + t + '</div></li>'; }).join("") + '</ol>'
        + rd.detail.map(function (d) { return '<p class="fr-ps-p">' + d + '</p>'; }).join("")
        + (rd.guide ? '<div class="guide"><div class="g-do"><h4>' + ic("ui-check") + 'Nên làm</h4><ul>' + rd.guide.do.map(function (t) { return "<li>" + t + "</li>"; }).join("") + '</ul></div><div class="g-no"><h4>' + ic("ui-close") + 'Nên tránh</h4><ul>' + rd.guide.avoid.map(function (t) { return "<li>" + t + "</li>"; }).join("") + '</ul></div></div>' : "")
        + feedback("p-" + br);
    } else {
      h += '<p class="fr-ps-p">' + excerpt(br) + '</p>' + blurLines(7, "Phần còn lại đang khoá")
        + '<p class="fr-counts">' + rd.points.length + ' ý chính · ' + (p.main.length + p.aux.length) + ' căn cứ · khoảng ' + fmt(Math.round(wordCount(br) / 10) * 10) + ' chữ · có Nên làm, Nên tránh</p>'
        + '<button type="button" class="btn btn-primary fr-wide" data-buy="palace:' + br + '">Mở cung ' + p.name + ' · ' + PRICE.palace + ' Lá</button>'
        + (BANMENH_PALACES.indexOf(br) > -1 && !state.banmenh ? '<button type="button" class="btn btn-secondary fr-wide" data-buy="banmenh">Hoặc mở Bản mệnh · ' + PRICE.banmenh + ' Lá (có cung này)</button>' : '')
        + '<p class="fr-fine">Mở cung rồi mà trong 7 ngày nâng lên Tử Vi trọn đời thì số Lá này được trừ lại.</p>';
    }
    return h;
  }
  function openPalace(br, opener) {
    state.sel = br; state.previewed[br] = true; state.lastPalace = br;
    $("#psTitle").textContent = "Cung " + P[br].name;
    $("#psBody").innerHTML = palaceBody(br);
    openSheet("palaceSheet", opener);
    renderChart(); renderPalaces(); renderSticky();
  }

  /* ---------- Buying (simulated) ---------- */
  function itemFor(key) {
    var k = key.split(":");
    switch (k[0]) {
      case "palace": return { key: key, name: "Cung " + P[k[1]].name, price: PRICE.palace, natal: true };
      case "banmenh": return { key: key, name: "Bản mệnh", price: PRICE.banmenh, natal: true };
      case "trondoi": return { key: key, name: "Tử Vi trọn đời", price: trondoiPrice() };
      case "homnay": return { key: key, name: "Hôm nay của bạn", price: PRICE.homnay };
      case "vanhan": return { key: key, name: "Vận hạn năm 2026", price: PRICE.vanhan };
      case "topic": var t = TOPICS.filter(function (x) { return x.id === k[1]; })[0]; return { key: key, name: t.name, price: t.price };
    }
  }
  function buy(key, opener) {
    if (key === "topic:van-han") key = "vanhan";
    state.pending = key;
    if (!state.signed) { toast("Lưu lá số trước, rồi mở ngay phần bạn chọn."); return openSheet("saveSheet", opener); }
    var it = itemFor(key), after = state.balance - it.price, short = after < 0;
    $("#cfTitle").textContent = "Mở " + it.name;
    $("#cfBody").innerHTML = '<dl class="fr-cf">'
      + '<div><dt>Phần mở</dt><dd>' + it.name + '</dd></div>'
      + '<div><dt>Giá</dt><dd><b>' + fmt(it.price) + ' Lá</b></dd></div>'
      + '<div><dt>Bạn đang có</dt><dd>' + fmt(state.balance) + ' Lá</dd></div>'
      + '<div><dt>' + (short ? "Còn thiếu" : "Còn lại sau khi mở") + '</dt><dd class="' + (short ? "is-short" : "") + '">' + fmt(Math.abs(after)) + ' Lá</dd></div></dl>'
      + (short ? '<button type="button" class="btn btn-primary fr-wide" id="goTopup">Nạp thêm Lá</button><p class="fr-fine">Nạp xong, phần này tự mở, không phải chọn lại.</p>'
               : '<button type="button" class="btn btn-primary fr-wide" id="doSpend">Mở ngay</button><p class="fr-fine">Mở rồi thì đọc lại được mãi trong thư viện của bạn.</p>');
    openSheet("confirmSheet", opener);
  }
  function topup() {
    var it = itemFor(state.pending), need = it.price - state.balance;
    var pick = PACKS.filter(function (p) { return p.la >= need; })[0] || PACKS[PACKS.length - 1];
    $("#tuBody").innerHTML = '<p class="fr-sub">Cần thêm ' + fmt(need) + ' Lá để mở ' + it.name + '.</p><div class="fr-packs" role="radiogroup" aria-label="Chọn gói Lá">'
      + PACKS.map(function (p) {
          var left = state.balance + p.la - it.price;
          return '<label class="fr-pack' + (p.la < need ? " is-off" : "") + '"><input type="radio" name="pack" value="' + p.id + '"' + (p.id === pick.id ? " checked" : "") + (p.la < need ? " disabled" : "") + '>'
            + '<span><b>' + p.name + ' · ' + fmt(p.la) + ' Lá</b><small>' + (left >= 0 ? "Mở xong còn " + fmt(left) + " Lá" : "Chưa đủ") + '</small></span><em>' + p.vnd + '</em>' + (p.tag ? '<i class="pill">' + p.tag + '</i>' : "") + '</label>';
        }).join("") + '</div>'
      + '<button type="button" class="btn btn-primary fr-wide" id="doPay">Thanh toán qua VietQR (giả lập)</button><p class="fr-fine">Chuyển khoản xong, Lá vào ví và phần bạn chọn tự mở.</p>';
    openSheet("topupSheet");
  }
  function spend() {
    var it = itemFor(state.pending), k = state.pending.split(":");
    state.balance -= it.price;
    if (it.natal) state.spentNatal += it.price;
    if (k[0] === "palace") state.unlocked[k[1]] = true;
    if (k[0] === "banmenh") state.banmenh = true;
    if (k[0] === "trondoi") { state.trondoi = true; state.homnay = true; state.vanhan = true; }
    if (k[0] === "homnay") state.homnay = true;
    if (k[0] === "vanhan") state.vanhan = true;
    if (k[0] === "topic") state.topics[k[1]] = true;
    state.pending = null;
    closeSheets(true);
    renderAll();
    if (k[0] === "palace") { openPalace(k[1]); }
    toast("Đã mở " + it.name + "." + residualHint());
  }
  function residualHint() {
    if (state.trondoi) return "";
    if (state.balance >= PRICE.palace) return " Còn " + fmt(state.balance) + " Lá, đủ mở thêm một cung.";
    if (state.balance >= PRICE.homnay && !state.homnay) return " Còn " + fmt(state.balance) + " Lá, đủ mở Hôm nay của bạn.";
    return "";
  }

  /* ---------- Sheets, toast, tabs ---------- */
  function openSheet(id, opener) {
    $$(".sheet-wrap").forEach(function (w) { w.hidden = true; });
    var w = document.getElementById(id); w.hidden = false;
    if (opener) state.opener = opener;
    document.body.classList.add("sheet-open");
    var f = $(".sheet button, .sheet a", w); if (f) f.focus();
    if (id === "palaceSheet") requestAnimationFrame(function () { drawLines($("#psBody .board")); });
  }
  function closeSheets(silent) {
    $$(".sheet-wrap").forEach(function (w) { w.hidden = true; });
    document.body.classList.remove("sheet-open");
    if (!silent && state.opener && document.contains(state.opener)) state.opener.focus();
    state.opener = null;
  }
  var tt = 0;
  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, 3800);
  }
  function setTab(tab) {
    state.tab = tab; renderTabs();
    requestAnimationFrame(function () { drawLines($("#chartMain .board")); });
  }
  function signIn() {
    var y = scrollY;
    state.signed = true; state.balance += 60;
    setWho(true);
    closeSheets(true);
    toast("Đã lưu lá số. Bạn nhận 60 Lá tặng.");
    if (state.pending) { var k = state.pending; setTimeout(function () { buy(k); }, 350); }
    else if (DESK.matches) setTab("tong-quan");
    else { var m = $("#s-member"); if (m) m.scrollIntoView({ block: "start" }); else scrollTo(0, y); }
  }
  function setWho(signed) {
    if (!signed) state = Object.assign(state, { signed: false, balance: 0, unlocked: {}, previewed: {}, spentNatal: 0, banmenh: false, trondoi: false, homnay: false, vanhan: false, topics: {}, lastPalace: null });
    state.signed = signed;
    $$("[data-who]").forEach(function (b) { b.setAttribute("aria-pressed", (b.dataset.who === "signed") === signed); });
    renderAll();
  }
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    $$("[data-theme-btn]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.themeBtn === t); });
    try { localStorage.setItem("lasoviet:theme", t); } catch (e) {}
  }

  document.addEventListener("click", function (e) {
    var t = e.target, el;
    if ((el = t.closest("[data-who]"))) { var s = el.dataset.who === "signed"; if (s && !state.signed) state.balance = 60; return setWho(s); }
    if ((el = t.closest("[data-theme-btn]"))) return setTheme(el.dataset.themeBtn);
    if (t.closest("[data-close]")) return closeSheets();
    if ((el = t.closest("[data-tab-btn]"))) return setTab(el.dataset.tabBtn);
    if ((el = t.closest("#chartMain .cell"))) return openPalace(el.dataset.br, el);
    if ((el = t.closest("[data-palace]"))) { closeSheets(true); return openPalace(el.dataset.palace, el); }
    if ((el = t.closest("[data-save]"))) return openSheet("saveSheet", el);
    if (t.closest("#doSignIn")) return signIn();
    if ((el = t.closest("[data-buy]"))) return buy(el.dataset.buy, el);
    if (t.closest("#doSpend")) return spend();
    if (t.closest("#goTopup")) return topup();
    if (t.closest("#doPay")) {
      var v = $('input[name="pack"]:checked'); var p = PACKS.filter(function (x) { return x.id === (v && v.value); })[0];
      state.balance += p.la; toast("Đã nhận " + fmt(p.la) + " Lá."); return spend();
    }
    if ((el = t.closest("[data-fb]"))) { var f = el.dataset.fb.split(":"); state.fb[f[0]] = f[1]; $$('[data-fb^="' + f[0] + ':"]').forEach(function (b) { b.setAttribute("aria-pressed", b === el); }); return; }
    if ((el = t.closest("[data-go]"))) { var g = document.getElementById(el.dataset.go); if (g) g.scrollIntoView({ block: "start" }); return; }
  });
  document.addEventListener("keydown", function (e) {
    var open = $(".sheet-wrap:not([hidden])");
    if (open && e.key === "Escape") { e.preventDefault(); closeSheets(); }
  });
  addEventListener("resize", function () { requestAnimationFrame(function () { drawLines($("#chartMain .board")); }); });

  setTheme(document.documentElement.dataset.theme || "dark");
  renderAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { drawLines($("#chartMain .board")); });
})();
