import { NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

function hashPassword(password, salt) {
  return crypto
    .scryptSync(password, salt, 64)
    .toString("hex");
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

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Username must be 3-20 characters and use only letters, numbers, or underscores"
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 8 characters"
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("krispyskin");
    const users = db.collection("users");

    const existingUser = await users.findOne({
      usernameLower: username.toLowerCase()
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Username is already taken"
        },
        { status: 409 }
      );
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);

    const userId = crypto.randomUUID();

    await users.insertOne({
      id: userId,
      username,
      usernameLower: username.toLowerCase(),
      passwordHash,
      passwordSalt: salt,
      createdAt: new Date()
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        user: {
          id: userId,
          username
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("KrispySkin registration error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create account"
      },
      { status: 500 }
    );
  }
}
