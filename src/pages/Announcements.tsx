import { fixtures } from "../data/selectors";
import { referenceNow, etFormat } from "../data/clock";
import Card from "../components/Card";
import AssistanceCard from "../components/AssistanceCard";
export default function Announcements() {
  const now = referenceNow();
  const current = fixtures.announcements
    .filter((a) => !a.expiresAt || new Date(a.expiresAt) > now)
    .sort(
      (a, b) =>
        Number(b.urgent) - Number(a.urgent) ||
        b.postedAt.localeCompare(a.postedAt),
    );
  const earlier = fixtures.announcements
    .filter((a) => a.expiresAt && new Date(a.expiresAt) <= now)
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">COMMUNITY</span>
          <h1>Announcements</h1>
          <p>A few things to keep on your radar.</p>
        </div>
      </div>
      {[
        ["Current", current],
        ["Earlier", earlier],
      ].map(([label, list]) => (
        <section key={String(label)}>
          <h2>{String(label)}</h2>
          {(list as typeof current).map((a) => (
            <Card key={a.id}>
              <div className="between">
                <h3>{a.title}</h3>
                {a.urgent && <span className="badge danger">Urgent</span>}
              </div>
              <p>{a.body}</p>
              <p className="metadata">
                Posted {etFormat(a.postedAt)} · Expires{" "}
                {a.expiresAt ? etFormat(a.expiresAt) : "—"}
              </p>
              {a.assistanceConfig && (
                <AssistanceCard
                  entityKey={`announcement:${a.id}`}
                  config={a.assistanceConfig}
                  expired={!!a.expiresAt && new Date(a.expiresAt) <= now}
                />
              )}
            </Card>
          ))}
        </section>
      ))}
    </>
  );
}
