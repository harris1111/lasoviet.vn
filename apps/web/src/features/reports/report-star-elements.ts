// Ngũ hành của từng sao, dùng để tô màu lá số trong báo cáo (FD-106a).
//
// Độ tin cậy: 14 chính tinh, lục cát tinh và lục sát tinh là phần mọi
// trường phái đều thống nhất. Vòng Bác Sĩ, vòng Thái Tuế, vòng Tướng Tinh
// và các sao phổ biến khác lấy theo cách ghi chung của sách Việt.
//
// Bốn sao dưới đây không có trong bảng gốc, được suy ra từ vị trí của chúng
// trong vòng sao, vì các sao cùng một vị trí trong vòng luôn mang cùng hành:
//   Tuế Kiện: sao đầu vòng Thái Tuế, chính là Thái Tuế        -> Hỏa
//   Hối Khí:  sao thứ hai vòng Thái Tuế, vị trí Thiếu Dương    -> Hỏa
//   Tuế Dịch: sao thứ ba vòng Tướng Tinh, vị trí Dịch Mã       -> Hỏa
//   Niên Giải: sao giải an theo năm, trường phái Việt gọi là
//              Giải Thần                                       -> Mộc
// Đối chiếu: vòng Thái Tuế trong bảng (Tang Môn Mộc, Quan Phù Hỏa, Bạch Hổ
// Kim, Điếu Khách Hỏa, Long Đức Thủy) khớp với cách xếp trên.
//
// Sao nào không có trong bảng thì lá số để màu chữ thường, vì tô sai một sao
// thì người biết Tử Vi nhìn ra ngay và mất lòng tin vào cả bản báo cáo.
//
// An và founder cần soát lại bảng này trước khi bật cho khách trả phí.

export type ZiweiElement = "kim" | "moc" | "thuy" | "hoa" | "tho";

export const ZIWEI_ELEMENT_LABELS_VI: Record<ZiweiElement, string> = {
  kim: "Kim",
  moc: "Mộc",
  thuy: "Thủy",
  hoa: "Hỏa",
  tho: "Thổ",
};

const STAR_ELEMENTS: Record<string, ZiweiElement> = {
  "ziwei.star.suijian": "hoa",
  "ziwei.star.huiqi": "hoa",
  "ziwei.star.suiyi": "hoa",
  "ziwei.star.nianjie": "moc",
  "ziwei.star.baihu": "kim",
  "ziwei.star.bazuo": "tho",
  "ziwei.star.bingfu": "tho",
  "ziwei.star.boshi": "thuy",
  "ziwei.star.dahao": "hoa",
  "ziwei.star.diaoke": "hoa",
  "ziwei.star.dijie": "hoa",
  "ziwei.star.dikong": "hoa",
  "ziwei.star.enguang": "tho",
  "ziwei.star.feilian": "hoa",
  "ziwei.star.fenggao": "tho",
  "ziwei.star.fengge": "tho",
  "ziwei.star.fubing": "hoa",
  "ziwei.star.guanfu": "hoa",
  "ziwei.star.guansuo": "moc",
  "ziwei.star.guasu": "hoa",
  "ziwei.star.guchen": "hoa",
  "ziwei.star.gwanfu": "hoa",
  "ziwei.star.hongluan": "thuy",
  "ziwei.star.huagai": "kim",
  "ziwei.star.huoxing": "hoa",
  "ziwei.star.jiangjun": "moc",
  "ziwei.star.jiangxing": "hoa",
  "ziwei.star.jiekong": "kim",
  "ziwei.star.jielu": "kim",
  "ziwei.star.jiesha": "hoa",
  "ziwei.star.jieshen": "moc",
  "ziwei.star.jumen": "thuy",
  "ziwei.star.kongwang": "tho",
  "ziwei.star.lianzhen": "hoa",
  "ziwei.star.lingxing": "hoa",
  "ziwei.star.lishi": "hoa",
  "ziwei.star.longchi": "thuy",
  "ziwei.star.longde": "thuy",
  "ziwei.star.lucun": "tho",
  "ziwei.star.panan": "moc",
  "ziwei.star.pojun": "thuy",
  "ziwei.star.posui": "hoa",
  "ziwei.star.qinglong": "thuy",
  "ziwei.star.qingyang": "kim",
  "ziwei.star.qisha": "kim",
  "ziwei.star.sangmen": "moc",
  "ziwei.star.santai": "tho",
  "ziwei.star.taifu": "tho",
  "ziwei.star.taiyang": "hoa",
  "ziwei.star.taiyin": "thuy",
  "ziwei.star.tanlang": "thuy",
  "ziwei.star.tiancai": "tho",
  "ziwei.star.tianchu": "tho",
  "ziwei.star.tiande": "hoa",
  "ziwei.star.tianfu": "tho",
  "ziwei.star.tianguan": "hoa",
  "ziwei.star.tiangui": "tho",
  "ziwei.star.tianji": "moc",
  "ziwei.star.tiankong": "hoa",
  "ziwei.star.tianku": "kim",
  "ziwei.star.tiankui": "hoa",
  "ziwei.star.tianliang": "tho",
  "ziwei.star.tianma": "hoa",
  "ziwei.star.tiansha": "hoa",
  "ziwei.star.tianshang": "thuy",
  "ziwei.star.tianshi": "thuy",
  "ziwei.star.tianshou": "tho",
  "ziwei.star.tiantong": "thuy",
  "ziwei.star.tianwu": "tho",
  "ziwei.star.tianxi": "thuy",
  "ziwei.star.tianxiang": "thuy",
  "ziwei.star.tianxing": "hoa",
  "ziwei.star.tianxu": "tho",
  "ziwei.star.tianyao": "thuy",
  "ziwei.star.tianyue": "hoa",
  "ziwei.star.tuoluo": "kim",
  "ziwei.star.wangshen": "thuy",
  "ziwei.star.wenchang": "kim",
  "ziwei.star.wenqu": "thuy",
  "ziwei.star.wuqu": "kim",
  "ziwei.star.xianchi": "thuy",
  "ziwei.star.xiaohao": "hoa",
  "ziwei.star.xiishen": "thuy",
  "ziwei.star.xishen": "hoa",
  "ziwei.star.xunkong": "tho",
  "ziwei.star.yinsha": "hoa",
  "ziwei.star.youbi": "thuy",
  "ziwei.star.yuede": "hoa",
  "ziwei.star.yuesha": "hoa",
  "ziwei.star.zhaisha": "hoa",
  "ziwei.star.zhibei": "kim",
  "ziwei.star.zhoushu": "kim",
  "ziwei.star.ziwei": "tho",
  "ziwei.star.zuofu": "tho",
};

export function starElement(starId: string): ZiweiElement | null {
  return STAR_ELEMENTS[starId] ?? null;
}
