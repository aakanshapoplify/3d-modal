import { NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function saveFileToTemp(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(new Uint8Array(arrayBuffer));
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "obj-upload-"));
  const tempPath = path.join(tempDir, file.name || "model.obj");
  fs.writeFileSync(tempPath, buffer);
  return tempPath;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Use multipart/form-data with field 'file'" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded (field name should be 'file')" }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".obj")) {
      return NextResponse.json({ error: "Only .obj files are supported in this route" }, { status: 400 });
    }

    const objPath = await saveFileToTemp(file);

    // Use CLI to avoid bundling Cesium in Next.js
    const outPath = path.join(path.dirname(objPath), (file.name.replace(/\.[^/.]+$/, "") || "model") + ".glb");
    const binPath = path.join(
      process.cwd(),
      "node_modules",
      ".bin",
      process.platform === "win32" ? "obj2gltf.cmd" : "obj2gltf"
    );

    await new Promise<void>((resolve, reject) => {
      execFile(binPath, ["-i", objPath, "-o", outPath, "--binary"], (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`obj2gltf failed: ${error.message}\n${stderr || ""}`));
          return;
        }
        resolve();
      });
    });

    const glbBuffer = fs.readFileSync(outPath);
    try { fs.rmSync(path.dirname(objPath), { recursive: true, force: true }); } catch {}

    const outName = path.basename(outPath);
    return new Response(glbBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "model/gltf-binary",
        "Content-Disposition": `attachment; filename="${outName}"`,
        "Content-Length": String((glbBuffer as any).length || 0),
      },
    });
  } catch (err: any) {
    console.error("OBJ→GLB error:", err);
    return NextResponse.json({ error: "Conversion failed", details: err?.message || String(err) }, { status: 500 });
  }
}


