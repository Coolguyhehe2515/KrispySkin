import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const token = request.cookies.get("krispyskin_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false
        },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db("krispyskin");

    const session = await db.collection("sessions").findOne({
      token
    });

    if (!session || new Date(session.expiresAt) <= new Date()) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false
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
          authenticated: false
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        skinId: user.skinId || null
      }
    });
  } catch (error) {
    console.error("KrispySkin session error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to check session"
      },
      { status: 500 }
    );
  }
}
