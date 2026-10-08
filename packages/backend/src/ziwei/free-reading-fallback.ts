import { FreeReadingContentV2Schema, FreeReadingFactsV2Schema, type FreeReadingContentV2, type FreeReadingFactsV2 } from "@lasoviet/contracts";
import { selectFreeReadingCards, type FreeReadingCard } from "./free-reading-cards.js";

export const FREE_READING_RULES_VERSION = "free-reading-rules-v2-draft-1";
type Claim = FreeReadingContentV2["overview"]["portrait"];
const domains: Record<string, readonly [string, string, string, string]> = {
  life: ["cách bạn tự quyết định", "how you make your own choices", "một quyết định bạn đang cân nhắc", "a decision you are considering"],
  siblings: ["cách bạn chia sẻ với anh chị em", "how you share with siblings", "việc hai người cùng nhận trách nhiệm", "a responsibility shared between two people"],
  spouse: ["cách bạn sống trong quan hệ đôi lứa", "how you approach a partnership", "một cuộc trao đổi về mong muốn của hai người", "a conversation about both people's wishes"],
  children: ["cách bạn chăm sóc và dẫn dắt", "how you care for and guide others", "một việc người được bạn chăm sóc đang tự học làm", "a task someone in your care is learning"],
  wealth: ["cách bạn sử dụng nguồn lực", "how you use resources", "một khoản cần phân bổ trong kế hoạch của bạn", "an expense to allocate in your plan"],
  health: ["cách bạn giữ nhịp sinh hoạt", "how you sustain everyday routines", "nhịp nghỉ và làm trong một ngày bận", "the balance of rest and work on a busy day"],
  travel: ["cách bạn bước vào môi trường mới", "how you enter a new environment", "lần bạn cùng làm việc với người chưa quen", "working with someone you do not yet know"],
  friends: ["cách bạn cộng tác", "how you collaborate", "một việc cần người khác phối hợp", "a task that needs another person's cooperation"],
  career: ["cách bạn làm việc", "how you work", "một việc cần hoàn thành cùng người khác", "a task to complete with other people"],
  property: ["cách bạn giữ nền tảng nơi ở", "how you maintain your home", "một thay đổi nhỏ trong không gian sống", "a small change in your living space"],
  fortune: ["cách bạn nuôi dưỡng đời sống bên trong", "how you nurture your inner life", "khoảng yên bạn dành cho mình sau một ngày nhiều việc", "quiet time after a busy day"],
  parents: ["cách bạn trao đổi giữa các thế hệ", "how you communicate across generations", "một mong muốn cần nói rõ với người thân", "a wish to explain to a family member"],
};

/** Offline draft only: never imported by the runtime read/writer path. */
export function compileFreeReadingFallback(input: FreeReadingFactsV2): FreeReadingContentV2 {
  const source = FreeReadingFactsV2Schema.parse(input), vi = source.locale === "vi";
  const facts = new Map(source.facts.map(fact => [fact.key, fact]));
  const cards = selectFreeReadingCards(source);
  const value = (key: string) => {
    const fact = facts.get(key);
    if (!fact) throw new Error("FREE_READING_SOURCE_MISSING");
    return fact;
  };
  const palace = (key: string) => value(key).label;
  const domain = (key: string) => domains[key.slice("palace:".length)]!;
  function context(key: string): { card: FreeReadingCard; keys: string[]; anchor: string } {
    let card = cards.find(item => item.palaceKey === key);
    let relation: string | undefined;
    // Borrow only when actual absence is proved. Unknown major meanings never become empty.
    if (!card && facts.has(`${key}:empty`)) {
      for (const rel of [`rel:${key.slice(7)}:opp`, `rel:${key.slice(7)}:tri`]) {
        const related = facts.get(rel);
        if (!related) continue;
        card = cards.find(item => related.value.split(" / ").includes(palace(item.palaceKey)));
        if (card) { relation = rel; break; }
      }
    }
    if (!card) throw new Error("FREE_READING_MEANING_UNAVAILABLE");
    const raw = value(card.factKey).value;
    const state = raw.split(" · ").slice(2).join(", ");
    const placement = vi ? `${card.name} ở ${palace(card.palaceKey)}` : `${card.name} in ${palace(card.palaceKey)}`;
    const anchor = relation
      ? vi ? `${palace(key)} không có chính tinh; nét đọc được mượn từ ${placement} qua ${value(relation).label.toLocaleLowerCase("vi")}.`
        : `${palace(key)} has no principal star; this reading borrows ${placement} through ${value(relation).label.toLowerCase()}.`
      : `${placement}${state ? ` (${state})` : ""}.`;
    return { card, keys: [...new Set([key, card.factKey, ...(relation ? [relation, `${key}:empty`] : [card.palaceKey])])], anchor };
  }
  function claim(key: string, kind: "theme" | "strength" | "snag" | "action" | "avoid", lead: string): Claim {
    const c = context(key), d = domain(key);
    const action = kind === "snag" || kind === "avoid" ? c.card.avoid : c.card.action;
    const text = vi
      ? `${lead} ${c.anchor} Nét ${c.card.essence} được đọc trong ${d[0]}. Bạn thử nhìn lại ${d[2]}: điều bạn chủ động làm, cách người kia phản hồi và việc còn để ngỏ. ${action}`
      : `${lead} ${c.anchor} The theme of ${c.card.essence} is considered through ${d[1]}. Think about ${d[3]}: what you chose to do, how others responded and what remains unresolved. ${action}`;
    return { text, basis: { keys: c.keys, chain: c.keys.slice(0, 3).map(k => ({ k,
      say: `${value(k).label}: ${value(k).value}${source.provisional ? vi ? " (vị trí tạm tính)" : " (provisional placement)" : ""}` })) } };
  }
  const axis = value("axis:life-body").value.split(" / ");
  const lifeKey = [...facts.values()].find(f => /^palace:[a-z_]+$/u.test(f.key) && f.label === axis[0])?.key;
  const bodyKey = [...facts.values()].find(f => /^palace:[a-z_]+$/u.test(f.key) && f.label === axis[1])?.key;
  if (!lifeKey || !bodyKey) throw new Error("FREE_READING_AXIS_UNAVAILABLE");
  const focusKey = source.focusPalaceId.replace("ziwei.palace.", "palace:");
  const portrait = claim(lifeKey, "theme", vi ? "Điểm bắt đầu của bạn là cách tự chọn việc mình chịu trách nhiệm." : "Start with how you choose the responsibilities you take on.");
  const lc = context(lifeKey);
  const borrowed = lc.card.palaceKey !== lifeKey;
  portrait.text = vi
    ? `${borrowed ? `${palace(lifeKey)} mượn nét từ ` : ""}${lc.card.name} tại ${palace(lc.card.palaceKey)} gợi ${lc.card.essence}.`
    : `${borrowed ? `${palace(lifeKey)} borrows the theme of ` : ""}${lc.card.name} in ${palace(lc.card.palaceKey)} suggests ${lc.card.essence}.`;
  const axisClaim = claim(bodyKey, "theme", vi ? `Mệnh ở ${palace(lifeKey)}, Thân ở ${palace(bodyKey)} đặt cách nghĩ cạnh cách làm.` : `Life in ${palace(lifeKey)} and Body in ${palace(bodyKey)} place your approach alongside its practical expression.`);
  axisClaim.basis.keys = [...new Set(["axis:life-body", ...axisClaim.basis.keys])].slice(0, 5);
  if (source.provisional) axisClaim.text = (vi ? "Giờ sinh chưa chắc, nên vị trí Mệnh, Thân và các cung dưới đây đang tạm tính. " : "Your birth time is uncertain, so the Life, Body and palace placements below are provisional. ") + axisClaim.text;
  const fc = context(focusKey), fd = domain(focusKey);
  const focus = (text: string, extraKeys: string[] = []): Claim => {
    const keys = [...new Set([...fc.keys, ...extraKeys])];
    if (keys.length > 5) throw new Error("FREE_READING_BASIS_TOO_LARGE");
    return { text, basis: { keys, chain: keys.slice(0, 3).map(k => ({ k,
      say: `${value(k).label}: ${value(k).value}${source.provisional ? vi ? " (vị trí tạm tính)" : " (provisional placement)" : ""}` })) } };
  };
  const relationKeys = [`rel:${focusKey.slice(7)}:opp`, `rel:${focusKey.slice(7)}:tri`];
  const opposite = value(relationKeys[0]!).value, trine = value(relationKeys[1]!).value;
  const overview = {
    portrait, axis: axisClaim,
    strengths: [claim(lifeKey, "strength", vi ? "Bạn có thể bắt đầu từ việc mình làm chủ được." : "Begin with something you can take ownership of."), claim("palace:career", "strength", vi ? "Trong công việc, hãy nhìn vào cách bạn biến ý định thành việc đã làm." : "At work, look at how you turn an intention into completed action.")],
    snags: [claim(lifeKey, "snag", vi ? "Điều dễ vướng thường nằm ngay cạnh nét bạn tin là thế mạnh." : "A point of friction can sit beside what you consider a strength."), claim("palace:wealth", "snag", vi ? "Với tiền bạc, thử nhìn cả cách quyết định lẫn cách giữ lời với chính mình." : "With money, consider both your decisions and the promises you make to yourself.")],
    work: claim("palace:career", "theme", vi ? "Một việc chung giúp bạn nhìn rõ cách mình làm việc." : "A shared task can help you see your working approach."),
    money: claim("palace:wealth", "theme", vi ? "Chuyện nguồn lực cần được đặt cạnh điều bạn đang muốn duy trì." : "Consider resources alongside what you want to sustain."),
    love: claim("palace:spouse", "theme", vi ? "Trong quan hệ đôi lứa, điều đáng nhìn là cách hai người nói và nghe." : "In a partnership, consider how both people speak and listen."),
    actions: [claim(lifeKey, "action", vi ? "Việc đầu tiên là chọn một thay đổi nhỏ trong cách tự quyết." : "First, choose one small change in how you make a decision."), claim("palace:career", "action", vi ? "Việc tiếp theo là thử một cách phối hợp cụ thể." : "Next, try one concrete way to coordinate with someone."), claim("palace:spouse", "action", vi ? "Cuối cùng, dành chỗ cho một cuộc trao đổi rõ ràng." : "Finally, make room for a clear conversation.")],
    bridge: { text: vi ? "Từ những nét này, bạn có thể đọc kỹ cung gắn với điều mình đang quan tâm." : "From these themes, explore the palace connected to your current concern.", keys: [lifeKey] },
  };
  const relationText = vi ? `${palace(focusKey)} có cung đối là ${opposite}; tam hợp gồm ${trine}.` : `${palace(focusKey)} has ${opposite} as its opposite; its trine includes ${trine}.`;
  const focusPalace = { palaceKey: focusKey.slice(7), title: palace(focusKey),
    conclusion: focus(vi ? `${fc.anchor} Bạn nhìn ${fd[0]} qua nét ${fc.card.essence}.` : `${fc.anchor} Consider ${fd[1]} through ${fc.card.essence}.`),
    keyPoints: [focus(vi ? `${fc.anchor} Nét đáng đọc là ${fc.card.essence}.` : `${fc.anchor} The relevant theme is ${fc.card.essence}.`),
      focus(relationText, relationKeys), focus(`${vi ? "Một bước cụ thể để thử:" : "One concrete step to try:"} ${fc.anchor} ${fc.card.action}`)],
    paragraphs: [
      focus(vi ? `Bạn thử nhớ lại ${fd[2]}. ${fc.anchor} Nét ${fc.card.essence} là một điểm để nhìn cách bạn tiếp cận việc ấy. Hãy đặt lời đọc cạnh một việc cụ thể: lúc bắt đầu bạn muốn điều gì, sau đó đã làm bước nào, và bước nào còn để ngỏ. Phản hồi từ người có mặt trong việc ấy giúp bạn nhận ra phần mình đang làm tốt hơn là chỉ tự đánh giá. Điều đáng giữ lại là cách làm thật sự có ích cho tình huống đó.` : `Think about ${fd[3]}. ${fc.anchor} The theme of ${fc.card.essence} offers a way to consider your approach. Set it alongside one concrete experience: what you wanted at the start, what you did next and what remains unresolved. Feedback from someone involved can help you see what worked. Keep the approach that was useful in that particular situation.`),
      focus(vi ? `${relationText} Các mối nối này giúp bạn đặt ${palace(focusKey)} cạnh những lĩnh vực liên quan, thay vì đọc một câu rồi áp cho mọi chuyện. Bạn có thể bắt đầu bằng câu hỏi về ${fd[0]}: khi việc này cần người khác cùng tham gia, bạn muốn giữ phần nào và chia sẻ phần nào? Nói rõ một mong muốn trước, nghe người kia trả lời rồi mới thống nhất bước tiếp theo. Việc nhìn từ nhiều phía có ích nhất khi nó dẫn đến một cuộc trao đổi cụ thể.` : `${relationText} These relationships place ${palace(focusKey)} beside other domains rather than making one sentence apply to every situation. Start with a question about ${fd[1]}: when another person needs to participate, which part do you want to keep and which part can be shared? State one wish, listen to the response and then agree on the next step. Looking from several sides is most useful when it leads to a concrete conversation.`, relationKeys),
      focus(vi ? `${fc.anchor} Trong nét ${fc.card.essence}, điều bạn thử trước là một hành động nhỏ: ${fc.card.action} Khi chọn bước ấy, hãy nói rõ kết quả bạn đang muốn và điều kiện thực tế mình có. Sau một lần thử, nhìn lại việc đã hoàn thành cùng điều còn gây vướng. ${fc.card.avoid} Một thay đổi có ích là thay đổi bạn quan sát được trong cách làm, rồi giữ lại vì nó phù hợp với việc đang cần giải quyết.` : `${fc.anchor} From the theme of ${fc.card.essence}, try a small action: ${fc.card.action} State the result you want and the practical conditions you have. After trying it, review both what was completed and what still caused friction. ${fc.card.avoid} A useful change is something you can observe in your approach and keep because it fits the task you need to resolve.`),
    ],
    do: [focus(`${fc.anchor} ${fc.card.action}`),
      focus(vi ? `${fc.anchor} Chọn ${fd[2]}, ghi điều bạn muốn đạt và một phản hồi cụ thể để nhìn lại cách làm.` : `${fc.anchor} Choose ${fd[3]}, note the result you want and one piece of feedback to review your approach.`)],
    avoid: [focus(`${fc.anchor} ${fc.card.avoid}`),
      focus(vi ? `${fc.anchor} Tránh nhận thêm một việc liên quan đến ${fd[0]} khi phần việc và điểm dừng chưa được thống nhất.` : `${fc.anchor} Avoid taking on another task connected to ${fd[1]} before the responsibilities and stopping point are agreed.`)] };
  const teasers = source.locked.map(targetKey => {
    const targetPalace = targetKey.startsWith("palace:") ? targetKey : targetKey === "topic:career_wealth" ? "palace:career" : "palace:spouse";
    const c = context(targetPalace);
    const title = targetKey.startsWith("palace:") ? palace(targetPalace) : vi ? targetKey.endsWith("career_wealth") ? "Công việc và tiền bạc" : "Tình cảm và hôn nhân" : targetKey.endsWith("career_wealth") ? "Work and money" : "Relationships and marriage";
    return { targetKey, title, keys: c.keys,
      line: vi ? `${title} mở một góc nhìn về ${domain(targetPalace)[0]}, với nét ${c.card.essence} gắn với ${c.card.name}.` : `${title} offers a view of ${domain(targetPalace)[1]}, with ${c.card.essence} connected to ${c.card.name}.` };
  });
  return FreeReadingContentV2Schema.parse({ version: 2, overview, focusPalace, teasers, yearHook: null });
}
