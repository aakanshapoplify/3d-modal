import { NextResponse } from "next/server";
import axios from "axios";

export async function GET() {
  try {
    // Prepare request body for APS v2 token API
    const params = new URLSearchParams({
      client_id: process.env.FORGE_CLIENT_ID!,
      client_secret: process.env.FORGE_CLIENT_SECRET!,
      grant_type: "client_credentials",
      scope: "data:read data:write data:create bucket:create bucket:read viewables:read"
    });

    // Send POST request to APS v2 endpoint
    const res = await axios.post(
      "https://developer.api.autodesk.com/authentication/v2/token",
      params.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    return NextResponse.json({
      access_token: res.data.access_token,
      token_type: res.data.token_type,
      expires_in: res.data.expires_in
    });
  } catch (err: any) {
    console.error("Forge Token Error:", err.response?.data || err.message);
    return NextResponse.json(
      {
        error: "Failed to fetch APS token",
        details: err.response?.data || err.message,
      },
      { status: 500 }
    );
  }
}
