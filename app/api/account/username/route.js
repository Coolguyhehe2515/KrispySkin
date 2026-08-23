import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    // Get the authenticated session.
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
        {
          status: 401
        }
      );
    }

    // Read the requested username.
    const body =
      await request.json();

    const username =
      String(
        body.username || ""
      ).trim();

    if (!username) {
      return NextResponse.json(
        {
          success: false,
          error: "Username is required"
        },
        {
          status: 400
        }
      );
    }

    // Validate username length.
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
        {
          status: 400
        }
      );
    }

    // Only allow letters, numbers,
    // and underscores.
    if (
      !/^[a-zA-Z0-9_]+$/.test(
        username
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Username can only contain letters, numbers, and underscores"
        },
        {
          status: 400
        }
      );
    }

    const client =
      await clientPromise;

    const db =
      client.db(
        "krispyskin"
      );

    const sessions =
      db.collection(
        "sessions"
      );

    const users =
      db.collection(
        "users"
      );

    // Validate the current session.
    const session =
      await sessions.findOne({
        token:
          sessionToken
      });

    if (
      !session ||
      new Date(
        session.expiresAt
      ) <= new Date()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Session expired"
        },
        {
          status: 401
        }
      );
    }

    // Make username uniqueness
    // case-insensitive.
    const usernameLower =
      username.toLowerCase();

    const existing =
      await users.findOne({
        usernameLower,
        id: {
          $ne:
            session.userId
        }
      });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Username is already taken"
        },
        {
          status: 409
        }
      );
    }

    // Update the authenticated user.
    const result =
      await users.updateOne(
        {
          id:
            session.userId
        },
        {
          $set: {
            username,
            usernameLower,
            usernameChangedAt:
              new Date()
          }
        }
      );

    if (
      result.matchedCount === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "User account not found"
        },
        {
          status: 404
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Username changed successfully",
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
        error:
          "Failed to change username"
      },
      {
        status: 500
      }
    );
  }
}
