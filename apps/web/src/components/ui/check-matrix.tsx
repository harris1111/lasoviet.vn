import { Icon } from "../icon";

type CheckMatrixColumn = {
  id: string;
  label: string;
};

type CheckMatrixRow = {
  cells: Record<string, boolean>;
  id: string;
  label: string;
};

type CheckMatrixProps = {
  columns: CheckMatrixColumn[];
  rows: CheckMatrixRow[];
};

export function CheckMatrix({ columns, rows }: CheckMatrixProps) {
  return (
    <table className="ui-check-matrix">
      <thead>
        <tr>
          <th scope="col">Nội dung</th>
          {columns.map((column) => <th key={column.id} scope="col">{column.label}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <th scope="row">{row.label}</th>
            {columns.map((column) => {
              const included = row.cells[column.id] === true;
              const stateLabel = included ? "Có" : "Chưa có";

              return (
                <td key={column.id}>
                  <span className="ui-check-matrix__label">
                    <span
                      aria-label={stateLabel}
                      className={`ui-check-matrix__state${included ? " ui-check-matrix__state--included" : ""}`}
                      role="img"
                    >
                      {included ? <Icon name="check" /> : "×"}
                    </span>
                    <span className="sr-only">{stateLabel}</span>
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
