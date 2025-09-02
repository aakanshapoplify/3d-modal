import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const urn = searchParams.get("urn");

  if (!urn) {
    return NextResponse.json({ error: "URN parameter is required" }, { status: 400 });
  }

  try {
    // Get access token
    const tokenRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/forge-token`);
    if (!tokenRes.ok) {
      return NextResponse.json({ error: "Failed to get access token" }, { status: 500 });
    }
    const tokenData:any = await tokenRes.json();

    console.log("Starting conversion for URN:", urn);

    // Start the translation job
    const res = await fetch(`https://developer.api.autodesk.com/modelderivative/v2/designdata/job`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
        "x-ads-force": "true" // Force translation even if already translated
      },
      body: JSON.stringify({
        input: { urn },
        output: {
          formats: [
            { 
              type: "svf", 
              views: ["2d", "3d"],
              advanced: {
                generateMasterViews: true
              }
            }
          ],
        },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Forge convert API error:", res.status, errorText);
      return NextResponse.json({ 
        error: `Translation failed: ${res.status} ${res.statusText}`,
        details: errorText
      }, { status: res.status });
    }

    const data = await res.json();
    console.log("Convert API response:", data);

    return NextResponse.json({
      success: true,
      result: data,
      urn: urn,
      message: "Translation job started successfully"
    });

  } catch (error: any) {
    console.error("Convert API error:", error);
    return NextResponse.json({ 
      error: "Failed to start translation",
      details: error.message 
    }, { status: 500 });
  }
}