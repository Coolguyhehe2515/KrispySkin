import { NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

function hashPassword(password, salt) {
  return crypto
    .scryptSync(password, salt, 64)
    .toString("hex");
}

function safeEqual(a, b) {
  const bufferA = Buffer.from(a, "hex");
  const bufferB = Buffer.from(b, "hex");

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    bufferA,
    bufferB
  );
}

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

    const currentPassword =
      String(body.currentPassword || "");

    const newPassword =
      String(body.newPassword || "");

    const confirmPassword =
      String(body.confirmPassword || "");

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "All password fields are required"
        },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error:
            "New passwords do not match"
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password must be at least 8 characters"
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

    if (
      !user.passwordSalt ||
      !user.passwordHash
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password authentication is not available for this account"
        },
        { status: 400 }
      );
    }

    const currentHash =
      hashPassword(
        currentPassword,
        user.passwordSalt
      );

    if (
      !safeEqual(
        currentHash,
        user.passwordHash
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Current password is incorrect"
        },
        { status: 401 }
      );
    }

    const newSalt =
      crypto.randomBytes(16).toString("hex");

    const newHash =
      hashPassword(
        newPassword,
        newSalt
      );

    await db.collection("users").updateOne(
      {
        id: user.id
      },
      {
        $set: {
          passwordSalt: newSalt,
          passwordHash: newHash,
          passwordChangedAt: new Date()
        }
      }
    );

    await db.collection("sessions").deleteMany({
      userId: user.id
    });

    const response = NextResponse.json({
      success: true,
      message:
        "Password changed successfully. Please log in again."
    });

    response.cookies.delete(
      "krispy_skin_session"
    );

    return response;
  } catch (error) {
    console.error(
      "Change password error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to change password"
      },
      { status: 500 }
    );
  }
}
