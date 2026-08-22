import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

export async function GET(
  request,
  { params }
) {
  try {
    const { id } = await params;

    const client = await clientPromise;
    const db = client.db("krispyskin");

    const skin =
      await db.collection("skins").findOne({
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

    const buffer = Buffer.from(
      skin.data,
      "base64"
    );

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control":
          "public, max-age=3600"
      }
    });
  } catch (error) {
    console.error(
      "KrispySkin skin preview error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load skin"
      },
      { status: 500 }
    );
  }
}
