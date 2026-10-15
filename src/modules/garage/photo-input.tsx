"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/strings/en";

// Shrinks a phone photo in the browser and uploads it plus a small
// thumbnail. The form only carries the stored path.
function shrink(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", quality),
  );
}

export function PhotoInput({ name, folder, label, defaultPath }: {
  name: string;
  folder: string;
  label: string;
  defaultPath?: string | null;
}) {
  const [path, setPath] = useState(defaultPath ?? "");
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "failed">("idle");
  const input = useRef<HTMLInputElement>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("uploading");
    // Holds the form back until the photo's path is known.
    input.current?.setCustomValidity(t.garage.uploading);
    try {
      // Decode once: a full-size phone photo is a lot of memory on an old phone.
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const [full, thumb] = await Promise.all([shrink(bitmap, 1600, 0.8), shrink(bitmap, 400, 0.7)]);
      bitmap.close();
      const base = `${folder}/${crypto.randomUUID()}`;
      const storage = createClient().storage.from("garage-photos");
      const opts = { contentType: "image/jpeg", upsert: false };
      const results = await Promise.all([
        storage.upload(`${base}.jpg`, full, opts),
        storage.upload(`${base}-thumb.jpg`, thumb, opts),
      ]);
      if (results.some((r) => r.error)) throw results.find((r) => r.error)!.error;
      setPath(`${base}.jpg`);
      setPreview(URL.createObjectURL(thumb));
      setStatus("idle");
    } catch (err) {
      console.error("photo upload", err);
      setStatus("failed");
    } finally {
      input.current?.setCustomValidity("");
    }
  }

  return (
    <label className="block pt-4">
      <span className="block pb-1 font-medium">{label}</span>
      <input ref={input} type="file" accept="image/*" onChange={onChange} className="block w-full text-sm" />
      <input type="hidden" name={name} value={path} />
      {preview && <img src={preview} alt="" className="mt-2 size-24 rounded object-cover" />}
      {status === "uploading" && <span className="block pt-1 text-sm text-muted">{t.garage.uploading}</span>}
      {status === "failed" && <span role="alert" className="block pt-1 text-sm text-danger">{t.garage.photoFailed}</span>}
    </label>
  );
}
