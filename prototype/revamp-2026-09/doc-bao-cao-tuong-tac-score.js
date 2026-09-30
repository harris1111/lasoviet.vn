// "Độ mạnh cấu trúc" của từng cung (FD-107).
//
// Đây KHÔNG phải điểm tốt xấu của cuộc đời. Nó chỉ đo một việc: bộ sao
// trong cung này, cộng các cung chiếu tới, đang hỗ trợ hay đang cản.
// Công thức được in công khai cho người đọc xem, và mọi con số đều truy
// ngược được về sao thật trên lá số. Không có yếu tố ngẫu nhiên.
//
// CÁC TRỌNG SỐ DƯỚI ĐÂY CẦN AN VÀ ANH LÃM DUYỆT trước khi dùng thật.
window.LSV = window.LSV || {};

LSV.SCORE_RULES = {
  base: 50,
  brightness: { "Miếu": 12, "Vượng": 9, "Đắc": 6, "Bình": 2, "Hãm": -6, "Nhược": -9 },
  hoa: { loc: 10, quyen: 8, khoa: 6, ky: -10 },
  luccat: { "Tả Phù": 4, "Hữu Bật": 4, "Văn Xương": 4, "Văn Khúc": 4, "Thiên Khôi": 4, "Thiên Việt": 4 },
  loctonma: { "Lộc Tồn": 6, "Thiên Mã": 3 },
  lucsat: { "Kình Dương": -5, "Đà La": -5, "Hỏa Tinh": -5, "Linh Tinh": -5, "Địa Không": -5, "Địa Kiếp": -5 },
  khongvong: { "Tuần Không": -4, "Triệt Lộ": -4, "Không Vong": -4 },
  // Cung đối và hai cung tam hợp góp một phần ba.
  chieuWeight: 1 / 3,
};

// Giải thích từng dòng, để hiện trong ô "Điểm này tính thế nào".
LSV.SCORE_EXPLAIN = [
  ["Điểm khởi đầu", "Mọi cung bắt đầu từ 50."],
  ["Chính tinh và độ sáng", "Miếu +12, Vượng +9, Đắc +6, Bình +2, Hãm -6, Nhược -9."],
  ["Tứ hóa", "Hóa Lộc +10, Hóa Quyền +8, Hóa Khoa +6, Hóa Kỵ -10."],
  ["Sao hỗ trợ", "Tả Phù, Hữu Bật, Văn Xương, Văn Khúc, Thiên Khôi, Thiên Việt mỗi sao +4. Lộc Tồn +6, Thiên Mã +3."],
  ["Sao cản", "Kình Dương, Đà La, Hỏa Tinh, Linh Tinh, Địa Không, Địa Kiếp mỗi sao -5. Tuần, Triệt -4."],
  ["Cung chiếu", "Cung đối và hai cung tam hợp góp thêm một phần ba số điểm của chúng."],
  ["Vô chính diệu", "Cung không có chính tinh mượn chính tinh của cung đối, tính nửa điểm."],
];

(function () {
  var R = LSV.SCORE_RULES;

  function ownScore(p, borrowFrom) {
    var s = 0, main = p.main;
    var borrowed = false;
    if (!main.length && borrowFrom && borrowFrom.main.length) { main = borrowFrom.main; borrowed = true; }
    main.forEach(function (m) {
      var v = R.brightness[m[1]] || 0;
      if (m[2]) v += R.hoa[m[2]] || 0;
      s += borrowed ? v / 2 : v;
    });
    (p.aux || []).forEach(function (raw) {
      var n = String(raw).replace(/\s*\(.*\)\s*/, "").trim();
      s += R.luccat[n] || R.loctonma[n] || R.lucsat[n] || R.khongvong[n] || 0;
    });
    return s;
  }

  // Trả về { score, parts } cho mọi cung, theo nhánh địa chi.
  LSV.computeScores = function (chart) {
    var P = chart.palaces, order = chart.order, out = {};
    function opp(br) { var i = order.indexOf(br); return order[(i + 6) % 12]; }
    function tri(br) { var i = order.indexOf(br); return [order[(i + 4) % 12], order[(i + 8) % 12]]; }
    var own = {};
    order.forEach(function (br) { own[br] = ownScore(P[br], P[opp(br)]); });
    order.forEach(function (br) {
      var t = tri(br), o = opp(br);
      var chieu = (own[o] + own[t[0]] + own[t[1]]) * R.chieuWeight;
      var raw = R.base + own[br] + chieu;
      out[br] = {
        score: Math.max(0, Math.min(100, Math.round(raw))),
        parts: { base: R.base, own: Math.round(own[br]), chieu: Math.round(chieu) },
        from: { opp: o, tri: t },
      };
    });
    return out;
  };

  // Nhãn chữ đi kèm con số, để người đọc không chỉ thấy điểm trần trụi.
  LSV.scoreBand = function (n) {
    if (n >= 70) return { key: "manh", label: "Bộ sao hỗ trợ mạnh" };
    if (n >= 55) return { key: "thuan", label: "Bộ sao thiên về hỗ trợ" };
    if (n >= 45) return { key: "can", label: "Bộ sao cân bằng" };
    if (n >= 30) return { key: "canh", label: "Bộ sao cần lưu tâm" };
    return { key: "kho", label: "Bộ sao nhiều lực cản" };
  };
})();
