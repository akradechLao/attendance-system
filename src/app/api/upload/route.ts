import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("photo") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Missing photo" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const compressed = await sharp(buffer)
      .resize(320, 240, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 50 })
      .toBuffer();

    const base64 = compressed.toString("base64");
    const imageUrl = `data:image/jpeg;base64,${base64}`;

    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
