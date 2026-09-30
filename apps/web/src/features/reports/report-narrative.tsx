import { splitLeadSentence, splitNarrative } from "./report-paragraphs";

export type ReportNarrativeProps = {
  text: string;
  className?: string;
  lead?: boolean;
};

export function ReportNarrative({ text, className, lead = true }: ReportNarrativeProps) {
  const paragraphs = splitNarrative(text);
  return (
    <div className={className ? `report-narrative ${className}` : "report-narrative"}>
      {paragraphs.map((paragraph, index) => {
        if (index === 0 && lead) {
          const parts = splitLeadSentence(paragraph);
          return (
            <p key={index}>
              <span className="report-narrative-lead">{parts.lead}</span>
              {parts.rest}
            </p>
          );
        }
        return <p key={index}>{paragraph}</p>;
      })}
    </div>
  );
}
