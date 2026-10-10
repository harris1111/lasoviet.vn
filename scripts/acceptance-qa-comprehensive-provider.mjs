import assert from "node:assert/strict";
import {displayFact} from "../packages/backend/dist/reports/comprehensive-report-quality-v4.js";
// Deterministic provider fixtures test delivery mechanics; they are never editorial acceptance.
const themes = [
  "Bạn có thể chọn việc cần ưu tiên trước, rồi dành thời gian rà soát các bước đã thực hiện để giữ nhịp sinh hoạt phù hợp với nguồn lực của bản thân.",
  "Khi học một kỹ năng mới, hãy ghi lại điều chưa hiểu, tìm ví dụ gần gũi và thử vận dụng trong phạm vi nhỏ trước khi mở rộng sang nhiệm vụ khác.",
  "Việc phối hợp những nguồn lực sẵn có cần được xem xét theo từng hoàn cảnh; nên trao đổi về mục tiêu, giới hạn và cách kiểm tra kết quả của mỗi lựa chọn.",
  "Trong quan hệ với cha mẹ, dành một cuộc trò chuyện bình tĩnh để lắng nghe mong muốn của từng người và cân nhắc cách hỗ trợ phù hợp với khả năng hiện tại.",
  "Đối với những giá trị gia đình, có thể giữ lại điều giúp mình thấy gần gũi và chủ động điều chỉnh thói quen khi hoàn cảnh sinh hoạt đã thay đổi.",
  "Không gian sống cần thuận tiện cho công việc thường ngày; bạn có thể sắp xếp đồ dùng, kiểm tra khoản chi và thống nhất việc chăm sóc nhà cửa cùng người chung sống.",
  "Với nhiệm vụ nghề nghiệp, nên xác định trách nhiệm được giao, thống nhất tiêu chí hoàn thành và ghi nhận phản hồi để điều chỉnh cách tổ chức công việc một cách phù hợp.",
  "Trong nhóm bạn, có thể nói rõ điều mình mong đợi, giữ lời hẹn trong khả năng thực hiện và tôn trọng quyền từ chối của người khác khi cần thay đổi kế hoạch.",
  "Khi di chuyển, hãy chuẩn bị giấy tờ, lựa chọn phương tiện phù hợp và dành thời gian nghỉ giữa các chặng để chủ động xử lý những thay đổi trong hành trình.",
  "Việc chăm sóc thể lực có thể bắt đầu từ giờ ngủ, bữa ăn và vận động vừa sức; nếu khó chịu kéo dài, hãy trao đổi trực tiếp với người có chuyên môn phù hợp.",
  "Đối với tài chính cá nhân, nên phân biệt khoản chi cần thiết và khoản có thể hoãn, lưu lại thông tin giao dịch rồi kiểm tra số tiền còn lại trước mỗi lựa chọn.",
  "Trong việc chăm sóc con trẻ, hãy lắng nghe nhu cầu cụ thể, thống nhất cách hỗ trợ với gia đình và dành không gian để trẻ thử sức trong phạm vi phù hợp.",
  "Quan hệ với người đồng hành cần cuộc trao đổi rõ ràng về trách nhiệm và mong muốn; bạn có thể chọn thời điểm bình tĩnh, lắng nghe ý kiến rồi thống nhất bước tiếp theo.",
  "Với anh chị em, có thể phân chia công việc chung theo khả năng của từng người, ghi nhận phần đã hoàn thành và cùng điều chỉnh khi một thành viên cần hỗ trợ.",
  "Thói quen tiếp nhận thông tin nên có khoảng dừng để kiểm tra nguồn, xác định điều còn thiếu và lựa chọn cách phản hồi phù hợp thay vì quyết định ngay khi chưa rõ hoàn cảnh.",
  "Mục tiêu dài hạn có thể được chia thành những bước nhỏ để dễ theo dõi; bạn nên kiểm tra năng lực hiện tại, dành thời gian học thêm và điều chỉnh khi nguồn lực thay đổi.",
  "Khi cân nhắc nghề nghiệp và thu nhập, hãy đối chiếu yêu cầu của vị trí với kỹ năng đang có, tìm hiểu cách phân công và giữ lại ghi chép về những điều cần thương lượng.",
  "Sự gắn bó trong gia đình có thể được chăm sóc qua việc chia sẻ công việc, thống nhất lịch sinh hoạt và dành một khoảng riêng cho những cuộc trò chuyện cần sự tập trung.",
  "Trong những lúc cần hồi phục tinh thần, hãy chọn hoạt động vừa sức, giảm việc không cần thiết và liên hệ người đáng tin để chia sẻ điều đang khiến bạn bận tâm.",
  "Thế mạnh cần được sử dụng đúng hoàn cảnh; có thể xem lại những việc mình đã làm tốt, nhận diện phần dễ quá sức và chủ động xin hỗ trợ khi nhiệm vụ vượt khả năng hiện tại.",
  "Một chặng đường nhiều năm cần được theo dõi bằng các mục tiêu thực tế; bạn nên rà soát nguồn lực đang có, chọn việc vừa sức và giữ khoảng trống cho thay đổi của hoàn cảnh.",
  "Khi lập kế hoạch trong năm, hãy phân chia trách nhiệm theo những việc cần hoàn thành, kiểm tra khoản chi đã dự kiến và trao đổi trước nếu lịch sinh hoạt cần được điều chỉnh.",
  "Những yếu tố ổn định giúp bạn có điểm tựa khi đối chiếu cách sống; nên ghi lại điều phù hợp với trải nghiệm của bản thân và trao đổi thêm khi cần hiểu rõ hoàn cảnh cụ thể.",
  "Những yếu tố thay đổi theo thời điểm sinh cần được đối chiếu cẩn thận; có thể so sánh trải nghiệm đã có và giữ thái độ linh hoạt khi chọn cách diễn giải phù hợp.",
  "Một hướng phát triển về sau có thể cần thêm thời gian tìm hiểu; hãy kiểm tra điều kiện thực tế, trao đổi với người liên quan và chủ động chuẩn bị những việc trong khả năng hiện tại.",
  "Bước đầu tiên nên là ghi nhận công việc đang chờ, lựa chọn nhiệm vụ vừa sức và thống nhất cách báo lại kết quả với người cùng tham gia để tránh bỏ sót trách nhiệm.",
  "Bước tiếp theo là rà soát cách sử dụng thời gian, dành khoảng nghỉ phù hợp và thử điều chỉnh lịch sinh hoạt khi nhận thấy một nhiệm vụ cần nhiều nguồn lực hơn dự kiến.",
  "Cuối cùng, hãy đối chiếu khoản chi thực tế với phần đã chuẩn bị, lưu lại thông tin cần thiết và trao đổi sớm khi có một cam kết cần được xem xét lại cùng người liên quan.",
];
const order = ["overview", "coreAxis", "keyConfigurations", ...["parents","fortune","property","career","friends","travel","health","wealth","children","spouse","siblings","life"].map(id=>"palace:ziwei.palace."+id), ...["career_wealth","relationships_family","social_environment","wellbeing_inner_resources"].map(id=>"thematic:"+id), "strengthsAndTensions","currentDecadal","annualSnapshot","stable","sensitive","teaser","action0","action1","action2"];
function narrative(theme, anchors, minimum=220) {
  const sentence=themes[Math.max(0,order.indexOf(theme))%themes.length];
  const repeats=Math.ceil(minimum/sentence.split(/\s+/u).length)+1;
  const text=[anchors,sentence.repeat(repeats)].filter(Boolean).join(" ");
  assert(text.length<=5000,"BOUNDED_COMPREHENSIVE_FIXTURE_REQUIRED"); return text;
}
function anchorKeys(keys) {
  const labels=[...new Set(keys.map(key=>key.replace(/^(natal|decadal|annual)\./u,"")).map(displayFact).filter(Boolean))];
  return labels.slice(0,2).map(label=>`Căn cứ gồm cung ${label}.`).join(" ");
}
function section(payload, contract) {
  const key=payload.sectionKey, evidenceKeys=payload.allowedEvidenceKeys;
  assert(evidenceKeys.length,"ACTUAL_SCOPED_EVIDENCE_REQUIRED");
  const minimum=contract?.sectionLength?.targetMinimumSyllables ?? 260;
  const anchors=anchorKeys(evidenceKeys);
  const base={title:"Định hướng phù hợp",narrative:narrative(key,anchors,minimum),evidenceKeys};
  let value=base;
  if(key.startsWith("palace:")){const palace=payload.facts.natal.palaces.find(p=>p.palaceId===key.slice(7));assert(palace);const names=palace.stars.map(s=>displayFact(s.id)).filter(Boolean).slice(0,2);assert(names.length===2);value={...base,palaceId:palace.palaceId,narrative:narrative(key,`Cung ${displayFact(palace.palaceId)} có ${names.join(" và ")}.`,minimum)};}
  else if(key.startsWith("thematic:"))value={...base,id:key.slice(9)};
  else if(key==="keyConfigurations")value=[base];
  else if(key==="currentDecadal"){const d=payload.facts.decadal;value=d.state==="active"?{...base,state:d.state,index:d.index,ageRange:d.ageRange,yearRange:d.yearRange}:{...base,state:d.state,firstCycleStartAge:d.firstCycleStartAge,firstCycleStartYear:d.firstCycleStartYear};}
  else if(key==="annualSnapshot")value={...base,...payload.facts.frozenTiming};
  else if(key==="birthTimeSensitivity")value={title:"Đối chiếu thời điểm sinh",stableFactors:{...base,narrative:narrative("stable","",minimum),evidenceKeys:evidenceKeys.filter(k=>k.startsWith("sensitivity.stable."))},sensitiveFactors:{...base,narrative:narrative("sensitive","",minimum),evidenceKeys:evidenceKeys.filter(k=>k.startsWith("sensitivity.sensitive."))}};
  else if(key==="decadalTeasers")value=payload.teaserCycles.map(c=>({ordinal:c.ordinal,narrative:narrative("teaser",anchors,minimum),evidenceKeys}));
  else if(key==="practicalDirection")value=[0,1,2].map(i=>({recommendation:narrative("action"+i,"",Math.ceil(minimum/2)),rationale:narrative("action"+i,anchors,Math.ceil(minimum/2)),avoid:themes[25+i],evidenceKeys}));
  return {key,value};
}
export function comprehensiveFixture(request,input) {
  if(request.schemaName==="comprehensive_report_sectioned_critic_v4")return {warnings:[]};
  if(request.schemaName.startsWith("ziwei_comprehensive_report_section_group_"))return {sections:input.sections.map((p,i)=>section(p,input.acceptanceContracts?.[i]))};
  if(request.schemaName.startsWith("ziwei_comprehensive_report_section_"))return section(input,JSON.parse(request.system.match(/\n(\{"scope":"section-and-item-addressed"[^\n]+)\n/u)?.[1]??"null"));
  throw Error("CLOSED_COMPREHENSIVE_FIXTURE_SCHEMA_REQUIRED");
}
