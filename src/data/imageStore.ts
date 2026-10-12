import { openDB } from "idb";
const database = () =>
  openDB("cis-fellowship-images", 1, {
    upgrade(db) {
      db.createObjectStore("blobs");
    },
  });
export function validateImage(file: File) {
  if (
    !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)
  )
    return "Choose a JPEG, PNG, GIF, or WebP image.";
  if (file.size > 10 * 1024 * 1024) return "Images must be 10 MB or smaller.";
  if (!file.size) return "The selected file is empty.";
  return null;
}
export async function putImage(key: string, file: File) {
  const error = validateImage(file);
  if (error) throw Error(error);
  const db = await database();
  try {
    await db.put("blobs", file, key);
  } finally {
    db.close();
  }
}
export async function getImage(key: string) {
  const db = await database();
  try {
    return (await db.get("blobs", key)) as Blob | undefined;
  } finally {
    db.close();
  }
}
