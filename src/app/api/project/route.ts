import { NextRequest, NextResponse } from "next/server";

let projects: any[] = []; // In-memory store for PoC

export async function POST(req: NextRequest) {
  const body = await req.json();
  const project = { id: Date.now(), ...body };
  projects.push(project);
  return NextResponse.json(project);
}

export async function GET() {
  return NextResponse.json(projects);
}
