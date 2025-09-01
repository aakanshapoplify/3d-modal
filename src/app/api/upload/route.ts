    import { NextRequest, NextResponse } from "next/server";

    export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const bucketKey = process.env.FORGE_BUCKET_KEY!;
        const fileName = file.name;

        // 1️⃣ Get OAuth token
        const tokenRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/forge-token`);
        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) throw new Error(tokenData.error || "Failed to fetch token");
        const accessToken = tokenData.access_token;

        // 2️⃣ Request signed S3 upload URLs from Autodesk APS
        const signedUrlRes = await fetch(
        `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(fileName)}/signeds3upload`,
        {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}` },
        }
        );

        const signedData = await signedUrlRes.json();
        if (!signedUrlRes.ok || !signedData.urls || signedData.urls.length === 0) {
        console.error("Signed URL error:", signedData);
        throw new Error("Failed to get signed upload URL");
        }

        const uploadUrl = signedData.urls[0]; // ✅ First presigned URL
        console.log("Signed URL:", uploadUrl);

        // 3️⃣ Upload the file directly to S3 using the signed URL
        const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: file,
        });

        if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.error("S3 Upload Failed:", errorText);
        throw new Error("S3 upload failed");
        }

        // 4️⃣ Finalize the upload with APS using uploadKey
        const finalizeRes = await fetch(
        `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${encodeURIComponent(fileName)}/signeds3upload`,
        {
            method: "POST",
            headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            },
            body: JSON.stringify({ uploadKey: signedData.uploadKey }),
        }
        );

        const finalizeData = await finalizeRes.json();
        if (!finalizeRes.ok || !finalizeData.objectId) {
        console.error("Finalize Error:", finalizeData);
        throw new Error("Failed to finalize upload");
        }

        console.log("Finalize Data:", finalizeData);

        // 5️⃣ Return URN for model conversion
        const urn = Buffer.from(finalizeData.objectId).toString("base64");
        return NextResponse.json({ urn });

    } catch (error: any) {
        console.error("Forge upload error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    }
