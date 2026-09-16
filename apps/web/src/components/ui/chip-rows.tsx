type ChipRowsProps = {
  firstRow: string[];
  secondRow: string[];
};

function ChipTrack({
  chips,
  reverse = false,
}: {
  chips: string[];
  reverse?: boolean;
}) {
  const repeatedChips = [...chips, ...chips];

  return (
    <div className={`ui-chip-rows__track${reverse ? " ui-chip-rows__track--reverse" : ""}`}>
      {repeatedChips.map((chip, index) => (
        <span className="ui-chip-rows__chip" key={`${chip}-${index}`}>{chip}</span>
      ))}
    </div>
  );
}

export function ChipRows({ firstRow, secondRow }: ChipRowsProps) {
  return (
    <div className="ui-chip-rows">
      <ChipTrack chips={firstRow} />
      <ChipTrack chips={secondRow} reverse />
    </div>
  );
}
