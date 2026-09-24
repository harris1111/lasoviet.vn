export type SampleTopicDetail = {
  id: string;
  isOpen: boolean;
  title: string;
  source: string;
  prose: string[];
  actions?: string[];
  evidenceDetails?: Array<{ label: string; value: string }>;
  byline?: string;
  lockedExcerpt?: string;
};

export const sampleTopicsVi: Record<string, SampleTopicDetail> = {
  career: {
    id: "career",
    isOpen: true,
    title: "Công việc, sự nghiệp",
    source: "Cung Quan Lộc tại Ngọ: Thất Sát (Vượng), Văn Xương, Hữu Bật, Hỏa Tinh. Lưu niên 2026 đóng tại đây",
    prose: [
      "Thất Sát vượng ở Quan Lộc là người làm việc kiểu tự quyết, chịu áp lực tốt và không thích bị cầm tay chỉ việc. Có Văn Xương và Hữu Bật đi cùng nên ngoài sức mạnh còn có chữ nghĩa và người đỡ. Hợp với vai trò tự chịu trách nhiệm: quản lý một mảng, kinh doanh riêng, bán hàng theo chỉ tiêu.",
      "Điểm yếu là Hỏa Tinh: nóng, dễ va với cấp trên, dễ nghỉ việc trong lúc bực. Năm 2026 lưu niên đóng đúng cung này nên chuyện công việc là chủ đề chính của cả năm, có đổi vị trí hoặc đổi môi trường.",
    ],
    actions: [
      "Chọn việc có quyền tự quyết và thưởng theo kết quả.",
      "Trước khi xin nghỉ, chờ hết một tuần rồi mới quyết.",
      "Năm 2026, ghi lại mọi thoả thuận miệng với sếp bằng tin nhắn.",
    ],
    evidenceDetails: [
      {
        label: "Căn cứ",
        value: "Thất Sát (Vượng) tại Ngọ; Văn Xương, Hữu Bật, Hỏa Tinh đồng cung; tam hợp Mệnh (Dần) và Tài Bạch (Tuất)",
      },
      {
        label: "Năm 2026",
        value: "Lưu Thái Tuế tại Ngọ",
      },
    ],
    byline: "Lá Số Việt biên tập",
  },
  wealth: {
    id: "wealth",
    isOpen: true,
    title: "Tiền bạc",
    source: "Cung Tài Bạch tại Tuất: Phá Quân (Vượng), Đà La, Tuần Không. Cũng là cung Thân",
    prose: [
      "Phá Quân vượng ở Tài Bạch: kiếm được tiền lớn nhưng tiêu cũng mạnh tay, tiền đến theo đợt chứ không đều. Đà La và Tuần Không làm tiền hay kẹt ở chỗ người khác: cho vay khó đòi, góp vốn chậm về.",
      "Vì cung Thân cũng nằm ở đây, những lần hao tài là những lần bạn nhớ lâu nhất. Người có lá số này thường giữ được tiền từ khi tách riêng một khoản không được đụng tới.",
    ],
    actions: [
      "Mở một tài khoản riêng, chuyển tự động 20% mỗi lần nhận tiền.",
      "Không cho vay khoản bạn không chịu mất được.",
      "Góp vốn thì làm giấy tờ, dù là người quen.",
    ],
    evidenceDetails: [
      {
        label: "Căn cứ",
        value: "Phá Quân (Vượng) tại Tuất; Đà La, Tuần Không đồng cung; Thân cư Tài Bạch",
      },
    ],
    byline: "Lá Số Việt biên tập",
  },
  life: {
    id: "life",
    isOpen: false,
    title: "Bản mệnh cốt lõi",
    source: "Cung Mệnh tại Dần: Tham Lang (Hãm), Thiên Mã, Linh Tinh",
    prose: [],
    lockedExcerpt: "Tham Lang ở Mệnh cho sức hút tự nhiên, khả năng thích ứng cao và tính tò mò lớn. Trục Mệnh - Thân cho thấy sự chuyển hướng quan trọng sau tuổi ba mươi khi trải nghiệm tích lũy thành thực lực...",
  },
  siblings: {
    id: "siblings",
    isOpen: false,
    title: "Anh em & bằng hữu",
    source: "Cung Huynh Đệ tại Sửu: Thái Dương (Hãm), Thái Âm (Miếu)",
    prose: [],
    lockedExcerpt: "Anh chị em có đời sống độc lập, hỗ trợ nhau chủ yếu về mặt tinh thần hơn là hợp tác tài chính trực tiếp...",
  },
  spouse: {
    id: "spouse",
    isOpen: false,
    title: "Hôn nhân & bạn đời",
    source: "Cung Phu Thê tại Tý: Vũ Khúc (Vượng) Hóa Kỵ, Thiên Phủ (Miếu), Kình Dương",
    prose: [],
    lockedExcerpt: "Vũ Khúc Hóa Kỵ ở Phu Thê: tiền bạc là chỗ vợ chồng va nhau nhiều nhất. Người bạn đời thường giỏi giữ tiền, cứng tính...",
  },
  children: {
    id: "children",
    isOpen: false,
    title: "Hậu duệ & con cái",
    source: "Cung Tử Tức tại Hợi: Thiên Đồng (Miếu), Lộc Tồn",
    prose: [],
    lockedExcerpt: "Duyên con cái hòa hợp, thế hệ sau có xu hướng phát triển tự lập và thừa hưởng tính cách hiếu học...",
  },
  health: {
    id: "health",
    isOpen: false,
    title: "Sức khỏe & chuyển hóa",
    source: "Cung Tật Ách tại Dậu: Cung vô chính diệu, quy chiếu Thái Dương - Thái Âm",
    prose: [],
    lockedExcerpt: "Chú ý cân bằng nhịp sinh học và hệ thần kinh, hạn chế tình trạng làm việc căng thẳng kéo dài...",
  },
  travel: {
    id: "travel",
    isOpen: false,
    title: "Xuất ngoại & giao tế",
    source: "Cung Thiên Di tại Thân: Liêm Trinh (Miếu), Tả Phụ, Văn Khúc",
    prose: [],
    lockedExcerpt: "Thiên Di sáng sủa tạo nhiều cơ hội giao tế ngoại vi, khi ra ngoài xã hội dễ gặp quý nhân hỗ trợ và tạo dựng uy tín...",
  },
  friends: {
    id: "friends",
    isOpen: false,
    title: "Mối quan hệ & cộng tác",
    source: "Cung Nô Bộc tại Mùi: Cung vô chính diệu, Địa Không, Hồng Loan",
    prose: [],
    lockedExcerpt: "Quan hệ đồng nghiệp và đối tác có tính phân hóa, cần quy chế minh bạch trong các dự án hợp tác chung...",
  },
  property: {
    id: "property",
    isOpen: false,
    title: "Gia cư & điền trạch",
    source: "Cung Điền Trạch tại Tỵ: Thiên Lương (Hãm), Thiên Việt",
    prose: [],
    lockedExcerpt: "Điền sản buổi đầu có sự biến động dịch chuyển, cơ duyên bất động sản gắn liền với sự nỗ lực tự thân tích lũy...",
  },
  fortune: {
    id: "fortune",
    isOpen: false,
    title: "Nội tâm & phúc đức",
    source: "Cung Phúc Đức tại Thìn: Tử Vi (Đắc), Thiên Tướng (Đắc)",
    prose: [],
    lockedExcerpt: "Tử Vi Thiên Tướng tại Phúc Đức mang lại nội lực tự chủ sâu sắc và khả năng phục hồi tinh thần sau những biến cố...",
  },
  parents: {
    id: "parents",
    isOpen: false,
    title: "Gốc rễ gia đình",
    source: "Cung Phụ Mẫu tại Mão: Thiên Cơ (Vượng), Cự Môn (Miếu)",
    prose: [],
    lockedExcerpt: "Phụ mẫu có nền tảng tri thức và định hướng rõ ràng, đôi bên cần giao tiếp cởi mở để tránh những bất đồng góc nhìn...",
  },
};

export const sampleTopicsEn: Record<string, SampleTopicDetail> = {
  career: {
    id: "career",
    isOpen: true,
    title: "Career & Vocation",
    source: "Career Palace at Horse (Wu): Seven Kills (Prosperous), Wenchang, Youbi, Huoxing. Decadal/Annual 2026 alignment",
    prose: [
      "Seven Kills in Career denotes an autonomous work style with high stress tolerance and an aversion to micromanagement. Backed by Wenchang and Youbi, decisive execution is balanced with strategic articulation and collaborative backing. Well-suited for leadership, autonomous management, or result-driven ventures.",
      "The watchpoint is Huoxing: impulsive reactions and friction with superiors under pressure. With the 2026 annual transit activating this palace, career progression and potential structural change are central themes.",
    ],
    actions: [
      "Prioritize roles with executive autonomy and performance-tied rewards.",
      "Reflect for one week before making irreversible career transition decisions.",
      "Document verbal agreements with management in writing during active cycles.",
    ],
    evidenceDetails: [
      {
        label: "Basis",
        value: "Seven Kills (Prosperous) at Wu; Wenchang, Youbi, Huoxing conjoined; natal trine with Life (Yin) and Wealth (Xu)",
      },
      {
        label: "Cycle 2026",
        value: "Annual Tai Sui transit at Wu",
      },
    ],
    byline: "Edited by Lá Số Việt",
  },
  wealth: {
    id: "wealth",
    isOpen: true,
    title: "Finances & Wealth",
    source: "Wealth Palace at Dog (Xu): Army (Prosperous), Tuoluo, Tuankong. Also Body Palace",
    prose: [
      "Army in Wealth represents substantial earning potential coupled with aggressive spending swings. Financial inflows tend to arrive in waves rather than a steady trickle. Tuoluo and Tuankong caution against uncollected receivables and delayed capital recovery.",
      "Because the Body Palace resides here, financial milestones and past losses serve as pivotal turning points in personal maturity. Establishing dedicated, partitioned reserves creates lasting stability.",
    ],
    actions: [
      "Automate a 20% dedicated reserve transfer immediately upon receiving income.",
      "Avoid extending loans that exceed your risk absorption tolerance.",
      "Formalize all joint ventures and partnerships with written contracts.",
    ],
    evidenceDetails: [
      {
        label: "Basis",
        value: "Army (Prosperous) at Xu; Tuoluo, Tuankong conjoined; Body Palace aligned with Wealth",
      },
    ],
    byline: "Edited by Lá Số Việt",
  },
  life: {
    id: "life",
    isOpen: false,
    title: "Core Identity",
    source: "Life Palace at Tiger (Yin): Greedy Wolf (Unfavorable), Tianma, Lingxing",
    prose: [],
    lockedExcerpt: "Greedy Wolf in Life bestows natural charisma, versatile adaptability, and boundless curiosity. The Life-Body axis indicates decisive self-reinvention after age thirty...",
  },
  siblings: {
    id: "siblings",
    isOpen: false,
    title: "Siblings & Kinship",
    source: "Siblings Palace at Ox (Chou): Sun (Weak), Moon (Exalted)",
    prose: [],
    lockedExcerpt: "Siblings maintain independent trajectories; mutual support is predominantly emotional rather than joint commercial ventures...",
  },
  spouse: {
    id: "spouse",
    isOpen: false,
    title: "Spouse & Partnership",
    source: "Spouse Palace at Rat (Zi): Wuqu (Prosperous) Hua Ji, Tianfu (Exalted), Qingyang",
    prose: [],
    lockedExcerpt: "Wuqu Hua Ji in Spouse: financial priorities represent the primary negotiation ground. The partner is prudent, assertive, and commercially disciplined...",
  },
  children: {
    id: "children",
    isOpen: false,
    title: "Descendants & Family",
    source: "Children Palace at Pig (Hai): Tiantong (Exalted), Lucun",
    prose: [],
    lockedExcerpt: "Harmonious rapport with offspring, with the next generation demonstrating self-direction and intellectual engagement...",
  },
  health: {
    id: "health",
    isOpen: false,
    title: "Vitality & Resilience",
    source: "Health Palace at Rooster (You): Unoccupied palace, projected from Sun-Moon",
    prose: [],
    lockedExcerpt: "Prioritize circadian balance and nervous system maintenance during high-stress working periods...",
  },
  travel: {
    id: "travel",
    isOpen: false,
    title: "Mobility & Social Arena",
    source: "Travel Palace at Monkey (Shen): Lianzhen (Exalted), Zuofu, Wenqu",
    prose: [],
    lockedExcerpt: "External activities offer significant networking potential, attracting benefactors and establishing public trust when expanding abroad...",
  },
  friends: {
    id: "friends",
    isOpen: false,
    title: "Allies & Network",
    source: "Friends Palace at Goat (Wei): Unoccupied palace, Dikong, Hongluan",
    prose: [],
    lockedExcerpt: "Collaborative circles show natural dispersion; prioritize formal agreements for key joint undertakings...",
  },
  property: {
    id: "property",
    isOpen: false,
    title: "Real Estate & Sanctuary",
    source: "Property Palace at Snake (Si): Tianliang (Weak), Tianyue",
    prose: [],
    lockedExcerpt: "Early relocations lead to stable long-term asset accumulation through disciplined gradual investment...",
  },
  fortune: {
    id: "fortune",
    isOpen: false,
    title: "Inner Spirit & Ancestry",
    source: "Fortune Palace at Dragon (Chen): Ziwei (Favorable), Tianxiang (Favorable)",
    prose: [],
    lockedExcerpt: "Ziwei and Tianxiang in Fortune provide strong self-sovereignty and resilient internal recovery from adversity...",
  },
  parents: {
    id: "parents",
    isOpen: false,
    title: "Ancestral Heritage",
    source: "Parents Palace at Rabbit (Mao): Tianji (Prosperous), Jumen (Exalted)",
    prose: [],
    lockedExcerpt: "Family foundation emphasizes education and high standards; transparent communication resolves divergent viewpoints...",
  },
};
