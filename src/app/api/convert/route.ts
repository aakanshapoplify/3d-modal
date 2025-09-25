import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getApsToken(): Promise<string> {
  // Prefer internal token route to keep secret handling consistent
  const base = process.env.NEXT_PUBLIC_BASE_URL || "";
  const url = base ? `${base}/api/forge-token` : "/api/forge-token";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to get APS token: ${res.status} ${res.statusText} - ${txt}`);
  }
  const data: any = await res.json();
  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const urn = searchParams.get("urn");
    const requestedType = (searchParams.get("type") as "svf2" | "svf" | null) || null;
    const allowFallback = (searchParams.get("fallback") || "true").toLowerCase() !== "false";
    if (!urn) {
      return NextResponse.json({ error: "Missing required query param 'urn'" }, { status: 400 });
    }

    const accessToken = await getApsToken();

    async function submit(type: "svf2" | "svf") {
      const job = {
        input: { urn },
        output: { formats: [{ type, views: ["2d", "3d"] }] },
      } as any;
      const r = await fetch("https://developer.api.autodesk.com/modelderivative/v2/designdata/job", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(job),
      });
      const d = await r.json().catch(() => null);
      return { r, d } as const;
    }

    const firstType: "svf2" | "svf" = requestedType || "svf2";
    let { r, d } = await submit(firstType);
    if (!r.ok && allowFallback) {
      const secondType: "svf2" | "svf" = firstType === "svf2" ? "svf" : "svf2";
      const fb = await submit(secondType);
      if (fb.r.ok) {
        return NextResponse.json({ success: true, job: fb.d || {}, chosenType: secondType, fallback: true });
      }
      return NextResponse.json({ error: "Job submission failed", details: fb.d || (await fb.r.text()), tried: [firstType, secondType] }, { status: fb.r.status });
    }
    if (!r.ok) {
      return NextResponse.json({ error: "Job submission failed", details: d || (await r.text()), tried: [firstType] }, { status: r.status });
    }
    return NextResponse.json({ success: true, job: d || {}, chosenType: firstType, fallback: false });
  } catch (err: any) {
    console.error("/api/convert error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}


