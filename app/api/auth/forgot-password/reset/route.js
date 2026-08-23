import { NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "../../../../../lib/mongodb";

export const runtime = "nodejs";

function hashPassword(password, salt) {
  return crypto
    .scryptSync(password, salt, 64)
    .toString("hex");
}

function hashCode(code) {
  return crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");
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
    const body = await request.json();

    const email =
      String(body.email || "")
        .trim()
        .toLowerCase();

    const code =
      String(body.code || "").trim();

    const newPassword =
      String(body.newPassword || "");

    const confirmPassword =
      String(body.confirmPassword || "");

    if (!email || !code) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Email and verification code are required"
        },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Verification code must be 6 digits"
        },
        { status: 400 }
      );
    }

    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error:
            "New password and confirmation are required"
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

    const reset =
      await db
        .collection("password_resets")
        .findOne({
          email
        });

    if (!reset) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid or expired reset request"
        },
        { status: 400 }
      );
    }

    if (
      new Date(reset.expiresAt) <= new Date()
    ) {
      await db
        .collection("password_resets")
        .deleteOne({
          _id: reset._id
        });

      return NextResponse.json(
        {
          success: false,
          error:
            "Password reset code has expired"
        },
        { status: 400 }
      );
    }

    const submittedHash =
      hashCode(code);

    if (
      !safeEqual(
        submittedHash,
        reset.codeHash
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Incorrect password reset code"
        },
        { status: 400 }
      );
    }

    const user =
      await db.collection("users").findOne({
        id: reset.userId,
        email: reset.email,
        emailVerified: true
      });

    if (!user) {
      await db
        .collection("password_resets")
        .deleteOne({
          _id: reset._id
        });

      return NextResponse.json(
        {
          success: false,
          error:
            "Account could not be found"
        },
        { status: 404 }
      );
    }

    const newSalt =
      crypto
        .randomBytes(16)
        .toString("hex");

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

    /*
     * Invalidate every existing session after
     * a successful password reset.
     */
    await db
      .collection("sessions")
      .deleteMany({
        userId: user.id
      });

    await db
      .collection("password_resets")
      .deleteOne({
        _id: reset._id
      });

    return NextResponse.json({
      success: true,
      message:
        "Password reset successfully. Please login again."
    });
  } catch (error) {
    console.error(
      "Password reset error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to reset password"
      },
      { status: 500 }
    );
  }
}
