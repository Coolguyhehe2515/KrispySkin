import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "../../../../lib/mongodb";

export async function GET() {
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

    return NextResponse.json({
      success: true,
      skins,
      activeSkin: user.skinId || null,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to load skin library",
      },
      { status: 500 }
    );
  }
}
