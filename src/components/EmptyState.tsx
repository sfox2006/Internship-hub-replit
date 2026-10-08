import type { ReactNode } from "react";
import { BookOpen } from "lucide-react";
export default function EmptyState({
  title = "Nothing here yet",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <BookOpen size={30} />
      <h2>{title}</h2>
      {children || <p>Try a different search or filter.</p>}
    </div>
  );
}
