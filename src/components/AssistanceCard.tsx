import type { AssistanceConfig } from "../../shared/types";
import { useDemo } from "../data/demoStore";
import { referenceNow } from "../data/clock";
export default function AssistanceCard({
  config,
  entityKey,
  expired = false,
}: {
  config: AssistanceConfig;
  entityKey: string;
  expired?: boolean;
}) {
  const { state, toggle } = useDemo();
  const signed = state.assistingEntityKeys.includes(entityKey);
  const count = config.baseSignups.length + Number(signed);
  const closed =
    expired ||
    (!!config.closesAt && new Date(config.closesAt) <= referenceNow());
  const full = config.capacity !== null && count >= config.capacity;
  return (
    <section className="assistance">
      <h3>Lend a hand</h3>
      <p>
        {count}
        {config.capacity !== null ? ` / ${config.capacity}` : ""} signed up
      </p>
      <p className="muted">
        {[
          ...config.baseSignups,
          ...(signed
            ? [`${state.profile.firstName} ${state.profile.lastName}`]
            : []),
        ].join(", ") || "No signups yet"}
      </p>
      <button
        disabled={closed || (full && !signed)}
        onClick={() => toggle("assistingEntityKeys", entityKey)}
      >
        {closed
          ? "Signup closed"
          : signed
            ? "Cancel signup"
            : full
              ? "Full"
              : "Sign up to help"}
      </button>
    </section>
  );
}
