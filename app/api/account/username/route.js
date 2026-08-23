import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const sessionToken =
      request.cookies.get(
        "krispyskin_session"
      )?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in"
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const username =
      String(body.username || "").trim();

    if (!username) {
      return NextResponse.json(
        {
          success: false,
          error: "Username is required"
        },
        { status: 400 }
      );
    }

    if (
      username.length < 3 ||
      username.length > 24
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Username must be 3-24 characters"
        },
        { status: 400 }
      );
    }

    if (
      !/^[a-zA-Z0-9_]+$/.test(username)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Username can only contain letters, numbers, and underscores"
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("krispyskin");

    const session =
      await db.collection("sessions").findOne({
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

    const usernameLower =
      username.toLowerCase();

    const existing =
      await db.collection("users").findOne({
        usernameLower,
        id: {
          $ne: session.userId
        }
      });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Username is already taken"
        },
        { status: 409 }
      );
    }

    await db.collection("users").updateOne(
      {
        id: session.userId
      },
      {
        $set: {
          username,
          usernameLower,
          usernameChangedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      message: "Username changed successfully",
      username
    });
  } catch (error) {
    console.error(
      "Change username error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to change username"
      },
      { status: 500 }
    );
  }
}
