import { NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "../../../../../lib/mongodb";

export const runtime = "nodejs";

function hashCode(code) {
  return crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");
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

    const body =
      await request.json();

    const code =
      String(
        body.code || ""
      ).trim();

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid verification code"
        },
        { status: 400 }
      );
    }

    const client =
      await clientPromise;

    const db =
      client.db("krispskin");

    const session =
      await db.collection("sessions").findOne({
        token: sessionToken
      });

    if (
      !session ||
      new Date(session.expiresAt) <=
        new Date()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Session expired"
        },
        { status: 401 }
      );
    }

    const verification =
      await db
        .collection(
          "email_verifications"
        )
        .findOne({
          userId: session.userId
        });

    if (!verification) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No verification request found"
        },
        { status: 404 }
      );
    }

    if (
      new Date(
        verification.expiresAt
      ) <= new Date()
    ) {
      await db
        .collection(
          "email_verifications"
        )
        .deleteOne({
          _id:
            verification._id
        });

      return NextResponse.json(
        {
          success: false,
          error:
            "Verification code expired"
        },
        { status: 400 }
      );
    }

    const submittedHash =
      hashCode(code);

    const storedHash =
      verification.codeHash;

    const valid =
      submittedHash.length ===
        storedHash.length &&
      crypto.timingSafeEqual(
        Buffer.from(
          submittedHash,
          "hex"
        ),
        Buffer.from(
          storedHash,
          "hex"
        )
      );

    if (!valid) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Incorrect verification code"
        },
        { status: 400 }
      );
    }

    await db
      .collection("users")
      .updateOne(
        {
          id:
            session.userId
        },
        {
          $set: {
            email:
              verification.email,
            emailVerified:
              true,
            emailVerifiedAt:
              new Date()
          }
        }
      );

    await db
      .collection(
        "email_verifications"
      )
      .deleteOne({
        _id:
          verification._id
      });

    return NextResponse.json({
      success: true,
      message:
        "Email authorized successfully"
    });
  } catch (error) {
    console.error(
      "Email verification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to verify email"
      },
      { status: 500 }
    );
  }
}
