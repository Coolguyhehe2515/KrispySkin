import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "../../../../lib/mongodb";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("krispy_session");

    if (!session) {
      return NextResponse.json(
        {
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const skinId = body.skinId;

    if (!skinId) {
      return NextResponse.json(
        {
          error: "skinId is required",
        },
        { status: 400 }
      );
    }

    const db = await getDb();

    const user = await db.collection("users").findOne({
      sessionToken: session.value,
    });

    if (!user) {
      return NextResponse.json(
        {
          error: "Invalid session",
        },
        { status: 401 }
      );
    }

    const skins = user.skins || [];

    if (!skins.includes(skinId)) {
      return NextResponse.json(
        {
          error: "Skin does not belong to this account",
        },
        { status: 403 }
      );
    }

    await db.collection("users").updateOne(
      {
        _id: user._id,
      },
      {
        $set: {
          skinId,
        },
      }
    );

    return NextResponse.json({
      success: true,
      activeSkin: skinId,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to load skin",
      },
      { status: 500 }
    );
  }
}
