import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EvidenceDrawer } from "../../../../features/evidence/evidence-drawer";
import { FreeIdentityPreview } from "../../../../features/reports/free-identity-preview";
import { freeIdentityPreviewLoader } from "../../../../features/reports/load-free-identity-preview";
import { loadZiweiEvidence } from "../../../../features/ziwei/calculate-ziwei-chart-action";
import { ZiweiChart } from "../../../../features/ziwei/ziwei-chart";
import { loadZiweiChart } from "../../../../features/ziwei/load-ziwei-chart";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ZiweiChartResultPage({
  params,
}: {
  params: Promise<{ chartId: string; locale: string }>;
}) {
  const { chartId, locale } = await params;
  const [chartResult, previewResult] = await Promise.all([
    loadZiweiChart.loadChart(chartId),
    freeIdentityPreviewLoader.loadPreview(chartId),
  ]);
  if (!chartResult.ok || !previewResult.ok) notFound();

  const topicHref = locale === "en"
    ? `/en/la-so/${chartId}/chon-luan-giai`
    : `/la-so/${chartId}/chon-luan-giai`;

  return (
    <main className="result-page">
      <section className="result-hero container">
        <p className="eyebrow">Lá số riêng tư</p>
        <h1>Lá số Tử Vi</h1>
        <p>12 cung được tính từ dữ liệu sinh của bạn. Mỗi nhận định có căn cứ để mở và tự kiểm tra.</p>
      </section>
      <div className="result-layout container">
        <ZiweiChart chart={chartResult.value.chart} />
        <aside className="result-evidence-note">
          <p className="eyebrow">Căn cứ</p>
          <h2>Đọc nhận định trong giới hạn của lá số</h2>
          <EvidenceDrawer chartId={chartId} evidenceId={chartResult.value.evidenceIndex.itemIds[0]!} loadEvidence={loadZiweiEvidence} />
        </aside>
      </div>
      <div className="container">
        <FreeIdentityPreview chartId={chartId} loadEvidence={loadZiweiEvidence} preview={previewResult.value} />
        <Link className="button" href={topicHref}>Chọn chủ đề luận giải</Link>
      </div>
    </main>
  );
}
