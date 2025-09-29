import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const type = formData.get("type") as string;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "uploads", "panoramic");
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    const uploadedFiles = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate unique filename
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const extension = file.name.split('.').pop();
      const filename = `${type}_${timestamp}_${randomSuffix}.${extension}`;
      
      const filepath = join(uploadsDir, filename);
      
      await writeFile(filepath, buffer);
      
      uploadedFiles.push({
        originalName: file.name,
        filename: filename,
        size: file.size,
        type: file.type,
        path: `/uploads/panoramic/${filename}`
      });
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      message: `${files.length} file(s) uploaded successfully`
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}
