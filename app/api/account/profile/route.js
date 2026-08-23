import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

const DEFAULT_PROFILE_PICTURE =
  "https://i.postimg.cc/JhwdnS9p/651c6da502353948bdc929f02da2b8e0.jpg";

export async function GET(request) {
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

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email || null,
        emailVerified:
          user.emailVerified === true,
        theme: user.theme || "system",
        profilePicture:
          user.profilePicture ||
          DEFAULT_PROFILE_PICTURE
      }
    });
  } catch (error) {
    console.error(
      "Get account profile error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load account profile"
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
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

    const updates = {};

    if (body.theme !== undefined) {
      const theme =
        String(body.theme).toLowerCase();

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
            error: "Invalid theme"
          },
          { status: 400 }
        );
      }

      updates.theme = theme;
    }

    if (
      body.profilePicture !== undefined
    ) {
      const profilePicture =
        String(
          body.profilePicture || ""
        ).trim();

      if (profilePicture.length > 2048) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Profile picture URL is too long"
          },
          { status: 400 }
        );
      }

      if (profilePicture) {
        try {
          const url =
            new URL(profilePicture);

          if (
            url.protocol !== "https:"
          ) {
            return NextResponse.json(
              {
                success: false,
                error:
                  "Profile picture must use HTTPS"
              },
              { status: 400 }
            );
          }
        } catch {
          return NextResponse.json(
            {
              success: false,
              error:
                "Invalid profile picture URL"
            },
            { status: 400 }
          );
        }

        updates.profilePicture =
          profilePicture;
      } else {
        updates.profilePicture =
          DEFAULT_PROFILE_PICTURE;
      }
    }

    if (
      Object.keys(updates).length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "No changes provided"
        },
        { status: 400 }
      );
    }

    updates.updatedAt = new Date();

    await db.collection("users").updateOne(
      {
        id: user.id
      },
      {
        $set: updates
      }
    );

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        theme:
          updates.theme ||
          user.theme ||
          "system",
        profilePicture:
          updates.profilePicture ||
          user.profilePicture ||
          DEFAULT_PROFILE_PICTURE
      }
    });
  } catch (error) {
    console.error(
      "Update account profile error:",
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
