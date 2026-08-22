import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const sessionToken =
      request.cookies.get("krispyskin_session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated"
        },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db("krispyskin");

    const session = await db.collection("sessions").findOne({
      token: sessionToken
    });

    if (
      !session ||
      new Date(session.expiresAt) <= new Date()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Session expired"
        },
        { status: 401 }
      );
    }

    const user = await db.collection("users").findOne({
      id: session.userId
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User account not found"
        },
        { status: 404 }
      );
    }

    const skins = await db
      .collection("skins")
      .find({
        userId: user.id
      })
      .sort({
        createdAt: -1
      })
      .project({
        _id: 0,
        id: 1,
        filename: 1,
        contentType: 1,
        size: 1,
        model: 1,
        createdAt: 1
      })
      .toArray();

    return NextResponse.json({
      success: true,
      skins,
      activeSkin: user.skinId || null
    });
  } catch (error) {
    console.error(
      "KrispySkin library error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load skin library"
      },
      { status: 500 }
    );
  }
}
