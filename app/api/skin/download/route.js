import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const skinId =
      request.nextUrl.searchParams.get("id");

    if (!skinId) {
      return NextResponse.json(
        {
          success: false,
          error: "Skin ID is required"
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("krispyskin");

    const skin = await db.collection("skins").findOne({
      id: skinId
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

    // A skin is downloadable publicly only if
    // it has at least one community post.
    const post = await db.collection("posts").findOne({
      skinId: skinId
    });

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: "This skin is not public"
        },
        { status: 403 }
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
        "Content-Length":
          String(buffer.length),
        "Content-Disposition":
          `attachment; filename="${skin.filename || "skin.png"}"`,
        "Cache-Control":
          "public, max-age=3600"
      }
    });
  } catch (error) {
    console.error(
      "KrispySkin download error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to download skin"
      },
      { status: 500 }
    );
  }
}
