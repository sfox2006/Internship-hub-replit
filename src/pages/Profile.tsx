import { useState } from "react";
import { useDemo } from "../data/demoStore";
import { putImage, validateImage } from "../data/imageStore";
import Avatar from "../components/Avatar";
import Card from "../components/Card";
export function validUrl(value: string) {
  if (!value.trim()) return true;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
export default function Profile() {
  const { state, update } = useDemo();
  const [form, setForm] = useState({ ...state.profile });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  function field(
    key:
      | "firstName"
      | "lastName"
      | "school"
      | "bio"
      | "linkedinUrl"
      | "websiteUrl",
    value: string,
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setMessage("");
  }
  return (
    <div className="narrow">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR SPACE</span>
          <h1>Profile</h1>
          <p>A little about you.</p>
        </div>
      </div>
      <Card>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setMessage("");
            setError("");
            if (!form.firstName.trim() || !form.lastName.trim()) {
              setError("First and last name are required.");
              return;
            }
            if (
              form.bio.length > 5000 ||
              !validUrl(form.linkedinUrl) ||
              !validUrl(form.websiteUrl)
            ) {
              setError(
                "Biography must be at most 5,000 characters and links must be valid http/https URLs.",
              );
              return;
            }
            setBusy(true);
            try {
              let photoKey = form.photoKey;
              if (file) {
                const issue = validateImage(file);
                if (issue) throw Error(issue);
                photoKey = crypto.randomUUID();
                await putImage(photoKey, file);
              }
              const ok = update((s) => ({
                ...s,
                profile: {
                  ...form,
                  firstName: form.firstName.trim(),
                  lastName: form.lastName.trim(),
                  linkedinUrl: form.linkedinUrl.trim(),
                  websiteUrl: form.websiteUrl.trim(),
                  photoKey,
                },
              }));
              setForm((f) => ({ ...f, photoKey }));
              setFile(null);
              setMessage(
                ok
                  ? "Changes saved."
                  : "Changes apply in this session; browser save failed.",
              );
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Photo storage is unavailable.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="row">
            <Avatar
              name={`${state.profile.firstName} ${state.profile.lastName}`}
              id="demo"
              size="large"
            />
            <label>
              Change photo
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
          </div>
          <label>
            Email
            <input value="fellow@example.com" readOnly />
          </label>
          <div className="grid two">
            <label>
              First name
              <input
                required
                value={form.firstName}
                onChange={(e) => field("firstName", e.target.value)}
              />
            </label>
            <label>
              Last name
              <input
                required
                value={form.lastName}
                onChange={(e) => field("lastName", e.target.value)}
              />
            </label>
          </div>
          <label>
            School
            <input
              value={form.school}
              onChange={(e) => field("school", e.target.value)}
            />
          </label>
          <label>
            Biography
            <textarea
              rows={7}
              maxLength={5000}
              value={form.bio}
              onChange={(e) => field("bio", e.target.value)}
            />
          </label>
          <small>{form.bio.length} / 5,000 characters</small>
          <label>
            LinkedIn
            <input
              value={form.linkedinUrl}
              onChange={(e) => field("linkedinUrl", e.target.value)}
              placeholder="https://…"
            />
          </label>
          <label>
            Website
            <input
              value={form.websiteUrl}
              onChange={(e) => field("websiteUrl", e.target.value)}
              placeholder="https://…"
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary"
            disabled={busy || (!!file && !!validateImage(file))}
            type="submit"
          >
            {busy ? "Saving…" : "Save Changes"}
          </button>
          <p role="status">{message}</p>
        </form>
      </Card>
    </div>
  );
}
