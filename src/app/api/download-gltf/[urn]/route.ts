// pages/api/download-gltf/[urn]/route.ts
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import {
  convertSvfToGltf,
  ensureConvertedDir,
  detectDefaultGuid,
  getOutputFilePath,
  listCandidateGuids,
} from "@/utils/svfConvert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ urn: string }> | { urn: string } }
) {
  try {
    const resolved = ctx.params instanceof Promise ? await ctx.params : ctx.params;
    const urn = decodeURIComponent(resolved.urn);
    const { searchParams } = new URL(req.url);

    const format: "gltf" | "glb" = (searchParams.get("format") as "gltf" | "glb") || "glb";
    const deduplicate = searchParams.get("deduplicate") === "true";
    const ignoreMeshes = searchParams.get("ignoreMeshes")?.split(",").filter(Boolean);

    const outDir = await ensureConvertedDir();

    // Get GUID
    let guid = searchParams.get("guid") || (await detectDefaultGuid(urn)) || undefined;

    if (!guid) {
      const candidates = await listCandidateGuids(urn);
      return new Response(
        JSON.stringify({ error: "GUID not found. Provide ?guid=", candidates }),
        { status: 400 }
      );
    }

    const outPath = getOutputFilePath(outDir, urn, guid, format);

    // Convert if not exists
    if (!fs.existsSync(outPath)) {
      let converted = false;
      const candidates = await listCandidateGuids(urn);

      // Try preferred GUID first
      const tryList = [guid, ...candidates.map((c) => c.guid).filter((g) => g !== guid)];

      for (const g of tryList) {
        const candidate = candidates.find((c) => c.guid === g);
        const readerType = candidate?.type === "svf2" ? "svf2" : candidate?.type === "svf" ? "svf" : undefined;
        const pathForCandidate = getOutputFilePath(outDir, urn, g, format);

        try {
          await convertSvfToGltf(urn, g, pathForCandidate, {
            readerType,
            writerOptions: { deduplicate, ignoreMeshes, binary: format === "glb" },
          });
          guid = g;
          converted = true;
          break;
        } catch (e) {
          console.warn(`[download-gltf] Conversion failed for GUID ${g}:`, (e as any).message);
        }
      }

      if (!converted) throw new Error("All conversion attempts failed");
    }

    // Stream output
    const finalPath = getOutputFilePath(outDir, urn, guid, format);
    const stat = fs.statSync(finalPath);
    const stream = fs.createReadStream(finalPath);
    const filename = path.basename(finalPath);

    return new Response(stream as any, {
      status: 200,
      headers: {
        "Content-Type": format === "glb" ? "model/gltf-binary" : "model/gltf+json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(stat.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: any) {
    console.error("[download-gltf] error:", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500 });
  }
}
