import { NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "../../../lib/mongodb";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

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

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "File is too large. Maximum size is 2 MB."
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify PNG signature.
    const pngSignature = Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a
    ]);

    if (!buffer.subarray(0, 8).equals(pngSignature)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid PNG file"
        },
        { status: 400 }
      );
    }

    const skinId = `ks_${crypto.randomBytes(8).toString("hex")}`;

    const client = await clientPromise;
    const db = client.db("krispyskin");
    const skins = db.collection("skins");

    await skins.insertOne({
      id: skinId,
      filename: file.name,
      contentType: "image/png",
      size: file.size,
      data: buffer.toString("base64"),
      model: "classic",
      createdAt: new Date()
    });

    return NextResponse.json(
      {
        success: true,
        service: "KrispySkin",
        version: "0.1.0",
        skin: {
          id: skinId,
          filename: file.name,
          type: "image/png",
          size: file.size,
          model: "classic"
        },
        message: "Skin uploaded and stored successfully"
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("KrispySkin skin upload error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to store skin"
      },
      { status: 500 }
    );
  }
}
