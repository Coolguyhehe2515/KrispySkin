import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

const DEFAULT_AVATAR =
  "https://i.postimg.cc/JhwdnS9p/651c6da502353948bdc929f02da2b8e0.jpg";

async function getAuthenticatedUser(request) {
  const sessionToken =
    request.cookies.get(
      "krispy_skin_session"
    )?.value;

  if (!sessionToken) {
    return null;
  }

  const client = await clientPromise;
  const db = client.db("krispsyskin");

  const session =
    await db.collection("sessions").findOne({
      token: sessionToken
    });

  if (
    !session ||
    new Date(session.expiresAt) <= new Date()
  ) {
    return null;
  }

  const user =
    await db.collection("users").findOne({
      id: session.userId
    });

  return user || null;
}

export async function GET(request) {
  try {
    const client = await clientPromise;
    const db = client.db("krispy_skin");

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
        profilePicture:
          user.profilePicture ||
          DEFAULT_AVATAR
      }
    });
  } catch (error) {
    console.error(
      "Account profile GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load profile"
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const client = await clientPromise;
    const db = client.db("krispy_skin");

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

    const body = await request.json();

    const profilePicture =
      String(
        body.profilePicture || ""
      ).trim();

    if (profilePicture) {
      try {
        const url = new URL(
          profilePicture
        );

        if (
          url.protocol !== "http:" &&
          url.protocol !== "https:"
        ) {
          throw new Error();
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
    }

    const finalPicture =
      profilePicture ||
      DEFAULT_AVATAR;

    await db.collection("users").updateOne(
      {
        id: session.userId
      },
      {
        $set: {
          profilePicture:
            finalPicture,
          profilePictureUpdatedAt:
            new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      user: {
        profilePicture:
          finalPicture
      }
    });
  } catch (error) {
    console.error(
      "Account profile POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save profile"
      },
      { status: 500 }
    );
  }
}
