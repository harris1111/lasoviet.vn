---
phase: 3
title: "Engine sinh chữ miễn phí v2"
status: pending
priority: P1
effort: "4d"
dependencies: [1]
---

# Phase 3: Engine sinh chữ miễn phí v2

## Overview
Viết lại cách máy ghép chữ cho phần miễn phí để khách **đọc thấy đúng về mình và muốn đọc tiếp**. Phạm vi: bài tổng quan, cung khớp mối quan tâm, dòng đọc thử của 11 cung và 2 chủ đề còn khoá, đoạn "Năm nay / đại vận" cắt giữa câu, và (nếu Q8 đồng ý) chữ cho "Đường đời 10 năm". Không đụng báo cáo trả phí.

## Hiện trạng (đã đọc mã nguồn)
- Chữ tổng quan do `packages/backend/src/ziwei/free-structural-overview.ts` ghép từ câu mẫu, **không dùng AI** (LSV-75: số lượt gọi AI miễn phí = 0). Phiên bản `structural-overview-v1`.
- Nguồn ý nghĩa chỉ có 14 chính tinh (`ziweiMajorStarMeaning`) + câu chung cho từng cung. Không dùng sao phụ, tứ hoá, độ sáng theo từng cung, Kho tri thức V4.1.
- Chữ giải thích công thức ngay trong bài: "Điểm cấu trúc là 71/100: nền 50, phần riêng 12,5, phần chiếu 8,3…", "Đây là quan hệ theo vị trí địa chi, không phải sao được thêm vào cung đang đọc", "Không có chính tinh không đồng nghĩa thiếu năng lực". Mỗi cung đều lặp kiểu câu tự phủ nhận. Kết quả: dài nhưng khô, giống biên bản kỹ thuật hơn là bài đọc về một con người.
- Lời khuyên "Nên làm/Nên tránh" là câu chung theo cung, giống nhau cho mọi người cùng cung.

## Requirements
- Functional:
  - **Giọng văn:** theo `docs/13-brand-experience-guideline.md` và `docs/20-deep-research-ta-social-listening-handoff.md`: nói với "bạn", câu ngắn, ví dụ đời thường, có kết luận rõ trước rồi mới giải thích. Không mê tín doạ dẫm, không hứa chắc chuyện tương lai.
  - **Mỗi đoạn có ít nhất một chi tiết riêng của lá số**: tên sao, cung, độ sáng (miếu/vượng/đắc/hãm), tứ hoá, hoặc sao phụ đáng kể. Không có đoạn nào ai đọc cũng đúng.
  - **Bỏ giải thích công thức khỏi thân bài.** Điểm số và công thức chỉ nằm trong hộp "Điểm này tính thế nào" (FD-107 vẫn giữ). Câu thận trọng gom lại thành **một dòng duy nhất** ở cuối bài, không lặp ở từng cung.
  - **Bài tổng quan 900–1.300 chữ**, cấu trúc: (1) chân dung một câu; (2) trục Mệnh – Thân; (3) điểm mạnh nổi bật nhất; (4) điều hay vướng; (5) công việc, tiền bạc, tình cảm (mỗi phần 1 đoạn); (6) 3 việc nên làm cụ thể. Đoạn cuối dẫn sang phần "Năm nay".
  - **Cung khớp mối quan tâm** (đọc trọn miễn phí): kết luận một câu, 3 ý chính, 2–3 đoạn, Nên làm/Nên tránh **riêng theo bộ sao**, không theo cung chung.
  - **Dòng đọc thử cho mỗi cung/chủ đề còn khoá** (cho Q4): 1–2 câu thật, riêng lá số, dừng ở chỗ gợi tò mò. Không lộ phần trả phí (FD-059).
  - **Đoạn "Năm 2026 và đại vận" cắt giữa câu**: 2–3 câu thật từ dữ liệu lưu niên và đại vận (đã có trong `iztro-horoscope.ts`), câu thứ ba bị cắt đúng ở ý quan trọng nhất.
  - **(Nếu Q8)** Đường đời 10 năm: mỗi đại vận một nhãn ngắn + điểm cấu trúc có công thức; chỉ chặng hiện tại có 1 câu đọc thử.
  - **Câu mời mua** (dùng ở GĐ5): thư viện câu theo 4 đòn bẩy (điều khách muốn, căn cứ, đọc ngay, khấu trừ khi nâng cấp), tiết chế; danh sách từ cấm: "giải mã vận mệnh", "đổi đời", "bí mật", đếm ngược giả, số người mua giả.
- Non-functional: vẫn tạo xong trong < 50ms mỗi lá số, không gọi AI (trừ khi Q9 chọn b); cùng lá số ra cùng chữ; có tiếng Anh tương đương; cache theo phiên bản renderer mới.

## Architecture
1. **Thư viện nội dung có phiên bản** (`packages/contracts/src/ziwei-free-copy-v2/`): ý nghĩa 14 chính tinh × 12 cung × 4 mức độ sáng, tứ hoá × cung, ~12 sao phụ hay gặp (Tả Phù, Hữu Bật, Văn Xương, Văn Khúc, Lộc Tồn, Thiên Mã, Kình Dương, Đà La, Hoả Tinh, Linh Tinh, Địa Không, Địa Kiếp). Lấy từ Kho tri thức Tử Vi V4.1 (LSV-16, đã viết bằng tiếng Việt dễ hiểu; tệp `content/knowledge/vi/ziwei/comprehensive-report.v4.json`) rồi rút gọn thành câu dùng được; mỗi câu có mã nguồn để truy về kho tri thức.
2. **Bộ ghép v2** (`free-structural-overview.ts` → `structural-overview-v2`): chọn câu theo độ ưu tiên (chính tinh + độ sáng > tứ hoá > sao phụ > câu chung cung), tránh lặp mở đầu câu, giới hạn độ dài từng phần.
3. **Bộ kiểm tra chữ tự động**: đếm chữ; mỗi đoạn có ≥1 tên sao/cung riêng; tối đa 1 câu thận trọng; không có từ cấm; không có số công thức trong thân bài; không lặp câu giữa các cung.
4. **Cache**: tăng `FREE_OVERVIEW_RENDERER_VERSION`; lá số cũ được ghép lại bằng v2 khi xem lần sau (miễn phí, không tốn AI). Giữ quy tắc xoá theo thời hạn 24 giờ và khi xoá dữ liệu.
5. **(Nếu Q9 chọn b)** Thêm đường AI viết tổng quan qua hạ tầng LSV-71 (trần 3.000đ/lá số, 50.000đ/ngày, một lần gọi, giữ cache); bản quy tắc v2 là phương án dự phòng khi AI lỗi hoặc hết ngân sách.

## Related Code Files
- Create: `packages/contracts/src/ziwei-free-copy-v2/*.ts` (thư viện câu, tiếng Việt + tiếng Anh)
- Create: `packages/backend/src/ziwei/free-copy-quality.ts` + test (bộ kiểm tra chữ)
- Modify: `packages/backend/src/ziwei/free-structural-overview.ts`, `free-structural-overview-cache.ts`
- Modify: `apps/web/src/features/ziwei/ziwei-free-result-model.ts`, `ziwei-free-preview-projection.ts` (dòng đọc thử, đoạn năm)
- Modify: `packages/engine-adapters/src/ziwei/iztro-horoscope.ts` chỉ nếu thiếu dữ liệu cho đoạn năm/đại vận (không đổi quy tắc tính)
- Create: `prototype/revamp-2026-10/chu-mien-phi-v2.html` (bản nguồn Artifact)

## Implementation Steps
1. Chọn 3 lá số mẫu tổng hợp khác nhau rõ: một Mệnh có chính tinh miếu, một Mệnh vô chính diệu, một lá số giờ sinh chưa chắc (tạm tính).
2. Rút thư viện câu từ Kho tri thức V4.1 cho 14 chính tinh trước (đủ cho 3 lá số mẫu), sau đó tứ hoá, sau đó sao phụ.
3. Viết bộ ghép v2 + bộ kiểm tra chữ; test cùng đầu vào ra cùng chữ.
4. **Trang HTML duyệt chữ:** mỗi lá số mẫu một cột "Chữ cũ" và "Chữ mới" cạnh nhau, có số chữ, đánh dấu chỗ có chi tiết riêng của lá số; anh sửa chữ trực tiếp trên trang hoặc bình luận từng đoạn; có 2 lựa chọn giọng văn (ấm áp gần gũi / gọn rõ như người tư vấn) để anh chọn. Publish Artifact, gửi anh.
5. Đưa chỗ anh sửa vào thư viện câu (sửa luật ghép, không sửa tay từng lá số).
6. Hoàn thiện đủ thư viện, chạy bộ kiểm tra trên 200 lá số tổng hợp ngẫu nhiên; báo số lá số đạt.
7. PR → merge → phát hành; xem lá số thật sau phát hành.

## Success Criteria
- [ ] Anh duyệt chữ của 3 lá số mẫu trên trang HTML.
- [ ] 200/200 lá số tổng hợp qua bộ kiểm tra chữ (độ dài, chi tiết riêng, không lặp, không từ cấm, ≤1 câu thận trọng).
- [ ] Thân bài không còn số công thức; hộp "Điểm này tính thế nào" vẫn đủ công thức (FD-107).
- [ ] Không chữ nào của phần trả phí xuất hiện trong dòng đọc thử (kiểm tra tự động giống LSV-75).
- [ ] Thời gian ghép < 50ms; 0 lượt gọi AI (nếu Q9 = a).

## Risk Assessment
- Kho tri thức V4.1 chưa phủ đủ sao phụ → làm chính tinh và tứ hoá trước; sao phụ thiếu thì bỏ qua thay vì bịa.
- Chữ "riêng" nhưng nhiều người giống nhau vẫn trùng → bộ kiểm tra đo độ trùng giữa các lá số mẫu; ưu tiên ghép theo bộ sao + độ sáng + tứ hoá thay vì chỉ theo cung.
- Đổi chữ làm khác với cung đọc trọn đã có trong báo cáo trả phí → dòng đọc thử chỉ lấy từ thư viện miễn phí, không cắt từ báo cáo trả phí.
