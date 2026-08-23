import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const sessionToken =
      request.cookies.get("krispy_skin_session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated"
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const skinId = body?.skinId;

    if (!skinId) {
      return NextResponse.json(
        {
          success: false,
          error: "skinId is required"
        },
        { status: 400 }
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

    // Make sure this skin belongs to this user.
    const skin = await db.collection("skins").findOne({
      id: skinId,
      userId: user.id
    });

    if (!skin) {
      return NextResponse.json(
        {
          success: false,
          error: "Skin not found in your library"
        },
        { status: 404 }
      );
    }

    await db.collection("users").updateOne(
      {
        id: user.id
      },
      {
        $set: {
          skinId: skinId,
          updatedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      activeSkin: skinId,
      message: "Skin loaded successfully"
    });
  } catch (error) {
    console.error(
      "KrispySkin load skin error:",
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
