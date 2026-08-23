import { NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "../../../../../lib/mongodb";

export const runtime = "nodejs";

const CODE_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function hashCode(code) {
  return crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");
}

async function sendBrevoEmail(to, code) {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey) {
    throw new Error(
      "BREVO_API_KEY is not configured"
    );
  }

  if (!from) {
    throw new Error(
      "EMAIL_FROM is not configured"
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
          email: from,
          name: "KrispySkin"
        },

        to: [
          {
            email: to
          }
        ],

        subject:
          "KrispySkin Email Verification",

        htmlContent: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>KrispySkin Email Verification</title>
            </head>

            <body
              style="
                margin:0;
                padding:0;
                background:#f5f5f5;
                font-family:Arial,sans-serif;
              "
            >
              <div
                style="
                  max-width:520px;
                  margin:40px auto;
                  background:#ffffff;
                  padding:32px;
                  border-radius:12px;
                "
              >
                <h2
                  style="
                    margin-top:0;
                    color:#111111;
                  "
                >
                  KrispySkin
                </h2>

                <p>
                  Your email verification code is:
                </p>

                <div
                  style="
                    font-size:32px;
                    font-weight:bold;
                    letter-spacing:8px;
                    margin:24px 0;
                    text-align:center;
                  "
                >
                  ${code}
                </div>

                <p>
                  This code expires in 10 minutes.
                </p>

                <p>
                  If you did not request this code,
                  you can safely ignore this email.
                </p>
              </div>
            </body>
          </html>
        `
      })
    }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `Brevo API ${response.status}: ${text}`
    );
  }
}

export async function POST(request) {
  try {
    // Get the currently authenticated session.
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

    // Read the requested email address.
    const body = await request.json();

    const email =
      String(body.email || "")
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

    // Basic email validation.
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email address"
        },
        {
          status: 400
        }
      );
    }

    const client = await clientPromise;
    const db = client.db("krispyskin");

    const sessions =
      db.collection("sessions");

    const users =
      db.collection("users");

    const verifications =
      db.collection(
        "email_verifications"
      );

    // Validate the current session.
    const session =
      await sessions.findOne({
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
        {
          status: 401
        }
      );
    }

    // Get the authenticated user.
    const user =
      await users.findOne({
        id: session.userId
      });

    if (!user) {
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

    // Prevent using an email already linked
    // to another account.
    const existingEmail =
      await users.findOne({
        email,
        id: {
          $ne: user.id
        }
      });

    if (existingEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "That email is already in use"
        },
        {
          status: 409
        }
      );
    }

    // Prevent verification-code spam.
    const previous =
      await verifications.findOne({
        userId: user.id
      });

    if (
      previous?.createdAt &&
      Date.now() -
        new Date(
          previous.createdAt
        ).getTime() <
        RESEND_COOLDOWN_MS
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please wait before requesting another code"
        },
        {
          status: 429
        }
      );
    }

    // Generate a secure six-digit verification code.
    const code = String(
      crypto.randomInt(
        100000,
        1000000
      )
    );

    // Remove older verification requests.
    await verifications.deleteMany({
      userId: user.id
    });

    // Store only the hash of the verification code.
    await verifications.insertOne({
      userId: user.id,

      email,

      codeHash:
        hashCode(code),

      createdAt:
        new Date(),

      expiresAt:
        new Date(
          Date.now() +
            CODE_EXPIRY_MS
        )
    });

    // Send the verification email through Brevo.
    await sendBrevoEmail(
      email,
      code
    );

    return NextResponse.json({
      success: true,
      message:
        "Verification code sent"
    });
  } catch (error) {
    console.error(
      "Email verification send error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to send verification email"
      },
      {
        status: 500
      }
    );
  }
}
