# 02 — Hệ thống AI viết chữ miễn phí (v2): luận điểm, prompt, kiểm tra, kế hoạch

Ngày: 2026-10-07 · Trạng thái: nghiên cứu và đề xuất, chưa viết code sản phẩm · Phục vụ Q9 và Q2 của biên bản họp 07/10 (Giai đoạn 3 và 4).

Cách đọc các nhãn trong tài liệu này:
- **[KT: đường dẫn]** = em đã mở file đó và đọc đúng như nói (đã kiểm tra trong code).
- **[SL]** = suy luận hoặc đề xuất, chưa kiểm chứng. An cần thử trước khi tin.

Bố cục: Phần 1 đến 8 là phần anh đọc (tiếng Việt thường ngày). Phần 3 là toàn bộ prompt để anh duyệt giọng chữ. Cuối cùng là **"Phần kỹ thuật cho An"** (hợp đồng đầu vào, schema, cổng kiểm tra, danh sách file).

---

## 1. Tóm tắt cho anh

1. **Chữ miễn phí hiện nay khô vì nó không phải bài viết, mà là câu mẫu ghép lại.** Bộ ghép chỉ biết ý nghĩa của 14 chính tinh, viết bằng lối Hán Việt cứng ("năng lực thực thi thực tế và sự nhạy bén về nguồn lực"), in cả công thức điểm vào thân bài, và lặp câu tự phủ nhận ở mọi cung. Lời khuyên "Nên làm/Nên tránh" giống hệt nhau cho mọi người cùng cung. [KT: `packages/backend/src/ziwei/free-structural-overview.ts`, `packages/contracts/src/ziwei-star-meanings-v1.ts`]
2. **Đề xuất: một lần gọi AI duy nhất cho mỗi lá số, trả về một gói JSON** gồm năm phần: bài tổng quan, cung đọc trọn theo mối quan tâm, dòng đọc thử của 13 mục còn khoá, đoạn "Năm nay" cắt giữa câu, và "Căn cứ" gắn cạnh từng nhận định. Một lần gọi giữ đúng quy tắc FD-109a ("một lần thử, cache theo bản lá số") và rẻ hơn hai lần gọi một chút.
3. **Chi phí:** khoảng **990 đồng/lá số** theo giá FD-114 (0,75/3,75 USD mỗi triệu token), trần chặn trước khi gọi khoảng **1.290 đồng**. Nhưng bảng giá đang nằm trong database lại gấp đôi (39.165/195.825 đồng mỗi triệu token): khi đó chi phí thật khoảng **1.974 đồng**, trần chặn **2.585 đồng**, vẫn dưới 3.000 đồng nhưng chỉ còn dư khoảng 415 đồng. Số học ở Phần 4.
4. **Hai điều chặn đang có trong code, An phải gỡ trước khi AI miễn phí chạy được thật:** (a) hiện chưa có "bằng chứng giới hạn token" nên mọi yêu cầu dừng ở `unproven_bound`, không gọi được; (b) bộ nối với 9router + Gemini coi số token trả về là "không rõ", nên không thể tính tiền. [KT: `apps/api/src/free-palace-composition.ts`, `packages/backend/src/ai/openai-compatible-adapter.ts`]. Đây là việc kỹ thuật, không cần anh quyết.
5. **Trần 50.000 đồng/ngày cho AI miễn phí chỉ đủ khoảng 25 đến 50 lá số mỗi ngày** (50.000 chia 1.974 hoặc 990). Đây là giới hạn kinh doanh lớn nhất. Khi hết trần, khách vẫn thấy bản chữ quy tắc đã cải tiến.
6. **Niềm tin đến từ 15 thủ pháp viết (Phần 2)**, trong đó quan trọng nhất: gọi đúng tên sao + cung + độ sáng, "tương phản có neo" thay cho câu ai đọc cũng đúng, chuỗi "vì sao" ngắn, cảnh đời thường, neo vào đại vận và lưu niên thật, dám nói điều khó nghe kèm việc chuẩn bị, và **chỉ một câu thận trọng cho cả bài**.
7. **"Căn cứ" (Q2) có hai tầng:** tầng 1 là các thẻ sao/cung/độ sáng lấy thẳng từ engine (không thể sai); tầng 2 là 2 đến 3 bước giải thích do AI viết, đúng khuôn một người có nghề giải thích cho người ngoài ngành, bám vào chính lá số đó.
8. **Cổng kiểm tra tự động** chặn: sao hoặc cung không có trong lá số, sai độ sáng, sai Hóa, sai vị trí sao-cung, ngày giờ không do engine tính, từ cấm, lộ nội dung trả phí trong dòng đọc thử, đoạn cắt không đúng dạng. Lỗi thì **không thử lại**, dùng chữ quy tắc đã cải tiến cho phần lỗi (Phần 5).
9. **Thử trước khi phát hành:** 30 lá số tổng hợp, anh đọc 5, chấm 1 đến 5 bốn tiêu chí. Đạt khi trung bình từ 4,0, không mục nào dưới 3, và không có câu nào sai sự thật về lá số (Phần 6).
10. **Anh cần chốt 6 việc** ở Phần 8 (trần ngày, chữ tiếng Anh, tên có gửi cho mô hình không, dùng "tôi", v.v.).

---

## 1b. Hiện trạng: vì sao chữ khô (đã kiểm tra)

| Điều anh thấy | Nguyên nhân trong code |
|---|---|
| Khô, như biên bản | Câu ghép từ mẫu. Ý nghĩa sao lấy từ bảng 14 mục, ví dụ Tử Vi = "tính tự chủ cao, phong thái đĩnh đạc và tinh thần tự chịu trách nhiệm". [KT: `ziwei-star-meanings-v1.ts`] |
| Có công thức trong bài | `scoreText()` in "Điểm cấu trúc là X/100: nền 50, phần riêng…, phần chiếu…" và cả câu "không phải tỷ lệ thành công". [KT: `free-structural-overview.ts`] |
| Câu tự phủ nhận lặp lại | Mỗi cung có câu kiểu "Đây là quan hệ theo vị trí địa chi, không phải sao được thêm vào cung đang đọc" và "Không có chính tinh không đồng nghĩa thiếu năng lực". [KT: cùng file, hàm `facts()` và `interpretation()`] |
| Nên làm/Nên tránh ai cũng như nhau | Hằng số theo cung (`domains`) cộng một câu theo chính tinh (`practices`), không phụ thuộc độ sáng, Hóa, sao phụ. [KT: cùng file] |
| Đoạn "Năm nay" dừng ở "…điều cần xem kỹ là…" | Đó là chuỗi cố định trong code, không phải câu cắt từ một đoạn thật. [KT: `apps/web/src/features/ziwei/ziwei-free-result-model.ts`, trường `periodTeaser`] |
| Tab "Căn cứ" nghèo | Chỉ có 3 mục (Mệnh, Thân, tứ hoá), lời lẽ chung ("chỉ dùng cho mục đích phản chiếu bản mệnh"). [KT: `ziwei-evidence-tab.tsx`, `ziwei-tabs-state.ts`] |
| Gói AI một cung hiện có quá nhỏ | Prompt chỉ 6 câu luật; dữ kiện chỉ có cung, địa chi, chính tinh, độ sáng, Hóa; trần output 2.500 token. [KT: `free-palace-writer.ts`, `free-palace-request.service.ts`] |

Điều tốt có sẵn để dùng lại: khối giọng văn đã duyệt cho báo cáo trả phí (v4.2), danh sách cụm cấm, cổng chống chữ Hán, cổng kiểm tra "sao bịa", cơ chế một lần gọi có cache và chặn tiền. [KT: `packages/backend/src/reports/comprehensive-report-voice-v4-2.ts`, `config/ziwei-comprehensive-report-quality.v2.4-beginner.json`, `free-palace-quality.ts`, `free-palace-writer.ts`]

**Ví dụ trước và sau (minh hoạ, chưa chạy qua mô hình, dữ kiện giả định).**

Trước (đúng văn mẫu hiện tại, dịch ý): "Quan Lộc an tại Dần; dữ liệu ghi nhận Thiên Phủ (Miếu). Đây là quan hệ theo vị trí địa chi… Điểm cấu trúc là 71/100: nền 50, phần riêng 12, phần chiếu 8…"

Sau (đích nhắm tới): "Trong công việc bạn là người sếp muốn giao việc mà không phải nhắc lại. Thiên Phủ, sao giữ kho, đóng ở Quan Lộc và ở vị trí sáng nhất, nên bạn có phản xạ làm gọn, làm đủ, rồi báo. Cái giá là bạn khó buông: giao lại cho ai bạn cũng thấy chưa yên tâm, và những tuần cao điểm bạn ôm luôn phần việc của người khác."

---

## 2. Luận điểm tạo niềm tin (15 thủ pháp)

Nguyên tắc chung: **niềm tin = đúng + riêng + dám nói thẳng + biết giới hạn của mình.** Câu nào ai đọc cũng gật (Barnum thuần) thì ngắn hạn dễ tin, nhưng khi khách so với bạn bè thấy trùng là mất tin. Vì vậy ta dùng Barnum đã được "neo": cùng là điểm mạnh và cái giá mà ai cũng có, nhưng nối vào hai dữ kiện thật của lá số này bằng chữ "vì". Mọi ví dụ dưới đây là minh hoạ với dữ kiện giả định.

| # | Thủ pháp | Cách làm | Dở | Tốt |
|---|---|---|---|---|
| 1 | **Neo lá số** | Mỗi nhận định có một neo: sao + cung + (độ sáng hoặc Hóa), nêu bằng lời thường trong cùng câu hoặc câu liền sau. | "Bạn có tiềm năng lớn và luôn nỗ lực vươn lên." | "Mệnh bạn có Thiên Phủ, sao giữ kho, ở vị trí sáng nhất: tiêu một đồng là nghĩ ngay đến đồng sau." |
| 2 | **Tương phản có neo** | "Mạnh ở X, hay vướng Y, vì A ở cung B." Hai nửa lấy từ hai dữ kiện hoặc hai mặt của một sao. | "Bạn vừa mạnh mẽ vừa nhạy cảm." | "Bạn làm chắc tay vì Thiên Phủ ngồi ở Mệnh; cũng vì chắc nên ít khi nhờ ai, trong khi người sẵn lòng giúp bạn đang ở cung Nô Bộc, chỉ chờ bạn mở lời." |
| 3 | **Chuỗi "vì sao" ngắn** | Sao → cung nó đóng (cung ấy lo chuyện gì) → cung đối hoặc tam hợp đỡ hay kéo → điều bạn thấy trong đời. Thân bài tối đa 3 mắt xích; chuỗi đầy đủ để ở Căn cứ. | "Do cấu trúc cung, bạn có xu hướng thận trọng." | "Thiên Phủ giữ kho, mà Tài Bạch là cung hợp với Mệnh, nên chuyện tiền trong nhà thường rơi vào tay bạn." |
| 4 | **Cảnh đời thường** | Mỗi đoạn trọng tâm có một cảnh ai cũng nhận ra, viết như "bạn thử để ý xem", không khẳng định chuyện đã xảy ra. | "Bạn đôi khi gặp khó khăn trong giao tiếp." | "Có những buổi họp bạn nghe cả buổi, về nhà mới nghĩ ra câu đáng nói nhất. Bạn thử để ý xem có đúng không." |
| 5 | **Neo thời gian thật** | Dùng đúng đại vận và lưu niên engine tính: tuổi, cung đi qua. Không kể sự kiện. | "Thời gian tới bạn sẽ có nhiều thay đổi." | "Mười năm bạn đang đi, từ 34 đến 43 tuổi, đóng ở cung Quan Lộc." |
| 6 | **Dám nói điều khó nghe** | Ít nhất một cái giá thật, lấy từ dữ kiện bất lợi (sao yếu, Hóa Kỵ, sát tinh, vô chính diệu). Nói thẳng như Tử Vi truyền thống, kèm việc nên làm (FD-089). Lá số ít điều bất lợi thì nói thẳng như vậy và lấy chỗ khó từ cung có độ mạnh thấp nhất. | Chỉ khen. | "Hóa Kỵ ở Tài Bạch không báo mất tiền; nó báo bạn hay lo chuyện tiền, và lo nhất vào lúc đang căng thẳng. Hãy tách riêng một khoản không đụng đến." |
| 7 | **Một câu thận trọng, và cụ thể** | Cả bài tổng quan chỉ một câu loại "điều này không có nghĩa là…", đặt đúng chỗ dễ hiểu sai nhất, nêu đúng sao. Cấm "chỉ mang tính tham khảo", "không phải dự đoán". | Câu "không phải…" ở mỗi cung. | "Bệnh Phù ở Mệnh không báo bệnh tật; nó nói về nhịp sống." (một lần) |
| 8 | **Giọng chuyên gia bằng cấu trúc** | (a) gọi đúng thuật ngữ rồi giải nghĩa một lần, (b) biết phân biệt A khác B, (c) nói thứ tự ưu tiên ("điều đáng để ý nhất là…"), (d) nói rõ giới hạn dữ liệu (giờ sinh). Tối đa 4 thuật ngữ được giải thích mỗi bài. | Dồn Hán Việt: "cương nghị, thao lược". | "Tam hợp, tức ba cung cách nhau bốn cung và đỡ nhau, của Mệnh gồm Quan Lộc và Tài Bạch." |
| 9 | **Cá nhân hoá bằng người, không bằng tên** | Dùng lựa chọn của khách (mối quan tâm, giai đoạn đời, tuổi âm). Không nói lá số "tiết lộ" điều đó. Tên khách do giao diện chèn, **không gửi cho mô hình**. | "Lá số cho thấy bạn đang lo chuyện tiền." | "Bạn chọn tiền bạc là điều quan tâm nhất, nên phần này đọc kỹ Tài Bạch trước." |
| 10 | **Con số thật, có chọn lọc** | Chỉ con số engine tính: tuổi âm, số năm đại vận, số tháng cần chú ý. Không số công thức trong thân bài (FD-107 giữ ở hộp riêng). | "Khoảng 70% may mắn." | "Có 3 trong 12 tháng năm nay cần để ý hơn." |
| 11 | **Không khen chung chung** | Các tính từ khen (thông minh, nhân hậu, mạnh mẽ…) chỉ được dùng khi cùng câu nói rõ bạn làm gì và sao nào gây ra. | "Bạn thông minh và nhân hậu." | "Bạn nghe kỹ hơn nói, nên người ta hay kể chuyện khó cho bạn." |
| 12 | **Hiếm trước, phổ biến sau** | Mở bằng điều ít người có nhất trong lá số này (cung vô chính diệu, Mệnh khác Thân, Hóa Kỵ ở Mệnh…), không mở bằng điều ai có cùng sao Mệnh cũng có. [SL: xếp hạng độ hiếm bằng bảng tần suất chạy sẵn trên vài nghìn lá số tổng hợp] | Mở bằng mô tả sao Mệnh như sách. | Mở bằng cặp Mệnh và Thân ở hai cung xa nhau, rồi mới tới sao. |
| 13 | **Lời khuyên riêng, đo được** | Mỗi việc nên làm gắn một neo, một mốc ("trong tuần này", "mỗi tối") và một lý do một mệnh đề; ba việc ở ba lĩnh vực khác nhau. | "Hãy tin vào bản thân." | "Tuần này ghi ra giấy mọi khoản cho mượn, kèm hạn trả, vì Đại Hao nằm cạnh cung huynh đệ." |
| 14 | **Nhất quán toàn trang** | Cùng một sao mang cùng một nghĩa ở tổng quan, cung đọc trọn, dòng đọc thử, Căn cứ. Đạt được vì một lần gọi dùng chung một bộ "thẻ nghĩa" (Phần kỹ thuật B4). | Mỗi nơi nói một kiểu. | — |
| 15 | **Thẳng thắn về giới hạn dữ liệu** | Giờ sinh chưa chắc thì nói đúng một lần, nêu đúng thứ bị ảnh hưởng (vị trí Mệnh, Thân, đại vận). | Cảnh báo chung ở đầu mỗi đoạn. | "Giờ sinh bạn nhập chưa chắc, nên chỗ Thân và đại vận dưới đây đang là tạm tính." |

**Giữ trung thực (hàng rào cứng, khớp FD-089, FD-071):** không sao, cung, Hóa, độ sáng, tuổi, năm, tháng nào ngoài dữ kiện engine; không cách cục (Sát Phá Tham, Cơ Nguyệt Đồng Lương…) trừ khi engine tính ra (hiện engine không tính: [KT: không có đoạn nào trong `packages/engine-adapters/src` gán `patterns`]); không sự kiện hay ngày cụ thể; không chết/tuổi thọ, không chẩn đoán bệnh, không cúng/giải hạn/vật phẩm, không xổ số; không "chúng tôi/đội ngũ/chuyên gia/AI" trong bài; không tự khoe kinh nghiệm ("tôi đã xem hàng nghìn lá số") vì đó là khẳng định bịa. Cảnh đời thường là điều "thử để ý", không phải chuyện đã xảy ra.

**Chỗ cần lưu ý về từ cấm:** danh sách `discouragedTerms` của báo cáo trả phí có "tài lộc" và "khí chất", trong khi quy tắc viết cho người mới lại ghi "tài lộc" là từ được giữ. [KT: `config/ziwei-comprehensive-report-quality.v2.4-beginner.json` và `docs/superpowers/specs/2026-09-28-report-writing-rules-beginner-first.md` §2c.2]. Hai nơi đang mâu thuẫn. Bản miễn phí cần danh sách riêng, chốt với anh.

---

## 3. Prompt (bản nháp đầy đủ, tiếng Việt)

Tất cả nằm trong **một lần gọi**: một system prompt dùng chung cho năm phần, một tin nhắn người dùng chứa dữ kiện. Các chỗ `<<...>>` là nội dung do code chèn lúc chạy (từ cấu hình, để prompt và cổng kiểm tra không bao giờ lệch nhau, đúng cách báo cáo trả phí đang làm [KT: `comprehensive-report-voice-v4-2.ts`]). Phiên bản đề xuất: `free-reading-prompt-v2.0`.

### 3.1 System prompt

```text
VAI TRÒ
Bạn viết bài đọc lá số Tử Vi miễn phí cho một người Việt cụ thể trên lasoviet.net. Đây là lần đầu họ thấy lá số của mình được luận giải. Họ phải đọc xong và nghĩ "đúng mình thật", vì mỗi câu bám vào lá số của họ, không phải câu ai đọc cũng đúng.
Chỉ trả đúng một đối tượng JSON theo schema. Không markdown, không chú thích, không in lại dữ kiện.

[1] DỮ KIỆN LÀ LUẬT
1.1 Chỉ dùng những gì có trong khối FACTS và CARDS của tin nhắn người dùng. Mỗi dòng FACTS có một khoá trong ngoặc vuông, ví dụ [palace:career].
1.2 Mọi tên sao, tên cung, độ sáng, Hóa Lộc/Quyền/Khoa/Kỵ, tuổi, năm, số tháng bạn nhắc phải có trong FACTS. Không có thì không nhắc. Không đoán "chắc cũng có sao nào đó". Không nhắc cách cục (như Sát Phá Tham, Cơ Nguyệt Đồng Lương, Tử Phủ Vũ Tướng) trừ khi FACTS ghi rõ.
1.3 Không viết ngày, tháng, năm, tuổi nào không có trong FACTS. Không kể sự việc cụ thể sẽ xảy ra (đổi việc ngày nào, gặp ai, mất bao nhiêu tiền). Chỉ nói xu hướng, chỗ dễ vướng, việc nên chuẩn bị.
1.4 Thiếu dữ kiện cho một ý thì bỏ ý đó, không bù bằng câu chung chung.
1.5 Cung không có chính tinh (vô chính diệu): nói đúng như vậy; chỉ mượn nghĩa từ sao ở cung đối hoặc tam hợp mà FACTS đã liệt kê và nói rõ là "mượn".
1.6 Điểm số, công thức, "điểm cấu trúc" không xuất hiện trong bài. Nhóm độ mạnh (band) chỉ để bạn chọn chỗ khó, không được nêu.
1.7 Trường keys chỉ chứa khoá có trong FACTS, chép nguyên văn. Mỗi nhận định có ít nhất một khoá, và tên sao hoặc tên cung bạn nêu trong nhận định đó phải thuộc dữ kiện của các khoá ấy hoặc của cung Mệnh, Thân.
1.8 Độ sáng viết bằng lời, đúng chiều: sao ở thế sáng (miếu, vượng, đắc) chỉ được tả bằng chữ "sáng", "vững", "đủ sức"; sao ở thế yếu (hãm, nhược) chỉ được tả bằng "mờ", "yếu thế", "thiếu lực"; sao ở thế bình thì tả trung tính. Không bao giờ tả ngược.

[2] GIỌNG VĂN
<<buildVoiceBlockV4_2: giữ nguyên khối giọng văn đã duyệt cho báo cáo trả phí, gồm TÊN SAO, MẠCH KỂ, mẫu văn>>
Bổ sung riêng cho bài miễn phí:
2.1 Người viết là người có nghề đang ngồi đối diện người đọc. Xưng "tôi" tối đa hai lần trong cả bài (để dặn dò hoặc nhấn mạnh), còn lại không xưng. Gọi người đọc là "bạn". Bạn không biết tên họ, không dùng tên riêng.
2.2 Không bao giờ nói "chúng tôi", "đội ngũ", "chuyên gia", "AI", "hệ thống", "dữ liệu", "thuật toán", "mô hình". Không tự khoe kinh nghiệm hay số lá số đã xem.
2.3 Câu có người làm việc gì. Câu dài tối đa khoảng 30 âm tiết, xen câu ngắn. Không để ba danh từ trừu tượng đứng liền nhau.
2.4 Mở đoạn bằng con người hoặc việc đời, không bằng tên sao. Không mở hai đoạn liên tiếp bằng cùng một chữ. Không quá ba câu trong cả bài bắt đầu bằng "Bạn".
2.5 Không chữ Hán, không từ tiếng Anh, không emoji, không gạch đầu dòng trong phần văn xuôi.

[3] BẢY THỦ PHÁP BẮT BUỘC
T1 Neo lá số: mỗi nhận định có một neo cụ thể (sao + cung + độ sáng hoặc Hóa), nêu bằng lời thường trong cùng câu hoặc câu liền sau.
T2 Tương phản có neo: điểm mạnh và cái giá đi cùng nhau. "Bạn mạnh ở X, nhưng hay vướng Y, vì A ở cung B." Hai nửa lấy từ hai dữ kiện khác nhau hoặc hai mặt của một sao. Cấm tương phản chung chung kiểu "vừa mạnh mẽ vừa nhạy cảm".
T3 Chuỗi vì sao: sao, rồi cung nó đóng (cung ấy lo chuyện gì), rồi cung đối hoặc tam hợp đỡ hay kéo, rồi điều người đọc thấy trong đời. Trong thân bài tối đa ba mắt xích; chuỗi đầy đủ để ở căn cứ.
T4 Cảnh đời thường: mỗi đoạn trọng tâm có một cảnh người ta nhận ra ngay (một buổi họp, một lần cho mượn tiền, một tối nghĩ về công việc). Viết như "bạn thử để ý xem", không khẳng định chuyện đã xảy ra với họ.
T5 Neo thời gian: khi nói về giai đoạn, dùng đúng đại vận và lưu niên trong FACTS (tuổi, cung nó đi qua).
T6 Dám nói điều khó nghe: ít nhất một cái giá hoặc chỗ vướng thật, lấy từ dữ kiện bất lợi (sao ở thế yếu, Hóa Kỵ, sát tinh, cung vô chính diệu). Nói thẳng theo lối Tử Vi truyền thống, kèm việc cụ thể nên làm. Nếu lá số thật sự ít dữ kiện bất lợi, nói đúng điều đó và lấy chỗ khó từ cung có nhóm độ mạnh thấp nhất.
T7 Hiếm trước, phổ biến sau: mở bằng điều đứng đầu danh sách [salient] trong FACTS, không mở bằng điều ai có cùng sao Mệnh cũng có.

[4] CÂU THẬN TRỌNG
Toàn bộ khối overview chỉ có đúng MỘT câu loại "điều này không có nghĩa là…", đặt chỗ người đọc dễ hiểu sai nhất, nêu cụ thể đúng sao và đúng cách hiểu sai. Khối focusPalace tối đa một câu như vậy. Khối teasers và yearHook không có.
Cấm: "chỉ mang tính tham khảo", "không phải dự đoán", "không thay thế", "cần đối chiếu với trải nghiệm", "có thể có nhiều cách hiểu".
Không rào đón liên tục bằng "có thể", "có lẽ", "dường như". Khi đã có căn cứ trong FACTS thì nói chắc, nhưng không dùng chữ hứa hẹn: <<certaintyPhrases>>.
Nếu FACTS ghi giờ sinh chưa chắc: nói đúng một lần, trong khối axis, nêu đúng thứ bị ảnh hưởng (vị trí Mệnh, Thân, đại vận).

[5] RANH GIỚI NỘI DUNG
Được nói thẳng chuyện hao tài, trắc trở, va chạm, kiện tụng, tai nạn, năm khó theo đúng dữ kiện, không phóng đại, mỗi điều khó kèm một bước chuẩn bị.
CẤM: cái chết, tuổi thọ, "khắc chết"; chẩn đoán bệnh cụ thể (sức khoẻ chỉ nói nghỉ ngơi, khám định kỳ); cúng bái, giải hạn, hoá giải, vật phẩm; xổ số, đề, cờ bạc; chuyện ngoài dữ kiện.
Không nói lá số "tiết lộ" hoàn cảnh hay mối quan tâm người đọc đã chọn. Cách nói đúng: "bạn chọn tiền bạc là điều quan tâm nhất, nên phần này đọc kỹ cung Tài Bạch trước". Mối quan tâm và giai đoạn đời chỉ để chọn trọng tâm và ví dụ gần gũi.

[6] TỪ VÀ CỤM CẤM
- Cấm ở mọi chỗ: <<bannedPhrases>>
- Không mở câu hoặc đoạn bằng: <<bannedOpeners>>
- Từ cổ ít người dùng: <<freeDiscouragedTerms>>
- Sáo của máy: "Tóm lại", "Nhìn chung", "Điều quan trọng là", "Hãy nhớ rằng", "hành trình", "khám phá bản thân", "tiềm năng vô hạn", "đóng vai trò", "mang lại", "thể hiện sự", "góp phần", "bạn xứng đáng", "vũ trụ".
- Tính từ khen chung chung (thông minh, nhân hậu, tốt bụng, giàu tiềm năng, mạnh mẽ, nhạy cảm) chỉ dùng khi cùng câu đó nói rõ bạn làm gì và sao nào gây ra.

[7] TỪNG KHỐI (độ dài tính bằng âm tiết, tức số chữ cách nhau bởi dấu cách)
A. overview, tổng 900 đến 1.250.
 - portrait: đúng 1 câu, 18 đến 32. Một hình ảnh về con người này, lấy từ neo hiếm nhất. Không mở bằng tên sao.
 - axis: 100 đến 140. Mệnh (con người bạn khi chưa kịp nghĩ) và Thân (nơi bạn đặt sức khi vào việc). Cùng cung hay khác cung, hai cung ấy kéo nhau thế nào. Nếu giờ sinh chưa chắc, nói ở đây.
 - strengths: 2 đến 3 nhận định, tổng 170 đến 240, mỗi cái một đoạn 60 đến 90, dùng nửa đầu của T2.
 - snags: 2 đến 3 nhận định, tổng 170 đến 240, mỗi cái kèm một cảnh (T4), dùng nửa sau của T2 và T6.
 - work, money, love: mỗi cái 85 đến 120, gắn cung Quan Lộc, Tài Bạch, Phu Thê. Nếu người đọc chọn mối quan tâm trùng một trong ba, đoạn đó viết ở mức cao của khoảng độ dài.
 - actions: đúng 3 việc, mỗi việc 25 đến 45. Mở bằng động từ cụ thể, có mốc đo được ("trong tuần này", "mỗi tối"), gắn một khoá, có lý do một mệnh đề. Ba việc ở ba lĩnh vực khác nhau.
 - bridge: 35 đến 60, một đến hai câu dẫn sang phần "Năm nay", dùng một dữ kiện thời gian trong FACTS, không tiết lộ nội dung yearHook. Nếu FACTS không có thời gian, dẫn sang mười hai cung.
 - Mỗi nhận định có basis (căn cứ) theo mục E.
B. focusPalace: cung ghi trong FACTS.focus, đọc trọn.
 - title: tối đa 10. conclusion: 1 câu, 20 đến 32, kết luận rõ trước. keyPoints: đúng 3, mỗi cái 18 đến 28.
 - paragraphs: 3 đến 4 đoạn, mỗi đoạn 110 đến 160: (1) cung này trông thế nào với bạn, (2) chỗ khó kèm một cảnh, (3) điều thật sự giúp, từ cung đối hoặc tam hợp, (4) nếu FACTS có thời gian: đại vận hiện tại chạm cung này ra sao.
 - do: 2 đến 3, avoid: đúng 2, mỗi cái 15 đến 28, riêng theo bộ sao của cung này (có khoá), không được là câu dùng cho mọi người cùng cung.
 - Mỗi keyPoint và mỗi đoạn có basis.
C. teasers: mỗi mục trong FACTS.locked có một teaser.
 - title: tối đa 8, là tiêu đề thật của mục. line: 1 đến 2 câu, 22 đến 45.
 - Nêu MỘT điều đáng chú ý có thật trong dữ kiện của mục đó (một cấu hình lạ, hai sao kéo hai hướng, cung vô chính diệu, một Hóa), dịch ra đời thường, rồi dừng ở chỗ còn câu hỏi.
 - Không: kết luận tốt hay xấu, lời khuyên (nên, hãy, tránh, cần), lý do hay cơ chế (vì, do đó, nhờ), quá một tên sao, con số, chữ "hạn". Mỗi teaser mở bằng cấu trúc câu khác nhau. keys: 1 đến 3.
D. yearHook: chỉ khi FACTS có khối time; nếu không, trả null.
 - shown: đúng 2 câu hoàn chỉnh, tổng 45 đến 75. Nêu lưu niên đi vào cung nào (dịch nghĩa cung) và MỘT con số thật (tháng cần chú ý hoặc tháng thuận) hoặc đại vận hiện tại (tuổi, cung).
 - clip: phần đầu của câu thứ ba, 10 đến 18 âm tiết, dừng giữa câu ngay trước điều quan trọng nhất. Kết bằng một chữ nối (là, mà, ở, vì, khi, nhưng, và, nằm ở) và KHÔNG có dấu chấm. Phần còn lại của câu đó bạn không viết và không gợi ý ở bất kỳ trường nào.
 - withheld: chọn đúng một giá trị trong FACTS.time.allowedWithheld.
E. basis (căn cứ) cho mọi nhận định ở A và B.
 - keys: 1 đến 5 khoá chép từ FACTS.
 - chain: 2 đến 3 bước, mỗi bước {k, say}. say 12 đến 24 âm tiết, nói như người có nghề giải thích cho người ngoài ngành.
 - Bước 1: sao, độ sáng hoặc Hóa nằm ở cung nào và nghĩa của nó. Bước 2: cung ấy lo chuyện gì, cung đối hoặc tam hợp tác động ra sao (nếu FACTS có). Bước 3 nối về chính nhận định: vì sao ra điều người đọc thấy.
 - Phải cụ thể cho lá số này: nêu đúng tên sao, tên cung như FACTS. Cấm câu dùng được cho mọi lá số ("sao này thể hiện tính cách"). Hai căn cứ khác nhau không được lặp nguyên văn. Không dán công thức hay điểm số.

TRƯỚC KHI TRẢ LỜI, kiểm tra thầm (không in ra): (a) mọi tên sao, cung, Hóa, tuổi, số trong bài có trong FACTS; (b) độ sáng tả đúng chiều; (c) không câu nào đúng với mọi lá số; (d) overview có đúng một câu thận trọng; (e) teaser không có lời khuyên, lý do; (f) clip không có dấu chấm và không giải quyết điều bị giấu; (g) độ dài từng khối đúng khoảng.
```

### 3.2 Tin nhắn người dùng (khuôn)

Code dựng từ engine, không có chữ tự do của khách. **Không có tên khách, ngày giờ sinh, nơi sinh** (khớp tinh thần FD-053; báo cáo trả phí cũng không đưa tên vào dữ kiện [KT: grep trong `comprehensive-ziwei-facts*.ts` không thấy tên người]).

```text
NGƯỜI ĐỌC
- Mối quan tâm đã chọn: {concernVi hoặc "chưa chọn"}  (chỉ để chọn trọng tâm)
- Giai đoạn đời tự chọn: {lifeStageVi hoặc "chưa chọn"}
- Tuổi âm hiện tại: {lunarAge}
- Giờ sinh: {chắc | chưa chắc: vị trí Mệnh, Thân, đại vận đang tạm tính}

FACTS (chỉ dùng những dòng này; khoá trong ngoặc vuông)
[axis] Mệnh cư {palace}, địa chi {branch}; Thân cư {palace}, địa chi {branch}; {cùng cung | khác cung}
[palace:life] cung Mệnh, địa chi {b}: {chính tinh (độ sáng, Hóa nếu có)}; phụ tinh: {tên}; cung đối: {palace}; tam hợp: {p1}, {p2}; nhóm độ mạnh: {mạnh|thuận|cân|cạnh|khó}
[palace:career:star:tianfu] Thiên Phủ ở cung Quan Lộc, thế {Miếu}, mang {Hóa Lộc}
[palace:wealth:empty] cung Tài Bạch không có chính tinh; mượn từ cung đối Phúc Đức: {star (độ sáng)}
... (đủ 12 cung, mỗi cung một dòng, rồi các dòng sao, Hóa, quan hệ)
[hoa:taiyin] Hóa Kỵ đậu ở Thái Âm, cung Điền Trạch
[time:decadal] đại vận hiện tại {tuổi a đến b}, năm {y1 đến y2}, đi qua cung {palace}
[time:annual] năm {Y}, lưu niên đi vào cung {palace}, can chi {Giáp Thìn}; tháng cần chú ý: {n}; tháng thuận: {m}; chủ đề: {focusAreas}
[salient] thứ tự điều đáng nói nhất: 1 {key}: {mô tả}; 2 ...; 3 ...
focus: {palace id}   (cung đọc trọn)
locked: [danh sách 11 cung + 2 chủ đề, mỗi mục có 1 đến 2 dòng dữ kiện nổi bật của chính mục đó]
time.allowedWithheld: {han_months | focus_area | annual_palace_meaning | decadal_interplay}

CARDS (nghĩa tham chiếu đã duyệt, học ý không chép nguyên văn)
[card:star:tianfu] ...
[card:palace:career] ...
[card:hoa:prosperity] ...
```

### 3.3 Ví dụ trong prompt (dữ kiện giả định, chỉ học giọng)

Nên có đúng ba ví dụ ngắn (ví dụ dài khiến mô hình chép nội dung [KT: chú thích trong `comprehensive-report-voice-v4-2.ts`]). Ngoài mẫu văn đã duyệt của báo cáo trả phí, thêm:

```text
VÍ DỤ NHẬN ĐỊNH + CĂN CỨ (dữ kiện giả định: Thiên Phủ ở Mệnh, thế sáng nhất)
text: "Bạn làm việc theo kiểu chắc tay: nhận gì làm nấy, làm xong thì báo. Thiên Phủ, sao trông coi kho tàng, đóng ở Mệnh bạn và ở vị trí sáng nhất, nên phản xạ để dành, tính trước rất khó tắt. Cái giá của nó là bạn ít khi nhờ ai. Có những tuần bạn ôm luôn việc của người khác, chỉ vì giao lại thì thấy chưa yên tâm. Bạn thử để ý xem có đúng không."
basis.keys: ["palace:life:star:tianfu", "palace:life"]
chain: [
 {k:"palace:life:star:tianfu", say:"Thiên Phủ là sao giữ kho; ở vị trí sáng nhất thì nét giữ gìn, dành dụm, tính trước thành phản xạ."},
 {k:"palace:life", say:"Mệnh nói về con người bạn khi chưa kịp nghĩ, nên nét này lộ ra ngay ở việc nhỏ nhất."}]
KHÔNG viết căn cứ kiểu: "Thiên Phủ là sao tốt, thể hiện tính cách ổn định." (dùng được cho mọi lá số)

VÍ DỤ TEASER (dữ kiện giả định: hai sao cùng cung Phu Thê)
ĐÚNG: "Cung Phu Thê của bạn có hai sao đứng chung một chỗ, và hai sao ấy kéo về hai hướng khác nhau."
SAI (lộ nội dung trả phí): "Phu Thê có Thiên Đồng nên bạn hợp người chững chạc, hãy tránh nóng vội."

VÍ DỤ YEARHOOK (dữ kiện giả định: lưu niên vào Tài Bạch, 3 tháng cần chú ý)
shown: ["Năm nay lưu niên của bạn đi vào cung Tài Bạch, cung nói về cách tiền đến và đi.", "Trong mười hai tháng có ba tháng cần để ý nhiều hơn các tháng còn lại."]
clip: "Điều đáng nói là ba tháng ấy không rơi vào chuyện chi tiêu mà là"
```

### 3.4 Schema đầu ra (JSON Schema; nguồn sự thật là bản Zod, bản này để đọc)

`teasers` dựng theo từng yêu cầu: số phần tử và `targetKey` đúng bằng danh sách `locked` trong FACTS (thường 13: 11 cung + 2 chủ đề). `yearHook` là `null` khi lá số tạm tính hoặc thiếu lớp thời gian (đúng như hôm nay: [KT: `ziwei-free-result-model.ts` đặt `periodTeaser` = null khi `chart.provisional`]).

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FreeReadingContentV2",
  "type": "object", "additionalProperties": false,
  "required": ["version", "overview", "focusPalace", "teasers", "yearHook"],
  "properties": {
    "version": { "const": 2 },
    "overview": {
      "type": "object", "additionalProperties": false,
      "required": ["portrait", "axis", "strengths", "snags", "work", "money", "love", "actions", "bridge"],
      "properties": {
        "portrait":  { "$ref": "#/$defs/claim" },
        "axis":      { "$ref": "#/$defs/claim" },
        "strengths": { "type": "array", "minItems": 2, "maxItems": 3, "items": { "$ref": "#/$defs/claim" } },
        "snags":     { "type": "array", "minItems": 2, "maxItems": 3, "items": { "$ref": "#/$defs/claim" } },
        "work":  { "$ref": "#/$defs/claim" },
        "money": { "$ref": "#/$defs/claim" },
        "love":  { "$ref": "#/$defs/claim" },
        "actions": { "type": "array", "minItems": 3, "maxItems": 3, "items": { "$ref": "#/$defs/claim" } },
        "bridge": { "type": "object", "additionalProperties": false, "required": ["text", "keys"],
                    "properties": { "text": { "type": "string", "maxLength": 420 }, "keys": { "$ref": "#/$defs/keys" } } }
      }
    },
    "focusPalace": {
      "type": "object", "additionalProperties": false,
      "required": ["palaceKey", "title", "conclusion", "keyPoints", "paragraphs", "do", "avoid"],
      "properties": {
        "palaceKey": { "type": "string", "pattern": "^[a-z]+$" },
        "title": { "type": "string", "maxLength": 80 },
        "conclusion": { "$ref": "#/$defs/claim" },
        "keyPoints":  { "type": "array", "minItems": 3, "maxItems": 3, "items": { "$ref": "#/$defs/claim" } },
        "paragraphs": { "type": "array", "minItems": 3, "maxItems": 4, "items": { "$ref": "#/$defs/claim" } },
        "do":    { "type": "array", "minItems": 2, "maxItems": 3, "items": { "$ref": "#/$defs/claim" } },
        "avoid": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "$ref": "#/$defs/claim" } }
      }
    },
    "teasers": { "type": "array", "minItems": 1, "maxItems": 13, "items": { "$ref": "#/$defs/teaser" } },
    "yearHook": { "anyOf": [ { "type": "null" }, { "$ref": "#/$defs/yearHook" } ] }
  },
  "$defs": {
    "key":  { "type": "string", "maxLength": 160, "pattern": "^[a-z0-9:._-]+$" },
    "keys": { "type": "array", "minItems": 1, "maxItems": 5, "items": { "$ref": "#/$defs/key" } },
    "basis": {
      "type": "object", "additionalProperties": false, "required": ["keys", "chain"],
      "properties": {
        "keys": { "$ref": "#/$defs/keys" },
        "chain": { "type": "array", "minItems": 2, "maxItems": 3, "items": {
          "type": "object", "additionalProperties": false, "required": ["k", "say"],
          "properties": { "k": { "$ref": "#/$defs/key" }, "say": { "type": "string", "maxLength": 170 } } } }
      }
    },
    "claim": {
      "type": "object", "additionalProperties": false, "required": ["text", "basis"],
      "properties": { "text": { "type": "string", "maxLength": 900 }, "basis": { "$ref": "#/$defs/basis" } }
    },
    "teaser": {
      "type": "object", "additionalProperties": false, "required": ["targetKey", "title", "line", "keys"],
      "properties": { "targetKey": { "type": "string", "pattern": "^(palace|topic):[a-z_]+$" },
                      "title": { "type": "string", "maxLength": 60 }, "line": { "type": "string", "maxLength": 260 },
                      "keys": { "$ref": "#/$defs/keys" } }
    },
    "yearHook": {
      "type": "object", "additionalProperties": false, "required": ["shown", "clip", "keys", "basis", "withheld"],
      "properties": {
        "shown": { "type": "array", "minItems": 2, "maxItems": 2, "items": { "type": "string", "maxLength": 320 } },
        "clip": { "type": "string", "maxLength": 130 },
        "keys": { "$ref": "#/$defs/keys" },
        "basis": { "$ref": "#/$defs/basis" },
        "withheld": { "enum": ["han_months", "focus_area", "annual_palace_meaning", "decadal_interplay"] }
      }
    }
  }
}
```

Thứ tự trường cố ý để `overview` sinh trước (văn xuôi tự nhiên nhất khi mô hình chưa mệt), `teasers` và `yearHook` sau. Mỗi nhận định có `basis` ngay sau `text` nên căn cứ được viết ngay lúc vừa nghĩ ra nhận định. [SL: Gemini structured output có thể không hỗ trợ hết các từ khoá như `pattern`, `maxLength`; Zod vẫn kiểm sau khi nhận. An cần thử.]

---

## 4. Một lần gọi hay nhiều lần, và số học chi phí

### 4.1 Khuyến nghị: MỘT lần gọi, đầu ra JSON ràng buộc

| Phương án | Chi phí (giá DB, kỳ vọng / trần chặn) | Ưu | Nhược |
|---|---|---|---|
| **1 lần gọi** (khuyến nghị) | 1.974 / 2.585 đồng | Đúng FD-109a ("một lần thử"); các phần nhất quán với nhau (thủ pháp 14); đơn giản; trần còn dư 415 đồng | Chờ lâu hơn [SL: khoảng 40 đến 90 giây cho ~7.000 token output]; JSON dài dễ lỗi một chỗ |
| 2 lần gọi song song (A: tổng quan + cầu + năm nay; B: cung đọc trọn + teaser) | 2.248 / 2.996 đồng | Nhanh gần gấp đôi; lỗi cô lập | Trần chặn 2.996 gần sát 3.000 nên gần như không còn đệm; phải sửa FD-109a thành "hai lần thử, mỗi khối một lần"; nghĩa lệch nhau giữa hai lần |
| Mỗi khối một lần gọi | cao hơn nữa | Đơn giản từng khối | Vượt trần, lặp system prompt 5 lần, mất nhất quán |

Chi phí chênh nhau không phải lý do chính (chỉ thêm khoảng 270 đồng); lý do chính là FD-109a và độ nhất quán. Cách giảm rủi ro của JSON dài mà vẫn một lần gọi: **chấp nhận từng khối riêng** (overview đạt thì dùng, teaser lỗi thì chỉ teaser dùng chữ quy tắc), không thử lại. Chỉ chuyển sang 2 lần song song nếu khi chạy thử 30 lá số tỉ lệ JSON hỏng trên 10% hoặc độ trễ p95 trên 60 giây, và cần anh sửa FD-109a.

### 4.2 Ngân sách token

Giả định quy đổi **1,7 token cho mỗi âm tiết tiếng Việt** [SL: phải đo lại bằng bộ đếm của nhà cung cấp trên 20 lần chạy, rồi đặt trần theo p99 cộng đệm]. "Chữ" của anh và hợp đồng hiện tại đều tính theo âm tiết cách nhau bởi dấu cách [KT: `free-structural-overview-v1.ts` đếm bằng `split(/\s+/)`].

**Đầu vào (token):**

| Khoản | Cách tính | Token |
|---|---|---|
| System prompt (3.1, khối giọng v4.2, danh sách cấm) + 3 ví dụ | ~3.300 âm tiết (đo bằng `wc -w` trên bản nháp: 2.077 + khoảng 850 chèn từ cấu hình + 342 ví dụ) × 1,7 | 5.600 |
| Schema | Bộ nối tự nhúng JSON Schema vào system prompt và gửi lại trong `response_format` [KT: `openai-compatible-adapter.ts`, `structuredSchemaInstruction` và `response_format`]; tính xấu nhất hai lần ~2.000 | 4.000 |
| FACTS | 12 cung × ~45 + trục, Hóa, thời gian, salient, 13 mục khoá | 2.000 |
| CARDS | 14 thẻ sao × 70 + 12 thẻ cung × 45 + Hóa, sao phụ, quan hệ | 2.800 |
| **Tổng kỳ vọng (xấu)** |  | **14.400** |
| Trần chặn đầu vào | thêm đệm ~11% | **16.000** |

**Đầu ra:**

| Khối | Âm tiết |
|---|---|
| overview | ~1.150 |
| focusPalace | ~710 (kết luận 25, 3 ý 66, đoạn 520, nên làm 60, nên tránh 40) |
| 13 teaser | ~570 |
| yearHook | ~90 |
| 20 căn cứ × ~47 | ~940 |
| **Tổng** | **~3.460 âm tiết ≈ 5.900 token** + khung JSON (khoá, ngoặc, mảng khoá) ~1.300 = **~7.200 token** |
| Trần chặn đầu ra (`max_tokens`, gồm cả "thinking" nếu bộ nối tính) | **10.000** |

**Giá:** đồng trên một triệu token = USD × 26.110.

| Bảng giá | Đầu vào | Đầu ra |
|---|---|---|
| FD-114 (Gemini Standard hiện hành): 0,75 / 3,75 USD | 19.582,5 | 97.912,5 |
| Đang nằm trong DB: migration 0044 [KT: `packages/database/drizzle/0044_ai_model_pricing_9router_gemini_flash.sql`] | 39.165 | 195.825 |

Nhận xét [KT cho phép tính, SL cho ý nghĩa]: giá DB đúng bằng 1,50/7,50 USD × 26.110, tức mức Google đã công bố áp dụng từ 01/01/2027 [KT: `plan/2026-10-06-lsv68-api-reference-pricing.md`: mức giới thiệu hết 31/12/2026, từ 01/01/2027 là 1,50/7,50/0,15]. FD-114 mới được áp cho script chiến dịch, không phải bảng giá chạy thật. Bộ chặn tiền chạy thật dùng giá trong DB [KT: `free-palace-runner.ts` đọc `aiModelPricing`], nên **phải thiết kế để qua được bảng giá đắt hơn**.

| Tình huống | Tính | FD-114 | Giá DB |
|---|---|---|---|
| Kỳ vọng | 14.400 × giá vào + 7.200 × giá ra, chia 1.000.000 | 282 + 705 = **987 đồng** | 564 + 1.410 = **1.974 đồng** |
| Kỳ vọng nếu "thinking" 3.000 token tính vào đầu ra | 14.400 vào + 10.200 ra | **1.281** | **2.561** |
| **Trần chặn trước khi gọi** (số tiền giữ chỗ) | 16.000 vào + 10.000 ra | 313 + 979 = **1.292 đồng** | 627 + 1.958 = **2.585 đồng** |
| Dư so với trần 3.000 đồng/lá số | 3.000 − trần chặn | 1.708 | **415** (tương đương ~2.100 token output) |

Kết luận: trần 3.000 đồng/lá số (FD-109a) **đủ**, nhưng với giá DB chỉ còn đệm 415 đồng, nên không được tăng `max_tokens`, không được bật "thinking" dài, không thêm khối nào mà không cắt khối khác. Muốn nới, anh có hai đòn bẩy: nâng trần lá số lên 4.000 đồng, hoặc cắt Căn cứ còn 2 bước.

**Trần ngày:** 50.000 đồng ÷ 987 = ~50 lá số; ÷ 1.974 = ~25 lá số mỗi ngày UTC. Hết trần: khách thấy chữ quy tắc đã cải tiến (Phần 5.3). Đây là điểm anh cần cân: nếu lượng khách lập lá số mỗi ngày lớn hơn con số này thì phần lớn khách sẽ không thấy chữ AI. [SL: em không có số lượng khách thật trong tay.]

**Giá Google từ 01/01/2027:** tăng gấp đôi, tức mọi con số "FD-114" ở trên thành cột "giá DB".

**Chữ tiếng Anh:** chỉ chạy AI cho tiếng Việt (một lá số một gói AI, đúng locale người đọc đang dùng khi yêu cầu [KT: chú thích trong `free-palace-request.service.ts`]); người đọc tiếng Anh dùng bản quy tắc. Nếu anh muốn AI cho cả tiếng Anh thì trần phải tăng gấp đôi. Xem Phần 8.

---

## 5. Cổng chất lượng và thang chấm

### 5.1 Máy tự kiểm (nói bằng lời thường; đặc tả kỹ thuật ở Phần kỹ thuật E)

Phân hai loại: **chặn cứng** (sai là bỏ khối đó, dùng chữ quy tắc) và **cảnh báo mềm** (ghi lại để chỉnh prompt, không bỏ).

**Chặn cứng:**
1. Đúng hình dạng schema, đủ số phần tử, đủ độ dài từng khối (tổng quan 900 đến 1.300 âm tiết).
2. Mọi khoá dẫn chứng có thật trong dữ kiện; mỗi đoạn có ít nhất một khoá.
3. Không nhắc sao, cung, Hóa, tuổi, năm, tháng, con số nào không có trong dữ kiện.
4. Không tả sai độ sáng (sao yếu mà bảo "sáng", hay ngược lại).
5. Không nói sai vị trí ("Thiên Phủ ở cung Phu Thê" trong khi nó ở Quan Lộc) và không gắn sai Hóa.
6. Không chữ Hán, không từ tiếng Anh, không mã kỹ thuật, không tiêu đề máy.
7. Không có từ cấm FD-089 (chết, tuổi thọ, bệnh cụ thể, cúng, giải hạn, vật phẩm, xổ số) và không có câu hứa chắc.
8. Câu thận trọng: tổng quan tối đa 2 câu loại "không có nghĩa là…" (mục tiêu 1; siết còn 1 sau khi đo), teaser và năm nay là 0.
9. Teaser không lộ: tối đa 2 câu, 45 âm tiết, không có lời khuyên, lý do, con số, kết luận tốt xấu; không quá 1 tên sao.
10. Đoạn cắt giữa câu: 10 đến 18 âm tiết, không dấu chấm, kết bằng chữ nối; hai câu hiển thị khớp số liệu thật (số tháng, tuổi, cung).

**Cảnh báo mềm (đo "tự nhiên" và "khí chất"):**
- Câu trung bình trên 26 âm tiết, câu dài nhất trên 42, quá 10% câu trên 35.
- Ba danh từ trừu tượng liền nhau (sự, khả năng, tinh thần, xu hướng, mức độ, yếu tố, nền tảng…) hoặc mật độ các từ đó trên 2 lần mỗi 100 âm tiết.
- Lặp đầu câu: cùng 2 âm tiết đầu mở quá 3 câu; hai đoạn cùng mở một chữ; "Bạn" mở quá 3 câu.
- Cụm sáo của máy ("Tóm lại", "Nhìn chung", "hành trình"…), "điều này" dùng quá 6 lần.
- Rào đón: "có thể/có lẽ/dường như/phần nào" quá 2 lần mỗi 100 âm tiết.
- Quá ít câu có "bạn" (dưới 35%): dấu hiệu văn nói về người thay vì nói với người.
- Dồn Hán Việt: số từ nằm trong danh sách "ít người dùng" (danh sách này do anh bổ sung dần, mỗi từ anh bắt được thành một ô kiểm, đúng tinh thần mục 2c.5 của quy tắc viết cho người mới).
- Một sao được giải nghĩa quá một lần, hoặc tên sao xuất hiện mà không có lời giải nghĩa gần đó.
- Tên sao dày hơn 1,5 tên khác nhau mỗi 80 âm tiết (dùng lại hàm sẵn có).

### 5.2 Thang chấm của anh (1 đến 5), cho mỗi lá số mẫu

| Tiêu chí | 1 | 3 | 5 |
|---|---|---|---|
| **Đúng lá số** (em đưa anh bản lá số cạnh bài; anh kiểm 5 câu bất kỳ) | Có thông tin sai về lá số | Đúng nhưng chung chung, ai đọc cũng đúng | Mọi câu đều gắn đúng sao, cung, độ sáng; có chỗ "hiếm" của riêng lá số này |
| **Tự nhiên** (đọc to thử) | Nghe như dịch máy | Có vài câu vấp | Đọc to không vấp; không câu nào nghe như văn AI |
| **Khí chất chuyên gia** | Vòng vo, khen chung chung | Đúng nhưng chưa phân biệt, chưa ưu tiên | Biết phân biệt, nói thứ tự quan trọng, dám nói điều khó, không khoe khoang |
| **Muốn đọc tiếp** | Đọc xong thấy đủ rồi | Có tò mò nhẹ | Đọc xong muốn mở ngay cung hoặc năm được nhắc, vì thấy mình sẽ hiểu thêm chứ không phải bị dụ |

Hai ô đánh dấu bắt buộc: "có câu nào sai sự thật về lá số không?" (có là **rớt**), "có câu nào anh ngại gửi cho khách không?".

### 5.3 Khi lỗi: không thử lại, quay về chữ quy tắc đã cải tiến

- Mỗi khối chấm riêng. Khối nào rớt chặn cứng thì chỉ khối đó dùng chữ quy tắc v2; khối đạt vẫn dùng chữ AI. Gói lưu `sourceKind` theo từng khối.
- **Không thử lại** (giữ FD-109a: một lần gọi, tiền vẫn tính). Mã lỗi ghi dạng `quality:<mã>` như hôm nay [KT: `free-palace-writer.ts`].
- Không nhận được số token từ nhà cung cấp: giữ nguyên số tiền giữ chỗ, không công bố, không gọi lại [KT: nhánh `usage_unknown`].
- Hết trần ngày hoặc không rõ giá: không gọi AI, khách thấy chữ quy tắc v2 ngay.
- Chữ quy tắc v2 dùng cùng bộ thẻ nghĩa với AI (Phần kỹ thuật B4), nên cải thiện cả nhánh dự phòng, đúng với GĐ3 của kế hoạch.

---

## 6. Kế hoạch thử

1. **Soạn prompt với Claude trước** (rẻ, chưa tốn tiền Gemini): chạy 6 lá số qua prompt này bằng Claude để chỉnh luật. [SL: giọng và lỗi của Claude khác Gemini, nên bước 3 mới là bước quyết định.]
2. **Dựng 30 lá số tổng hợp** (không dùng dữ liệu khách), phủ đều: mỗi chính tinh làm sao Mệnh ít nhất 1 lần (14), Mệnh vô chính diệu (3), Mệnh và Thân cùng cung (3), khác cung (3), Hóa Kỵ ở Mệnh hoặc Tài Bạch hoặc Phu Thê (4), lá số giờ sinh chưa chắc (3), 6 mối quan tâm và 6 giai đoạn đời xen kẽ. [SL: một số mục chồng nhau trong cùng lá số.]
3. **Chạy thật 30 lần** trên `ag/gemini-3.8-flash` bằng bộ chạy thử riêng (không qua trần ngày của khách). Chi phí ≈ 30 × (987 đến 1.974) = **30.000 đến 59.000 đồng mỗi vòng**; dự trù 3 vòng ≤ **180.000 đồng**. [SL: cần anh duyệt trần riêng cho đợt thử, như đã làm với chiến dịch LSV68 có trần 200.000 đồng.]
4. **Máy kiểm tự động trên cả 30**: mục tiêu ≥ 27/30 qua toàn bộ chặn cứng ngay lần đầu (tức tỉ lệ rơi về chữ quy tắc ≤ 10%).
5. **Anh đọc 5 lá số** chọn sẵn: một vô chính diệu, một giờ sinh chưa chắc, một Mệnh có sao miếu, một có Hóa Kỵ ở Mệnh, một chọn "tình cảm". Chấm theo 5.2. Em đưa trang HTML (Artifact) cạnh nhau: lá số, chữ cũ, chữ mới, căn cứ, như kế hoạch GĐ3.
6. **A/B mù** 5 lá số: bản cũ và bản mới, anh chọn cái muốn đọc tiếp.
7. **Kiểm độ trùng**: hai lá số khác nhau không được có quá 35% cụm 5 từ giống nhau ngoài phần trích thẻ nghĩa [SL: ngưỡng 35% là khởi điểm, chỉnh theo dữ liệu thật].
8. **Sửa prompt tối đa 3 vòng**, mỗi vòng ghi lại số lỗi theo mã.

**Đạt khi (tất cả):** (a) ≥ 27/30 qua chặn cứng; (b) anh chấm trung bình ≥ 4,0 ở cả 4 tiêu chí, không ô nào dưới 3; (c) **0 câu sai sự thật về lá số** trong 5 bài anh đọc, và trong 10 bài ngẫu nhiên (trong 30) An hoặc em đối chiếu tay 10 nhận định mỗi bài với lá số; (d) A/B ≥ 4/5 chọn bản mới; (e) chi phí thực đo ≤ 3.000 đồng ở p99 và trần chặn ≤ 3.000 đồng; (f) độ trễ p95 chấp nhận được (dưới 90 giây, nếu hơn thì giao diện phải có trạng thái chờ tốt, xem Phần 7).

Sau khi qua: bật theo cờ cho tài khoản đã xác minh trước, rồi khách vãng lai đã tương tác; theo dõi tỉ lệ rơi về chữ quy tắc, tiền dùng mỗi ngày, và nút "Đúng / Một phần / Không đúng" trên từng nhận định (đã có thành phần sẵn [KT: `apps/web/src/features/reports/part-feedback.tsx`]) làm dữ liệu chỉnh prompt.

---

## 7. Ai làm gì (tóm tắt; danh sách file ở Phần kỹ thuật H)

- **An (backend):** gỡ hai điều chặn (bằng chứng giới hạn token, số token Gemini qua 9router); thư viện thẻ nghĩa + dựng dữ kiện + schema; module viết chữ một lần gọi dùng lại bộ chặn tiền LSV-71; cổng chất lượng; chữ quy tắc v2 làm dự phòng; cache và lưu theo phiên bản; bộ chạy thử 30 lá số.
- **Anh và Claude (frontend + nội dung):** duyệt thẻ nghĩa; trang HTML so sánh chữ cũ-mới (GĐ3); bỏ tab "Căn cứ", làm thành phần "nhận định + Căn cứ" ngay tại chỗ; trạng thái "đang viết riêng cho bạn"; khối đọc thử, đoạn năm nay cắt giữa câu; chèn tên khách ở giao diện; nhãn "AI hỗ trợ diễn giải".
- Quy tắc cũ vẫn giữ: Sonnet viết code, Opus review; làm giao diện cho điện thoại trước và báo anh trước khi viết giao diện thật.

---

## 8. Quyết định cần anh chốt

1. **Trần AI miễn phí:** giữ 3.000 đồng/lá số (đủ, đệm 415 đồng với giá DB). Trần ngày 50.000 đồng chỉ đủ 25 đến 50 lá số: nâng không, hay chỉ chạy cho khách đã đăng nhập/tương tác như hiện hành?
2. **Giá chạy thật:** DB đang để giá gấp đôi FD-114. Anh muốn bộ chặn tiền dùng giá nào? (Em khuyên giữ giá DB để an toàn; An có thể đổi sau khi xác minh.)
3. **Tiếng Anh:** AI chỉ tiếng Việt, tiếng Anh dùng chữ quy tắc. Đồng ý không?
4. **Tên khách:** không gửi cho mô hình, giao diện tự chèn câu chào. Đồng ý không? (Tên chỉ đi ra bên thứ ba là nhà cung cấp mô hình; FD-053 nói về công cụ phân tích nhưng cùng tinh thần.)
5. **Xưng "tôi":** cho phép tối đa 2 lần mỗi bài, như bài mẫu đã duyệt của báo cáo trả phí; cấm "chúng tôi", "đội ngũ", "chuyên gia" (FD-071). Đồng ý không?
6. **Danh sách từ cấm riêng cho bản miễn phí** (xử lý mâu thuẫn "tài lộc"), và trần riêng cho đợt thử 30 lá số (đề xuất ≤ 180.000 đồng).
7. Ghi vào sổ quyết định (FD-117 trở đi): Q9 chọn AI; phạm vi AI miễn phí mở rộng từ "một cung" thành "một gói năm phần trong một lần gọi"; sửa chữ cũ trong FD-109a.

**Bốn rủi ro nói thẳng:** (1) bản AI không chạy được đến khi An gỡ hai điều chặn; (2) trần ngày hạn chế số khách thấy chữ AI; (3) chờ 40 đến 90 giây [SL] nên giao diện phải hiện bản quy tắc trước rồi thay bằng bản AI khi xong; (4) bản AI vẫn có thể diễn giải quá đà một nghĩa sao: cổng chặn cứng bắt được lỗi dữ kiện nhưng không bắt được "nghĩa gượng", chỉ mắt anh và nút phản hồi bắt được.

---

# PHẦN KỸ THUẬT CHO AN

## A. Đã kiểm tra trong code, và hai điều chặn

| # | Điều đã kiểm tra | Đường dẫn |
|---|---|---|
| V1 | Tổng quan hiện tại là bộ ghép mẫu, không AI; phiên bản `structural-overview-v1:free-insight-major-star-meanings-v1:fd111`; chỉ 14 nghĩa chính tinh; `domains`/`practices` là hằng số; `scoreText()` in công thức; câu thận trọng lặp trong `facts()`, `interpretation()` | `packages/backend/src/ziwei/free-structural-overview.ts`, `packages/contracts/src/ziwei-star-meanings-v1.ts` |
| V2 | Schema tổng quan cũ: 8 đến 12 mục, 900 đến 1.800 "từ" đếm bằng `split(/\s+/)`; cache so khớp `FREE_OVERVIEW_RENDERER_VERSION` + hash nguồn, lỗi cache thì biên dịch lại bằng hàm thuần, không ghi, không gọi nhà cung cấp | `packages/contracts/src/free-structural-overview-v1.ts`, `free-structural-overview-cache.ts` |
| V3 | Dữ kiện gói AI một cung chỉ gồm: cung, địa chi, chính tinh + độ sáng + Hóa. Khoá dạng `palace:<p>` và `palace:<p>:star:<star>`. `FREE_PALACE_MAX_OUTPUT_TOKENS = 2500`. Một gói mỗi phiên bản lá số, theo locale lúc yêu cầu. `selectFreePalace`: mối quan tâm → cung (self_understanding → cung Thân), không có thì cung điểm cao nhất | `free-palace-request.service.ts`, `free-palace-selection.ts` |
| V4 | Writer: đúng một lần gọi, `createFreePalaceAttemptRecorder` từ chối lần begin thứ hai, chỉ nhận `purpose: "free_preview"`, kiểm snapshot giá, không có cached-discount (token cache tính như input thường), usage không rõ thì `kind: "unknown"` (giữ nguyên số giữ chỗ), chất lượng rớt thì vẫn bị tính tiền và `disposition: "failed"` | `free-palace-writer.ts` |
| V5 | Cổng chất lượng gói hiện tại: `validateFreePalaceGift` (chữ Hán, nhãn độ sáng tiếng Anh, tiêu đề máy, mã kỹ thuật, bệnh/chết/cúng/xổ số, ngày giờ phải có nguyên văn trong fact, sao bịa, cung lạc đề, trùng ý). Các hằng `PROHIBITED`, `DATE_PATTERNS`, `CANONICAL_ID` đang **private** (không export) | `free-palace-quality.ts` |
| V6 | Bộ nối: nhúng JSON Schema vào system prompt **và** `response_format`; không có tham số temperature; `reasoning: {effort:"none"}` chỉ đặt cho OpenRouter; **với `providerId === "9router-an"` và model khớp `/^(ag\/)?gemini-/i` thì `providerUsage()` luôn trả `tokensUnknown`**; mọi `reasoning_tokens`, `cache_*` khác 0 cũng thành unknown | `packages/backend/src/ai/openai-compatible-adapter.ts` |
| V7 | `NO_REVIEWED_TOKEN_BOUND_PROOF = () => null` → mọi yêu cầu kết thúc `unproven_bound`, không gọi được | `apps/api/src/free-palace-composition.ts`, `freezeFreePalaceCostContext` trong `free-palace-cost-context.ts` |
| V8 | Giá chạy thật trong DB: `9router-an` / `ag/gemini-3.8-flash` = 39.165 vào, 195.825 ra, 3.917 cached (VND/triệu token), hiệu lực 2026-09-25, FX 26.110. FD-114 (0,75/3,75 USD) chỉ nằm trong `scripts/lib/native-campaign-api-pricing.mjs` | `packages/database/drizzle/0044_*.sql`, `plan/2026-10-06-lsv68-api-reference-pricing.md` |
| V9 | Giọng văn v4.2: `buildVoiceBlockV4_2(config)`; cấu hình `v2.4-beginner` có `bannedPhrases`, `bannedOpeners`, `discouragedTerms` (có "tài lộc", "khí chất"), `deathTerms`, `certaintyPhrases`, `maxDistinctStarNamesPer80Syllables: 1.5`; hàm cổng: `findBannedPhrase`, `findBannedOpener`, `findMachineSubheading`, `starDensityProblem`, `overviewArcProblem`; `countVietnameseSyllables`, `wholeWord`, `HAN_IDEOGRAPH_PATTERN`, `ENGLISH_BRIGHTNESS_PATTERN` | `packages/backend/src/reports/comprehensive-report-voice-v4-2.ts`, `comprehensive-report-beginner-gates.ts`, `comprehensive-report-quality-v4.ts`, `config/ziwei-comprehensive-report-quality.v2.4-beginner.json` |
| V10 | Kho tri thức V4: 441 đoạn, trung bình ~302 ký tự, tối đa 513; `metadata.stars` phủ 28 sao (14 chính tinh + lục cát, lục sát, Lộc Tồn, Thiên Mã, Khôi, Việt, Không, Kiếp…); 86 đoạn không gắn sao; nguồn: classical 264, modern 114, curated 39, matrix 24; `permittedUse: reference_rewrite`. **Không có đoạn cho các sao phụ/trang trí như Bệnh Phù, Long Đức, Đại Hao** (bài mẫu duyệt dùng chúng) | `content/knowledge/vi/ziwei/comprehensive-report.v4.json` |
| V11 | Truy xuất tri thức dựa DB (`ts_rank` + điểm metadata, `priority`); `buildComprehensiveKnowledgePacks` thuần theo callback `retrieve`, có các pack `core_temperament`, `palace_<id>` | `packages/backend/src/knowledge/knowledge-retrieval.service.ts`, `reports/comprehensive-report-retrieval.ts` |
| V12 | Engine lớp thời gian miễn phí: `calculateZiweiHoroscope` trả `yearly` (cung lưu niên, can chi, tuổi âm, số tháng warn/good/neutral, `focusAreas`, `summary`) và `decadal` (cung, tuổi, năm). **Không xuất lưu Hóa (yearly.mutagen) ra ngoài** dù dùng nội bộ; **luôn ép tối thiểu 1 tháng `warn`** ("Ensure realistic distribution", tháng thứ 7) khi engine không tìm được tháng xấu nào | `packages/engine-adapters/src/ziwei/iztro-horoscope.ts` |
| V13 | Lớp thời gian đầy đủ (12 cung × sao × Hóa cho đại vận và lưu niên) chỉ có ở `ZiweiTimingSnapshotV1` của báo cáo trả phí | `packages/contracts/src/ziwei-report-snapshot-v1.ts`, `packages/engine-adapters/src/ziwei/iztro-report-snapshot.ts` |
| V14 | Engine không gán `patterns` (cách cục); `chart.patterns` và `chart.relationships` là trường tuỳ chọn trong schema nhưng không được điền | grep `packages/engine-adapters/src` |
| V15 | Danh mục nhãn có 106 id sao (`KNOWN_CANONICAL_IDENTIFIERS_VI`), nhãn độ sáng: Miếu, Vượng, Đắc, Bình, Hãm (unfavorable), Nhược (weak); nhãn Hóa: Lộc, Quyền, Khoa, Kỵ | `packages/backend/src/reports/ziwei-canonical-labels.ts`, `comprehensive-report-writer.ts` |
| V16 | Web: `periodTeaser` là chuỗi cố định kết thúc "điều cần xem kỹ là…", `sku` chọn `ZIWEI-YEAR-{năm}-P0` nếu còn bán, không thì `ZIWEI-IDENTITY-P0`; gift đã có tham chiếu đánh số `fd109-gift-fact-n` và `giftPreparing`; tab Căn cứ ánh xạ chỉ 3 id (`life-palace`, `body-palace`, `transformations`); 6 tab chuẩn gồm `evidence` | `apps/web/src/features/ziwei/ziwei-free-result-model.ts`, `free-palace-gift-block.tsx`, `ziwei-tabs-state.ts`, `ziwei-evidence-tab.tsx` |
| V17 | Khoá và thang điểm cấu trúc: `computeNormalizedPalaceScores`, band `manh|thuan|can|canh|kho` (≥70, ≥55, ≥45, ≥30) | `packages/backend/src/reports/structural-palace-score.ts` |
| V18 | Danh mục mối quan tâm (`career, money, love, family, wellbeing, self_understanding`) và giai đoạn đời (`studying, early_career, established_career, business_owner, between_paths, retired`) | `packages/contracts/src/reading-context-v1.ts` |

### Hai điều chặn (P0, việc kỹ thuật của An)

1. **Bằng chứng giới hạn token (V7).** Chưa có bộ nối nào được duyệt để chứng minh "đầu vào chính xác + trần đầu ra được nhà cung cấp thực thi". Với model có "thinking", `max_tokens` có thể không chặn tổng thinking + output; bản ghi chú LSV68 cũng nói điều này chưa giải quyết cho tuyến riêng [KT: `plan/2026-10-06-lsv68-api-reference-pricing.md`, mục Remaining execution gate]. Hướng [SL]: tắt hoặc ép "thinking" thấp qua tham số chuẩn của tuyến Gemini (cần thử trên 9router), đo bằng `countTokens`, chứng minh bằng thử nghiệm ngưỡng; hoặc bộ nối riêng cho Gemini API gọi thẳng.
2. **Số token Gemini qua 9router (V6).** Hiện luôn "không rõ", nên writer luôn trả `usage_unknown`, giữ nguyên toàn bộ số giữ chỗ và không công bố gì. Cần đường lấy usage đáng tin (gọi thẳng API Gemini, hoặc xác minh bản dịch của 9router giữ đủ `usageMetadata`).

Không có hai việc này thì mọi chữ AI trong tài liệu này không thể chạy; chữ quy tắc v2 (Phần F3) vẫn làm được độc lập và nên ra trước.

---

## B. Hợp đồng đầu vào

### B1. Nguồn dữ kiện (chỉ từ engine và lựa chọn của khách)

| Nhóm | Trường | Nguồn |
|---|---|---|
| Người đọc | `concern` (6 giá trị hoặc null), `lifeStage` (6 hoặc null), `lunarAge`, `timeCertainty` (`provisional` → "chưa chắc") | `reading-context-v1.ts`; `yearly.lunarAge`; `chart.provisional` / `chart.timePrecision` |
| Trục | `soulPalaceId`, `bodyPalaceId`, cùng/khác cung | `NormalizedZiweiChartV1` |
| 12 cung | `id`, `earthlyBranchId`, `heavenlyStemId?`, `stars[]` {id, brightness, category}, cung đối + hai cung tam hợp (`getPalaceRelations`), band cấu trúc | `NormalizedZiweiChartV1`; `structural-palace-score.ts` |
| Hóa | `transformations[]` {starId, id}; gắn về cung chứa sao | `chart.transformations` |
| Vô chính diệu | cờ `empty`, và nguồn mượn (cung đối), theo đúng quy tắc mượn nửa trọng số đã có | `structural-palace-score.ts` (`ownScore`) |
| Thời gian (khi không `provisional`) | `decadal` {palaceId, startAge, endAge, startYear, endYear}; `annual` {targetYear, annualPalaceId, annualStem, annualBranch, lunarAge, hanMonthCount, favorableMonthCount, focusAreas} | `calculateZiweiHoroscope` |
| Điều hiếm | `salient[]` (B3) | tính mới, thuần |
| Mục khoá | 11 cung còn lại + 2 chủ đề (`career_wealth`, `relationship_marriage`, thứ tự theo `buildFreeResultTopics`), mỗi mục 1 đến 2 dòng nổi bật của chính mục đó | `free-result-topic-catalog.ts` |

**Sao đưa vào prompt:** chính tinh (`category: "major"`) và sao phụ có thẻ nghĩa: lục cát (Tả Phù, Hữu Bật, Văn Xương, Văn Khúc, Thiên Khôi, Thiên Việt), Lộc Tồn, Thiên Mã, lục sát (Kình Dương, Đà La, Hỏa Tinh, Linh Tinh, Địa Không, Địa Kiếp), Tuần, Triệt và các id tương đương. Loại bỏ mọi sao còn lại (adjective, decorative): không có thẻ nghĩa nên không được phép đưa vào, đúng với quy tắc "không bịa" (V10 cho thấy kho không phủ chúng). Trần: tối đa 4 sao phụ cho mỗi cung then chốt (Mệnh, Thân, cung đọc trọn, Quan Lộc, Tài Bạch, Phu Thê), các cung khác chỉ chính tinh và Hóa.

**Không đưa vào:** tên khách, ngày/giờ/nơi sinh, `chart_id`, điểm số số học (chỉ band), công thức, văn bản từ preview API, nội dung báo cáo trả phí. Điểm số công thức đã miễn phí hiển thị ở UI (FD-108) nhưng bị cấm trong thân bài.

### B2. Ngữ pháp khoá dẫn chứng (mở rộng quy ước sẵn có, khớp `^[a-z0-9:._-]+$`, ≤160 ký tự [KT: `free-palace-gift-v1.ts`])

```text
axis:life-body                      palace:<p>                    palace:<p>:star:<star>        (đã có)
palace:<p>:aux:<star>               palace:<p>:empty              palace:<p>:borrow:<fromPalace>
hoa:<star>                          rel:<p>:opp                   rel:<p>:tri
band:<p>                            time:decadal                  time:annual
time:han-months                     data:time-uncertain           reader:concern
```

Mỗi dòng FACTS = một khoá, giá trị tiếng Việt đã dựng sẵn bằng `freePalaceLabel`. Số khoá điển hình 80 đến 110. `FreePalaceGiftFactV1` (key/label/value) dùng lại được nguyên cho danh sách dẫn chứng lưu kèm gói [KT: `FreePalaceGiftFactV1Schema`].

### B3. Xếp hạng "điều hiếm" (`salient`)

Điểm khởi đầu [SL, chỉnh bằng bộ thử]: +5 Mệnh vô chính diệu; +4 Hóa Kỵ ở Mệnh/cung đọc trọn/Tài Bạch/Phu Thê/Quan Lộc; +4 chính tinh ở Mệnh hoặc Thân thế miếu hoặc thế nhược/hãm; +3 Mệnh khác cung Thân; +3 sát tinh ở cung then chốt; +3 Hóa Lộc/Quyền ở cung then chốt; +2 hai chính tinh cùng Mệnh; +2 lục cát ở Mệnh. Lấy 5 điều đầu, mỗi điều một dòng mô tả bằng lời + khoá.
**Đề xuất nâng cấp [SL]:** chạy engine trên vài nghìn lá số ngẫu nhiên lúc build để có bảng tần suất (sao, cung, độ sáng, Hóa) và xếp hạng theo −log tần suất thay cho điểm tay. Tuỳ chọn thêm: tự phát hiện vài nhóm cổ điển bằng vị trí (Tử Phủ đồng cung, Nhật Nguyệt, Cơ Nguyệt Đồng Lương, Sát Phá Tham tam hợp) trong bộ dựng dữ kiện, vì engine chưa tính (V14); chỉ khi có thẻ nghĩa đã duyệt cho từng nhóm.

### B4. Thẻ nghĩa (CARDS) và cách chọn

**Đề xuất [SL, khác hướng "truy xuất DB"]:** đóng băng một **thư viện thẻ nghĩa có phiên bản** `content/knowledge/vi/ziwei/free-reading-cards.v1.json`, soạn một lần từ Kho V4 (mỗi thẻ ghi `sourcePassageIds` để truy về kho, đúng thiết kế GĐ3 của kế hoạch) và từ giọng đã duyệt của bài mẫu `prototype/revamp-2026-09/doc-bao-cao-tuong-tac-palaces.js`, anh duyệt. Lý do: (a) đoạn kho V4 ngắn, giọng cứng ("gợi ý cách bạn tổ chức việc chung…") và 86/441 không gắn sao (V10), (b) truy xuất DB phải chạy lúc nhận yêu cầu rồi đóng băng vào prompt, (c) cùng thư viện nuôi cả chữ AI và chữ quy tắc v2 (nhất quán, thủ pháp 14). Dùng đoạn kho trực tiếp chỉ như phương án bổ sung cho cung đọc trọn [`buildComprehensiveKnowledgePacks` gói `core_temperament` và `palace_<focus>`].

| Loại thẻ | Số lượng | Nội dung mỗi thẻ | Âm tiết |
|---|---|---|---|
| Chính tinh | 14 | `essence` (sao này lo chuyện gì, nghĩa đời thường), `strength`, `cost` (cái giá cùng gốc), `scene` (một cảnh nhận ra), `brightnessNote` (miếu/vượng/đắc khác bình/hãm ra sao), `hoaNote` (4 câu cho 4 Hóa nếu cần) | 60 đến 90 |
| Cung | 12 | cung lo chuyện gì trong đời thường (một câu), thuật ngữ nói thay (ví dụ "Quan Lộc = cách bạn làm việc và môi trường nghề") | 25 đến 35 |
| Hóa | 4 | nghĩa gốc, cách tả trung tính, cách tả khi là Kỵ (nói thẳng nhưng kèm bước chuẩn bị) | 25 |
| Sao phụ | ~18 | nghĩa một câu + một lưu ý | 20 đến 30 |
| Quan hệ | 6 | tam hợp/đối cung/xung chiếu, Mệnh–Thân cùng hoặc khác cung, vô chính diệu và cách mượn | 25 đến 35 |

Ví dụ thẻ (nguồn: văn đã duyệt của bài mẫu, rút gọn):

```json
{ "id": "card:star:tianfu", "kind": "star", "starId": "ziwei.star.tianfu",
  "essence": "sao trông coi kho tàng; nét giữ gìn, dành dụm, tính trước",
  "strength": "nói được làm được, giữ lời, sổ sách gọn",
  "cost": "khó buông, khó nhờ người, ôm việc của người khác",
  "scene": "giao việc cho ai cũng thấy chưa yên tâm",
  "brightnessNote": { "bright": "nét trên thành phản xạ", "weak": "muốn giữ nhưng thiếu lực, hay lo mất" },
  "sourcePassageIds": ["ziwei-v4-..."], "approvedBy": null }
```

**Chọn thẻ cho một lá số (thuần, không DB):**
1. Luôn: 12 thẻ cung, 4 thẻ Hóa, thẻ quan hệ liên quan (tam hợp/đối cung, Mệnh–Thân).
2. Mỗi chính tinh có trong lá số (tối đa 14): thẻ đầy đủ nếu ở Mệnh, Thân, cung đọc trọn, Quan Lộc, Tài Bạch, Phu Thê; còn lại chỉ `essence` + `cost` rút gọn (~20 âm tiết).
3. Sao phụ có mặt ở các cung then chốt: một thẻ mỗi sao.
4. Nếu Mệnh vô chính diệu: thẻ "vô chính diệu" + thẻ sao ở cung đối.
Ước lượng ~2.800 token (Phần 4.2). Thiếu thẻ cho sao nào thì **bỏ sao đó khỏi FACTS** (không để mô hình tự suy nghĩa).

### B5. Ngân sách và chốt tham số

| Tham số | Giá trị đề xuất | Ghi chú |
|---|---|---|
| `maxInputTokens` (khai trong bằng chứng giới hạn) | 16.000 | đo lại theo p99 sau 20 lần chạy; vượt thì cắt thẻ rút gọn trước, rồi cắt sao phụ, không cắt FACTS |
| `maxOutputTokens` | 10.000 | thay `FREE_PALACE_MAX_OUTPUT_TOKENS = 2500`; hằng mới `FREE_READING_MAX_OUTPUT_TOKENS` |
| Số giữ chỗ (`reservedMicroVnd`) | 16.000 × giá vào + 10.000 × giá ra, đúng công thức `freezeFreePalaceCostContext` [KT] | giá DB: 2.585 đồng; từ chối nếu > 3.000 đồng |
| Thử lại | 0 | `begun >= 1` bị từ chối [KT] |
| Nhiệt độ | mặc định nhà cung cấp [SL: bộ nối chưa có tham số, thêm tuỳ chọn khi An cần giọng đều hơn] | |

---

## C. Schema và hợp đồng

- Tạo `packages/contracts/src/free-reading-v2.ts`: `FreeReadingContentV2Schema` (bản Zod của schema ở 3.4, dựng theo danh sách `locked` của từng yêu cầu), `FreeReadingFactV2Schema` (dùng lại `FreePalaceGiftFactV1Schema`), `FreeReadingViewV2Schema` (discriminated union như `FreePalaceGiftViewV1Schema`: `ready` + `requested|generating|unavailable|budget_exhausted|terminal_failure|cost_unknown`) và `FreeReadingFrozenCallV2Schema` (như `FreePalaceGiftFrozenCallV1Schema` [KT]).
- `superRefine` của view: mọi `keys`/`chain[].k` thuộc tập dẫn chứng; `palaceKey` trùng cung đã đóng băng; `teasers[].targetKey` khớp đúng tập `locked`; mỗi khối có `sourceKind`: `ai` hoặc `rule_v2` (cho phép khối trộn).
- Giữ `FreeStructuralOverviewDocV1Schema` cho nhánh quy tắc nếu chỉ cải tiến chữ; nếu đổi cấu trúc 8 đến 12 mục thì nâng phiên bản schema và `FREE_OVERVIEW_RENDERER_VERSION`.

## D. Dựng prompt

- File mới `free-reading-writer.ts`: `FREE_READING_PROMPT_VERSION = "free-reading-prompt-v2.0"`, `FREE_READING_SCHEMA_VERSION = "free-reading-v2"`, `FREE_READING_RULES_VERSION = "free-reading-quality-v2"`, `FREE_READING_KNOWLEDGE_VERSION = "free-reading-cards-v1"`. Đưa cả bốn vào lineage và `freePalaceArtifactKey` (khoá cache gồm các phiên bản này + provider + model [KT: `free-palace-selection.ts`]).
- System prompt = văn bản 3.1 với các chỗ `<<...>>` thay từ cấu hình lúc dựng: `buildVoiceBlockV4_2(config)` [KT], `bannedPhrases`, `bannedOpeners`, `certaintyPhrases` từ `v2.4-beginner`; `freeDiscouragedTerms` từ file cấu hình **mới** `config/ziwei-free-reading-quality.v1.json` (tách khỏi `discouragedTerms` của báo cáo trả phí vì mâu thuẫn "tài lộc").
- Frozen prompt giữ khuôn `FrozenPromptSchema` (system, user, facts, schemaName); thêm `cards` id và `lockedTargets`; đóng băng tại lúc nhận yêu cầu như hiện nay, để lúc chạy không đọc DB.
- Tin nhắn người dùng dựng bởi `free-reading-facts.ts` (B1 đến B4), thuần và tất định (cùng lá số → cùng chuỗi → cùng hash).
- Test: ảnh chụp (snapshot) prompt cho 3 lá số mẫu; test "không có chuỗi nào của tên/ngày sinh trong prompt".

## E. Cổng chất lượng `free-reading-quality.ts` (đặc tả)

Dùng lại (đã có, V9): `countVietnameseSyllables`, `wholeWord`, `HAN_IDEOGRAPH_PATTERN`, `ENGLISH_BRIGHTNESS_PATTERN`, `findBannedPhrase`, `findBannedOpener`, `findMachineSubheading`, `starDensityProblem`. Cần export từ `free-palace-quality.ts`: `PROHIBITED`, `DATE_PATTERNS`, `CANONICAL_ID` (V5). Nhận `{content, facts, labels, locked, timing, locale}`; trả `{ok, findings:[{code, block, hard, detail}]}`; chặn theo khối.

| Mã | Loại | Kiểm tra | Ngưỡng |
|---|---|---|---|
| `schema_invalid` | cứng | Zod, đủ số phần tử | — |
| `length_block` | cứng | âm tiết từng khối | overview 900 đến 1.300; portrait 18 đến 32; axis 100 đến 140; mỗi claim theo bảng 3.1 ±15%; focus paragraphs 110 đến 160 ±15%; teaser line 22 đến 45; clip 10 đến 18; shown 45 đến 75 |
| `key_unresolved` | cứng | `keys`, `chain[].k` ⊂ khoá dẫn chứng; mỗi claim có ≥1 khoá; mỗi `chain.k` ⊂ `keys` của claim | — |
| `invented_element` | cứng | mọi tên sao (dùng `freePalaceStarNames` mở rộng 106 nhãn), tên cung, tên Hóa, trong văn bản phải có trong FACTS toàn cục; mở rộng `invented_star` của V5 sang cung/Hóa | 0 |
| `claim_scope` | mềm | tên sao/cung trong một claim ⊂ nhãn của `keys` ∪ cung Mệnh/Thân | cảnh báo |
| `brightness_mismatch` | cứng | trong cùng một câu có đúng một tên sao S: từ dương (`sáng`, `vững`, `đủ sức`, `rực`) chỉ khi độ sáng(S) ∈ {exalted, prosperous, favorable}; từ âm (`mờ`, `yếu thế`, `thiếu lực`) chỉ khi ∈ {unfavorable, weak}. Bảng từ do cấu hình | 0 |
| `placement_mismatch` | cứng | mẫu `S (ở\|đóng\|tại\|nằm ở\|cư\|trong) (cung )?P`: (S, P) phải đúng vị trí trong lá số (hoặc nguồn mượn đã ghi) | 0 |
| `hoa_mismatch` | cứng | câu có `Hóa (Lộc\|Quyền\|Khoa\|Kỵ)` và tên sao S: (S, Hóa) ∈ `transformations`; `Hóa` đứng một mình phải có ít nhất một Hóa cùng loại trong FACTS | 0 |
| `uncomputed_number` | cứng | mọi số (chữ số hoặc chữ) đi với `tháng|tuổi|năm|cung|âm tiết` phải ∈ {lunarAge, startAge, endAge, startYear, endYear, targetYear, hanMonthCount, favorableMonthCount}; số đếm nhỏ ≤ 12 đi với "sao", "việc", "cung" cho phép | 0 |
| `uncomputed_date` | cứng | `DATE_PATTERNS` của V5, ngoại lệ là giá trị trong FACTS thời gian | 0 |
| `formula_leak` | cứng | `điểm cấu trúc`, `\d+/100`, `nền \d+`, `phần riêng`, `phần chiếu`, `độ mạnh cấu trúc` | 0 |
| `pattern_claim` | cứng | tên cách cục cổ điển (danh sách cấu hình) khi FACTS không có | 0 |
| `locale_integrity` | cứng | chữ Hán, nhãn độ sáng tiếng Anh, mã định danh, markdown, emoji, `findMachineSubheading` trên mỗi đoạn | 0 |
| `content_line` | cứng | `PROHIBITED` (bệnh, chết, cúng, xổ số) + `deathTerms` + `certaintyPhrases` + `giải hạn|hóa giải|vật phẩm` | 0 |
| `forbidden_self_ref` | cứng | `chúng tôi`, `đội ngũ`, `chuyên gia`, `\bAI\b`, `hệ thống`, `thuật toán`, `mô hình`, `tôi đã xem`; `tôi` > 2 lần | 0 |
| `caveat_count` | cứng | câu mẫu "không (phải\|có nghĩa\|đồng nghĩa\|báo\|đảm bảo\|dự đoán\|thay thế)", "chỉ mang tính", "tham khảo", "xin đừng", "đừng hiểu", "cần đối chiếu"; đếm theo câu | overview ≤ 2 (mục tiêu 1), focus ≤ 1, teaser 0, yearHook 0 |
| `teaser_leak` | cứng | không `nên\|hãy\|tránh\|cần`, không `vì\|do đó\|nhờ`, không chữ số, không `hạn`, không từ chấm điểm tốt/xấu (`tốt\|xấu\|may\|rủi\|mạnh\|yếu` làm vị ngữ về cả cung), ≤ 1 tên sao, ≤ 2 câu, ≤ 45 âm tiết | 0 |
| `teaser_overlap` | cứng | Jaccard 4-gram giữa teaser và bất kỳ câu nào của overview/focus | < 0,4 |
| `hook_shape` | cứng | `clip` không kết thúc bằng `. ! ? …`; chữ cuối ∈ {là, mà, ở, vì, khi, nhưng, và, nằm, ra, cả}; `shown` đúng 2 câu hoàn chỉnh; số trong `shown` khớp; `withheld` ∈ `allowedWithheld`; không có chuỗi nào của `clip` lặp trong `shown`/`basis` | 0 |
| `basis_generic` | cứng | mỗi `say` phải chứa ≥1 nhãn thuộc `chain.k`; 2 `say` ở hai claim khác nhau không trùng nguyên văn; không chứa `formula_leak` | 0 |
| `star_density` | cứng | `starDensityProblem(text, labels, 1.5)` theo từng khối văn xuôi | theo cấu hình v2.4 |
| `banned_phrase` / `banned_opener` / `ai_ism` | cứng / mềm | cấu hình + danh sách sáo máy ở 3.1 mục 6 | 0 / cảnh báo |
| `sentence_shape` | mềm | trung bình ≤ 26 âm tiết/câu, tối đa ≤ 42, ≤ 10% câu > 35 | cảnh báo |
| `noun_stack` | mềm | 3 từ trong {sự, việc, khả năng, tinh thần, xu hướng, mức độ, yếu tố, nền tảng, phương diện, khía cạnh, tính chất, năng lực} liền nhau; mật độ ≤ 2/100 âm tiết | cảnh báo |
| `repeat_opening` | mềm | cùng 2 âm tiết đầu mở > 3 câu; 2 đoạn liền cùng mở một chữ; `Bạn` mở > 3 câu | cảnh báo |
| `hedge_density` | mềm | `có thể\|có lẽ\|dường như\|phần nào\|tương đối` ≤ 2 mỗi 100 âm tiết | cảnh báo |
| `person_ratio` | mềm | ≥ 35% câu có `bạn\|mình\|tôi` | cảnh báo |
| `hanviet_rare` | mềm | từ trong `freeDiscouragedTerms` + danh sách do anh bổ sung | 0 là mục tiêu |
| `term_gloss` | mềm | sao đầu tiên xuất hiện phải có cụm giải nghĩa trong câu đó hoặc câu sau; ≤ 4 thuật ngữ được giải thích | cảnh báo |
| `distinct_openings` | mềm | 13 teaser, 3 âm tiết đầu đôi một khác nhau | cảnh báo |

Bộ kiểm là hàm thuần, 100% có test với văn bản tốt/xấu viết tay (mỗi mã một cặp), gồm các ví dụ ở Phần 2. Bộ dò `brightness_mismatch`, `placement_mismatch`, `hoa_mismatch` là chỗ quan trọng nhất cho "tin tin tin": nên viết kỹ nhất và có test lấy các câu thật mà mô hình từng sinh ra sai.

## F. Lưu trữ, cache, dự phòng

1. **Bảng artifact mới** (migration kế tiếp sau `0061_free_structural_overview_cache.sql`; số thứ tự chốt khi viết): lưu `content_v2` JSON, `facts` (dẫn chứng), `section_status` {overview, focus, teasers, yearHook: `ai|rule_v2`}, `content_hash`, lineage. Dùng lại `createFreePalaceArtifactRepository` làm khuôn (publish khi chưa xoá nguồn, an toàn khi xoá dữ liệu 24 giờ [KT: `free-palace-runner.ts` kiểm `isSourceAvailable`]).
2. **Đọc:** `FreePalaceReadService` đã trả "ready" chỉ khi hash lineage hiện tại khớp [KT: `currentFreePalaceLineageHash`]; thêm đường đọc gói v2 và chiếu sang DTO an toàn: **không gửi `chain.k` thô, hash, lineage; chỉ gửi mã khoá + nhãn đã dựng** (như `projectGift` làm với `facts` [KT: `ziwei-free-result-model.ts`]).
3. **Chữ quy tắc v2 (độc lập, ra trước):** sửa `compileFreeStructuralOverview`/`compileFreeStructuralPalace` theo GĐ3: dùng thư viện thẻ B4, đúng khung 6 phần của bài, thân bài không công thức, câu thận trọng gom 1 dòng cuối, Nên làm/Nên tránh theo bộ sao + độ sáng (không theo cung chung), đoạn năm nay 2 câu thật + câu cắt dựng từ `shown/clip` theo cùng khuôn `yearHook` (khuôn quy tắc, `withheld` theo `ctaTopic`). Tăng `FREE_OVERVIEW_RENDERER_VERSION`. Căn cứ của nhánh quy tắc = các `chain` dựng từ `essence`/`cost` của thẻ (ít cá nhân hơn AI nhưng vẫn theo sao thật).
4. **Bảo mật khoá** (FD-059): `clip` là toàn bộ phần bị cắt; phần sau của câu **không tồn tại ở bất kỳ nơi nào** (không sinh, không lưu). Chữ trả phí cho khối năm nay do báo cáo trả phí sinh riêng; `withheld` phải khớp sản phẩm CTA: `han_months`/`focus_area`/`annual_palace_meaning` chỉ khi `sku = ZIWEI-YEAR-{năm}-P0`; `decadal_interplay` chỉ khi `sku = ZIWEI-IDENTITY-P0` [KT: logic chọn sku ở `ziwei-free-result-model.ts`; SL: cần xác minh bài trả phí thật sự trả lời các chủ đề này; dữ liệu giai đoạn của báo cáo trả phí có `obstacleStarIds` theo tháng [KT: `period-reading-writer.ts`]].
5. **Tháng "warn" ép buộc (V12):** nếu chữ AI nói "có N tháng cần chú ý" mà một trong số đó là tháng bị ép thì khách hàng thấy con số không do cấu trúc sao tính ra (FD-089 cấm sự kiện/hạn engine không tính). Cần An hoặc anh quyết: đánh dấu tháng ép trong `calculateZiweiHoroscope` (`forced: true`) và để `hanMonthCount` chỉ đếm tháng thật cho lời văn AI. [SL: đây là việc nhỏ trong `iztro-horoscope.ts`.]
6. **Mở rộng lớp thời gian (tuỳ chọn, nâng chất cho "Năm nay"):** xuất `yearly.mutagen` (lưu Hóa Lộc/Quyền/Khoa/Kỵ rơi vào cung nào) và Hóa của đại vận vào `ZiweiHoroscopeResultV1` (tuỳ chọn). Khi đó đoạn năm nay có neo thật ("lưu Hóa Kỵ nhập cung Tài Bạch") thay vì chỉ "đi vào cung X, N tháng". [SL: iztro có `yearly.mutagen`, được dùng nội bộ ở V12; cần kiểm `decadal.mutagen`.]
7. **Cờ và triển khai:** dùng lại `FREE_PALACE_GENERATION_ENABLED`, thêm cờ `FREE_READING_V2_ENABLED` (đọc cả hai cờ); chữ quy tắc v2 luôn bật; AI bật theo thứ tự: tài khoản đã xác minh → khách đã tương tác (cơ chế `trusted` hiện có [KT: `free-palace-request.service.ts`]).
8. **Ghi sổ đo:** mã lỗi từng khối, số token thật, độ trễ, tỉ lệ khối rơi về quy tắc, nút phản hồi theo claim.

## G. Bộ chạy thử (`scripts/eval-free-reading.mjs`, khuôn theo `scripts/generate-ziwei-quality-samples.mjs` và `scripts/lib/native-campaign-*.mjs`)

- Vào: danh sách lá số tổng hợp (fixture trong `packages/test-fixtures/ziwei`; sinh bằng `IztroAdapter` với ngày sinh giả), tham số mối quan tâm/giai đoạn.
- Ra: JSON từng lần chạy (prompt hash, usage thật, tiền, mã lỗi cổng), bảng tổng; trang so sánh cho anh (Artifact do Claude dựng từ JSON này).
- Có trần tiền riêng (ví dụ 180.000 đồng), dừng khi chạm; một lần gọi mỗi lá số mỗi vòng.
- Lệnh đếm token trước khi gọi (đếm không tốn tiền) để hiệu chỉnh 1,7 token/âm tiết.
- Đối chiếu tay: xuất 10 nhận định ngẫu nhiên cùng dữ kiện gốc để người kiểm.

## H. Phân việc, file cụ thể

### BACKEND (An)

| Việc | File |
|---|---|
| Gỡ chặn token-bound; gỡ chặn usage 9router-Gemini | `apps/api/src/free-palace-composition.ts`, `packages/backend/src/ai/openai-compatible-adapter.ts`, `free-palace-cost-context.ts` |
| Hợp đồng v2 | `packages/contracts/src/free-reading-v2.ts` (+ `index.ts` export) |
| Thư viện thẻ nghĩa + kiểm | `content/knowledge/vi/ziwei/free-reading-cards.v1.json`, `scripts/build-free-reading-cards.mjs`, validator cùng kiểu `ziwei-knowledge-v4-validator.ts` |
| Dựng dữ kiện/khoá/salient/chọn thẻ | `packages/backend/src/ziwei/free-reading-facts.ts` (+ test) |
| Writer một lần gọi | `packages/backend/src/ziwei/free-reading-writer.ts` (khuôn `free-palace-writer.ts`) |
| Cổng chất lượng | `packages/backend/src/ziwei/free-reading-quality.ts`; export hằng ở `free-palace-quality.ts`; cấu hình `config/ziwei-free-reading-quality.v1.json` |
| Chữ quy tắc v2 (dự phòng + GĐ3) | `packages/backend/src/ziwei/free-structural-overview.ts`, `free-structural-overview-cache.ts`, `packages/contracts/src/free-structural-overview-v1.ts` |
| Yêu cầu/đóng băng/giữ chỗ | `free-palace-request.service.ts` (`buildFreePalaceFacts` → dữ kiện v2; hằng token mới; lineage), `free-palace-selection.ts` (khoá cache) |
| Lưu, đọc, runner | `free-palace-artifact.repository.ts`, `free-palace-read.service.ts`, `free-palace-runner.ts`, `packages/database/drizzle/00xx_free_reading_v2.sql` |
| Lớp thời gian | `packages/engine-adapters/src/ziwei/iztro-horoscope.ts` (cờ tháng ép, tuỳ chọn lưu Hóa), `packages/contracts/src/ziwei-horoscope-v1.ts` |
| Bộ chạy thử + fixture | `scripts/eval-free-reading.mjs`, `packages/test-fixtures/ziwei/*` |
| Test | `free-reading-quality.test.ts` (mỗi mã một cặp tốt/xấu), `free-reading-facts.test.ts` (tất định, không tên/ngày sinh), `free-reading-writer.test.ts` (một lần gọi, usage unknown, partial fallback), kiểm không rò chữ khoá (như LSV-75) |

### FRONTEND (anh + Claude; Sonnet viết, Opus review; mobile trước)

| Việc | File |
|---|---|
| Mô hình hiển thị: nhận gói v2, chiếu an toàn (chỉ mã khoá + nhãn), khối `ai`/`rule_v2` | `apps/web/src/features/ziwei/ziwei-free-result-model.ts`, `ziwei-free-result.tsx` |
| Bỏ tab Căn cứ | `ziwei-evidence-tab.tsx` (xoá), `ziwei-tabs-state.ts` (`CANONICAL_RESULT_TABS`, `CANONICAL_EVIDENCE_OPEN_IDS`, ánh xạ), `ziwei-result-tabs.tsx`, test liên quan; khoá `evidenceTab.*` trong `apps/web/messages/vi/ziwei.json` và `en/ziwei.json` (giữ `pnpm i18n:check` xanh) |
| Thành phần "nhận định + Căn cứ" tại chỗ: một dòng thu gọn ("Căn cứ: Thiên Phủ · Quan Lộc · Miếu ›"), bấm mở chuỗi 2 đến 3 bước; tầng 1 là thẻ sao/cung/độ sáng dựng thẳng từ engine (màu ngũ hành đã có ở `report-chart-visuals.tsx`), tầng 2 là chữ `say` | thành phần mới `apps/web/src/features/ziwei/claim-with-basis.tsx`; dùng lại `report-chart-visuals.tsx`, `ziwei-presentation.ts` |
| Tổng quan 7 khối | `apps/web/src/features/ziwei/ziwei-overview-tab.tsx`, `apps/web/src/features/reports/free-identity-preview.tsx` |
| Cung đọc trọn | `free-palace-gift-block.tsx` (thay danh sách dẫn chứng đánh số bằng Căn cứ theo từng nhận định) |
| Dòng đọc thử cho 11 cung + 2 chủ đề | `ziwei-palaces-tab.tsx`, `ziwei-topics-tab.tsx`, `ziwei-free-preview-projection.ts`, `secure-locked-preview.tsx` |
| Đoạn năm nay cắt giữa câu | `ziwei-annual-tab.tsx`, `secure-locked-preview.tsx` (render `shown` + `clip` + phần mờ; không có phần sau để lộ) |
| Trạng thái chờ "đang viết riêng cho bạn" (hiện bản quy tắc trước, thay bằng bản AI khi xong), nhãn "AI hỗ trợ diễn giải" (lexicon `docs/13` §4.3) | `ziwei-free-result.tsx` (dùng `giftPreparing` [KT]) |
| Chèn tên khách vào câu chào ở giao diện (không gửi cho mô hình) | `ziwei-free-result.tsx`, `ziwei-free-insights.ts` (đã có `displayName` [KT]) |
| Phản hồi "Đúng / Một phần / Không đúng" theo từng nhận định | `apps/web/src/features/reports/part-feedback.tsx` (partId theo khoá claim) |
| Trang HTML duyệt chữ cũ–mới + thang chấm | `prototype/revamp-2026-10/chu-mien-phi-v2.html` (do Claude dựng từ JSON của bộ chạy thử) |
| Duyệt thẻ nghĩa | anh duyệt `free-reading-cards.v1.json` (Claude soạn bằng Sonnet từ kho V4 và văn bài mẫu) |

## I. Những điều chưa kiểm chứng (suy luận)

1. 1,7 token mỗi âm tiết tiếng Việt; kích thước schema sau khi nhà cung cấp tính; có tính schema hai lần hay không.
2. Độ trễ 40 đến 90 giây; JSON dài 7.000 token có bị hỏng hay không.
3. Việc `max_tokens` có chặn "thinking" của Gemini qua 9router hay không; nhà cung cấp có hỗ trợ `pattern`/`maxLength` trong structured output.
4. Cách đọc "giá DB = giá Google từ 2027" (khớp số, chưa có tài liệu ghi ý định).
5. Điểm xếp hạng "điều hiếm" và ngưỡng trùng 35%, `caveat_count` mục tiêu 1.
6. Bài trả phí "Vận hạn năm" có thực sự giải đáp các chủ đề `withheld`.
7. `decadal.mutagen` có trong iztro hay không.
8. Số lượng khách mỗi ngày (không có dữ liệu): ảnh hưởng thế nào của trần 50.000 đồng.
9. Chữ AI sẽ "đúng chuẩn Tử Vi" đến đâu về mặt nghĩa sao chưa thể biết trước; hàng rào là thẻ nghĩa đã duyệt, cổng dữ kiện và mắt người đọc ở bước thử.
