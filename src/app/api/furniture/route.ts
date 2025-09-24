import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const modelsDir = path.join(process.cwd(), "public", "models");
    
    // Check if models directory exists
    if (!fs.existsSync(modelsDir)) {
      return NextResponse.json({ furniture: [] });
    }

    // Read all files in the models directory
    const files = fs.readdirSync(modelsDir);
    
    // Filter for GLB files and extract names
    const furniture = files
      .filter(file => file.toLowerCase().endsWith('.glb'))
      .map(file => {
        const name = path.parse(file).name;
        return {
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name: name,
          filename: file,
          path: `/models/${encodeURIComponent(file)}`
        };
      });

    return NextResponse.json({ furniture });
  } catch (error) {
    console.error("Error reading furniture models:", error);
    return NextResponse.json({ error: "Failed to read furniture models" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.glb')) {
      return NextResponse.json({ error: "Only GLB files are allowed" }, { status: 400 });
    }

    // Create models directory if it doesn't exist
    const modelsDir = path.join(process.cwd(), "public", "models");
    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
    }

    // Save the file
    const filePath = path.join(modelsDir, file.name);
    const buffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));

    return NextResponse.json({ 
      success: true, 
      message: "Furniture model uploaded successfully",
      furniture: {
        id: path.parse(file.name).name.toLowerCase().replace(/\s+/g, '-'),
        name: path.parse(file.name).name,
        filename: file.name,
        path: `/models/${encodeURIComponent(file.name)}`
      }
    });
  } catch (error) {
    console.error("Error uploading furniture model:", error);
    return NextResponse.json({ error: "Failed to upload furniture model" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("filename");
    const filename = raw ? decodeURIComponent(raw) : null;
    
    if (!filename) {
      return NextResponse.json({ error: "Filename required" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "public", "models", filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return NextResponse.json({ success: true, message: "Furniture model deleted successfully" });
    } else {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error deleting furniture model:", error);
    return NextResponse.json({ error: "Failed to delete furniture model" }, { status: 500 });
  }
}
