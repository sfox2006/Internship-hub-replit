import { useEffect, useState } from "react";
import { useDemo } from "../data/demoStore";
import { getImage } from "../data/imageStore";
export default function Avatar({
  name,
  id,
  size = "",
}: {
  name: string;
  id?: string;
  size?: string;
}) {
  const { state } = useDemo();
  const key = id === "demo" ? state.profile.photoKey : null;
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setUrl(null);
    if (key)
      getImage(key)
        .then((blob) => {
          if (blob && active) {
            objectUrl = URL.createObjectURL(blob);
            setUrl(objectUrl);
          }
        })
        .catch(() => {});
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [key]);
  return url ? (
    <img className={`avatar ${size}`} src={url} alt={name} />
  ) : (
    <span className={`avatar ${size}`} aria-hidden="true">
      {name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
