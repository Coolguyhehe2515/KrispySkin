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

    const theme =
      String(body.theme || "")
        .trim()
        .toLowerCase();

    const allowedThemes = [
      "system",
      "light",
      "dark"
    ];

    if (
      !allowedThemes.includes(theme)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Theme must be system, light, or dark"
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

    const result =
      await db.collection("users").updateOne(
        {
          id: session.userId
        },
        {
          $set: {
            theme,
            updatedAt: new Date()
          }
        }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found"
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      theme,
      message: "Theme updated successfully"
    });
  } catch (error) {
    console.error(
      "Theme update error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update theme"
      },
      { status: 500 }
    );
  }
  }
