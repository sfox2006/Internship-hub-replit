import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <div className="empty">
      <h1>Page not found</h1>
      <p>This record is not part of the demo fixture.</p>
      <Link className="button primary" to="/">
        Back to This Week
      </Link>
    </div>
  );
}
