import { Bookmark } from "lucide-react";
import { useDemo } from "../data/demoStore";
export default function BookmarkButton({
  type,
  id,
  title,
}: {
  type: string;
  id: string;
  title: string;
}) {
  const { state, update } = useDemo();
  const saved = state.bookmarks.some(
    (b) => b.entityType === type && b.entityId === id,
  );
  return (
    <button
      className={`icon-button bookmark ${saved ? "bookmarked" : ""}`}
      aria-label={`${saved ? "Unsave" : "Save"} ${title}`}
      aria-pressed={saved}
      onClick={() =>
        update((s) => ({
          ...s,
          bookmarks: saved
            ? s.bookmarks.filter(
                (b) => !(b.entityType === type && b.entityId === id),
              )
            : [
                ...s.bookmarks,
                {
                  entityType: type,
                  entityId: id,
                  savedAt: new Date().toISOString(),
                },
              ],
        }))
      }
    >
      <Bookmark size={19} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
