import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { ReportNarrative } from "./report-narrative";

const seven = "Một là một. Hai là hai. Ba là ba. Bốn là bốn. Năm là năm. Sáu là sáu. Bảy là bảy.";

describe("ReportNarrative", () => {
  it("renders one <p> per paragraph with a lead line on the first", () => {
    const html = renderToStaticMarkup(<ReportNarrative text={seven} className="report-section-narrative" />);
    expect(html.match(/<p>/g)).toHaveLength(3);
    expect(html).toContain('<span class="report-narrative-lead">Một là một.</span>');
    expect(html).toContain('class="report-narrative report-section-narrative"');
  });

  it("can skip the lead line", () => {
    const html = renderToStaticMarkup(<ReportNarrative text="Câu một. Câu hai." lead={false} />);
    expect(html).not.toContain("report-narrative-lead");
  });
});
