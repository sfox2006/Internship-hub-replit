import { percentage } from "../data/selectors";
export default function ProgressBar({
  done,
  total,
  label,
}: {
  done: number;
  total: number;
  label: string;
}) {
  const percent = percentage(done, total);
  return (
    <div className="progress-wrap">
      <div className="between">
        <span>
          {done} of {total} {label} complete
        </span>
        <strong>{percent}%</strong>
      </div>
      <progress aria-label={label} value={done} max={total || 1} />
    </div>
  );
}
