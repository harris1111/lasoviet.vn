// Ngũ hành của từng sao, dùng để tô màu lá số (FD-104).
//
// NGUỒN VÀ ĐỘ TIN CẬY - An và anh Lãm cần soát lại trước khi dùng thật:
//   "chac"  = 14 chính tinh, lục cát tinh, lục sát tinh. Các trường phái
//             Tử Vi đều thống nhất, tra sách nào cũng ra như nhau.
//   "thuong"= vòng Bác Sĩ, vòng Thái Tuế, vòng Tướng Tinh và các sao phổ
//             biến. Phần lớn sách Việt ghi giống nhau, nhưng có sách khác.
//   không có trong bảng = chưa đủ chắc chắn, lá số để màu chữ thường.
//
// Nguyên tắc: thà để màu trung tính còn hơn tô sai. Người biết Tử Vi nhìn
// một cái là thấy sai ngay, và mất lòng tin vào cả bản báo cáo.
window.LSV = window.LSV || {};

// kim | moc | thuy | hoa | tho
LSV.STAR_ELEMENT = {
  // --- 14 chính tinh (chắc chắn) ---
  "Tử Vi": "tho", "Thiên Cơ": "moc", "Thái Dương": "hoa", "Vũ Khúc": "kim",
  "Thiên Đồng": "thuy", "Liêm Trinh": "hoa", "Thiên Phủ": "tho", "Thái Âm": "thuy",
  "Tham Lang": "thuy", "Cự Môn": "thuy", "Thiên Tướng": "thuy", "Thiên Lương": "tho",
  "Thất Sát": "kim", "Phá Quân": "thuy",

  // --- Lục cát tinh (chắc chắn) ---
  "Tả Phù": "tho", "Hữu Bật": "thuy", "Văn Xương": "kim", "Văn Khúc": "thuy",
  "Thiên Khôi": "hoa", "Thiên Việt": "hoa",

  // --- Lục sát tinh (chắc chắn) ---
  "Kình Dương": "kim", "Đà La": "kim", "Hỏa Tinh": "hoa", "Linh Tinh": "hoa",
  "Địa Không": "hoa", "Địa Kiếp": "hoa",

  // --- Lộc Tồn, Thiên Mã (chắc chắn) ---
  "Lộc Tồn": "tho", "Thiên Mã": "hoa",

  // --- Vòng Bác Sĩ (thường) ---
  "Bác Sỹ": "thuy", "Lực Sỹ": "hoa", "Thanh Long": "thuy", "Tiểu Hao": "hoa",
  "Tướng Quân": "moc", "Tấu Thư": "kim", "Phi Liêm": "hoa", "Hỷ Thần": "hoa",
  "Bệnh Phù": "tho", "Đại Hao": "hoa", "Phục Binh": "hoa", "Quan Phủ": "hoa",

  // --- Vòng Thái Tuế (thường) ---
  "Tang Môn": "moc", "Quan Phù": "hoa", "Bạch Hổ": "kim", "Điếu Khách": "hoa",
  "Long Đức": "thuy", "Quán Tác": "moc",

  // --- Vòng Tướng Tinh (thường) ---
  "Tướng Tinh": "hoa", "Phan Án": "moc", "Tức Thần": "thuy", "Tai Sát": "hoa",
  "Thiên Sát": "hoa", "Chỉ Bối": "kim", "Nguyệt Sát": "hoa", "Vong Thần": "thuy",
  "Kiếp Sát": "hoa", "Hàm Trì": "thuy",

  // --- Sao phổ biến khác (thường) ---
  "Hồng Loan": "thuy", "Thiên Hỷ": "thuy", "Thiên Diêu": "thuy", "Thiên Hình": "hoa",
  "Long Trì": "thuy", "Phượng Các": "tho", "Tam Thai": "tho", "Bát Tọa": "tho",
  "Ân Quang": "tho", "Thiên Quý": "tho", "Thiên Tài": "tho", "Thiên Thọ": "tho",
  "Đài Phụ": "tho", "Phong Cáo": "tho", "Thiên Vu": "tho", "Hoa Cái": "kim",
  "Thiên Khốc": "kim", "Thiên Hư": "tho", "Thiên Đức": "hoa", "Nguyệt Đức": "hoa",
  "Thiên Không": "hoa", "Tuần Không": "tho", "Triệt Lộ": "kim", "Phá Toái": "hoa",
  "Âm Sát": "hoa", "Cô Thần": "hoa", "Quả Tú": "hoa", "Thiên Thương": "thuy",
  "Thiên Sứ": "thuy", "Giải Thần": "moc", "Thiên Quan": "hoa", "Thiên Trù": "tho",

  // --- Bốn sao suy ra từ vị trí trong vòng sao (2026-09-28) ---
  // Tuế Kiện là Thái Tuế; Hối Khí ở vị trí Thiếu Dương; Tuế Dịch ở vị trí
  // Dịch Mã, trùng Thiên Mã; Niên Giải là Giải Thần theo cách gọi Việt.
  "Tuế Kiện": "hoa", "Hối Khí": "hoa", "Tuế Dịch": "hoa", "Niên Giải": "moc",
};

LSV.ELEMENT_LABEL = { kim: "Kim", moc: "Mộc", thuy: "Thủy", hoa: "Hỏa", tho: "Thổ" };

// Vòng trường sinh của lá số mẫu: Thổ ngũ cục, âm nam nên đi nghịch,
// khởi Trường Sinh tại Thân.
LSV.CYCLE_STATE = {
  "Thân": "Trường Sinh", "Mùi": "Mộc Dục", "Ngọ": "Quan Đới", "Tỵ": "Lâm Quan",
  "Thìn": "Đế Vượng", "Mão": "Suy", "Dần": "Bệnh", "Sửu": "Tử",
  "Tý": "Mộ", "Hợi": "Tuyệt", "Tuất": "Thai", "Dậu": "Dưỡng",
};

LSV.starElement = function (name) {
  return LSV.STAR_ELEMENT[String(name).trim()] || null;
};
