import { NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

const DISCORD_PUBLIC_KEY =
  process.env.DISCORD_PUBLIC_KEY;

const DISCORD_BOT_TOKEN =
  process.env.DISCORD_BOT_TOKEN;

const DISCORD_API =
  "https://discord.com/api/v10";

// --------------------------------------------------
// DISCORD SIGNATURE VERIFICATION
// --------------------------------------------------

async function verifyDiscordRequest(
  request,
  rawBody
) {
  if (!DISCORD_PUBLIC_KEY) {
    throw new Error(
      "DISCORD_PUBLIC_KEY is not configured."
    );
  }

  const signature =
    request.headers.get(
      "x-signature-ed25519"
    );

  const timestamp =
    request.headers.get(
      "x-signature-timestamp"
    );

  if (!signature || !timestamp) {
    return false;
  }

  try {
    const publicKey =
      Buffer.from(
        DISCORD_PUBLIC_KEY,
        "hex"
      );

    const signatureBuffer =
      Buffer.from(
        signature,
        "hex"
      );

    const message =
      Buffer.from(
        timestamp + rawBody
      );

    return crypto.verify(
      null,
      message,
      {
        key: publicKey,
        format: "der",
        type: "spki"
      },
      signatureBuffer
    );
  } catch (error) {
    console.error(
      "Discord signature verification error:",
      error
    );

    return false;
  }
}

// --------------------------------------------------
// DISCORD API
// --------------------------------------------------

async function discordRequest(
  endpoint,
  options = {}
) {
  if (!DISCORD_BOT_TOKEN) {
    throw new Error(
      "DISCORD_BOT_TOKEN is not configured."
    );
  }

  const response =
    await fetch(
      `${DISCORD_API}${endpoint}`,
      {
        ...options,
        headers: {
          Authorization:
            `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type":
            "application/json",
          ...(options.headers || {})
        }
      }
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Discord API ${response.status}: ${text}`
    );
  }

  if (
    response.status === 204
  ) {
    return null;
  }

  return response.json();
}

// --------------------------------------------------
// FIND REPORT
// --------------------------------------------------

async function findReport(
  db,
  reportId
) {
  if (!reportId) {
    return null;
  }

  return db
    .collection("reports")
    .findOne({
      id: reportId
    });
}

// --------------------------------------------------
// UPDATE REPORT
// --------------------------------------------------

async function updateReport(
  db,
  reportId,
  status,
  moderator
) {
  return db
    .collection("reports")
    .updateOne(
      {
        id: reportId
      },
      {
        $set: {
          status,
          moderatedBy:
            moderator || "Discord Admin",
          moderatedAt:
            new Date(),
          updatedAt:
            new Date()
        }
      }
    );
}

// --------------------------------------------------
// HIDE POST
// --------------------------------------------------

async function hidePost(
  db,
  report
) {
  if (!report.postId) {
    return;
  }

  await db
    .collection("posts")
    .updateOne(
      {
        id: report.postId
      },
      {
        $set: {
          hidden: true,
          hiddenAt:
            new Date(),
          updatedAt:
            new Date()
        }
      }
    );
}

// --------------------------------------------------
// DELETE POST
// --------------------------------------------------

async function deletePost(
  db,
  report
) {
  if (!report.postId) {
    return;
  }

  await db
    .collection("posts")
    .deleteOne({
      id: report.postId
    });
}

// --------------------------------------------------
// UPDATE DISCORD REPORT MESSAGE
// --------------------------------------------------

async function updateDiscordMessage(
  interaction,
  status
) {
  if (
    !interaction.channel_id ||
    !interaction.message?.id
  ) {
    return;
  }

  const channelId =
    interaction.channel_id;

  const messageId =
    interaction.message.id;

  const statusText = {
    dismissed:
      "Report dismissed",
    hidden:
      "Post hidden",
    deleted:
      "Post deleted"
  }[status] || status;

  await discordRequest(
    `/channels/${channelId}/messages/${messageId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        embeds:
          interaction.message
            .embeds?.map(
              (embed) => ({
                ...embed,
                footer: {
                  text:
                    `Moderation: ${statusText}`
                }
              })
            ) || [],
        components: []
      })
    }
  );
}

// --------------------------------------------------
// POST
// --------------------------------------------------

export async function POST(
  request
) {
  try {
    const rawBody =
      await request.text();

    const valid =
      await verifyDiscordRequest(
        request,
        rawBody
      );

    if (!valid) {
      return new NextResponse(
        "Invalid request signature.",
        {
          status: 401
        }
      );
    }

    let interaction;

    try {
      interaction =
        JSON.parse(
          rawBody
        );
    } catch {
      return new NextResponse(
        "Invalid JSON.",
        {
          status: 400
        }
      );
    }

    // ------------------------------------------------
    // PING
    // ------------------------------------------------

    if (
      interaction.type === 1
    ) {
      return NextResponse.json({
        type: 1
      });
    }

    // ------------------------------------------------
    // BUTTON INTERACTION
    // ------------------------------------------------

    if (
      interaction.type !== 3
    ) {
      return NextResponse.json({
        type: 4,
        data: {
          content:
            "Unsupported interaction.",
          flags: 64
        }
      });
    }

    const customId =
      interaction.data
        ?.custom_id;

    if (!customId) {
      return NextResponse.json({
        type: 4,
        data: {
          content:
            "Invalid moderation action.",
          flags: 64
        }
      });
    }

    // ------------------------------------------------
    // PARSE BUTTON
    //
    // Expected:
    //
    // report:dismiss:REPORT_ID
    // report:hide:REPORT_ID
    // report:delete:REPORT_ID
    // ------------------------------------------------

    const parts =
      customId.split(":");

    if (
      parts.length !== 3 ||
      parts[0] !== "report"
    ) {
      return NextResponse.json({
        type: 4,
        data: {
          content:
            "Invalid report action.",
          flags: 64
        }
      });
    }

    const action =
      parts[1];

    const reportId =
      parts[2];

    if (
      ![
        "dismiss",
        "hide",
        "delete"
      ].includes(action)
    ) {
      return NextResponse.json({
        type: 4,
        data: {
          content:
            "Unknown moderation action.",
          flags: 64
        }
      });
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

    const report =
      await findReport(
        db,
        reportId
      );

    if (!report) {
      return NextResponse.json({
        type: 4,
        data: {
          content:
            "Report not found.",
          flags: 64
        }
      });
    }

    // ------------------------------------------------
    // MODERATOR
    // ------------------------------------------------

    const moderator =
      interaction.member
        ?.user?.username ||
      interaction.user
        ?.username ||
      "Discord Admin";

    // ------------------------------------------------
    // DISMISS
    // ------------------------------------------------

    if (
      action === "dismiss"
    ) {
      await updateReport(
        db,
        reportId,
        "dismissed",
        moderator
      );

      await updateDiscordMessage(
        interaction,
        "dismissed"
      );

      return NextResponse.json({
        type: 4,
        data: {
          content:
            "Report dismissed.",
          flags: 64
        }
      });
    }

    // ------------------------------------------------
    // HIDE
    // ------------------------------------------------

    if (
      action === "hide"
    ) {
      await hidePost(
        db,
        report
      );

      await updateReport(
        db,
        reportId,
        "hidden",
        moderator
      );

      await updateDiscordMessage(
        interaction,
        "hidden"
      );

      return NextResponse.json({
        type: 4,
        data: {
          content:
            "Post hidden and report marked as hidden.",
          flags: 64
        }
      });
    }

    // ------------------------------------------------
    // DELETE
    // ------------------------------------------------

    if (
      action === "delete"
    ) {
      await deletePost(
        db,
        report
      );

      await updateReport(
        db,
        reportId,
        "deleted",
        moderator
      );

      await updateDiscordMessage(
        interaction,
        "deleted"
      );

      return NextResponse.json({
        type: 4,
        data: {
          content:
            "Post deleted and report marked as deleted.",
          flags: 64
        }
      });
    }

    return NextResponse.json({
      type: 4,
      data: {
        content:
          "Nothing to do.",
        flags: 64
      }
    });
  } catch (error) {
    console.error(
      "Discord moderation error:",
      error
    );

    return NextResponse.json({
      type: 4,
      data: {
        content:
          "Moderation action failed.",
        flags: 64
      }
    });
  }
}
