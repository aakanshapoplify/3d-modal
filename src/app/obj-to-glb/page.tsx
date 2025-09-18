"use client";
import { useState } from "react";

export default function ObjToGlbPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const onConvert = async () => {
    if (!file) return;
    setIsConverting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/obj-to-glb", { method: "POST", body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.details || data?.error || res.statusText);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (file.name.replace(/\.[^/.]+$/, "") || "model") + ".glb";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || "Conversion failed");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-semibold mb-2">OBJ → GLB Converter</h1>
        <p className="text-gray-600 mb-6">Upload a .obj file to download a .glb (no Autodesk account required).</p>

        <div className="mb-4">
          <input
            type="file"
            accept=".obj"
            onChange={onFileChange}
            className="block w-full text-sm text-gray-700"
          />
        </div>

        {file && (
          <div className="mb-4 text-sm text-gray-700">
            <div><strong>File:</strong> {file.name}</div>
            {!file.name.toLowerCase().endsWith(".obj") && (
              <div className="text-red-600 mt-1">Only .obj files are supported here.</div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onConvert}
            disabled={!file || isConverting || !file.name.toLowerCase().endsWith(".obj")}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isConverting ? "Converting..." : "Convert to GLB"}
          </button>
          <a
            href="/"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Back
          </a>
        </div>
      </div>
    </div>
  );
}


