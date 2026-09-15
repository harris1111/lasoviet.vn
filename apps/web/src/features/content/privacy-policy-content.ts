export type PrivacyPolicySection = {
  id: string;
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

export type LocalizedPrivacyPolicyContent = {
  title: string;
  effectiveDateLabel: string;
  effectiveDate: string;
  summary: string;
  sections: readonly PrivacyPolicySection[];
};

export const PRIVACY_POLICY_CONTENT: Record<"vi" | "en", LocalizedPrivacyPolicyContent> = {
  vi: {
    title: "Chính sách bảo mật",
    effectiveDateLabel: "Ngày hiệu lực & rà soát",
    effectiveDate: "14/09/2026",
    summary: "Thông tin minh bạch về dữ liệu được thu thập, mục đích sử dụng, thời hạn lưu trữ và các ranh giới bảo vệ quyền riêng tư của bạn.",
    sections: [
      {
        id: "collected-categories",
        title: "1. Các nhóm dữ liệu thu thập",
        paragraphs: [
          "Lá Số Việt chỉ thu thập các nhóm thông tin cần thiết phục vụ vận hành và tính toán dịch vụ:",
        ],
        bullets: [
          "Thông tin tài khoản: email, họ tên hiển thị và trạng thái xác minh tài khoản.",
          "Dữ liệu hồ sơ sinh và lá số: thông tin ngày, giờ, nơi sinh, giới tính và kết quả an sao lá số, luận giải.",
          "Dữ liệu kỹ thuật và hành vi: địa chỉ IP, user-agent/loại thiết bị, referrer/thông số UTM/đường dẫn và lịch sử tương tác sản phẩm.",
          "Lịch sử thương mại: thông tin đơn hàng, trạng thái thanh toán và lịch sử đọc báo cáo.",
        ],
      },
      {
        id: "purposes",
        title: "2. Mục đích sử dụng dữ liệu",
        paragraphs: [
          "Dữ liệu thu thập được xử lý cho các mục đích cụ thể:",
        ],
        bullets: [
          "Cung cấp dịch vụ lập lá số và lưu trữ hồ sơ sinh (birth_profile).",
          "Phân tích việc sử dụng sản phẩm để cải thiện trải nghiệm (analytics).",
          "Cá nhân hoá nội dung theo chủ đề và nhu cầu (personalization).",
          "Gợi ý dịch vụ và ưu đãi phù hợp (offers).",
          "Phòng chống gian lận và bảo đảm an toàn hệ thống (fraud/security).",
          "Bảo đảm phân phát nội dung và đo lường kinh doanh tổng hợp.",
        ],
      },
      {
        id: "identity-and-linking",
        title: "3. Nhận diện visitor và liên kết dữ liệu",
        paragraphs: [
          "Trước khi đồng ý hoặc đăng nhập, dữ liệu sử dụng được gắn với định danh kỹ thuật trong cookie bên thứ nhất HTTP-only visitor_id.",
          "Khi bạn chấp thuận consent trong wizard ở phiên ẩn danh, lịch sử tương tác của visitor được liên kết với hồ sơ sinh và ngữ cảnh phiên ẩn danh đó, không tự tạo hoặc hàm ý tài khoản xác thực. Khi bạn đăng nhập hoặc tạo tài khoản xác thực (qua Email hoặc Google), lịch sử tương tác của visitor được liên kết với tài khoản xác thực của bạn. Khi phiên hoặc hồ sơ ẩn danh sau đó được liên kết với tài khoản xác thực, quyền sở hữu dữ liệu sẽ được chuyển giao theo quy trình liên kết tài khoản hiện có.",
        ],
      },
      {
        id: "retention-and-deletion",
        title: "4. Thời hạn lưu trữ và thanh lọc dữ liệu",
        paragraphs: [
          "Chúng tôi áp dụng các mốc lưu trữ nghiêm ngặt:",
        ],
        bullets: [
          "Dữ liệu visitor và sự kiện chưa liên kết tài khoản: được thanh lọc sau tối đa 30 ngày.",
          "Hồ sơ sinh và lá số ẩn danh: lưu trữ tối đa 24 giờ và hỗ trợ xoá ngay lập tức.",
          "Dữ liệu hành vi đã liên kết tài khoản: lưu trữ trong suốt vòng đời tài khoản và bị thanh lọc hoàn toàn khi bạn yêu cầu xoá tài khoản hoặc dữ liệu.",
          "Địa chỉ IP thô: lưu trữ 12 tháng phục vụ phân tích/cá nhân hoá và lưu trữ tách biệt cho mục đích an ninh/phòng chống gian lận, sau đó được gỡ bỏ khỏi sự kiện.",
          "Dữ liệu chứng từ kế toán: hoá đơn và lịch sử giao dịch được lưu trữ độc lập theo nghĩa vụ pháp luật hiện hành.",
        ],
      },
      {
        id: "third-party-boundary",
        title: "5. Ranh giới chia sẻ bên thứ ba (Quy chuẩn FD-053)",
        paragraphs: [
          "Theo ranh giới bắt buộc FD-053, các dịch vụ phân tích hoặc xuất dữ liệu bên thứ ba không nhận được: họ tên, email, ngày/giờ/nơi sinh chính xác, câu hỏi tự do, chart_id, profile_id, nội dung luận giải, bằng chứng tính toán, địa chỉ IP thô, hoặc các khoá định danh tài khoản/visitor nội bộ.",
          "Pixel quảng cáo và trình theo dõi quảng cáo bên thứ ba không được kích hoạt trong phạm vi phát hành LSV-12 hiện tại.",
        ],
      },
      {
        id: "user-rights",
        title: "6. Quyền của người dùng",
        paragraphs: [
          "Bạn luôn nắm quyền kiểm soát dữ liệu cá nhân của mình:",
        ],
        bullets: [
          "Xuất dữ liệu tài khoản (Account export) dưới dạng file JSON đầy đủ.",
          "Yêu cầu xoá tài khoản với thời gian khôi phục 30 ngày.",
          "Xoá dữ liệu tạm thời ngay lập tức khi sử dụng phiên ẩn danh.",
          "Hủy đăng ký nhận email tiếp thị bất cứ lúc nào nếu có email tiếp thị được gửi.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    effectiveDateLabel: "Effective & Review Date",
    effectiveDate: "September 14, 2026",
    summary: "Clear facts on data collected, purposes of processing, retention periods, and boundaries protecting your sensitive information.",
    sections: [
      {
        id: "collected-categories",
        title: "1. Collected Data Categories",
        paragraphs: [
          "Lá Số Việt collects only necessary categories of information required to operate and compute our services:",
        ],
        bullets: [
          "Account details: email address, display name, and verification status.",
          "Birth profile & chart data: birth date, birth time, place, gender, calculated charts, and readings.",
          "Technical & behavioral data: IP address, user-agent/device class, referrer/UTM parameters/path, and product interactions.",
          "Commercial history: order history, payment confirmation status, and report reading progress.",
        ],
      },
      {
        id: "purposes",
        title: "2. Purposes of Data Processing",
        paragraphs: [
          "Collected data is processed for explicit purposes:",
        ],
        bullets: [
          "Providing chart generation and storing birth profiles (birth_profile).",
          "Product usage analytics to refine user experience (analytics).",
          "Content personalization tailored to your needs (personalization).",
          "Suggesting relevant services and tailored offers (offers).",
          "Fraud prevention and infrastructure security (fraud/security).",
          "Ensuring content delivery and aggregate business measurement.",
        ],
      },
      {
        id: "identity-and-linking",
        title: "3. Visitor Identity & History Linking",
        paragraphs: [
          "Prior to consent or authentication, usage data is keyed to a first-party HTTP-only visitor_id cookie.",
          "Wizard consent by an anonymous actor links visitor history to the birth profile and anonymous session context, and does not by itself create or imply an authenticated account. Signing in or authenticating (via Email or Google) links visitor history to your authenticated account. When an anonymous actor or profile is subsequently linked to a verified account, ownership transfers under the existing account-linking flow.",
        ],
      },
      {
        id: "retention-and-deletion",
        title: "4. Retention & Deletion Schedules",
        paragraphs: [
          "We enforce strict data retention boundaries:",
        ],
        bullets: [
          "Unlinked visitor and event records: purged after at most 30 days.",
          "Anonymous birth profiles and charts: retained for at most 24 hours with immediate deletion available.",
          "Account-linked behavioral data: retained while the account exists and completely purged upon account or data deletion requests.",
          "Raw IP addresses: retained for 12 months for analytics/personalization and separately bounded fraud/security, then scrubbed from events.",
          "Statutory accounting records: order invoices and payment transactions are preserved independently under applicable legal obligations.",
        ],
      },
      {
        id: "third-party-boundary",
        title: "5. Third-Party Data Boundaries (FD-053 Policy)",
        paragraphs: [
          "Under the binding FD-053 boundary, third-party analytics or export adapters do not receive: names, emails, exact birth date/time/place, free-text questions, chart_id, profile_id, report content, evidence text, raw IP addresses, or internal account/visitor identifiers.",
          "Advertising pixels and third-party advertising trackers are not activated by LSV-12 in the current release.",
        ],
      },
      {
        id: "user-rights",
        title: "6. Your Privacy Rights",
        paragraphs: [
          "You retain full authority over your personal information:",
        ],
        bullets: [
          "Account data export: download a complete JSON file of your account data.",
          "Account deletion request with a 30-day recovery window.",
          "Immediate deletion of temporary data during anonymous sessions.",
          "Unsubscribe from marketing emails at any time should any marketing communication be sent.",
        ],
      },
    ],
  },
};
