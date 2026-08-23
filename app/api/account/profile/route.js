import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

const DEFAULT_PROFILE_PICTURE =
  "https://i.postimg.cc/JhwdnS9p/651c6da502353948bdc929f02da2b8e0.jpg";

const VALID_THEMES = [
  "system",
  "light",
  "dark"
];

export async function POST(request) {
  try {
    const sessionToken =
      request.cookies.get(
        "krispy_skin_session"
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

    let profilePicture =
      String(
        body.profilePicture || ""
      ).trim();

    const theme =
      String(
        body.theme || "system"
      ).toLowerCase();

    if (!VALID_THEMES.includes(theme)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid theme"
        },
        { status: 400 }
      );
    }

    if (profilePicture) {
      try {
        const url =
          new URL(profilePicture);

        if (
          url.protocol !== "http:" &&
          url.protocol !== "https:"
        ) {
          throw new Error("Invalid protocol");
        }
      } catch {
        return NextResponse.json(
          {
            success: false,
            error:
              "Profile picture must be a valid image URL"
          },
          { status: 400 }
        );
      }

      if (profilePicture.length > 2000) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Profile picture URL is too long"
          },
          { status: 400 }
        );
      }
    } else {
      profilePicture = "";
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

    const user =
      await db.collection("users").findOne({
        id: session.userId
      });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found"
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
          profilePicture,
          theme,
          profileUpdatedAt: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      profilePicture:
        profilePicture ||
        DEFAULT_PROFILE_PICTURE,
      theme
    });
  } catch (error) {
    console.error(
      "Profile update error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update profile"
      },
      { status: 500 }
    );
  }
}
