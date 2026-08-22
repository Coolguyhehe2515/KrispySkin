import { NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "../../../lib/mongodb";

export const runtime = "nodejs";

// GET = public community posts
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("krispyskin");

    const posts = await db
      .collection("posts")
      .find({})
      .sort({
        createdAt: -1
      })
      .limit(100)
      .toArray();

    const result = [];

    for (const post of posts) {
      const skin = await db
        .collection("skins")
        .findOne({
          id: post.skinId
        });

      if (!skin) {
        continue;
      }

      const user = await db
        .collection("users")
        .findOne(
          {
            id: post.userId
          },
          {
            projection: {
              username: 1
            }
          }
        );

      result.push({
        id: post.id,
        skinId: post.skinId,
        title: post.title,
        description:
          post.description || "",
        username:
          user?.username || "Unknown",
        filename:
          skin.filename,
        model:
          skin.model || "classic",
        createdAt:
          post.createdAt
      });
    }

    return NextResponse.json({
      success: true,
      posts: result
    });
  } catch (error) {
    console.error(
      "KrispySkin posts GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load posts"
      },
      { status: 500 }
    );
  }
}


// POST = publish a skin
export async function POST(request) {
  try {
    const sessionToken =
      request.cookies.get("krispyskin_session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in to post a skin"
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const skinId = body?.skinId;
    const title = body?.title?.trim();
    const description =
      body?.description?.trim() || "";

    if (!skinId) {
      return NextResponse.json(
        {
          success: false,
          error: "skinId is required"
        },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          error: "Post title is required"
        },
        { status: 400 }
      );
    }

    if (title.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Title cannot exceed 100 characters"
        },
        { status: 400 }
      );
    }

    if (description.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Description cannot exceed 500 characters"
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
          error: "User account not found"
        },
        { status: 404 }
      );
    }

    // Verify ownership.
    const skin =
      await db.collection("skins").findOne({
        id: skinId,
        userId: user.id
      });

    if (!skin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Skin not found or you do not own it"
        },
        { status: 403 }
      );
    }

    // Prevent duplicate posts for the same skin.
    const existingPost =
      await db.collection("posts").findOne({
        skinId,
        userId: user.id
      });

    if (existingPost) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This skin is already posted"
        },
        { status: 409 }
      );
    }

    const postId =
      `post_${crypto.randomBytes(8).toString("hex")}`;

    await db.collection("posts").insertOne({
      id: postId,
      skinId,
      userId: user.id,
      title,
      description,
      createdAt: new Date()
    });

    return NextResponse.json(
      {
        success: true,
        post: {
          id: postId,
          skinId,
          title,
          description
        },
        message:
          "Skin posted successfully"
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "KrispySkin posts POST error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create post"
      },
      { status: 500 }
    );
  }
}
