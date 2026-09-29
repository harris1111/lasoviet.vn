import "server-only";

// Public editorial model. It contains no birth data, generated interpretation, or prices.
export function homepageShowcaseContent(locale: "vi" | "en") {
  return locale === "vi"
    ? {
        eyebrow: "NHÌN THẤY TRƯỚC KHI ĐỌC SÂU",
        title: "Một lá số mở ra theo từng lớp.",
        lead: "Bắt đầu bằng đồ hình 12 cung và hai nhận định miễn phí. Khi muốn đi sâu, bạn có thể xem bản luận giải mẫu trước.",
        diagramLabel: "Minh họa cách đọc các cung liên hệ, không phải kết quả cá nhân",
        diagramCenter: "Cung Mệnh",
        diagramRelated: ["Quan Lộc", "Tài Bạch", "Thiên Di"],
        proof: [
          { number: "01", title: "Thấy đồ hình", body: "Chạm vào một cung để thấy các mối liên hệ trên lá số." },
          { number: "02", title: "Đọc phần miễn phí", body: "Hai nhận định giúp bạn bắt đầu đối chiếu với chính mình." },
          { number: "03", title: "Xem bản mẫu", body: "Thấy cách trình bày luận giải và căn cứ trước khi chọn đọc sâu." },
        ],
        sample: "Xem bản luận giải mẫu",
        expand: "Cách đọc minh họa này có nghĩa gì?",
        explanation: "Sơ đồ chỉ diễn tả quan hệ giữa các cung trong một lá số mẫu. Nội dung cá nhân chỉ được tính sau khi bạn nhập dữ liệu sinh và tạo lá số.",
      }
    : {
        eyebrow: "SEE THE EXPERIENCE FIRST",
        title: "A chart opens one layer at a time.",
        lead: "Start with the twelve-palace chart and two free observations. You can inspect a sample reading before choosing to go deeper.",
        diagramLabel: "Illustration of related palaces, not a personal result",
        diagramCenter: "Life palace",
        diagramRelated: ["Career", "Wealth", "Travel"],
        proof: [
          { number: "01", title: "Explore the chart", body: "Tap a palace to see its relationships on the chart." },
          { number: "02", title: "Read the free part", body: "Two observations offer a starting point for reflection." },
          { number: "03", title: "View a sample", body: "See the reading format and evidence before choosing more depth." },
        ],
        sample: "View sample reading",
        expand: "What does this illustration show?",
        explanation: "This diagram shows relationships among palaces in a sample chart. Personal content is calculated only after you enter birth details and create a chart.",
      };
}
