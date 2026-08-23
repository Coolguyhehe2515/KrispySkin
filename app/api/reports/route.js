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

const DISCORD_WEBHOOK_URL =
  process.env.DISCORD_REPORT_WEBHOOK_URL;

async function sendDiscordReport({
  report,
  reporter,
  post,
  postOwner
}) {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn(
      "DISCORD_REPORT_WEBHOOK_URL is not configured."
    );

    return;
  }

  const reasonLabels = {
    nsfw: "NSFW / Sexual Content",
    racist: "Racist / Hateful Content",
    predatory:
      "Predatory / Grooming-related",
    harassment:
      "Harassment Toward a Specific Person",
    impersonation: "Impersonation",
    inappropriate:
      "Other Inappropriate Content",
    other: "Other"
  };

  const reason =
    reasonLabels[report.reason] ||
    report.reason;

  const description =
    report.description ||
    "No additional information provided.";

  const embed = {
    title: "KrispySkin — New Content Report",
    description:
      "A new community report has been submitted.",
    color: 15158332,
    fields: [
      {
        name: "Report ID",
        value: `\`${report.id}\``,
        inline: false
      },
      {
        name: "Reason",
        value: reason,
        inline: true
      },
      {
        name: "Reporter",
        value:
          `**${reporter?.username || "Unknown"}**\n` +
          `ID: \`${report.reporterId}\``,
        inline: true
      },
      {
        name: "Post Owner",
        value:
          `**${postOwner?.username || "Unknown"}**\n` +
          `ID: \`${post?.userId || "Unknown"}\``,
        inline: true
      },
      {
        name: "Post ID",
        value: `\`${report.postId}\``,
        inline: true
      },
      {
        name: "Skin ID",
        value:
          `\`${post?.skinId || "Unknown"}\``,
        inline: true
      },
      {
        name: "Post Title",
        value:
          post?.title ||
          "Untitled post",
        inline: false
      },
      {
        name: "Additional Information",
        value:
          description.length > 1024
            ? `${description.slice(
                0,
                1021
              )}...`
            : description,
        inline: false
      }
    ],
    timestamp:
      new Date().toISOString(),
    footer: {
      text: "KrispySkin Moderation"
    }
  };

  const response = await fetch(
    DISCORD_WEBHOOK_URL,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json"
      },
      body: JSON.stringify({
        username: "KrispySkin Moderation",
        embeds: [embed]
      })
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Discord webhook failed (${response.status}): ${errorText}`
    );
  }
}

export async function POST(request) {
  try {
    // --------------------------------------------------
    // CHECK LOGIN SESSION
    // --------------------------------------------------

    const sessionToken =
      request.cookies.get(
        "krispyskin_session"
      )?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You must be logged in to report content."
        },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // DATABASE
    // --------------------------------------------------

    const client =
      await clientPromise;

    const db =
      client.db("krispysskin");

    const session =
      await db
        .collection("sessions")
        .findOne({
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
          error:
            "Your session has expired. Please login again."
        },
        { status: 401 }
      );
    }

    const user =
      await db
        .collection("users")
        .findOne({
          id: session.userId
        });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "User account not found."
        },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // READ REQUEST
    // --------------------------------------------------

    const body =
      await request.json();

    const postId =
      typeof body.postId === "string"
        ? body.postId.trim()
        : "";

    const reason =
      typeof body.reason === "string"
        ? body.reason
            .trim()
            .toLowerCase()
        : "";

    const description =
      typeof body.description ===
      "string"
        ? body.description.trim()
        : "";

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

    if (!postId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Post ID is required."
        },
        { status: 400 }
      );
    }

    if (
      !VALID_REASONS.includes(
        reason
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid report reason."
        },
        { status: 400 }
      );
    }

    if (
      description.length > 1000
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Report description is too long."
        },
        { status: 400 }
      );
    }

    if (
      reason === "other" &&
      !description
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please explain the reason for an Other report."
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // FIND POST
    // --------------------------------------------------

    const post =
      await db
        .collection("posts")
        .findOne({
          id: postId
        });

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Post not found."
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // PREVENT SELF-REPORTING
    // --------------------------------------------------

    if (
      post.userId === user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You cannot report your own post."
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // FIND POST OWNER
    // --------------------------------------------------

    const postOwner =
      await db
        .collection("users")
        .findOne({
          id: post.userId
        });

    // --------------------------------------------------
    // PREVENT DUPLICATE REPORTS
    // --------------------------------------------------

    const existingReport =
      await db
        .collection("reports")
        .findOne({
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

    // --------------------------------------------------
    // CREATE REPORT
    // --------------------------------------------------

    const reportId =
      `report_${crypto
        .randomBytes(8)
        .toString("hex")}`;

    const report = {
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
    };

    await db
      .collection("reports")
      .insertOne(report);

    // --------------------------------------------------
    // SEND DISCORD NOTIFICATION
    // --------------------------------------------------

    let discordSent = false;

    try {
      await sendDiscordReport({
        report,
        reporter: user,
        post,
        postOwner
      });

      discordSent = true;
    } catch (discordError) {
      // Do NOT fail the report itself if
      // Discord is temporarily unavailable.
      console.error(
        "Discord report notification error:",
        discordError
      );
    }

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        report: {
          id: reportId,
          postId,
          reason,
          status: "pending"
        },
        notification: {
          discordSent
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
        error:
          "Failed to submit report."
      },
      { status: 500 }
    );
  }
}
