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
// VERIFY DISCORD SIGNATURE
// --------------------------------------------------

function verifyDiscordRequest(
  rawBody,
  signature,
  timestamp
) {
  if (!DISCORD_PUBLIC_KEY) {
    throw new Error(
      "DISCORD_PUBLIC_KEY is not configured."
    );
  }

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
// DISCORD API REQUEST
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
// EDIT ORIGINAL DISCORD MESSAGE
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

  const oldEmbeds =
    interaction.message.embeds ||
    [];

  const newEmbeds =
    oldEmbeds.map(
      (embed) => ({
        ...embed,

        footer: {
          text:
            `KrispySkin Moderation • ${statusText}`
        }
      })
    );

  await discordRequest(
    `/channels/${channelId}/messages/${messageId}`,
    {
      method: "PATCH",

      body:
        JSON.stringify({
          embeds:
            newEmbeds,

          components: []
        })
    }
  );
}

// --------------------------------------------------
// SEND FOLLOW-UP RESPONSE
// --------------------------------------------------

async function sendFollowUp(
  interaction,
  content
) {
  if (
    !interaction.application_id ||
    !interaction.token
  ) {
    return;
  }

  const response =
    await fetch(
      `${DISCORD_API}/webhooks/${interaction.application_id}/${interaction.token}`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            content,
            flags: 64
          })
      }
    );

  if (!response.ok) {
    const text =
      await response.text();

    console.error(
      "Discord follow-up failed:",
      text
    );
  }
}

// --------------------------------------------------
// GET REPORT
// --------------------------------------------------

async function getReport(
  db,
  reportId
) {
  return db
    .collection("reports")
    .findOne({
      id:
        reportId
    });
}

// --------------------------------------------------
// UPDATE REPORT STATUS
// --------------------------------------------------

async function setReportStatus(
  db,
  reportId,
  status,
  moderator
) {
  await db
    .collection("reports")
    .updateOne(
      {
        id:
          reportId
      },

      {
        $set: {
          status,

          moderatedBy:
            moderator,

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
  postId
) {
  if (!postId) {
    return;
  }

  await db
    .collection("posts")
    .updateOne(
      {
        id:
          postId
      },

      {
        $set: {
          hidden:
            true,

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
  postId
) {
  if (!postId) {
    return;
  }

  await db
    .collection("posts")
    .deleteOne({
      id:
        postId
    });
}

// --------------------------------------------------
// PROCESS MODERATION
// --------------------------------------------------

async function processModeration(
  interaction,
  action,
  reportId
) {
  try {
    const client =
      await clientPromise;

    const db =
      client.db(
        "krispyskin"
      );

    const report =
      await getReport(
        db,
        reportId
      );

    if (!report) {
      await sendFollowUp(
        interaction,
        "Report not found."
      );

      return;
    }

    // ----------------------------------------------
    // MODERATOR NAME
    // ----------------------------------------------

    const moderator =
      interaction.member
        ?.user?.username ||

      interaction.user
        ?.username ||

      "Discord Admin";

    // ----------------------------------------------
    // DISMISS
    // ----------------------------------------------

    if (
      action ===
      "dismiss"
    ) {
      await setReportStatus(
        db,
        reportId,
        "dismissed",
        moderator
      );

      await updateDiscordMessage(
        interaction,
        "dismissed"
      );

      await sendFollowUp(
        interaction,
        "Report dismissed."
      );

      return;
    }

    // ----------------------------------------------
    // HIDE
    // ----------------------------------------------

    if (
      action ===
      "hide"
    ) {
      await hidePost(
        db,
        report.postId
      );

      await setReportStatus(
        db,
        reportId,
        "hidden",
        moderator
      );

      await updateDiscordMessage(
        interaction,
        "hidden"
      );

      await sendFollowUp(
        interaction,
        "Post hidden and report marked as hidden."
      );

      return;
    }

    // ----------------------------------------------
    // DELETE
    // ----------------------------------------------

    if (
      action ===
      "delete"
    ) {
      await deletePost(
        db,
        report.postId
      );

      await setReportStatus(
        db,
        reportId,
        "deleted",
        moderator
      );

      await updateDiscordMessage(
        interaction,
        "deleted"
      );

      await sendFollowUp(
        interaction,
        "Post deleted and report marked as deleted."
      );

      return;
    }

    await sendFollowUp(
      interaction,
      "Unknown moderation action."
    );
  } catch (error) {
    console.error(
      "Moderation processing error:",
      error
    );

    await sendFollowUp(
      interaction,
      "Moderation action failed. Check the Vercel logs."
    );
  }
}

// --------------------------------------------------
// POST
// --------------------------------------------------

export async function POST(
  request
) {
  try {
    // ----------------------------------------------
    // READ RAW BODY
    // ----------------------------------------------

    const rawBody =
      await request.text();

    // ----------------------------------------------
    // VERIFY SIGNATURE
    // ----------------------------------------------

    const signature =
      request.headers.get(
        "x-signature-ed25519"
      );

    const timestamp =
      request.headers.get(
        "x-signature-timestamp"
      );

    const valid =
      verifyDiscordRequest(
        rawBody,
        signature,
        timestamp
      );

    if (!valid) {
      return new NextResponse(
        "Invalid request signature.",
        {
          status: 401
        }
      );
    }

    // ----------------------------------------------
    // PARSE BODY
    // ----------------------------------------------

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

    // ----------------------------------------------
    // DISCORD PING
    // ----------------------------------------------

    if (
      interaction.type ===
      1
    ) {
      return NextResponse.json({
        type: 1
      });
    }

    // ----------------------------------------------
    // ONLY BUTTON INTERACTIONS
    // ----------------------------------------------

    if (
      interaction.type !==
      3
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

    // ----------------------------------------------
    // GET CUSTOM ID
    // ----------------------------------------------

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

    // ----------------------------------------------
    // EXPECTED:
    //
    // report:dismiss:REPORT_ID
    // report:hide:REPORT_ID
    // report:delete:REPORT_ID
    // ----------------------------------------------

    const parts =
      customId.split(":");

    if (
      parts.length !==
        3 ||
      parts[0] !==
        "report"
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

    // ----------------------------------------------
    // VALID ACTION
    // ----------------------------------------------

    if (
      ![
        "dismiss",
        "hide",
        "delete"
      ].includes(
        action
      )
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

    // ----------------------------------------------
    // IMPORTANT:
    //
    // ACK DISCORD IMMEDIATELY.
    //
    // type: 5 = DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    //
    // This prevents:
    //
    // "The application did not respond"
    // ----------------------------------------------

    const response =
      NextResponse.json({
        type: 5
      });

    // ----------------------------------------------
    // PROCESS AFTER ACK
    //
    // Do not await this before returning response.
    // ----------------------------------------------

    processModeration(
      interaction,
      action,
      reportId
    ).catch(
      (error) => {
        console.error(
          "Background moderation error:",
          error
        );
      }
    );

    return response;
  } catch (error) {
    console.error(
      "Discord interaction error:",
      error
    );

    return NextResponse.json(
      {
        type: 4,

        data: {
          content:
            "Internal moderation error.",

          flags: 64
        }
      },
      {
        status: 500
      }
    );
  }
}
