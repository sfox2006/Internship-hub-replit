import { useDemo } from "../data/demoStore";
export default function DemoEntry() {
  const { update, error } = useDemo();
  return (
    <main className="entry">
      <div className="card">
        <span className="wordmark">CIS</span>
        <span className="eyebrow">INTERN HUB RECONSTRUCTION</span>
        <h1>
          A place to learn.
          <br />A place to belong.
        </h1>
        <p>
          This is a public demonstration using fixture content. Entering the
          demo is not authentication.
        </p>
        <p>
          Your changes stay in this browser. Signing out keeps your saved
          records.
        </p>
        <button
          className="primary"
          onClick={() => update((s) => ({ ...s, demoSignedIn: true }))}
        >
          Enter demo
        </button>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
