import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";
import crypto from "crypto";

export const runtime = "nodejs";

const VALID_REASONS = [
  "nsfw",
  "racist",
  "predatory",
  "harassment",
  "impersonation",
  "inappropriate",
  "other"
];

export async function POST(request) {
  try {
    const sessionToken =
      request.cookies.get("krispyskin_session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in to report content."
        },
        { status: 401 }
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
          error: "Your session has expired."
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
          error: "User account not found."
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const postId =
      typeof body.postId === "string"
        ? body.postId.trim()
        : "";

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim().toLowerCase()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    if (!postId) {
      return NextResponse.json(
        {
          success: false,
          error: "Post ID is required."
        },
        { status: 400 }
      );
    }

    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid report reason."
        },
        { status: 400 }
      );
    }

    if (description.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Report description is too long."
        },
        { status: 400 }
      );
    }

    const post =
      await db.collection("posts").findOne({
        id: postId
      });

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: "Post not found."
        },
        { status: 404 }
      );
    }

    // Prevent users from reporting their own post.
    if (post.userId === user.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You cannot report your own post."
        },
        { status: 400 }
      );
    }

    // Prevent duplicate reports.
    const existingReport =
      await db.collection("reports").findOne({
        postId,
        reporterId: user.id,
        status: "pending"
      });

    if (existingReport) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You have already reported this post."
        },
        { status: 409 }
      );
    }

    const reportId =
      `report_${crypto.randomBytes(8).toString("hex")}`;

    await db.collection("reports").insertOne({
      id: reportId,
      postId,
      reporterId: user.id,
      reason,
      description,
      status: "pending",
      createdAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      action: null
    });

    return NextResponse.json(
      {
        success: true,
        report: {
          id: reportId,
          postId,
          reason,
          status: "pending"
        },
        message:
          "Report submitted successfully."
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "KrispySkin report error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to submit report."
      },
      { status: 500 }
    );
  }
}
