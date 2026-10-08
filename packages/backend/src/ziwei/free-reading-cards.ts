import { ziweiMajorStarMeaning, ZIWEI_MAJOR_STAR_MEANING_VERSION, type FreeReadingFactsV2 } from "@lasoviet/contracts";

export const FREE_READING_CARDS_VERSION = "free-reading-cards-v2-draft-1";

// Draft practical wording derived from the existing free catalog; owner acceptance is still pending.
const practices: Record<string, readonly [string, string, string, string]> = {
  ziwei: ["Chọn một việc bạn nhận trách nhiệm đến cùng, rồi nói rõ phần nào cần người khác góp sức.", "Choose one responsibility to own through completion, then name the parts where you need help.", "Đừng ôm hết việc để giữ quyền chủ động; một lời nhờ cụ thể giúp bạn giữ sức cho việc chính.", "Avoid carrying every task to keep control; a specific request for help protects your energy."],
  tianji: ["Đặt hai phương án cạnh nhau, chọn một và hẹn lúc nhìn lại sau khi có phản hồi thực tế.", "Compare two options, choose one and set a review point after receiving practical feedback.", "Đừng đổi hướng chỉ vì một ý mới xuất hiện khi phương án hiện tại chưa được thử đủ.", "Avoid changing direction merely because a new idea appears before the current approach has been tested."],
  taiyang: ["Chọn một việc giúp người khác và nói trước giới hạn thời gian bạn có thể dành cho việc ấy.", "Choose one useful contribution and state how much time you can realistically give it.", "Đừng nhận thêm lời nhờ khi việc đã hứa còn dang dở; sự nhiệt tình cần đi cùng giới hạn rõ.", "Avoid taking on another request while a previous promise is unfinished; enthusiasm needs clear limits."],
  wuqu: ["Chuyển mục tiêu thành một bước có thể làm ngay, ghi rõ nguồn lực và cách kiểm tra kết quả.", "Turn a goal into one executable step, noting the resources and how you will check its result.", "Đừng quyết quá nhanh chỉ để thấy tiến độ; kiểm tra điều kiện thực tế trước khi chốt một việc.", "Avoid deciding too quickly just to see progress; check practical conditions before committing."],
  tiantong: ["Tìm điểm hai bên đồng ý trước, rồi nói rõ nhu cầu của bạn vẫn chưa được đáp ứng.", "Start with a point of agreement, then clearly state a need that remains unmet.", "Đừng giữ hòa khí bằng cách im lặng mãi về điều quan trọng; một lời nói rõ giúp hai bên hiểu nhau.", "Avoid keeping the peace by staying silent about an important need; clarity helps both people understand."],
  lianzhen: ["Ghi điều bạn cần giữ nguyên và điều có thể thương lượng trước một cuộc trao đổi khó.", "Write down what must remain firm and what can be negotiated before a difficult conversation.", "Đừng xem mọi khác biệt là vi phạm nguyên tắc; hỏi người kia đang cố giải quyết việc gì trước.", "Avoid treating every difference as a broken principle; first ask what the other person is trying to resolve."],
  tianfu: ["Kiểm kê điều đang có, chọn một nguồn lực cần giữ ổn định và thống nhất cách theo dõi.", "Take stock of what you have, choose one resource to keep stable and agree on how to track it.", "Đừng giữ một cách làm chỉ vì quen thuộc; xem nhu cầu hiện tại còn phù hợp với nó hay chưa.", "Avoid preserving a method merely because it is familiar; check whether it still meets the current need."],
  taiyin: ["Dành một khoảng yên để nghe, sau đó nói lại điều bạn hiểu cho người kia xác nhận.", "Make quiet time to listen, then repeat what you understood so the other person can confirm it.", "Đừng giữ mọi băn khoăn bên trong khi cần hỏi trực tiếp; một câu hỏi rõ giảm việc tự đoán.", "Avoid keeping every concern inside when a direct question would help; clarity reduces guesswork."],
  tanlang: ["Chọn một trải nghiệm mới phù hợp, đặt giới hạn thời gian và giữ một việc chính đến cùng.", "Choose one relevant new experience, set a time limit and complete one main commitment.", "Đừng theo quá nhiều hướng cùng lúc; nhìn lại việc đang dở trước khi nhận thêm một lựa chọn.", "Avoid pursuing too many directions at once; review unfinished commitments before accepting another option."],
  jumen: ["Kiểm tra một nhận định bằng điều đã quan sát, rồi đặt câu hỏi ngắn trước khi phản biện.", "Check a claim against what you observed, then ask a short question before challenging it.", "Đừng để tranh luận kéo dài làm quên việc cần giải quyết; chốt lại điều hai bên đã hiểu nhau.", "Avoid letting a long debate obscure the task; restate what both people have understood."],
  tianxiang: ["Nói rõ phần việc và trách nhiệm của mỗi người trước khi cùng nhận một cam kết.", "Clarify each person's task and responsibility before making a shared commitment.", "Đừng nhận vai trò hỗ trợ vô hạn; thống nhất điểm dừng và điều người kia tự chịu trách nhiệm.", "Avoid taking on unlimited support; agree where your role ends and the other person's responsibility begins."],
  tianliang: ["Chia sẻ một kinh nghiệm phù hợp rồi để người nhận tự chọn cách áp dụng vào việc của họ.", "Share one relevant experience, then let the other person choose how to apply it.", "Đừng để mong muốn bảo vệ biến thành quyết thay; hỏi người kia cần giúp ở bước nào.", "Avoid turning protection into deciding for someone; ask which step they need help with."],
  qisha: ["Chọn một thử thách có giới hạn rõ, chuẩn bị phương án dự phòng trước khi bắt tay làm.", "Choose a challenge with clear limits and prepare a backup approach before starting.", "Đừng coi việc nhờ hỗ trợ là thiếu bản lĩnh; kiểm tra nguồn lực trước khi tự nhận toàn bộ.", "Avoid treating a request for support as weakness; check resources before taking everything on yourself."],
  pojun: ["Thử một thay đổi nhỏ, giữ lại điều đang hữu ích và quan sát kết quả trước khi mở rộng.", "Try one small change, preserve what still works and observe the result before expanding it.", "Đừng bỏ toàn bộ cách cũ khi chưa có phương án thay thế; đổi từng phần giúp bạn giữ điểm tựa.", "Avoid discarding an entire approach before having a replacement; gradual change preserves useful support."],
};

export type FreeReadingCard = Readonly<{
  id: string; sourceId: string; factKey: string; palaceKey: string; name: string;
  essence: string; action: string; avoid: string; accepted: false;
}>;

export function selectFreeReadingCards(source: FreeReadingFactsV2): FreeReadingCard[] {
  return source.facts.flatMap(fact => {
    const match = /^palace:([a-z_]+):star:([a-z_]+)$/u.exec(fact.key);
    if (!match) return [];
    const [, palace, star] = match;
    const essence = ziweiMajorStarMeaning(source.locale, star!);
    const practice = practices[star!];
    if (!essence || !practice) return [];
    const vi = source.locale === "vi";
    return [{ id: `card:star:${star}`, sourceId: `${ZIWEI_MAJOR_STAR_MEANING_VERSION}:${star}`,
      factKey: fact.key, palaceKey: `palace:${palace}`, name: fact.label.replace(/^sao\s+/u, ""),
      essence, action: practice[vi ? 0 : 1], avoid: practice[vi ? 2 : 3], accepted: false as const }];
  });
}
