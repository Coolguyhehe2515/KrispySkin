import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

const ALLOWED_THEMES = [
  "system",
  "light",
  "dark"
];

async function getAuthenticatedUser(request) {
  const sessionToken =
    request.cookies.get("krispy_skin")?.value;

  if (!sessionToken) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "You must be logged in"
        },
        { status: 401 }
      )
    };
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
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "Session expired"
        },
        { status: 401 }
      )
    };
  }

  const user =
    await db.collection("users").findOne({
      id: session.userId
    });

  if (!user) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "User not found"
        },
        { status: 404 }
      )
    };
  }

  return {
    db,
    user
  };
}

export async function GET(request) {
  try {
    const result =
      await getAuthenticatedUser(request);

    if (result.error) {
      return result.error;
    }

    return NextResponse.json({
      success: true,
      theme: result.user.theme || "system"
    });
  } catch (error) {
    console.error(
      "Theme fetch error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load theme"
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const result =
      await getAuthenticatedUser(request);

    if (result.error) {
      return result.error;
    }

    const body = await request.json();

    const theme =
      String(body.theme || "")
        .trim()
        .toLowerCase();

    if (!ALLOWED_THEMES.includes(theme)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid theme"
        },
        { status: 400 }
      );
    }

    await result.db
      .collection("users")
      .updateOne(
        {
          id: result.user.id
        },
        {
          $set: {
            theme,
            themeUpdatedAt: new Date()
          }
        }
      );

    return NextResponse.json({
      success: true,
      theme
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
