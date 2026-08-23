import { NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

const CODE_EXPIRATION = 10 * 60 * 1000;

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

async function sendResetEmail(email, code) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;

  if (!apiKey || !fromEmail) {
    throw new Error(
      "Email service is not configured"
    );
  }

  const response = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: {
          name: "KrispySkin",
          email: fromEmail
        },
        to: [
          {
            email
          }
        ],
        subject: "KrispySkin Password Reset",
        htmlContent: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
            <h2>KrispySkin Password Reset</h2>

            <p>Your password reset code is:</p>

            <h1 style="letter-spacing:8px;font-size:32px">
              ${code}
            </h1>

            <p>
              This code expires in 10 minutes.
            </p>

            <p>
              If you did not request a password reset,
              you can safely ignore this email.
            </p>
          </div>
        `,
        textContent:
          `Your KrispySkin password reset code is: ${code}. ` +
          `This code expires in 10 minutes. ` +
          `If you did not request a password reset, you can safely ignore this email.`
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      "Brevo error:",
      errorText
    );

    throw new Error(
      "Failed to send reset email"
    );
  }
}

export async function POST(request) {
  try {
    const body =
      await request.json();

    const action =
      String(
        body.action || ""
      ).trim();

    const email =
      String(
        body.email || ""
      )
        .trim()
        .toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required"
        },
        { status: 400 }
      );
    }

    const client =
      await clientPromise;

    const db =
      client.db("krispyskin");

    const users =
      db.collection("users");

    const resets =
      db.collection(
        "password_resets"
      );

    const sessions =
      db.collection("sessions");

    // ---------------------------------------------
    // REQUEST RESET CODE
    // ---------------------------------------------

    if (action === "request") {
      const user =
        await users.findOne({
          email
        });

      /*
       * Do not reveal whether the email
       * belongs to an account.
       */
      if (!user) {
        return NextResponse.json({
          success: true,
          message:
            "If an authorized account with that email exists, a reset code has been sent."
        });
      }

      /*
       * Only users who have verified their
       * email are authorized for password recovery.
       */
      if (
        user.emailVerified !== true
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This account is not authorized for password recovery. Please verify your email address first."
          },
          { status: 403 }
        );
      }

      /*
       * Banned accounts cannot use
       * password recovery.
       */
      if (
        user.banned === true
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This account has been banned."
          },
          { status: 403 }
        );
      }

      const code =
        String(
          crypto.randomInt(
            100000,
            1000000
          )
        );

      const codeHash =
        hashCode(code);

      const expiresAt =
        new Date(
          Date.now() +
            CODE_EXPIRATION
        );

      await resets.deleteMany({
        userId: user.id
      });

      await resets.insertOne({
        userId: user.id,
        email,
        codeHash,
        expiresAt,
        createdAt: new Date(),
        attempts: 0
      });

      try {
        await sendResetEmail(
          email,
          code
        );
      } catch (error) {
        await resets.deleteMany({
          userId: user.id
        });

        throw error;
      }

      return NextResponse.json({
        success: true,
        message:
          "Password reset code has been sent to your email."
      });
    }

    // ---------------------------------------------
    // VERIFY CODE
    // ---------------------------------------------

    if (action === "verify") {
      const code =
        String(
          body.code || ""
        ).trim();

      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Enter the 6-digit verification code"
          },
          { status: 400 }
        );
      }

      const reset =
        await resets.findOne({
          email
        });

      if (!reset) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid or expired verification code"
          },
          { status: 400 }
        );
      }

      const user =
        await users.findOne({
          id: reset.userId
        });

      if (!user) {
        await resets.deleteOne({
          _id: reset._id
        });

        return NextResponse.json(
          {
            success: false,
            error: "User not found"
          },
          { status: 404 }
        );
      }

      if (
        user.emailVerified !== true
      ) {
        await resets.deleteOne({
          _id: reset._id
        });

        return NextResponse.json(
          {
            success: false,
            error:
              "This account is not authorized for password recovery. Please verify your email address first."
          },
          { status: 403 }
        );
      }

      if (
        user.banned === true
      ) {
        await resets.deleteOne({
          _id: reset._id
        });

        return NextResponse.json(
          {
            success: false,
            error:
              "This account has been banned."
          },
          { status: 403 }
        );
      }

      if (
        new Date(
          reset.expiresAt
        ) <= new Date()
      ) {
        await resets.deleteOne({
          _id: reset._id
        });

        return NextResponse.json(
          {
            success: false,
            error:
              "Verification code has expired"
          },
          { status: 400 }
        );
      }

      if (
        (reset.attempts || 0) >= 5
      ) {
        await resets.deleteOne({
          _id: reset._id
        });

        return NextResponse.json(
          {
            success: false,
            error:
              "Too many verification attempts"
          },
          { status: 429 }
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
        await resets.updateOne(
          {
            _id: reset._id
          },
          {
            $inc: {
              attempts: 1
            }
          }
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid verification code"
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        verified: true
      });
    }

    // ---------------------------------------------
    // RESET PASSWORD
    // ---------------------------------------------

    if (action === "reset") {
      const code =
        String(
          body.code || ""
        ).trim();

      const newPassword =
        String(
          body.newPassword || ""
        );

      const confirmPassword =
        String(
          body.confirmPassword || ""
        );

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

      if (
        newPassword.length < 8
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Password must be at least 8 characters"
          },
          { status: 400 }
        );
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Passwords do not match"
          },
          { status: 400 }
        );
      }

      const reset =
        await resets.findOne({
          email
        });

      if (!reset) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid or expired verification code"
          },
          { status: 400 }
        );
      }

      const user =
        await users.findOne({
          id: reset.userId
        });

      if (!user) {
        await resets.deleteOne({
          _id: reset._id
        });

        return NextResponse.json(
          {
            success: false,
            error: "User not found"
          },
          { status: 404 }
        );
      }

      /*
       * Check authorization again before
       * changing the password.
       */
      if (
        user.emailVerified !== true
      ) {
        await resets.deleteOne({
          _id: reset._id
        });

        return NextResponse.json(
          {
            success: false,
            error:
              "This account is not authorized for password recovery. Please verify your email address first."
          },
          { status: 403 }
        );
      }

      if (
        user.banned === true
      ) {
        await resets.deleteOne({
          _id: reset._id
        });

        return NextResponse.json(
          {
            success: false,
            error:
              "This account has been banned."
          },
          { status: 403 }
        );
      }

      if (
        new Date(
          reset.expiresAt
        ) <= new Date()
      ) {
        await resets.deleteOne({
          _id: reset._id
        });

        return NextResponse.json(
          {
            success: false,
            error:
              "Verification code has expired"
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
              "Invalid verification code"
          },
          { status: 400 }
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

      await users.updateOne(
        {
          id: user.id
        },
        {
          $set: {
            passwordHash:
              newHash,
            passwordSalt:
              newSalt,
            passwordChangedAt:
              new Date()
          }
        }
      );

      /*
       * Invalidate all existing sessions
       * after a successful password reset.
       */
      await sessions.deleteMany({
        userId: user.id
      });

      await resets.deleteOne({
        _id: reset._id
      });

      return NextResponse.json({
        success: true,
        message:
          "Password reset successfully"
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid action"
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "Forgot password error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to process password reset"
      },
      { status: 500 }
    );
  }
}
