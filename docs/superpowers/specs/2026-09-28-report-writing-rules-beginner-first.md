# Report Writing Rules: Beginner First

**Date:** 2026-09-28
**Status:** Founder-approved direction (FD-106c, FD-106d). Extends, and where it conflicts overrides, the editorial parts of `docs/superpowers/specs/2026-09-13-ziwei-knowledge-editorial-ruleset.md` and FD-076.
**Owner:** An (prompt, gate and config changes). Lãm/Harris (voice acceptance).
**Reference output:** `prototype/revamp-2026-09/doc-bao-cao-tuong-tac.html`, section "Tổng quan lá số" and the Mệnh palace card. That text is the target voice.

## 1. Problem

The founder read a live V4.1 report beside AiTuvi (2026-09-28) and found two faults the current rules do not catch.

**Fault 1: the text is a list of observations, not a portrait.** Our overview opens by naming stars and listing what each contributes. AiTuvi opens by naming who the person is, then earns every claim afterwards. Both are roughly the same length. The difference is arc, not word count.

**Fault 2: a reader with no Tử Vi background cannot follow it.** Star and palace names arrive without translation, several per sentence. This is not an accident of prompting: the quality gate `minimumPalaceStars: 2` (`config/ziwei-comprehensive-report-quality.v2.3-sensitivity.json`) **requires** every palace section to name at least two real stars in its narrative, and `minimumEvidenceAnchors: 2` pushes in the same direction. The gate is doing exactly what it was told, and what it was told is now wrong.

Two things the current rules already get right and must not be lost:
- Length. Overview and coreAxis target 700 to 900 syllables, each palace 550 to 750. The founder wants that depth kept. Structure reorganises it; it never trims it.
- The `discouragedTerms` list (43 entries: `cát hung`, `thân tâm`, `bản mệnh`, `phú quý`, …). Keep it as is.

## 2. The one rule everything else serves

> A reader who has never opened a Tử Vi book must be able to read any section start to finish and understand it, without looking anything up.

Test it like this: read a section aloud to someone who does not know Tử Vi and ask them to say back what it meant. If they repeat star names instead of meaning, the section fails.

## 2b. Voice: an expert talking to you, in real Vietnamese

Founder instruction, 2026-09-28, binding on every word of every reading:

> Toàn bộ ngôn ngữ của phần luận giải **bắt buộc** phải viết theo giọng tâm tình của chuyên gia, tiếng Việt tự nhiên, không dùng các cụm ghép lại trông như dịch thuật và ngôn ngữ AI.

Reference for the voice: **Vũ Tài Lục, *Tử Vi Đẩu Số Toàn Thư***. What to take from it, and what not to.

**Take:** continuous prose in long connected sentences; concrete life consequences chained one after another; the writer addressing the reader directly and allowing himself an aside, a caveat, or a plain "I want you to notice this"; the confidence to say what a star does *not* mean.

**Do not take:** its content. The book is full of material FD-089 bans outright (lifespan, `chết non`, `tàn tật`, moral judgement of women). We copy the voice, never the claims.

### 2b.1 No machine sub-headings

Detail paragraphs are **flowing prose with no sub-headings**. The AI habit of labelling every paragraph is the single most obvious tell, and the founder named it directly.

Banned as sub-headings or as sentence openers. These are labels a machine writes, not Vietnamese a person speaks:

`Chỗ dễ va chạm` · `Chỗ đang mắc` · `Chỗ khiến bạn mệt` · `Chỗ phải giữ` · `Chỗ sinh lộc` · `Hai lực kéo` · `Cách dùng cả hai` · `Nơi bạn phát huy` · `Điều cần giữ` · `Loại việc hợp` · `Đường thăng tiến` · `Cách giữ tiền` · `Nhịp làm và nghỉ` · `Giao tiếp bên ngoài` · `Nếp sống hằng ngày` · `Với người xung quanh` · `Người quanh bạn` · `Điều chặng này mang lại` · `Tiền bạc và sức lực` · `Giữ gắn bó` · `Giữ sức lâu dài`

The pattern, not just this list, is banned: a two to four word noun phrase used as a heading over a paragraph. A heading is allowed only where the content really is a set of separate items, such as the four tứ hóa or the twelve palace cards. Inside one section's narrative, never.

The summary layer (conclusion plus three key points) already gives the reader structure. Detail is prose.

### 2b.2 Sentences that read like translation

Also banned: noun stacks assembled instead of written. `mức độ thận trọng`, `xu hướng hành động chặt chẽ`, `khả năng ứng phó linh hoạt`, `tinh thần trách nhiệm cao`, `phương thức tiếp cận thực tế`, `yếu tố quan trọng`, `nền tảng vững chắc`.

Rewrite them as something a person does: not `củng cố thêm mức độ thận trọng khi đứng trước các quyết định quan trọng`, but `bạn cân nhắc lâu, nhưng đã nói là làm`.

Rule of thumb: if a sentence has three abstract nouns and no person doing anything, rewrite it.

### 2b.3 Things the voice is allowed to do

- Address the reader: `tôi muốn bạn để ý`, `xin nói rõ ngay`, `nếu bạn nghĩ lại những lần khó khăn đã qua`.
- Rule out a wrong reading before it forms: `sao này không báo bệnh tật gì`, `tôi không nói bạn sẽ mất nhà, xin đừng hiểu như vậy`.
- Use an everyday scene: tiền chợ, một buổi họp với đối tác lạ, một lần cho người nhà mượn tiền.
- Point at something the reader can check: `có lẽ bạn chưa để ý`, `nếu bạn để ý, những khoản chi bạn tiếc nhất thường rơi vào lúc đang căng thẳng`.

Reference output for all of this: `prototype/revamp-2026-09/doc-bao-cao-tuong-tac-palaces.js`, the Mệnh and Phu Thê palaces. That is the target, not an approximation of it.

## 2c. Vocabulary: natural Vietnamese, Hán Việt on a short leash

Founder instruction, 2026-09-28: *"có thể dùng từ hán việt nhưng cần tiết chế, chỉ dùng những từ thật sự phổ biến trong tiếng việt."*

The examples he caught are the template for the whole class of fault: `mặt sau` where Vietnamese says **`mặt trái`**, `người dưới tay` where Vietnamese says **`người cấp dưới`**. Neither is a hard word. Both are a writer assembling a phrase instead of using the phrase that already exists.

### 2c.1 The test

> Would a Vietnamese news reader say this sentence out loud without stumbling?

If the phrase has to be worked out by the reader, it fails, however simple the individual words are.

### 2c.2 Hán Việt that stays

These are common in everyday Vietnamese and appear in every competitor's readings (checked 2026-09-28 against `tracuutuvi.com`, `thanglongdaoquan.vn`, `aituvi.com`). They read as normal speech, not as jargon:

`đương số` · `tính tình` · `tướng mạo` · `cá tính` · `ôn hòa` · `chính trực` · `nhân hậu` · `trung hậu` · `khiêm tốn` · `hòa nhã` · `cẩn trọng` · `quyết đoán` · `trách nhiệm` · `nguyên tắc` · `uy tín` · `cấp trên` · `cấp dưới` · `sự nghiệp` · `tài lộc` · `vận hạn` · `phúc đức` · `tích lũy` · `dự phòng` · `thẩm mỹ` · `tự lập`

Plus the Tử Vi proper names and chart terms, which are names, not vocabulary: star names, palace names, `tứ hóa`, `tam hợp`, `đại vận`, `lưu niên`, `vô chính diệu`, `miếu vượng đắc bình hãm`.

### 2c.3 Four kinds of word that are banned

**Archaic Hán Việt.** Real words, but nobody under sixty uses them: `kho lẫm`, `khí chất`, `bản mệnh`, `phú quý`, `hiển đạt`, `công danh`, `hao tán`. Already partly covered by the 43-entry `discouragedTerms` list; that list stands and this rule extends it.

**Compounds the writer invented.** The phrase does not exist in Vietnamese; it was assembled on the spot. Caught so far: `mặt sau` (→ `mặt trái`), `người dưới tay` (→ `người cấp dưới`), `cửa lộc` (→ `nơi sinh lộc`), `chỗ tựa bên dưới` (→ `nền tảng`), `chỗ lùi` (→ `đường lui`), `sức vóc` (→ `thực lực`), `xô lệch` (→ `chệch hướng`).

**Technology metaphors.** Instantly reads as machine-written in a Tử Vi reading: `chế độ`, `bật chế độ`, `nạp lại năng lượng`, `hệ thống`, `cơ chế`, `kích hoạt`, `tối ưu`, `vận hành`. Say what the person actually does instead.

**Modern slang.** `gu`, `lệch pha`, `toang`, `flex`, `chill`. The register is an experienced practitioner, not a group chat.

### 2c.4 What competitors show, and where we differ

The classic Vietnamese sites (`tracuutuvi.com`, `thanglongdaoquan.vn`) write in a catalogue register: *"Chủ về đương số là người trung hậu, uy nghi, thông minh"*. Dense Hán Việt, short, no explanation. A reader who already knows Tử Vi can use it; a beginner cannot.

AiTuvi sits closer to where we want to be: *"Với bản chất ôn hòa, tốt bụng và giàu nhiệt huyết cống hiến, đương số thường chọn con đường văn cách, đi lên từ sự ổn định và những bước tiến chắc chắn, bài bản."* Full sentences, a controlled set of familiar Hán Việt, and a person doing something in every clause.

Our target is one step further again: AiTuvi's flow, our translate-on-arrival rule (§3.1), and no term left unexplained. The competitors are the floor for register, not the ceiling.

### 2c.5 Gate

A banned-phrase list in the quality config, checked against the narrative of every section, seeded with every phrase in §2c.3 and grown each time the founder catches a new one. A hit fails the section.

Each phrase the founder flags is worth more than a general instruction, because it turns into a check the model cannot argue with. Add every one of them.

## 3. Star and palace names

Star names stay (founder decision, 2026-09-28: they carry the sense of real expertise that part of the audience pays for). What changes is how they appear.

**Rule 3.1 — Translate on arrival.** The first time a star appears in a section, the same sentence or the next one says what it means in ordinary life. Never a bare name.

- Bad: `Cung Mệnh có Liêm Trinh ở trạng thái Bình và Thiên Phủ ở trạng thái Miếu, củng cố xu hướng hành động chặt chẽ.`
- Good: `Ngôi lo kho là Thiên Phủ, và nó ở vị trí sáng nhất trong lá số bạn. Nó khiến bạn có phản xạ tích luỹ, dự phòng, và rất không thích cảm giác tay trắng.`

**Rule 3.2 — Meaning before mechanism.** Every claim leads with the everyday observation and follows with the chart basis. This restates FD-076's intent; the difference now is that it is enforced (§6).

**Rule 3.3 — Density cap.** At most **one and a half distinct star names per 80 syllables** of narrative, counted per section, rounded up. A 700-syllable overview may name at most 14 stars. Repeats of the same star do not count again, and "Tử Vi" as the name of the discipline (Tử Vi Đẩu Số, trong Tử Vi) does not count. Calibrated 2026-09-28 on the twelve approved palace texts: the densest, Tử Tức, names 7 in 388 syllables (1.44 per 80), and passes because every name is explained on arrival. The count is a backstop; Rule 3.1 is the real defence.

**Rule 3.4 — Brightness in words, not labels.** Write `ở vị trí sáng nhất`, not `ở trạng thái Miếu`. The exact label already appears on the star chip beside the text.

**Rule 3.5 — Palace names only in chart context.** Unchanged from the current rule: `Phu Thê`, `Tử Tức` and the rest appear only when describing chart structure, never as a standalone label for a life area. Say `người đồng hành`, not `cung Phu Thê của bạn`.

## 4. Where the proof lives now

The reader UI gained two surfaces in FD-104 wave 1 that did not exist when the gates were written:

| Surface | Carries |
|---|---|
| Star chips under each heading | Every star in the palace, with brightness and tứ hóa |
| "Vì sao có nhận định này?" box | The full chart basis for the section |
| Mini chart | Which palace, and its triad and opposite |

So the prose no longer has to carry the proof. **`minimumPalaceStars: 2` moves from the narrative to the section's evidence refs**: the section must still be anchored to at least two real stars in the palace, but the check reads the refs, not the prose. Same for `minimumEvidenceAnchors`.

This is the single change that makes beginner-first writing possible without weakening grounding.

## 5. Narrative arc

### 5.1 Overview (`overview`)

Five beats, in order, at the current 700 to 900 syllables:

| Beat | Job | Opens with |
|---|---|---|
| 1. Con người bạn, nhìn từ xa | Name who this person is, in one image, then earn it | The dominant structure, translated |
| 2. Cách bạn đi qua công việc | How they decide and act, with a concrete situation | An everyday scene |
| 3. Chỗ khiến bạn mệt | The cost of the same trait. Written as part of the person, not a fault list | The trait from beat 1, turned over |
| 4. Con người thứ hai của bạn | The Mệnh/Thân tension, or whatever second mode the chart shows | A contrast the reader can recognise |
| 5. Cuộc đời này hợp với cách sống nào | What environment suits them | A closing judgement, not a summary |

The beat names above are internal labels for writers and reviewers only. They are never printed: the overview is five paragraphs of flowing prose with no sub-headings (§2b.1), separated by a blank line.

Beat 1 must not open with a star name as the grammatical subject. Open with the person or the pattern, translated.

### 5.2 Palaces and themes

Three beats: what this area looks like for this person → where it gets hard → what actually helps. Same translate-on-arrival and density rules.

### 5.3 Decadal cycles (new, FD-106b)

- Current cycle: unchanged depth (550 to 750 syllables), full arc.
- Other seven cycles: **120 to 200 syllables each**. Two or three sentences. Name the palace the cycle passes through, say what rises in those ten years, and stop. Short and formulaic is acceptable here; this is a teaser, not a reading.

## 6. Gate changes

| Gate | Now | Change |
|---|---|---|
| `minimumPalaceStars` | Counts star names in the narrative | Counts distinct stars in the section's evidence refs |
| `minimumEvidenceAnchors` | Same | Same move |
| Star density | Does not exist | New: reject above 1.5 distinct star names per 80 syllables (§3.3) |
| Translate on arrival | Does not exist | New: every star name in the narrative must have an explanatory clause within the same or next sentence. Checked by the AI critic as an advisory `beginner` warning (a pattern check cannot tell an explanation from a list); the founder reads those warnings in the release gate (§8) |
| Machine sub-headings | Does not exist | New: reject any narrative paragraph preceded by a 2 to 4 word noun-phrase heading, and reject the §2b.1 list at the start of a line or sentence (the approved texts use some of these words mid-sentence, correctly). The §2b.2 and §2c.3 lists are rejected anywhere |
| Arc check (overview only) | Does not exist | New: five paragraphs present (flowing prose, no sub-headings, per §2b.1), first paragraph does not start with a star name |
| Section length | 700 to 900 overview, 550 to 750 palace | Unchanged |
| `discouragedTerms`, death terms, certainty phrases, locale integrity | As configured | Unchanged |
| Decadal teaser length | Does not exist | New: 120 to 200 syllables per non-current cycle |

New config version: `ziwei-comprehensive-report-quality.v2.4-beginner-first.json`.

## 7. Cost

Seven new teaser sections at roughly 700 max output tokens each adds about 11 percent to the output budget of a report (current total across 23 sections is about 46,300). The founder accepted this on 2026-09-28 in preference to full-depth readings for every cycle, which would have added about 38 percent.

## 8. Release gate

Unchanged from FD-082: **20 consecutive generations passing every gate** before this prompt version takes paid traffic. Plus one addition specific to this change: five of those twenty are read by the founder against the §2 test before sign-off.

## 9. Out of scope

Rewriting already-sold reports (FD-104: UI upgrade only). Scores are covered by FD-107 and `doc-bao-cao-tuong-tac-score.js`, not here. The free chart result page is a separate project the founder deferred until the paid report is done.
