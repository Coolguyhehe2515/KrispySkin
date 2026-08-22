import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const client = await clientPromise;
    const db = client.db("krispyskin");
    const skins = db.collection("skins");

    const skin = await skins.findOne({
      id
    });

    if (!skin) {
      return NextResponse.json(
        {
          success: false,
          error: "Skin not found"
        },
        { status: 404 }
      );
    }

    const imageBuffer = Buffer.from(skin.data, "base64");

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch (error) {
    console.error("KrispySkin skin fetch error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve skin"
      },
      { status: 500 }
    );
  }
}
