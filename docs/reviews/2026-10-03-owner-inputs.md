# Các mục cần bạn trả lời — 2026-10-03

Bạn có thể trả lời theo số hoặc điền vào các dòng **Trả lời**. An hoặc Lãm đều có quyền quyết định, không cần xác nhận riêng từ người còn lại. Ngày 04/10 bạn đã duyệt làm theo các khuyến nghị. Phần bối cảnh bên dưới ghi lại lý do ban đầu; không cần duyệt lại các mục đã chốt. SePay để sau; bạn sẽ chạy nghiệm thu điện thoại sau khi có Sentry. Không ghi mật khẩu, API key, thông tin ngân hàng hay dữ liệu sinh của khách hàng vào file này.

## Những việc đã làm xong mà không cần thêm ý kiến

- Trang chủ, PR [274](https://github.com/harris1111/lasoviet.vn/pull/274): đã merge và deploy; luồng đồng ý xử lý dữ liệu → lập lá số thật bằng VI/EN và 22 ca kiểm tra kích thước màn hình đều đạt.
- Ghi nhận sự kiện không trùng khi gửi lại, PR [275](https://github.com/harris1111/lasoviet.vn/pull/275): đã merge/deploy; gửi lại phản hồi thật chỉ tạo một sự kiện, dữ liệu xung đột hoặc lệch thời gian bị từ chối, dữ liệu kiểm thử đã xóa. Toàn bộ LSV57 vẫn ở In Review.
- Số liệu phễu trong 7 ngày đã có trong [tài liệu vận hành](../runbooks/funnel-dashboard.md). Có cả lượt kiểm thử, một số bước mới chưa đủ thời gian thu thập, nguồn xác nhận thanh toán chưa được kiểm chứng; chưa thể coi đây là tỷ lệ chuyển đổi hay doanh thu khách hàng.
- Ưu tiên đọc miễn phí trước khi mời mua, PR [277](https://github.com/harris1111/lasoviet.vn/pull/277): đã bỏ link mua xuất hiện quá sớm ở đầu trang và merge/deploy; 48 ca dành cho khách chưa đăng nhập đều đạt trên Chromium/Firefox/WebKit, VI/EN, bốn kích thước màn hình và giao diện sáng/tối. LSV72 vẫn còn phần nghiệm thu thành viên, điện thoại thật và hiệu năng.

- LSV76, PR [278](https://github.com/harris1111/lasoviet.vn/pull/278): đã merge/deploy và chuyển Done; bảng mở khóa dùng giá thật từ API, phần khấu trừ nâng cấp và giao dịch ví đã kiểm thử bằng PostgreSQL. Sản phẩm giữ chỗ vẫn chưa mở bán.
- LSV78, PR [281](https://github.com/harris1111/lasoviet.vn/pull/281): phần màn hình chờ và gợi ý nâng cấp đã merge/deploy; 24 ca Chromium/Firefox trên bản chạy thật đạt, dữ liệu thử đã xóa. Toàn bộ ticket vẫn In Progress.

## Những quyết định và thông tin còn cần

### 1. Mua một cung ngay trong phần xem trước đang khóa — LSV75/76

**Bối cảnh:** LSV76 ghi rằng việc mua ngay trong phần xem trước đã được duyệt nhưng chưa ghi nhận; kế hoạch giai đoạn 5 vẫn yêu cầu duyệt; FD-109c/d có độ ưu tiên cao hơn vẫn chỉ cho phép link sang trang chọn luận giải. Ba nguồn này đang mâu thuẫn. Cần xác nhận phạm vi duyệt trước đó để ghi lại, hoặc có quyết định rõ ràng thay thế nó. Luồng từ trang chủ sang bước kiểm tra thông tin, với ô đồng ý mặc định chưa tích, đã được chốt.

**Phương án:** sửa FD-109 để cho phép hiện giá và nút mua trong phần xem trước đang khóa do người dùng chủ động mở; phần đọc miễn phí bên ngoài vẫn không hiện giá. Mua cung này giá 120 Lá, có lựa chọn phụ là luận giải trọn đời 960 Lá. Giá cuối cùng và phần Lá được khấu trừ khi nâng cấp lấy từ API; sản phẩm chưa mở bán vẫn không mua được.

**Khuyến nghị:** xác nhận quyết định duyệt trước đó trong ticket bao gồm thay đổi hẹp này, rồi đồng bộ sổ quyết định và đặc tả. Giữ luồng hiện tại cho đến khi giải quyết mâu thuẫn.

**Trả lời:** đã duyệt thay đổi hẹp này; ghi nhận tại FD-110 và FD-113 trong PR #278.

### 2. Review luồng mobile đề xuất — LSV75–78

**Bối cảnh:** các ticket này cần duyệt bản mẫu trước khi làm giao diện production. Đã có [bản mẫu tương tác](../../prototype/revamp-2026-09/contextual-unlock-proposal-2026-10-03.html) cho luồng xem trước → nạp Lá trong cùng bảng mở → màn hình chờ, kèm cách trình bày các gói. Xem nhanh: [xem trước](../../prototype/revamp-2026-09/contextual-unlock-proposal-preview-390.png), [nạp Lá](../../prototype/revamp-2026-09/contextual-unlock-proposal-topup-390.png), [chờ kết quả](../../prototype/revamp-2026-09/contextual-unlock-proposal-waiting-390.png). Để chạy bản mẫu, tải file HTML cùng thư mục chứa các tài nguyên rồi mở. Mọi giao dịch và số dư đều là mô phỏng.

**Khuyến nghị:** duyệt hướng luồng này, sau đó triển khai bằng giá thật từ API, tiếp tục đúng hành động người dùng đang làm, dùng lại đơn hàng, yêu cầu tài khoản đã xác minh khi thanh toán và tự động cập nhật khi luận giải sẵn sàng. Duyệt bản mẫu không đồng nghĩa với duyệt nội dung bịa, bật nhà cung cấp thật hay mở bán sản phẩm đang giữ chỗ.

**Trả lời:** đã duyệt hướng bản mẫu; triển khai theo từng ticket, dùng giá thật và giữ sản phẩm chưa mở bán ở trạng thái tắt.

### 3. Môi trường kiểm thử thanh toán thật và tài khoản đã xác minh — LSV50–54/59/80

**Bối cảnh:** kiểm thử sandbox đã được duyệt theo FD-030. Production hiện có `SEPAY_ENV=disabled` và bật tự duyệt nạp tiền để kiểm thử; cấu hình này chưa chứng minh được thanh toán SePay có xác thực, cộng ví, mở đúng nội dung đã chọn, khấu trừ khi nâng cấp hay hoàn tiền thật.

**Khuyến nghị:** dùng sandbox SePay tách biệt, tắt tự duyệt và có một tài khoản kiểm thử đã xác minh do chủ sở hữu kiểm soát. Cung cấp cấu hình môi trường/merchant qua kênh triển khai bảo mật; chỉ ghi nơi tham chiếu trong file này. Cần thêm mẫu trích đoạn đã mua và hai cung thuộc quyền sở hữu của tài khoản để kiểm tra khấu trừ nâng cấp, giới hạn nội dung PDF và chính sách bảo đảm. Không sửa ngày mua lịch sử để tạo kết quả nghiệm thu giả.

**Trả lời:** bạn yêu cầu để phần SePay sandbox/tài khoản kiểm thử này làm sau. Chưa tuyên bố nghiệm thu thanh toán đạt.

Không thực hiện giao dịch ngân hàng thật thay cho phần sandbox đã hoãn.

### 4. Ngân sách, model và review 5 luận giải trả phí — LSV58/62/63/68

**Bối cảnh:** các điều kiện chất lượng thật chưa hoàn tất. Luận giải trọn đời v4.2 cần 20 bản thật đạt liên tiếp và chủ sở hữu review 5 bản. Luận giải chủ đề cần 20 bản cho mỗi chủ đề; luận giải tháng và năm mỗi loại cần 20 bản. Bản xem trước ngắn để kiểm tra kỹ thuật không đáp ứng các điều kiện này. v4.2 tiếng Việt đã được bật, không cần duyệt lại.

**Khuyến nghị:** bắt đầu với luận giải trọn đời v4.2, dùng tên model hiện được cấu hình là `ag/gemini-3.8-flash`, với **trần tổng chi phí 200.000 VND cho cả đợt, gồm cả lần chạy lại**. Xác minh model thực tế và giá trước khi chạy; dừng nếu chưa biết chi phí hoặc đã hết ngân sách. Đây là trần đề xuất, không phải dự toán hay cam kết đủ 20 bản đạt. Các đợt khác lên lịch riêng sau khi có kết quả này.

Review 5 bản đầy đủ: có bám đúng lá số không, tiếng Việt có dễ đọc không, lời khuyên có cụ thể/hữu ích không, có lặp ý/viết cho đủ chữ hoặc nội dung bị cấm không. Ghi đạt/không đạt cho từng bản và câu/đoạn cần sửa. Nếu chất lượng không đạt thì dừng, sửa xong rồi đếm lại chuỗi bản đạt liên tiếp; bản không đạt không được đưa ra bán.

**Trả lời:** đã duyệt đợt trọn đời theo đề xuất: `ag/gemini-3.8-flash`, trần tổng 200.000 VND gồm chạy lại; phải xác minh giá trước. Review 5 bản vẫn cần bạn thực hiện khi có bản đầy đủ.

Các đợt sự nghiệp, tình cảm, hằng ngày, tháng và năm vẫn hoãn; chưa có ngân sách riêng ngoài đợt trọn đời.

### 5. Đăng nhập Google và quay lại đúng trang trên điện thoại thật — LSV73

**Bối cảnh:** kiểm tra đường quay lại sau đăng nhập trên Chromium đã deploy đều đạt, nhưng kiểm thử OAuth có mô phỏng chưa chứng minh được đăng nhập Google trên iPhone/Safari thật hoặc trình duyệt bên trong Facebook/Messenger.

**Khuyến nghị:** trên từng trình duyệt có sẵn: mở lá số → mở trang chọn luận giải → đăng nhập Google → xác nhận quay lại đúng lá số/trang chọn luận giải → bấm Quay lại hoặc mở lại link. Kiểm tra ngôn ngữ và tham số/phần `#` của URL được giữ nguyên, không bị lặp vòng đăng nhập. Dùng tài khoản do chủ sở hữu kiểm soát.

**Trả lời:** bạn sẽ chạy; bổ sung Sentry trước để dễ xem lỗi. Thiết bị/trình duyệt và kết quả nghiệm thu sẽ ghi sau.

### 6. Tài khoản thành viên và thiết bị thật để nghiệm thu — LSV72

**Bối cảnh:** kiểm thử khách chưa đăng nhập chưa chứng minh được hành vi của tài khoản đã xác minh hoặc hiệu năng trên thiết bị thật có chiều rộng hiển thị 360px qua mạng 4G.

**Khuyến nghị:** chỉ định tài khoản đã xác minh và lá số thuộc tài khoản đó, do chủ sở hữu kiểm soát; thêm thiết bị Android/Chrome có chiều rộng hiển thị 360px dùng 4G. Đội kỹ thuật sẽ cung cấp cách đo LCP (thời gian hiển thị nội dung chính) theo ngưỡng đã chốt là dưới 2,5 giây; không cần quyết định lại ngưỡng. Không đưa mật khẩu hoặc cookie phiên đăng nhập lên Git.

**Trả lời:** bạn sẽ chạy nghiệm thu thiết bị; thêm Sentry trước. Tài khoản đã xác minh/lá số và kết quả 4G vẫn cần bằng chứng thực tế.

### 7. Duyệt trọng số điểm cấu trúc trước khi dùng cho khách trả phí — FD-107

**Bối cảnh:** [sổ quyết định](../superpowers/plans/2026-08-31-lasoviet-platform-implementation/rules-and-decisions-tracker.md) vẫn ghi việc duyệt trọng số cụ thể là chưa xong. [Công thức đã triển khai](../../packages/backend/src/reports/structural-palace-score.ts) cho kết quả cố định với cùng dữ liệu, không phải dự đoán cuộc đời được kiểm chứng bằng thực nghiệm.

**Phương án:** điểm nền 50; sáu mức độ sáng trong mã nguồn `exalted/prosperous/favorable/neutral/unfavorable/weak` lần lượt +12/+9/+6/+2/−6/−9; Lộc/Quyền/Khoa/Kỵ lần lượt +10/+8/+6/−10; mỗi sao trong sáu cát tinh +4, Lộc Tồn +6, Thiên Mã +3, mỗi sao trong sáu sát tinh −5, Tuần/Triệt mỗi sao −4. Chính tinh mượn tính nửa điểm; cộng thêm một phần ba tổng điểm riêng của cung đối và hai cung tam hợp, làm tròn và giới hạn trong 0–100. Các ngưỡng phân nhóm là 30/45/55/70. Mã nguồn là nơi xác định chính xác mã sao và quy tắc tránh tính trùng.

**Khuyến nghị:** duyệt rõ các trọng số này cho chỉ số độ mạnh cấu trúc đang công bố, hoặc tiếp tục chưa dùng cho khách trả phí trong khi sửa trọng số.

**Trả lời:** đã duyệt trọng số hiện tại cho chỉ số cấu trúc; ghi nhận tại FD-111, không coi là dự đoán đã kiểm chứng.

### 8. Người nhận và phạm vi gửi thông báo kiểm thử — LSV60/79

**Bối cảnh:** đã có hạ tầng đồng ý nhận thông báo và hủy đăng ký; gửi thật cần người nhận kiểm thử có kiểm soát và cấu hình bên gửi. Thông báo nhắc tiếp tục mua phải giữ đúng đơn đang chờ và không gửi cho tài khoản chưa đồng ý.

**Khuyến nghị:** trước tiên chỉ thu thông báo trong sandbox, hoặc gửi tới một người nhận là chủ sở hữu đã được chỉ định rõ và đồng ý nhận. Giữ việc gửi nhắc mua diện rộng ở trạng thái tắt cho đến khi kiểm thử gửi/nhận, sự đồng ý, chống gửi trùng và hủy đăng ký đều đạt.

**Trả lời:** theo khuyến nghị đã duyệt: chỉ ghi nhận thông báo trong môi trường thử, không gửi thật; chưa có người nhận được chỉ định.

### 9. Đặc tả công cụ trả phí đầu tiên của gói thành viên — LSV64

**Bối cảnh:** quyết định tạm giữ gói thành viên vẫn có hiệu lực. Chỉ có luồng luận giải ngày/tháng chưa đáp ứng toàn bộ quyền lợi FD-093, và không được tự ý giảm quyền lợi đã hứa.

**Khuyến nghị:** giữ gói thành viên ở trạng thái chưa mở bán; đặc tả một công cụ trước: dữ liệu người dùng nhập → phương pháp/dữ kiện từ bộ tính → kết quả trả về → giới hạn sử dụng/thời hạn → đồng ý xử lý dữ liệu/xóa dữ liệu. Chỉ bắt đầu với công cụ lịch/chọn ngày sau khi phương pháp được duyệt; chỉ dẫn sang luận giải hằng ngày có sẵn không được tính là một công cụ trả phí mới.

**Trả lời:** giữ gói thành viên chưa mở bán. Công cụ đầu tiên và phương pháp/nguồn cụ thể chưa được chọn; không tự bật quyền lợi mới.

### 10. Cấu hình Sentry trước khi test điện thoại — LSV81

**Bối cảnh:** bạn đề nghị thêm Sentry để có trace lỗi phía trình duyệt. Phần SDK đã merge/deploy qua PR #279 và bản sửa build #280: chỉ nhận lỗi, gắn SHA bản deploy, lọc dữ liệu riêng tư; Replay/trace hiệu năng tắt, source map chỉ upload riêng. Ngày 04/10 bạn đã chọn org `cashcow-73`, project `javascript-nextjs`, kết nối wizard/quyền đọc và bật ngăn lưu IP. DSN/token đã được lưu đúng chỗ trong GitHub. Lỗi thử trên bản staging đã được xác nhận qua MCP, có file/dòng TypeScript đọc được: [JAVASCRIPT-NEXTJS-1](https://cashcow-73.sentry.io/issues/JAVASCRIPT-NEXTJS-1). Đội kỹ thuật tiếp tục review và nghiệm thu bản deploy bật Sentry trước khi báo Done.

**Đề xuất:** dùng project do bạn quản lý. Đội kỹ thuật cấu hình rồi kiểm tra một lỗi giả lập có file/dòng nguồn đọc được trước khi bạn test Google/4G.

**Trả lời:** đã chốt và kết nối đầy đủ; không cần gửi thêm token hay mật khẩu. Token upload chỉ phục vụ build. Quyền đọc project/lỗi dùng kết nối riêng, không thêm quyền sửa/xóa vào token CI. Đăng nhập Google và hiệu năng 4G trên thiết bị thật vẫn cần bạn nghiệm thu sau khi Sentry được bật trên bản deploy.

**“Cấu hình bảo mật” là gì:** DSN là địa chỉ công khai để trình duyệt gửi lỗi, lưu ở GitHub variable `SENTRY_CLIENT_DSN`. Token upload source map là khóa bí mật, lưu tại [GitHub Actions Secrets](https://github.com/harris1111/lasoviet.vn/settings/secrets/actions), tên `SENTRY_AUTH_TOKEN`; không gửi token vào chat hay file này. Đội kỹ thuật sẽ dùng token trong bước build, không đưa vào trình duyệt. Cần tắt lưu IP ở Sentry và kiểm tra lỗi thật có file/dòng nguồn đọc được trước khi báo Done hoặc chạy nghiệm thu điện thoại.

## Đã chốt, không cần trả lời lại

AI miễn phí giữ các trần đã duyệt: 3.000 VND/phiên bản lá số và 50.000 VND/ngày UTC cho toàn hệ thống; giới hạn khách 1/tài khoản đã xác minh 3 trong cửa sổ 24 giờ trượt, chỉ một lần thử. Việc tạo nội dung vẫn tắt cho đến khi giá, giới hạn token, chất lượng thật, nghiệm thu thành viên và cơ chế tắt khẩn cấp đều có bằng chứng đạt. Phương án teaser B và mặc định v4.2 tiếng Việt đã được duyệt. Gói thành viên và Combo chưa mở bán; tính hợp đôi/BaZi vẫn hoãn. PR197/231 giữ nguyên.

## Phần việc kỹ thuật còn lại

Phát sự kiện `upgrade_purchased` từ nguồn xác nhận đáng tin cậy, nghiệm thu đầy đủ luồng tiếp tục mua/hoàn tiền thật, bảo mật và báo giá phần xem trước đang khóa, chất lượng bài tổng quan miễn phí dài, đủ bằng chứng A17/trình duyệt/hiệu năng và sáu luồng kiểm thử chuẩn (golden paths) trong CI vẫn là việc của đội kỹ thuật. Đây không phải câu hỏi để chủ sở hữu tự giải quyết. Không chuyển cả ticket sang Done chỉ nhờ bản mẫu hoặc một phần kiểm thử sau deploy.
