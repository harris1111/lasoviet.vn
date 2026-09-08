import Link from "next/link";
import type { PublicContentV1, RouteDefinitionV1 } from "@lasoviet/contracts";

type SampleReportPageProps = {
  content: PublicContentV1;
  locale: "en" | "vi";
  route: RouteDefinitionV1;
};

export function SampleReportPage({ content, locale }: SampleReportPageProps) {
  const isVi = locale === "vi";
  const chartHref = isVi ? "/tao-la-so/tu-vi" : "/en/tao-la-so/tu-vi";

  const ziweiPalaces = isVi
    ? [
        { name: "Cung Mệnh", role: "Bản mệnh cốt lõi", desc: "Định vị căn tính, tiềm năng nội tại và trục tính cách xuyên suốt." },
        { name: "Cung Phụ Mẫu", role: "Gốc rễ gia đình", desc: "Soi chiếu tương quan cùng phụ mẫu, nền tảng nuôi dưỡng thuở đầu đời." },
        { name: "Cung Phúc Đức", role: "Nội tâm & phúc trạch", desc: "Đời sống tinh thần, phúc nghiệp tổ tiên và chiều sâu nội tại." },
        { name: "Cung Điền Trạch", role: "Gia cư & tích lũy", desc: "Không gian an cư, tài sản điền địa và độ vững vàng hậu phương." },
        { name: "Cung Quan Lộc", role: "Sự nghiệp & phát triển", desc: "Đường hướng công việc, vị thế chuyên môn và nhịp bứt phá." },
        { name: "Cung Nô Bộc", role: "Mối quan hệ xã hội", desc: "Cộng sự, bạn bè, cấp dưới và trường tương tác ngoại vi." },
        { name: "Cung Thiên Di", role: "Xuất ngoại & giao tế", desc: "Môi trường bên ngoài, cơ hội dịch chuyển và khả năng ứng biến." },
        { name: "Cung Tật Ách", role: "Sức khỏe & chuyển hóa", desc: "Thể chất, cơ chế ứng phó căng thẳng và điểm cần gìn giữ." },
        { name: "Cung Tài Bạch", role: "Tài chính & dòng tiền", desc: "Quy luật kiếm tiền, quản trị tài sản và nguồn lực vật chất." },
        { name: "Cung Tử Tức", role: "Hậu duệ & truyền thừa", desc: "Mối duyên cùng con cái, sự kế thừa và gieo mầm tương lai." },
        { name: "Cung Phu Thê", role: "Hôn nhân & bạn đồng hành", desc: "Hình mẫu người phối ngẫu, nhịp đồng hành và điểm cần lắng nghe." },
        { name: "Cung Huynh Đệ", role: "Anh em & bằng hữu", desc: "Tình thân ruột thịt, sự gắn kết nội tộc và trợ lực đồng trang lứa." },
      ]
    : [
        { name: "Life Palace", role: "Core identity", desc: "Baseline character, inherent potential, and lifelong personal trajectory." },
        { name: "Parents Palace", role: "Lineage roots", desc: "Family context, early guidance, and intergenerational alignment." },
        { name: "Fortune Palace", role: "Inner spirit & well-being", desc: "Psychological resilience, spiritual peace, and ancestral endowment." },
        { name: "Property Palace", role: "Real estate & assets", desc: "Living environment, tangible holdings, and foundational security." },
        { name: "Career Palace", role: "Vocation & ambition", desc: "Professional trajectory, leadership potential, and mastery path." },
        { name: "Friends Palace", role: "Allies & community", desc: "Support networks, collaborations, and wider social dynamics." },
        { name: "Travel Palace", role: "Mobility & diplomacy", desc: "Adaptability away from home, public presence, and outward journeys." },
        { name: "Health Palace", role: "Vitality & balance", desc: "Constitutional health, stress vulnerability, and restorative practices." },
        { name: "Wealth Palace", role: "Finances & cashflow", desc: "Resource generation, money stewardship, and financial independence." },
        { name: "Children Palace", role: "Descendants & mentoring", desc: "Relationship with the next generation, creative projects, and legacy." },
        { name: "Spouse Palace", role: "Partnership & marriage", desc: "Relational dynamics, partner temperament, and mutual commitments." },
        { name: "Siblings Palace", role: "Kinship & peers", desc: "Sibling bonds, extended peer trust, and early collaborative roots." },
      ];

  const reportModules = isVi
    ? [
        { title: "1. Đồ hình bản mệnh & Trục chính", desc: "Xác lập trục Cung Mệnh - Cung Thân, ngũ hành cục diện và đối chiếu căn cứ." },
        { title: "2. Luận giải chi tiết 12 cung vị", desc: "Tường giải từng cung theo sao chính tọa thủ, sao phụ trợ và tương tác hội tụ." },
        { title: "3. Tứ Hóa & Biến chuyển chu kỳ", desc: "Phân tích Hóa Lộc, Hóa Quyền, Hóa Khoa, Hóa Kỵ theo từng giai đoạn đại hạn." },
        { title: "4. Đối chiếu dữ liệu minh bạch", desc: "Mỗi luận điểm gắn liền với nguyên lý đồ hình, mở được căn cứ kiểm chứng." },
        { title: "5. Gợi ý chiêm nghiệm thực hành", desc: "Định hướng hành động cụ thể, tự quan sát và rèn luyện không phán xét tương lai." },
      ]
    : [
        { title: "1. Natal chart structure & core axes", desc: "Determining Life and Body palaces, element局, and baseline configurations." },
        { title: "2. Comprehensive twelve-palace readings", desc: "In-depth interpretation of each palace based on primary and auxiliary stars." },
        { title: "3. Four Transformations & life cycles", desc: "Analysis of Lu, Quan, Khoa, and Ky across major life decennial periods." },
        { title: "4. Verifiable evidence provenance", desc: "Each analytical claim references underlying astrological rules and placements." },
        { title: "5. Actionable self-reflection guidance", desc: "Pragmatic behavioral recommendations designed for personal clarity." },
      ];

  const upcomingDisciplines = isVi
    ? [
        {
          discipline: "Bát Tự (BaZi)",
          subtitle: "Tứ Trụ Mệnh Lý",
          preview: "Cấu trúc 4 trụ Năm - Tháng - Ngày - Giờ, tương quan Thập Thần, Vòng Trường Sinh và thế cân bằng Ngũ Hành khuyết - vượng.",
          status: "Bản mẫu cấu trúc · Sắp ra mắt",
        },
        {
          discipline: "Kinh Dịch (I Ching)",
          subtitle: "Chu Dịch Tượng Số",
          preview: "Quẻ Chủ, Quẻ Biến, Thoán từ, Hào từ và thời thế hành động trong những ngã rẽ chuyển giao mang tính quyết định.",
          status: "Bản mẫu cấu trúc · Sắp ra mắt",
        },
        {
          discipline: "Chiêm Tinh Tây Phương",
          subtitle: "Western Natal Astrology",
          preview: "Bản đồ sao 12 Cung Hoàng Đạo, 12 Nhà (Houses), các hành tinh chủ đạo và mạng lưới góc chiếu tương hỗ.",
          status: "Bản mẫu cấu trúc · Sắp ra mắt",
        },
        {
          discipline: "Thần Số Học",
          subtitle: "Pythagorean Numerology",
          preview: "Số Chủ Đạo, Số Vận Mệnh, các chặng đỉnh cao Kim Tự Tháp và chu kỳ năm cá nhân định hướng thời điểm hành động.",
          status: "Bản mẫu cấu trúc · Sắp ra mắt",
        },
      ]
    : [
        {
          discipline: "BaZi (Four Pillars)",
          subtitle: "Natal Four Pillars of Destiny",
          preview: "Four pillars of Year, Month, Day, and Hour, Ten Gods dynamics, Twelve Life Stages, and Five Elements balance.",
          status: "Sample structure · Upcoming",
        },
        {
          discipline: "I Ching",
          subtitle: "Hexagram Situational Wisdom",
          preview: "Primary and Changing Hexagrams, Judgment, Line statements, and tactical timing for decisive crossroads.",
          status: "Sample structure · Upcoming",
        },
        {
          discipline: "Western Natal Astrology",
          subtitle: "Planetary Natal Mapping",
          preview: "Twelve Zodiac signs, twelve astrological houses, planetary placements, and geometric aspect configurations.",
          status: "Sample structure · Upcoming",
        },
        {
          discipline: "Numerology",
          subtitle: "Pythagorean Numerology",
          preview: "Life Path Number, Destiny Number, Pyramid Pinnacle cycles, and personal year transitions.",
          status: "Sample structure · Upcoming",
        },
      ];

  return (
    <main className="sample-report-page">
      {/* 1. Hero section: First viewport identifies sample reading experience and shows live Tu Vi offer */}
      <section aria-labelledby="sample-hero-heading" className="sample-hero container">
        <p className="eyebrow">{isVi ? "Bản luận giải mẫu · Minh bạch cấu trúc" : "Sample Report · Transparent Structure"}</p>
        <h1 id="sample-hero-heading">
          {content.title || (isVi ? "Bản luận giải mẫu Lá Số Việt" : "Lá Số Việt Sample Report")}
        </h1>
        <p className="sample-hero-lead">
          {isVi
            ? "Khám phá cấu trúc một báo cáo Tử Vi hoàn chỉnh: từ 12 cung vị đến những mối liên hệ tạo nên bức tranh riêng của bạn."
            : "Explore a complete Zi Wei report structure, from all twelve palaces to the connections that shape your personal reading."}
        </p>

        {/* Primary live product signal */}
        <div className="sample-offer-spotlight">
          <div className="sample-offer-info">
            <span className="sample-badge-active">{isVi ? "Báo cáo có sẵn ngay" : "Available now"}</span>
            <h2>{isVi ? "Luận giải Tử Vi trọn đời" : "Comprehensive Zi Wei Report"}</h2>
            <p className="sample-offer-meta">
              <span className="topic-price">{isVi ? "79.000 ₫" : "79,000 VND"}</span>
              <span className="topic-once">{isVi ? "Thanh toán một lần · Không tự động gia hạn" : "One-time payment · No automatic renewal"}</span>
            </p>
          </div>
          <div className="sample-offer-cta">
            <Link className="button" href={chartHref}>
              {isVi ? "Lập lá số để bắt đầu" : "Build your chart to start"}
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Tu Vi comprehensive report preview */}
      <section aria-labelledby="sample-tuvi-heading" className="sample-section sample-tuvi-preview container">
        <div className="section-heading">
          <p className="eyebrow">{isVi ? "Tử Vi Đẩu Số" : "Zi Wei Dou Shu"}</p>
          <h2 id="sample-tuvi-heading">
            {isVi ? "Cấu trúc 12 cung vị trong bản luận giải hoàn chỉnh" : "Twelve-Palace Structure in Complete Report"}
          </h2>
          <p className="section-lead">
            {isVi
              ? "Mỗi cung vị đại diện cho một bình diện sống, kết hợp giữa đồ hình thiên bàn và tương tác các sao."
              : "Each palace represents an essential domain of life, synthesized from chart placements and star interactions."}
          </p>
        </div>

        <div className="sample-palaces-grid">
          {ziweiPalaces.map((palace) => (
            <article className="sample-palace-card" key={palace.name}>
              <div className="sample-palace-head">
                <h3>{palace.name}</h3>
                <span className="sample-palace-role">{palace.role}</span>
              </div>
              <p className="sample-palace-desc">{palace.desc}</p>
            </article>
          ))}
        </div>

        {/* Short cross-palace synthesis preview */}
        <article className="sample-synthesis-card">
          <div className="sample-synthesis-head">
            <p className="eyebrow">{isVi ? "Nhận định tổng hợp đa cung" : "Cross-palace Synthesis Preview"}</p>
            <h3>{isVi ? "Mô hình phối hợp Mệnh · Tài · Quan · Thiên Di" : "Life · Wealth · Career · Travel Matrix"}</h3>
          </div>
          <p className="sample-synthesis-body">
            {isVi
              ? "Bản báo cáo chính thức không phân tích các cung rời rạc. Hệ thống tổng hợp thế Tam Hợp và Xung Chiếu để làm rõ sự tác động qua lại giữa năng lực nội tại (Mệnh), nguồn lực tài chính (Tài Bạch), vị thế phát triển (Quan Lộc) và cơ hội bên ngoài (Thiên Di)."
              : "The full report synthesizes palace interactions rather than treating them in isolation. The system brings together Trine and Opposition dynamics to clarify connections between intrinsic capability (Life), material resources (Wealth), vocational momentum (Career), and external mobility (Travel)."}
          </p>
          <div className="sample-synthesis-tags">
            <span>{isVi ? "Tam hợp bản mệnh" : "Natal trine"}</span>
            <span>{isVi ? "Tứ Hóa định kỳ" : "Transformations"}</span>
            <span>{isVi ? "Căn cứ tường minh" : "Verifiable evidence"}</span>
          </div>
        </article>
      </section>

      {/* 3. Compact report content overview */}
      <section aria-labelledby="sample-overview-heading" className="sample-section sample-content-overview container">
        <div className="section-heading">
          <p className="eyebrow">{isVi ? "Nội dung nhận được" : "Report Contents"}</p>
          <h2 id="sample-overview-heading">
            {isVi ? "Các phần trong báo cáo luận giải chính thức" : "Sections Included in the Official Report"}
          </h2>
          <p className="section-lead">
            {isVi
              ? "Một tập tài liệu riêng tư, có cấu trúc lớp lang rõ ràng, trình bày trang nhã và lưu giữ lâu dài."
              : "A structured, private reading document designed for clarity, reference, and personal reflection."}
          </p>
        </div>

        <div className="sample-modules-grid">
          {reportModules.map((module) => (
            <div className="sample-module-card" key={module.title}>
              <h3>{module.title}</h3>
              <p>{module.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Sample structure previews for upcoming disciplines */}
      <section aria-labelledby="sample-upcoming-heading" className="sample-section sample-upcoming-section container">
        <div className="section-heading">
          <p className="eyebrow">{isVi ? "Đa tầng soi chiếu" : "Multi-discipline Overview"}</p>
          <h2 id="sample-upcoming-heading">
            {isVi ? "Cấu trúc bản mẫu các bộ môn khác" : "Sample Structure Previews for Other Disciplines"}
          </h2>
          <p className="section-lead">
            {isVi
              ? "Lá Số Việt đang hoàn thiện các bộ môn soi chiếu tiếp theo với cùng tiêu chuẩn minh bạch căn cứ."
              : "Lá Số Việt is preparing upcoming disciplines with the same standard of methodological transparency."}
          </p>
        </div>

        <div className="sample-upcoming-grid">
          {upcomingDisciplines.map((item) => (
            <article className="sample-upcoming-card" key={item.discipline}>
              <div className="sample-upcoming-head">
                <h3>{item.discipline}</h3>
                <span className="sample-upcoming-badge">{item.status}</span>
              </div>
              <p className="sample-upcoming-subtitle">{item.subtitle}</p>
              <p className="sample-upcoming-body">{item.preview}</p>
            </article>
          ))}
        </div>
      </section>

      {/* 5. Explicit State Distinction */}
      <section aria-labelledby="sample-comparison-heading" className="sample-section sample-comparison container">
        <div className="section-heading">
          <p className="eyebrow">{isVi ? "Trạng thái sẵn sàng" : "Availability Status"}</p>
          <h2 id="sample-comparison-heading">
            {isVi ? "Phân định trạng thái dịch vụ" : "Service Availability Distinction"}
          </h2>
        </div>

        <div className="sample-status-comparison">
          <div className="sample-status-card is-active">
            <div className="sample-status-header">
              <span className="sample-badge-available">{isVi ? "Đang mở chính thức" : "Officially available"}</span>
              <h3>{isVi ? "Tử Vi Đẩu Số" : "Zi Wei Dou Shu"}</h3>
              <p className="topic-price">{isVi ? "79.000 ₫" : "79,000 VND"}</p>
              <span className="topic-once">{isVi ? "Thanh toán một lần" : "One-time payment"}</span>
            </div>
            <ul className="sample-feature-list">
              <li>{isVi ? "Lập lá số 12 cung hoàn toàn miễn phí" : "Free 12-palace chart calculation"}</li>
              <li>{isVi ? "Xem trước 3 điểm tự quan sát có căn cứ" : "Free 3-point evidence-backed preview"}</li>
              <li>{isVi ? "Báo cáo luận giải trọn đời đầy đủ 12 cung" : "Full lifetime 12-palace comprehensive report"}</li>
            </ul>
            <Link className="button" href={chartHref}>
              {isVi ? "Lập lá số Tử Vi" : "Build Zi Wei chart"}
            </Link>
          </div>

          <div className="sample-status-card is-planned">
            <div className="sample-status-header">
              <span className="sample-badge-planned">{isVi ? "Bản mẫu cấu trúc · Chưa mở bán" : "Sample structure · Not for sale"}</span>
              <h3>{isVi ? "Bát Tự · Kinh Dịch · Chiêm Tinh · Thần Số Học" : "BaZi · I Ching · Astrology · Numerology"}</h3>
              <p className="topic-price">{isVi ? "Chưa mở bán" : "Not yet available"}</p>
              <span className="topic-once">{isVi ? "Bản xem trước cấu trúc" : "Preview structure only"}</span>
            </div>
            <ul className="sample-feature-list">
              <li>{isVi ? "Xem mô hình khung luận giải mẫu" : "View structural sample outline"}</li>
              <li>{isVi ? "Không có nút thanh toán hoặc mua trước" : "No purchase or pre-order actions"}</li>
              <li>{isVi ? "Đang hoàn thiện tiêu chuẩn căn cứ minh bạch" : "In preparation under transparent evidence standards"}</li>
            </ul>
            <span className="sample-inert-notice">
              {isVi ? "Chưa mở hành động mua cho các môn này" : "Purchase actions disabled for these disciplines"}
            </span>
          </div>
        </div>
      </section>

      {/* 6. Final chart CTA */}
      <section aria-labelledby="sample-final-heading" className="sample-final-cta container">
        <h2 id="sample-final-heading">
          {isVi ? "Bắt đầu với lá số của chính bạn" : "Start with your own chart"}
        </h2>
        <p>
          {isVi
            ? "Nhập thời khắc sinh để lập lá số Tử Vi miễn phí và khám phá toàn bộ 12 cung vị ngay hôm nay."
            : "Enter your birth details to generate your free Zi Wei chart and explore all twelve palaces today."}
        </p>
        <div className="sample-final-actions">
          <Link className="button" href={chartHref}>
            {isVi ? "Lập lá số miễn phí ngay" : "Build your free chart now"}
          </Link>
        </div>
      </section>
    </main>
  );
}
