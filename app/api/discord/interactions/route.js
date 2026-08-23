import crypto from "crypto";
import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

const DISCORD_PUBLIC_KEY =
  process.env.DISCORD_PUBLIC_KEY;

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://krispy-skin.vercel.app";

const MODERATION_SECRET =
  process.env.DISCORD_MODERATION_SECRET;

// --------------------------------------------------
// DISCORD REQUEST SIGNATURE VERIFICATION
// --------------------------------------------------

function verifyDiscordRequest(
  body,
  signature,
  timestamp
) {
  if (
    !DISCORD_PUBLIC_KEY ||
    !signature ||
    !timestamp
  ) {
    return false;
  }

  try {
    const message = Buffer.from(
      timestamp + body
    );

    const signatureBuffer =
      Buffer.from(
        signature,
        "hex"
      );

    const publicKeyBuffer =
      Buffer.from(
        DISCORD_PUBLIC_KEY,
        "hex"
      );

    // Ed25519 public key in SPKI DER format.
    const spkiPrefix =
      Buffer.from(
        "302a300506032b6570032100",
        "hex"
      );

    const publicKey =
      crypto.createPublicKey({
        key: Buffer.concat([
          spkiPrefix,
          publicKeyBuffer
        ]),
        format: "der",
        type: "spki"
      });

    return crypto.verify(
      null,
      message,
      publicKey,
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
// DISCORD RESPONSE HELPER
// --------------------------------------------------

function discordResponse(
  data,
  status = 200
) {
  return NextResponse.json(
    data,
    {
      status
    }
  );
}

// --------------------------------------------------
// DATABASE HELPERS
// --------------------------------------------------

async function getPost(postId) {
  const client =
    await clientPromise;

  const db =
    client.db("krispyskin");

  const post =
    await db
      .collection("posts")
      .findOne({
        id: postId
      });

  if (!post) {
    return {
      db,
      post: null
    };
  }

  return {
    db,
    post
  };
}

// --------------------------------------------------
// HIDE POST
// --------------------------------------------------

async function hidePost(
  postId,
  moderator
) {
  const { db, post } =
    await getPost(postId);

  if (!post) {
    return {
      success: false,
      message:
        "Post was not found."
    };
  }

  await db
    .collection("posts")
    .updateOne(
      {
        id: postId
      },
      {
        $set: {
          hidden: true,
          hiddenAt: new Date(),
          hiddenBy: moderator,
          moderationStatus:
            "hidden",
          updatedAt: new Date()
        }
      }
    );

  return {
    success: true
  };
}

// --------------------------------------------------
// DELETE POST
// --------------------------------------------------

async function deletePost(
  postId,
  moderator
) {
  const { db, post } =
    await getPost(postId);

  if (!post) {
    return {
      success: false,
      message:
        "Post was not found."
    };
  }

  await db
    .collection("posts")
    .deleteOne({
      id: postId
    });

  await db
    .collection("moderation_logs")
    .insertOne({
      action: "delete_post",
      postId,
      moderator,
      createdAt: new Date()
    });

  return {
    success: true
  };
}

// --------------------------------------------------
// BAN USER
// --------------------------------------------------

async function banUser(
  postId,
  moderator
) {
  const { db, post } =
    await getPost(postId);

  if (!post) {
    return {
      success: false,
      message:
        "Post was not found."
    };
  }

  if (!post.userId) {
    return {
      success: false,
      message:
        "This post does not have an owner."
    };
  }

  const user =
    await db
      .collection("users")
      .findOne({
        id: post.userId
      });

  if (!user) {
    return {
      success: false,
      message:
        "Post owner was not found."
    };
  }

  // Store the ban separately so the original
  // user document remains available for moderation records.
  await db
    .collection("bans")
    .updateOne(
      {
        userId: user.id
      },
      {
        $set: {
          userId: user.id,
          username:
            user.username ||
            "Unknown",
          reason:
            "Community moderation",
          bannedBy: moderator,
          bannedAt: new Date(),
          active: true
        }
      },
      {
        upsert: true
      }
    );

  // Mark the account as banned.
  await db
    .collection("users")
    .updateOne(
      {
        id: user.id
      },
      {
        $set: {
          banned: true,
          bannedAt: new Date(),
          bannedBy: moderator,
          updatedAt: new Date()
        }
      }
    );

  // Invalidate all active sessions for the banned account.
  await db
    .collection("sessions")
    .deleteMany({
      userId: user.id
    });

  await db
    .collection("moderation_logs")
    .insertOne({
      action: "ban_user",
      postId,
      userId: user.id,
      moderator,
      createdAt: new Date()
    });

  return {
    success: true,
    username:
      user.username ||
      "Unknown"
  };
}

// --------------------------------------------------
// IP BAN
// --------------------------------------------------

async function banIp(
  postId,
  moderator
) {
  const { db, post } =
    await getPost(postId);

  if (!post) {
    return {
      success: false,
      message:
        "Post was not found."
    };
  }

  if (!post.userId) {
    return {
      success: false,
      message:
        "This post does not have an owner."
    };
  }

  const user =
    await db
      .collection("users")
      .findOne({
        id: post.userId
      });

  if (!user) {
    return {
      success: false,
      message:
        "Post owner was not found."
    };
  }

  /*
   * The application must have previously stored
   * the user's IP address on the user document.
   *
   * This supports the common field names below.
   * Prefer "ipAddress" for new accounts.
   */
  const ipAddress =
    user.ipAddress ||
    user.lastIp ||
    user.lastIP ||
    null;

  if (!ipAddress) {
    return {
      success: false,
      message:
        "No IP address is stored for this user."
    };
  }

  await db
    .collection("ip_bans")
    .updateOne(
      {
        ipAddress
      },
      {
        $set: {
          ipAddress,
          userId: user.id,
          username:
            user.username ||
            "Unknown",
          reason:
            "Community moderation",
          bannedBy: moderator,
          bannedAt: new Date(),
          active: true
        }
      },
      {
        upsert: true
      }
    );

  await db
    .collection("moderation_logs")
    .insertOne({
      action: "ip_ban",
      postId,
      userId: user.id,
      moderator,
      createdAt: new Date()
    });

  return {
    success: true,
    username:
      user.username ||
      "Unknown"
  };
}

// --------------------------------------------------
// DISMISS REPORT
// --------------------------------------------------

async function dismissReport(
  reportId,
  moderator
) {
  if (!reportId) {
    return {
      success: false,
      message:
        "Report ID is missing."
    };
  }

  const client =
    await clientPromise;

  const db =
    client.db("krispyskin");

  const report =
    await db
      .collection("reports")
      .findOne({
        id: reportId
      });

  if (!report) {
    return {
      success: false,
      message:
        "Report was not found."
    };
  }

  await db
    .collection("reports")
    .updateOne(
      {
        id: reportId
      },
      {
        $set: {
          status: "dismissed",
          resolvedBy: moderator,
          resolvedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

  await db
    .collection("moderation_logs")
    .insertOne({
      action: "dismiss_report",
      reportId,
      postId:
        report.postId ||
        null,
      moderator,
      createdAt: new Date()
    });

  return {
    success: true
  };
}

// --------------------------------------------------
// UPDATE REPORT AFTER MODERATION
// --------------------------------------------------

async function resolveReportByPost(
  postId,
  action,
  moderator
) {
  const client =
    await clientPromise;

  const db =
    client.db("krispyskin");

  await db
    .collection("reports")
    .updateMany(
      {
        postId,
        status: {
          $in: [
            "pending",
            "reviewing"
          ]
        }
      },
      {
        $set: {
          status: "resolved",
          resolution: action,
          resolvedBy: moderator,
          resolvedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
}

// --------------------------------------------------
// MAIN DISCORD INTERACTION ENDPOINT
// --------------------------------------------------

export async function POST(
  request
) {
  try {
    const body =
      await request.text();

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
        body,
        signature,
        timestamp
      );

    if (!valid) {
      console.error(
        "Invalid Discord request signature."
      );

      return new NextResponse(
        "Invalid request signature",
        {
          status: 401
        }
      );
    }

    const interaction =
      JSON.parse(body);

    // ------------------------------------------------
    // DISCORD ENDPOINT VERIFICATION
    // ------------------------------------------------

    if (
      interaction.type === 1
    ) {
      return discordResponse({
        type: 1
      });
    }

    // ------------------------------------------------
    // BUTTON INTERACTION
    // ------------------------------------------------

    if (
      interaction.type !== 3
    ) {
      return discordResponse({
        type: 4,
        data: {
          content:
            "Unsupported interaction.",
          flags: 64
        }
      });
    }

    const customId =
      interaction.data?.custom_id;

    const member =
      interaction.member;

    const username =
      member?.user?.username ||
      "Unknown moderator";

    console.log(
      "Discord moderation interaction:",
      {
        customId,
        username
      }
    );

    // ------------------------------------------------
    // DISMISS
    // ------------------------------------------------

    if (
      customId?.startsWith(
        "report:dismiss:"
      )
    ) {
      const reportId =
        customId.substring(
          "report:dismiss:".length
        );

      const result =
        await dismissReport(
          reportId,
          username
        );

      if (!result.success) {
        return discordResponse({
          type: 4,
          data: {
            content:
              result.message,
            flags: 64
          }
        });
      }

      return discordResponse({
        type: 4,
        data: {
          content:
            `Report \`${reportId}\` dismissed by ${username}.`,
          flags: 64
        }
      });
    }

    // ------------------------------------------------
    // HIDE POST
    // ------------------------------------------------

    if (
      customId?.startsWith(
        "report:hide:"
      )
    ) {
      const postId =
        customId.substring(
          "report:hide:".length
        );

      const result =
        await hidePost(
          postId,
          username
        );

      if (!result.success) {
        return discordResponse({
          type: 4,
          data: {
            content:
              result.message,
            flags: 64
          }
        });
      }

      await resolveReportByPost(
        postId,
        "hide_post",
        username
      );

      return discordResponse({
        type: 4,
        data: {
          content:
            `Post \`${postId}\` has been hidden by ${username}.`,
          flags: 64
        }
      });
    }

    // ------------------------------------------------
    // DELETE POST
    // ------------------------------------------------

    if (
      customId?.startsWith(
        "report:delete:"
      )
    ) {
      const postId =
        customId.substring(
          "report:delete:".length
        );

      const result =
        await deletePost(
          postId,
          username
        );

      if (!result.success) {
        return discordResponse({
          type: 4,
          data: {
            content:
              result.message,
            flags: 64
          }
        });
      }

      await resolveReportByPost(
        postId,
        "delete_post",
        username
      );

      return discordResponse({
        type: 4,
        data: {
          content:
            `Post \`${postId}\` has been deleted by ${username}.`,
          flags: 64
        }
      });
    }

    // ------------------------------------------------
    // BAN USER
    // ------------------------------------------------

    if (
      customId?.startsWith(
        "report:ban:"
      )
    ) {
      const postId =
        customId.substring(
          "report:ban:".length
        );

      const result =
        await banUser(
          postId,
          username
        );

      if (!result.success) {
        return discordResponse({
          type: 4,
          data: {
            content:
              result.message,
            flags: 64
          }
        });
      }

      await resolveReportByPost(
        postId,
        "ban_user",
        username
      );

      return discordResponse({
        type: 4,
        data: {
          content:
            `User **${result.username}** has been banned by ${username}.`,
          flags: 64
        }
      });
    }

    // ------------------------------------------------
    // IP BAN
    // ------------------------------------------------

    if (
      customId?.startsWith(
        "report:ipban:"
      )
    ) {
      const postId =
        customId.substring(
          "report:ipban:".length
        );

      const result =
        await banIp(
          postId,
          username
        );

      if (!result.success) {
        return discordResponse({
          type: 4,
          data: {
            content:
              result.message,
            flags: 64
          }
        });
      }

      await resolveReportByPost(
        postId,
        "ip_ban",
        username
      );

      return discordResponse({
        type: 4,
        data: {
          content:
            `The IP associated with user **${result.username}** has been banned by ${username}.`,
          flags: 64
        }
      });
    }

    // ------------------------------------------------
    // UNKNOWN BUTTON
    // ------------------------------------------------

    console.warn(
      "Unknown moderation action:",
      customId
    );

    return discordResponse({
      type: 4,
      data: {
        content:
          "Unknown moderation action.",
        flags: 64
      }
    });
  } catch (error) {
    console.error(
      "Discord interactions error:",
      error
    );

    return discordResponse(
      {
        error:
          "Internal server error"
      },
      500
    );
  }
}
