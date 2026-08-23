import { NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

// --------------------------------------------------
// PASSWORD HELPERS
// --------------------------------------------------

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

// --------------------------------------------------
// GET CLIENT IP
// --------------------------------------------------

function getClientIp(request) {
  const forwardedFor =
    request.headers.get(
      "x-forwarded-for"
    );

  if (forwardedFor) {
    return forwardedFor
      .split(",")[0]
      .trim();
  }

  const realIp =
    request.headers.get(
      "x-real-ip"
    );

  if (realIp) {
    return realIp.trim();
  }

  return null;
}

// --------------------------------------------------
// POST LOGIN
// --------------------------------------------------

export async function POST(request) {
  try {
    const body =
      await request.json();

    const username =
      String(
        body.username || ""
      ).trim();

    const password =
      String(
        body.password || ""
      );

    if (
      !username ||
      !password
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Username and password are required"
        },
        {
          status: 400
        }
      );
    }

    // ------------------------------------------------
    // DATABASE
    // ------------------------------------------------

    const client =
      await clientPromise;

    const db =
      client.db(
        "krispyskin"
      );

    const users =
      db.collection(
        "users"
      );

    const sessions =
      db.collection(
        "sessions"
      );

    const bans =
      db.collection(
        "bans"
      );

    const ipBans =
      db.collection(
        "ip_bans"
      );

    // ------------------------------------------------
    // FIND USER
    // ------------------------------------------------

    const user =
      await users.findOne({
        usernameLower:
          username.toLowerCase()
      });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid username or password"
        },
        {
          status: 401
        }
      );
    }

    // ------------------------------------------------
    // CHECK USER BAN
    // ------------------------------------------------

    const userBan =
      await bans.findOne({
        userId:
          user.id,

        active: true
      });

    if (
      user.banned === true ||
      userBan
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

    // ------------------------------------------------
    // CHECK IP BAN
    // ------------------------------------------------

    const clientIp =
      getClientIp(request);

    if (clientIp) {
      const ipBan =
        await ipBans.findOne({
          ipAddress:
            clientIp,

          active: true
        });

      if (ipBan) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Your IP address has been banned."
          },
          {
            status: 403
          }
        );
      }
    }

    // ------------------------------------------------
    // VERIFY PASSWORD
    // ------------------------------------------------

    const passwordHash =
      hashPassword(
        password,
        user.passwordSalt
      );

    if (
      !safeEqual(
        passwordHash,
        user.passwordHash
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid username or password"
        },
        {
          status: 401
        }
      );
    }

    // ------------------------------------------------
    // CHECK BAN AGAIN BEFORE SESSION CREATION
    // ------------------------------------------------

    // Re-check the account immediately before
    // creating a session so a newly-created ban
    // cannot be bypassed during login.
    const latestUser =
      await users.findOne({
        id:
          user.id
      });

    const latestBan =
      await bans.findOne({
        userId:
          user.id,

        active: true
      });

    if (
      latestUser?.banned === true ||
      latestBan
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

    // ------------------------------------------------
    // CREATE SESSION
    // ------------------------------------------------

    const sessionToken =
      crypto
        .randomBytes(32)
        .toString("hex");

    const expiresAt =
      new Date(
        Date.now() +
          1000 *
            60 *
            60 *
            24 *
            30
      );

    await sessions.insertOne({
      token:
        sessionToken,

      userId:
        user.id,

      createdAt:
        new Date(),

      expiresAt
    });

    // ------------------------------------------------
    // UPDATE LAST IP
    // ------------------------------------------------

    // Store the latest IP so the moderation system
    // can perform an IP ban later if necessary.
    if (clientIp) {
      await users.updateOne(
        {
          id:
            user.id
        },
        {
          $set: {
            ipAddress:
              clientIp,

            lastIp:
              clientIp,

            lastLoginAt:
              new Date()
          }
        }
      );
    } else {
      await users.updateOne(
        {
          id:
            user.id
        },
        {
          $set: {
            lastLoginAt:
              new Date()
          }
        }
      );
    }

    // ------------------------------------------------
    // RESPONSE
    // ------------------------------------------------

    const response =
      NextResponse.json({
        success: true,

        message:
          "Login successful",

        user: {
          id:
            user.id,

          username:
            user.username
        }
      });

    // ------------------------------------------------
    // SESSION COOKIE
    // ------------------------------------------------

    response.cookies.set({
      name:
        "krispy_skin_session",

      value:
        sessionToken,

      httpOnly:
        true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite:
        "lax",

      path:
        "/",

      expires:
        expiresAt
    });

    return response;
  } catch (error) {
    console.error(
      "KrispySkin login error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          "Failed to login"
      },
      {
        status: 500
      }
    );
  }
        }
