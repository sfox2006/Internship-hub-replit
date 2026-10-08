import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { useDemo } from "../data/demoStore";
import { getImage, putImage, validateImage } from "../data/imageStore";
import { referenceNow, etFormat } from "../data/clock";
import Card from "../components/Card";
import EmptyState from "../components/EmptyState";
import type { Photo } from "../../shared/types";
function PhotoCard({ photo }: { photo: Photo }) {
  const { state } = useDemo();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    getImage(photo.blobKey)
      .then((blob) => {
        if (!active) return;
        if (!blob) {
          setError("Stored image is unavailable.");
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setError("Unable to read image storage.");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo.blobKey]);
  return (
    <Card>
      {url ? (
        <img
          className="gallery-photo"
          src={url}
          alt={photo.caption || "Demo upload"}
        />
      ) : (
        <p role="status">{error || "Loading image…"}</p>
      )}
      <p>{photo.caption || "No caption"}</p>
      <small className="muted">
        {state.profile.firstName} {state.profile.lastName} ·{" "}
        {etFormat(photo.createdAt)}
      </small>
    </Card>
  );
}
export default function Photos() {
  const { state, update } = useDemo();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">COMMUNITY</span>
          <h1>Photo Library</h1>
          <p>A few moments worth keeping.</p>
        </div>
      </div>
      <Card>
        <h2>
          <ImagePlus size={22} /> Share a photo
        </h2>
        <p className="muted">
          JPEG, PNG, GIF, or WebP · up to 10 MB · stored only in this browser
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!file || validateImage(file)) return;
            setBusy(true);
            setError("");
            try {
              const key = crypto.randomUUID();
              await putImage(key, file);
              const ok = update((s) => ({
                ...s,
                photos: [
                  ...s.photos,
                  {
                    id: key,
                    blobKey: key,
                    caption: caption.trim(),
                    authorId: "demo",
                    createdAt: referenceNow().toISOString(),
                  },
                ],
              }));
              setMessage(
                ok
                  ? "Photo saved in this browser."
                  : "Image stored, but metadata could not be saved for reload.",
              );
              setFile(null);
              setCaption("");
              (e.target as HTMLFormElement).reset();
            } catch {
              setError(
                "The photo could not be stored. Browser image storage may be unavailable or full.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Image
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
                setError(f ? validateImage(f) || "" : "");
                setMessage("");
              }}
            />
          </label>
          <label>
            Caption (optional)
            <input
              value={caption}
              maxLength={500}
              onChange={(e) => setCaption(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button
            className="primary"
            disabled={!file || !!validateImage(file) || busy}
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
          <p role="status">{message}</p>
        </form>
      </Card>
      {state.photos.length ? (
        <div className="grid three">
          {state.photos.map((p) => (
            <PhotoCard key={p.id} photo={p} />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState title="The library is waiting for your first photo">
            <p>Share a small moment from your demo experience.</p>
          </EmptyState>
        </Card>
      )}
    </>
  );
}
