---
title: Lá Số Việt — Handoff vẽ logo (cho Claude Design)
version: 2.1
status: active-handoff
date: 2026-09-03
tool: Claude Design (web) — không đọc được git/file local, phải dán text tự chứa
owners: Harris/Product (chốt hướng), Claude Design (vẽ logo)
supersedes: v1.0 (hướng "Nét Việt" — nét bút lông, đã loại ngày 2026-09-03)
changelog: v2.1 — thêm PHẦN SỬA sau vòng Claude Design ra bản monoline khô cứng
---

# Handoff — Claude Design vẽ logo Lá Số Việt (v2, hướng precision-based)

> **Cách dùng:** Claude Design không đọc được repo. Dán **PHẦN LÕI** + **đúng một khối hướng**
> (H1 / H2 / H3) + paste ảnh ref Pinterest vào cùng một lượt. Sau khi chốt mark mới dán **PHẦN XUẤT FILE**.

## Vì sao bỏ hướng "Nét Việt" (nét bút lông)

Vòng 4 giao cho Claude Design vẽ một vòng tròn bút lông + chữ V một nét liền. Kết quả luộm thuộm:
vòng đứt thành hai mảnh rời, mảnh phải còn mẩu cụt có vết khấc; cánh trái chữ V lõm giữa nét, phình
rồi thắt đột ngột; giọt son mất liên hệ với nét.

**Chẩn đoán gốc — lỗi nằm ở brief, không chỉ ở tool:** một mark dựa trên *cử chỉ tay* chỉ sang khi
cử chỉ đó thật sự điêu luyện; lệch một chút là thành vụng. Không có vùng an toàn ở giữa, và không có
tiêu chí nào kiểm tra được bằng số.

**Đổi nguyên tắc:** chọn hướng mà **chất lượng đến từ tỉ lệ và độ chính xác** — kiểm tra được, sửa
được, và tool dựng được. Đây cũng là cách hầu hết mark đẳng cấp quốc tế trong nhóm "trí thức · di sản
· cao cấp" được dựng.

---

# PHẦN LÕI — dán trước, cho mọi hướng

```
BỐI CẢNH

Lá Số Việt (lasoviet.vn) — nền tảng lập và luận giải lá số Tử Vi tiếng Việt. Lập lá số miễn phí dẫn
vào báo cáo luận giải trả phí, thanh toán một lần. Định vị: "thư viện tri thức Việt đương đại" —
KHÔNG phải web bói toán, KHÔNG phải thầy bói AI. Giọng thương hiệu: điềm tĩnh, có căn cứ, trả quyền
quyết định về cho người dùng, không phán định tương lai.

Website đã dựng xong, chạy hệ "sơn mài": nền đen sơn mài, vàng kim, đỏ son dùng hiếm như một con dấu.

VIỆC CẦN LÀM

Vẽ logomark chính. Tôi có paste kèm vài ảnh tham chiếu — chúng KHÔNG phải để sao chép hình, mà để
xác định CHUẨN CHẤT LƯỢNG DỰNG HÌNH và register thẩm mỹ cần đạt. Hãy đọc chúng theo hướng đó.

RATIONALE BẮT BUỘC (founder yêu cầu logo phải giải thích được cả hai lớp, không được bỏ)

1. LỚP CHỮ — mark phải dựng trên chữ cái của tên thương hiệu: L (Lá), S (Số), hoặc V (Việt).
   Dùng một chữ, hoặc lồng nhiều chữ. Phải đọc ra được là chữ, không phải hình trừu tượng ngẫu nhiên.
2. LỚP NGÀNH — mark phải đồng thời mang một ký hiệu có thật của ngành luận mệnh Đông phương.
   Kho ký hiệu được phép dùng: vòng 12 cung (thiên bàn) · một cung cắt ra từ vòng đó · trục chia
   cung · la kinh · dấu triện · can chi (chỉ dạng hình học, KHÔNG viết chữ Hán).
   Không bịa biểu tượng huyền học mới.

TIÊU CHUẨN DỰNG HÌNH — ĐÂY LÀ PHẦN QUAN TRỌNG NHẤT

Lần trước thất bại vì hình dựng ẩu. Lần này bắt buộc:

- Mọi đường bao phải LIÊN TỤC và SẠCH. Không vết lõm bất chợt giữa nét, không khấc, không mẩu thừa,
  không đầu nét cụt lơ lửng.
- Bề rộng nét chỉ được thay đổi THEO QUY LUẬT (ví dụ tương phản đậm–thanh của chữ serif), không
  nhảy bậc, không phình thắt ngẫu nhiên.
- Cung tròn phải là cung tròn chuẩn. Đường thẳng phải thẳng. Nếu đã chọn đối xứng thì phải đối xứng
  chính xác tuyệt đối.
- Mọi đầu nét kết thúc dứt khoát và NHẤT QUÁN với nhau: hoặc cắt phẳng hết, hoặc bo tròn hết, hoặc
  cắt vát hết — không trộn ba kiểu trong một mark.
- Dùng SỐ NODE TỐI THIỂU. Một mark tốt ở cỡ này thường dưới 40 điểm neo. Nếu path phình lên hàng
  trăm điểm nghĩa là đang mô phỏng nét tay — sai hướng.
- Mark phải PHẲNG: không đổ bóng, không phát sáng, không bevel, không 3D, không kim tuyến,
  không texture giả cổ, không hiệu ứng grunge.
- Dựng trên lưới có chủ ý: nêu rõ hệ tỉ lệ đã dùng (ví dụ bán kính, độ dày nét, khoảng cách đều)
  và giữ nhất quán các bội số đó trong toàn mark.

MÀU

Khung vẽ: viewBox 0 0 100 100. Nền trình bày: đen sơn mài #0F0D0A.
Mark: vàng kim #C9A44D (ưu tiên màu đặc). Nếu dùng chuyển sắc thì đúng dải này:
  linear-gradient(103deg, #9A7730 0%, #F2DCA0 34%, #C9A44D 58%, #A8842F 100%)
Đỏ son #CE5B45: tối đa MỘT chi tiết nhỏ trong toàn mark, và chỉ khi nó có nghĩa. Được phép không dùng.
Vẽ sao cho đổi màu được: phần chính dùng currentColor, chỉ chi tiết son cắm cứng mã màu.

CẤM (luật thương hiệu, vi phạm là loại)

- Không chữ Hán, chữ Nôm, hay ký tự không kiểm chứng được nghĩa.
- Không quả cầu pha lê, khói nhang, lá bài tarot, cung hoàng đạo phương Tây, hành tinh, sao chổi,
  tím neon, mặt người, hình thầy bói.
- Không mô phỏng nét bút lông / nét vẽ tay. Đây là hướng đã bị loại.

CẦN GIAO

1. Mark chính: SVG, viewBox 0 0 100 100, nền trong suốt.
2. Bản dựng hình: cùng mark nhưng hiện lưới/đường dựng, để kiểm tra tỉ lệ có thật sự chặt không.
3. Ảnh render mark trên nền #0F0D0A ở các cỡ 300 / 120 / 64 / 32 / 24px xếp cạnh nhau.
4. Một đoạn ngắn nói rõ: chữ nào, ký hiệu ngành nào, và hệ tỉ lệ đã dùng.

TIÊU CHÍ NGHIỆM THU

- Che rationale đi, người lạ vẫn gọi được tên chữ cái trong mark.
- Ở 24px vẫn đọc được, không dính nét, không mất chi tiết quan trọng.
- Phóng to 800% không lộ đường bao gợn, khấc, hay node thừa.
- Đặt cạnh chữ "Lá Số Việt" font Source Serif 4 cỡ 20px thì cân, không lấn át chữ.
- Nhìn 3 giây phải thấy "được dựng có chủ ý", không thấy "vẽ hụt".
```

---

# KHỐI HƯỚNG — dán MỘT khối, kèm ảnh ref tương ứng

## H1 — COLOPHON (ký hiệu nhà xuất bản) · khuyến nghị

```
HƯỚNG: COLOPHON

Ý tưởng: Lá Số Việt thực chất là một nhà xuất bản — mỗi báo cáo là một ấn bản riêng cho một người.
Logo là một colophon: ký hiệu nhà in đặt ở trang cuối sách.

Dựng: một chữ (ưu tiên V, hoặc L) theo lối SERIF TƯƠNG PHẢN CAO — nét đậm và nét thanh chênh nhau
rõ rệt, chân serif sắc và mảnh, dựng theo kỷ luật typography cổ điển (tham chiếu tinh thần Bodoni /
Didot / các chữ tiêu đề sách cổ điển). Chữ đặt trong một khuôn: hình tròn hoặc vuông bo nhẹ, đóng vai
con triện / khung colophon.

Ký hiệu ngành: khuôn ngoài đọc được là vòng thiên bàn; hoặc chèn một vạch chia cung duy nhất trên
khuôn, đúng vị trí có nghĩa (ví dụ đỉnh khuôn). Chi tiết này phải mảnh và kín đáo, không được thành
trang trí.

Register cần đạt: ký hiệu nhà xuất bản kinh điển — trí thức, tĩnh, vượt thời gian. Sang nhờ tỉ lệ
chữ và độ sắc của serif, không nhờ hiệu ứng nào.

Tránh: chữ sans-serif tròn trịa hiện đại; khuôn dày nặng nề; chữ bị bóp méo cho vừa khuôn — chữ phải
giữ đúng cấu trúc typography, khuôn điều chỉnh theo chữ chứ không ngược lại.
```

Keywords Pinterest: `publishing colophon logo` · `book imprint logo mark` · `serif letterform seal logo`

## H2 — CHỮ LỒNG (monogram serif đan nét)

```
HƯỚNG: CHỮ LỒNG

Ý tưởng: hai hoặc ba chữ trong "Lá Số Việt" lồng vào nhau và CHIA SẺ NÉT CHUNG — một nét vừa thuộc
chữ này vừa thuộc chữ kia — theo tinh thần các monogram kinh điển của thiết kế đồ hoạ hiện đại.

Cơ hội riêng của thương hiệu này, ưu tiên khai thác: chữ S vốn đã là một đường cong, nên nó có thể
vừa là chữ S (Số) vừa là đường cong của vòng thiên bàn. Chữ V có thể lồng bên trong lòng chữ S hoặc
chữ L, và hai cánh chữ V đồng thời đọc được là hai trục chia cung.

Dựng: serif tương phản cao hoặc sans hình học có kỷ luật — chọn MỘT hệ và giữ tuyệt đối. Chỗ hai chữ
giao nhau phải xử lý dứt khoát: hoặc nét đè hẳn, hoặc khoét một khe đều tay để thấy lớp trên lớp
dưới. Khe khoét (nếu có) phải rộng đều nhau ở mọi giao điểm.

Register cần đạt: monogram thông minh, đọc ra hai nghĩa, sang nhờ tỉ lệ typography.

Tránh: lồng quá ba chữ thành rối; chữ biến dạng đến mức không đọc ra; khe khoét không đều.
```

Keywords Pinterest: `interlocking letterform monogram` · `serif ligature logo` · `V&A logo Alan Fletcher`

## H3 — MỘC BẢN (nét khắc gỗ)

```
HƯỚNG: MỘC BẢN

Ý tưởng: mộc bản — ván khắc gỗ dùng in sách xưa, trong đó mộc bản triều Nguyễn là di sản tư liệu
được UNESCO ghi danh. Đây là nghề khắc, không phải nghề viết: nét do DAO cắt ra, nên góc cạnh, dứt
khoát, tương phản cao — ngược hẳn với nét bút lông mềm.

Dựng: một chữ (V hoặc L) theo lối khắc — đầu nét CẮT VÁT phẳng như vết dao, góc nối giữa các nét
hơi vuông và sắc, bề rộng nét tương phản mạnh nhưng thay đổi theo bậc rõ ràng chứ không mượt. Có thể
đặt trong khuôn chữ nhật đứng như một con dấu khắc.

Ký hiệu ngành: kết hợp một vòng hoặc một góc cung 12 cung, cũng khắc cùng ngôn ngữ dao cắt.

Register cần đạt: bản in mộc bản sắc nét, di sản Việt Nam cụ thể chứ không phải "Á Đông chung chung".

Tránh: mọi hiệu ứng giả cũ — vết mực lem, giấy ố, texture gỗ, nét sờn. Hình phải sạch tuyệt đối;
chất "khắc" đến từ HÌNH DÁNG nét, không từ texture.
```

Keywords Pinterest: `woodblock carved logo mark` · `letterpress cut letterform` · `wood type logo`

---

## Cách chọn ảnh ref (gửi kèm founder)

Chọn ref theo **chất lượng dựng hình**, không theo "trông hay hay":

- Nét dứt khoát, đầu nét kết thúc rõ ràng và nhất quán.
- Tỉ lệ chặt, cảm giác được dựng trên lưới.
- Ít chi tiết, ít node.
- Đọc được ở cỡ nhỏ.

**Loại ngay** ref có: texture giả cổ, hiệu ứng grunge, nét "vẽ tay", đổ bóng/gradient loè loẹt,
hoặc quá nhiều chi tiết trang trí. Đó chính là nhóm đã làm hỏng vòng trước.

---

# PHẦN XUẤT FILE — chỉ dán sau khi founder chốt mark

```
Đã chốt mark. Dựng bộ nhận diện quanh nó.

LOCKUP NGANG (header website)
- Mark cao 26px, cách chữ 12px, chữ "Lá Số Việt" font Source Serif 4, 20px, weight 600,
  letter-spacing 0.01em, màu #F6F1E6. Luôn đủ dấu tiếng Việt.
- Canh theo trục thị giác, không canh theo hộp bao. Chỉnh bằng mắt.
- Giao thêm bản lockup dọc (mark trên, chữ dưới) cho ảnh chia sẻ mạng xã hội.

KHOẢNG THỞ VÀ CỠ TỐI THIỂU
- Khoảng thở tối thiểu quanh lockup = chiều cao chữ "L" viết hoa.
- Cỡ tối thiểu: mark đứng riêng 20px; lockup ngang rộng 120px.

CÁC BẢN CẦN CÓ
1. Bản chính: vàng (+ chi tiết son nếu có), trên nền sơn mài tối.
2. Bản một màu #F6F1E6 — dùng khi in một màu, khắc, hoặc đặt trên ảnh.
3. Bản đảo #14263D hoặc đen — dùng trên nền sáng/giấy.
4. Favicon 16 / 32 / 48px (giao biến thể rút gọn nếu bản đủ chi tiết không đọc được).
5. App icon 512×512: mark đặt giữa, nền #0F0D0A, lề an toàn 15%.

TRANG QUY TẮC DÙNG SAI (kèm hình đúng/sai)
Không xoay, không lật, không nghiêng, không đổi tỉ lệ mark/chữ, không đổi màu chi tiết son,
không thêm viền hay nền tròn quanh mark (trừ app icon), không đặt lên nền hoạ tiết rối.
```

---

# PHẦN SỬA — vòng 06 (dán khi bảo Claude Design vẽ lại)

## Chẩn đoán: hai option hỏng vì hai lý do KHÁC NHAU

Claude Design đã giao 2 bản. Cả hai đều khô cứng, nhưng nguyên nhân không giống nhau — nên
không dùng chung một toa sửa.

**Option 1 (chữ V serif trong vòng tròn):**
- Chữ V và vòng tròn **không có quan hệ nào**. Bỏ vòng đi chữ vẫn thế, bỏ chữ đi vòng vẫn thế.
  Đây là "chữ đặt trong khung", không phải một mark.
- Toàn bộ là đoạn thẳng và cung tròn gặp nhau ở góc gãy. Không có chuyển tiếp cong nào.
- Serif trên của chữ V thành hai thanh ngang rời, không dính vào thân chữ.
- Vạch đỏ trên vòng là vật thể lạ dán thêm.

→ **Thiếu: ĐỘ CONG VÀ SỰ CHẢY.** Xem ref 3/4/5 — cả ba đều là những dải cong chảy mượt, chỗ thẳng
chuyển vào chỗ cong bằng tiếp tuyến. Ref 4 tuy nét đều nhưng đẹp nhờ độ cong và nhịp lặp.

**Option 2 (chữ S ghép chữ V):**
- Nét đều tăm tắp 9 đơn vị ở mọi chỗ. Ref 6/7/8 (V&A, ligature script, monogram VR dập đồng) đều
  **tương phản đậm–thanh rất mạnh** — đó chính là nguồn gốc của cảm giác mềm mại và sang.
- Chữ S và chữ V chỉ **chồng lên nhau**, không đan qua nhau. Trong ref, các chữ luồn qua nhau,
  dùng chung khoảng trong, thấy rõ sợi nào nằm trên sợi nào.
- Chữ S dựng bằng hai nửa hình tròn ghép — ra chữ S cứng như biển báo giao thông.
- Viên kim cương đỏ ở điểm tiếp xúc là ký hiệu bản vẽ kỹ thuật, không phải chi tiết thiết kế.

→ **Thiếu: TƯƠNG PHẢN NÉT VÀ ĐAN LỒNG THẬT.**

## Khối sửa cho OPTION 1 — "cong và chảy"

```
VẼ LẠI OPTION 1. Ý tưởng giữ nguyên (chữ V trong vòng), nhưng bản vừa rồi hỏng ở hai chỗ.

LỖI 1 — CHỮ VÀ VÒNG KHÔNG CÓ QUAN HỆ

Hiện tại bỏ vòng đi chữ vẫn thế, bỏ chữ đi vòng vẫn thế. Phải làm hai thứ CHIA SẺ VẬT LIỆU.
Chọn MỘT trong ba cách sau và làm cho tới:

a) Một cánh chữ V kéo dài ra rồi TRỞ THÀNH một đoạn của vòng — đi tiếp theo đường cong của vòng
   rồi mới kết thúc. Chữ và vòng là một nét liên tục, không thể tách.
b) Vòng ĐỨT ĐÚNG chỗ cánh chữ V cắt qua, hai đầu vòng ở chỗ đứt vuốt thanh dần — như thể chữ
   xuyên qua và vòng nhường chỗ.
c) Hai cánh chữ V cong ra và TIẾP TUYẾN với vòng từ bên trong, chạm đúng một điểm mỗi bên.

LỖI 2 — KHÔNG CÓ ĐỘ CONG NÀO

Toàn bộ bản cũ là đoạn thẳng và cung tròn gặp nhau ở góc gãy. Bắt buộc sửa:

- Mọi chỗ đường thẳng gặp đường cong phải TIẾP TUYẾN (tangent-continuous). Phóng to 800% không
  được thấy khấc, không thấy góc gãy.
- Bán kính bo tại các chỗ chuyển hướng tối thiểu 6 đơn vị trên khung 100.
- Thân chữ V nên đọc ra như một DẢI CONG chảy xuống rồi hất lên, không phải hai thanh thẳng
  ghép thành góc nhọn.
- Serif (nếu giữ) phải MỌC RA từ thân chữ bằng một đường cong nối liền, không được là thanh ngang
  rời đặt cạnh.

NÂNG CẤP Ý TƯỞNG (làm được thì mark mạnh hơn hẳn)

Đầu cánh trái của chữ V nở ra thành một hình LÁ — cong, vuốt nhọn ở đầu, có thể gợi sống lá bằng
một nét thanh. Vì "Lá" là chữ đầu của tên thương hiệu, khi đó mark mang được cả L và V trong một
hình, thay vì chỉ một chữ.

CHI TIẾT ĐỎ

Bỏ vạch đỏ dán trên vòng. Nếu vẫn muốn có điểm son, nó phải MỌC RA TỪ cấu trúc — ví dụ chính đầu
mút của một nét được tô son, hoặc khoảng trong của hình lá. Không được là vật thể rời.
```

## Khối sửa cho OPTION 2 — "tương phản và đan lồng"

```
VẼ LẠI OPTION 2. Ý tưởng giữ nguyên (chữ S và chữ V lồng nhau), nhưng bản vừa rồi hỏng ở hai chỗ.

LỖI 1 — NÉT ĐỀU TĂM TẮP

Bản cũ dùng một bề rộng 9 đơn vị ở mọi chỗ. Tất cả ảnh tham chiếu tôi gửi đều có TƯƠNG PHẢN
ĐẬM–THANH rất mạnh — đó chính là nguồn gốc của cảm giác mềm mại và sang. Nét đều không bao giờ
ra được cảm giác đó.

Thông số bắt buộc, tôi sẽ đo:
- Chỗ nét đậm nhất phải rộng gấp 5 đến 8 lần chỗ nét thanh nhất.
- Trên khung 100×100: nét thanh nhất không dưới 2 đơn vị; nét đậm nhất trong khoảng 10–14 đơn vị.
- Nét thanh phải nằm ĐÚNG CHỖ theo quy luật chữ in cổ điển: ở đỉnh và đáy của đường cong, nơi nét
  đổi hướng. Không rải tương phản ngẫu nhiên.
- Trục tương phản hơi nghiêng (khoảng 10–15°), không thẳng đứng tuyệt đối.

LỖI 2 — CHỈ CHỒNG LÊN NHAU, CHƯA ĐAN

Chữ S và chữ V hiện chỉ đặt đè lên nhau. Phải dựng như một monogram đan lồng thật:

- Thân chữ S đi phía SAU một cánh chữ V và phía TRƯỚC cánh còn lại. Nhìn vào phải thấy rõ thứ tự
  lớp, như hai sợi bện vào nhau.
- Phải có ít nhất 2 điểm giao nhau thật sự. Tại mỗi điểm, chỗ nét bị che phải khoét một khe rộng
  ĐỀU NHAU 1.5 đơn vị ở mọi giao điểm — không chỗ rộng chỗ hẹp.
- Hai chữ được phép dùng chung khoảng trong (counter), không cần tách bạch.

LỖI 3 — CHỮ S DỰNG SAI CÁCH

Bản cũ ghép hai nửa hình tròn bán kính bằng nhau, ra chữ S cứng như biển báo giao thông. Dựng
chữ S theo lối chữ in cổ điển:
- Bụng trên NHỎ HƠN bụng dưới (đây là quy luật, không phải tuỳ chọn).
- Trục hơi nghiêng.
- Hai đầu nét vuốt ra thành đuôi có chủ ý — vuốt nhọn hoặc bầu tròn, chọn một kiểu và giữ nhất quán
  với đầu nét của chữ V.

BỎ HẲN

Viên kim cương đỏ ở điểm tiếp xúc, và mọi nhãn ghi chú kiểu "r=20", "nét=9", "tiếp xúc" — đó là
ký hiệu bản vẽ kỹ thuật, không phải chi tiết của logo. Bản giao phải là logo sạch.
```

## Áp dụng cho cả hai option

```
CHUNG CHO CẢ HAI

- ĐẦU NÉT: chọn MỘT ngôn ngữ đầu nét cho toàn bộ mark (vuốt nhọn / bầu tròn / cắt vát) và ghi rõ
  đã chọn gì. Không trộn nhiều kiểu trong một mark.
- Giao kèm bản render ở 300 / 120 / 64 / 32 / 24px trên nền #0F0D0A.
- Giao kèm một ảnh phóng to 800% một góc bất kỳ của mark, để kiểm tra đường bao có mượt không.
- Nếu ở 24px mà tương phản nét làm chỗ thanh biến mất: giao thêm một biến thể cỡ nhỏ với tương
  phản giảm còn khoảng 3:1, giữ nguyên bố cục.
```

---

# Phụ lục — lịch sử đã loại

| Vòng | Hướng | Vì sao loại |
|---|---|---|
| 1 | Huy hiệu đồng mạ vàng photoreal | Ảnh tham khảo vật liệu, không vector hoá sạch được |
| 2 | 6 mark hình học (la kinh · bánh xe 12 cung · dấu triện · mạng nút · trăng khuyết · tàng thư) | "Quá kỹ thuật, kém sang, không dấu ấn" — nét mảnh đều + hình học parametric = register icon dashboard |
| 3 | B Tam Tài · C Giờ Sinh | Founder chọn A |
| 4 | A Nét Việt (nét bút lông mềm) | Claude Design dựng ra hình luộm thuộm: vòng đứt rời, mẩu cụt có khấc, nét lõm phình thắt. Gốc lỗi: hướng dựa vào cử chỉ tay, không có tiêu chí kiểm tra được |
| 5 | H1 Colophon · H2 Chữ lồng · H3 Mộc bản | Founder chọn H1 và H2, gửi 6 ảnh ref |
| 6 | Bản Claude Design giao cho H1 và H2 | Khô cứng. H1 thiếu độ cong và quan hệ chữ–vòng; H2 thiếu tương phản nét và đan lồng thật. Gốc lỗi: prompt v2.0 nhấn quá mạnh vào "chính xác, node tối thiểu" mà không đặc tả tương phản lẫn đan lồng → tool hiểu thành monoline |

File liên quan trong repo (không dán cho Claude Design):
`prototype/logo/logo-concepts-v3.md` · `prototype/logo/marks/*.svg` ·
`prototype/logo/marks/brush-outline-generator.py` (giữ lại để tham khảo, hướng nét bút đã bỏ).
