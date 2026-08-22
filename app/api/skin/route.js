import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No PNG file provided"
        },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file"
        },
        { status: 400 }
      );
    }

    if (file.type !== "image/png") {
      return NextResponse.json(
        {
          success: false,
          error: "Only PNG files are allowed"
        },
        { status: 400 }
      );
    }

    // Minecraft Java skins are normally 64x64.
    // This endpoint only checks the file type for now.
    // Image dimension validation will be added later.

    const randomId = crypto.randomBytes(8).toString("hex");
    const skinId = `ks_${randomId}`;

    return NextResponse.json(
      {
        success: true,
        service: "KrispySkin",
        version: "0.1.0",
        skin: {
          id: skinId,
          filename: file.name,
          type: file.type,
          size: file.size
        },
        message: "Skin received successfully"
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("KrispySkin upload error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process skin"
      },
      { status: 500 }
    );
  }
}
