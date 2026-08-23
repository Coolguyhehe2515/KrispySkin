import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const token =
      request.cookies.get("krispy_skin_session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "You must be logged in"
        },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db("krispyskin");

    const session =
      await db.collection("sessions").findOne({
        token: token
      });

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "Session not found"
        },
        { status: 401 }
      );
    }

    if (
      !session.expiresAt ||
      new Date(session.expiresAt) <= new Date()
    ) {
      await db.collection("sessions").deleteOne({
        token: token
      });

      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "Session expired"
        },
        { status: 401 }
      );
    }

    if (!session.userId) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "Invalid session"
        },
        { status: 401 }
      );
    }

    const user =
      await db.collection("users").findOne({
        id: session.userId
      });

    if (!user) {
      await db.collection("sessions").deleteOne({
        token: token
      });

      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "User not found"
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        username: user.username || "",
        email: user.email || "",
        skinId: user.skinId || null,
        banned: user.banned === true
      }
    });
  } catch (error) {
    console.error(
      "KrispySkin session error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        error: "Failed to check session"
      },
      { status: 500 }
    );
  }
}
