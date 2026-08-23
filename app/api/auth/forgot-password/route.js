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
          email: fromEmail,
          name: "KrispySkin"
        },

        to: [
          {
            email: email
          }
        ],

        subject: "KrispySkin Password Reset",

        htmlContent: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>KrispySkin Password Reset</title>
            </head>

            <body
              style="
                margin:0;
                padding:0;
                background:#f5f5f5;
                font-family:Arial,Helvetica,sans-serif;
              "
            >
              <div
                style="
                  max-width:520px;
                  margin:40px auto;
                  background:#ffffff;
                  padding:32px;
                  border-radius:12px;
                  box-shadow:0 4px 20px rgba(0,0,0,0.08);
                "
              >
                <h2
                  style="
                    margin-top:0;
                    color:#111111;
                  "
                >
                  KrispySkin Password Reset
                </h2>

                <p
                  style="
                    color:#444444;
                    font-size:15px;
                    line-height:1.6;
                  "
                >
                  We received a request to reset your
                  KrispySkin account password.
                </p>

                <p
                  style="
                    color:#444444;
                    font-size:15px;
                  "
                >
                  Your verification code is:
                </p>

                <div
                  style="
                    margin:24px 0;
                    padding:20px;
                    text-align:center;
                    background:#f3f3f3;
                    border-radius:10px;
                  "
                >
                  <span
                    style="
                      font-size:32px;
                      font-weight:bold;
                      letter-spacing:8px;
                      color:#111111;
                    "
                  >
                    ${code}
                  </span>
                </div>

                <p
                  style="
                    color:#555555;
                    font-size:14px;
                    line-height:1.6;
                  "
                >
                  This code will expire in
                  <strong>10 minutes</strong>.
                </p>

                <p
                  style="
                    color:#777777;
                    font-size:13px;
                    line-height:1.6;
                  "
                >
                  If you did not request a password reset,
                  you can safely ignore this email.
                </p>

                <hr
                  style="
                    border:0;
                    border-top:1px solid #eeeeee;
                    margin:28px 0;
                  "
                >

                <p
                  style="
                    color:#999999;
                    font-size:12px;
                    margin:0;
                  "
                >
                  This is an automated message from KrispySkin.
                </p>
              </div>
            </body>
          </html>
        `,

        textContent:
          `KrispySkin Password Reset\n\n` +
          `Your password reset verification code is: ${code}\n\n` +
          `This code expires in 10 minutes.\n\n` +
          `If you did not request a password reset, you can safely ignore this email.`,

        tags: [
          "krispyskin",
          "password-reset"
        ]
      })
    }
  );

  const responseText =
    await response.text();

  if (!response.ok) {
    console.error(
      "Brevo error:",
      responseText
    );

    throw new Error(
      `Brevo API ${response.status}: ${responseText}`
    );
  }

  let result = null;

  try {
    result = JSON.parse(
      responseText
    );
  } catch {
    result = null;
  }

  console.log(
    "Brevo email accepted:",
    {
      status: response.status,
      messageId:
        result?.messageId || null,
      recipient: email
    }
  );

  return result;
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
        {
          status: 400
        }
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
       * Only verified users are authorized
       * for password recovery.
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
          {
            status: 403
          }
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
          {
            status: 403
          }
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

      if (
        !/^\d{6}$/.test(code)
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Enter the 6-digit verification code"
          },
          {
            status: 400
          }
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
          {
            status: 400
          }
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
          {
            status: 404
          }
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
          {
            status: 403
          }
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
          {
            status: 403
          }
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
          {
            status: 400
          }
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
          {
            status: 429
          }
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
          {
            status: 400
          }
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

      if (
        !/^\d{6}$/.test(code)
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid verification code"
          },
          {
            status: 400
          }
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
          {
            status: 400
          }
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
          {
            status: 400
          }
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
          {
            status: 400
          }
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
          {
            status: 404
          }
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
          {
            status: 403
          }
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
          {
            status: 403
          }
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
          {
            status: 400
          }
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
          {
            status: 400
          }
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
      {
        status: 400
      }
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
      {
        status: 500
      }
    );
  }
          }
