import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

const DEFAULT_PROFILE_PICTURE =
  "https://i.postimg.cc/JhwdnS9p/651c6da502353948bdc929f02da2b8e0.jpg";

async function getAuthenticatedUser(request) {
  const sessionToken =
    request.cookies.get("krispy_skin_session")?.value;

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

  const session = await db
    .collection("sessions")
    .findOne({
      token: sessionToken
    });

  if (!session) {
    return {
      error: NextResponse.json(
        {
          success: false,
          error: "Invalid session"
        },
        { status: 401 }
      )
    };
  }

  if (
    session.expiresAt &&
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

  const user = await db
    .collection("users")
    .findOne({
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

function formatUser(user) {
  return {
    id: user.id,
    username: user.username || "",
    email: user.email || "",
    emailVerified:
      user.emailVerified === true,
    profilePicture:
      user.profilePicture ||
      DEFAULT_PROFILE_PICTURE
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
      user: formatUser(result.user)
    });
  } catch (error) {
    console.error(
      "Profile fetch error:",
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
    const result =
      await getAuthenticatedUser(request);

    if (result.error) {
      return result.error;
    }

    const body = await request.json();

    const profilePicture = String(
      body.profilePicture || ""
    ).trim();

    if (!profilePicture) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Profile picture URL is required"
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

    let parsedUrl;

    try {
      parsedUrl = new URL(profilePicture);
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

    if (parsedUrl.protocol !== "https:") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Profile picture must use HTTPS"
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
            profilePicture,
            profilePictureUpdatedAt:
              new Date()
          }
        }
      );

    const updatedUser = {
      ...result.user,
      profilePicture
    };

    return NextResponse.json({
      success: true,
      user: formatUser(updatedUser)
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
