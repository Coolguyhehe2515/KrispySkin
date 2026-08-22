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

  return crypto.timingSafeEqual(bufferA, bufferB);
}

export async function POST(request) {
  try {
    const body = await request.json();

    const username = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Username and password are required"
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("krispyskin");

    const users = db.collection("users");
    const sessions = db.collection("sessions");

    const user = await users.findOne({
      usernameLower: username.toLowerCase()
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid username or password"
        },
        { status: 401 }
      );
    }

    const passwordHash = hashPassword(
      password,
      user.passwordSalt
    );

    if (!safeEqual(passwordHash, user.passwordHash)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid username or password"
        },
        { status: 401 }
      );
    }

    const sessionToken = crypto
      .randomBytes(32)
      .toString("hex");

    const expiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 30
    );

    await sessions.insertOne({
      token: sessionToken,
      userId: user.id,
      createdAt: new Date(),
      expiresAt
    });

    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username
      }
    });

    response.cookies.set({
      name: "krispyskin_session",
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt
    });

    return response;
  } catch (error) {
    console.error("KrispySkin login error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to login"
      },
      { status: 500 }
    );
  }
}
