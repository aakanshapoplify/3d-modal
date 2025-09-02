import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const urn = searchParams.get("urn");

  if (!urn) {
    return NextResponse.json({ status: "error", message: "URN is required" }, { status: 400 });
  }

  try {
    // 1️⃣ Get access token
    const tokenRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/forge-token`);
    if (!tokenRes.ok) {
      return NextResponse.json({ status: "error", message: "Failed to fetch access token" }, { status: 500 });
    }
    const tokenData:any = await tokenRes.json();

    // 2️⃣ Fetch manifest from Forge
    const res = await fetch(
      `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/manifest`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    // 3️⃣ Handle HTTP errors
    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({
          status: "pending",
          message: "Manifest not found - translation may still be starting",
        });
      }
      return NextResponse.json({
        status: "error",
        message: `Forge API error: ${res.status} ${res.statusText}`,
      }, { status: res.status });
    }

    // 4️⃣ Handle empty response
    const text = await res.text();
    if (!text || text.trim() === "") {
      return NextResponse.json({
        status: "pending",
        message: "Manifest not yet available, translation still starting",
      });
    }

    // 5️⃣ Parse JSON safely
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("Manifest JSON parse failed:", text);
      return NextResponse.json({ status: "error", message: "Invalid JSON from Forge" }, { status: 500 });
    }

    console.log("Raw manifest data:", data);

    // 6️⃣ Handle success
    if (data.status === "success") {
      // Check if we have viewable derivatives
      const hasViewables = data.derivatives && data.derivatives.some((derivative: any) => 
        derivative.children && derivative.children.some((child: any) => 
          child.role === "viewable" || child.role === "3d" || child.role === "2d"
        )
      );

      return NextResponse.json({
        status: "success",
        derivatives: data.derivatives,
        progress: "100%",
        hasViewables,
        message: "Translation completed successfully"
      });
    }

    // 7️⃣ Handle failed status
    if (data.status === "failed") {
      const failureReason = data.progress || data.reason || "Unknown failure reason";
      return NextResponse.json({
        status: "failed",
        message: `Model translation failed: ${failureReason}`,
        reason: failureReason
      });
    }

    // 8️⃣ Handle in-progress with detailed progress
    if (data.progress) {
      const progressDetails = data.progress;
      let progressMessage = "Translation in progress";
      
      if (typeof progressDetails === "string") {
        progressMessage = progressDetails;
      } else if (typeof progressDetails === "object") {
        // Handle complex progress objects
        if (progressDetails.phase) {
          progressMessage = `Phase: ${progressDetails.phase}`;
        }
        if (progressDetails.progress) {
          progressMessage += ` - ${progressDetails.progress}`;
        }
      }

      return NextResponse.json({
        status: "pending",
        progress: progressDetails,
        message: progressMessage,
        phase: typeof progressDetails === "object" ? progressDetails.phase : undefined
      });
    }

    // 9️⃣ Handle other statuses
    if (data.status === "pending" || data.status === "inprogress") {
      return NextResponse.json({
        status: "pending",
        message: "Translation is in progress",
        phase: "processing"
      });
    }

    // 🔟 Default response if status unknown
    return NextResponse.json({
      status: "pending",
      message: "Translation is still processing",
      rawStatus: data.status
    });

  } catch (err: any) {
    console.error("Manifest fetch error:", err);
    return NextResponse.json({ 
      status: "error", 
      message: "Failed to fetch manifest",
      error: err.message 
    }, { status: 500 });
  }
}