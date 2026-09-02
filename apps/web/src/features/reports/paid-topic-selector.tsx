import type { PaidTopicSelectionViewV1 } from "@lasoviet/contracts";

export function PaidTopicSelector({ topics }: { topics: PaidTopicSelectionViewV1 }) {
  const offer = topics.offers[0]!;

  return (
    <section className="paid-topic-selector">
      <p className="eyebrow">Luận giải chuyên sâu</p>
      <h1>Chọn luận giải chuyên sâu</h1>
      <article className="paid-topic-offer">
        <p>{offer.sku}</p>
        <h2>Bản mệnh và tiềm năng</h2>
        <p>{offer.price.toLocaleString("vi-VN")} {offer.currency}</p>
        <p>Thanh toán một lần. Không tự động gia hạn.</p>
        <p className="topic-deferred">SePay sẽ được mở ở bước tiếp theo.</p>
      </article>
    </section>
  );
}
