import crypto from "crypto";
import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";

export const runtime = "nodejs";

const DISCORD_PUBLIC_KEY =
  process.env.DISCORD_PUBLIC_KEY;

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
    const message =
      Buffer.from(
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

function jsonResponse(
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

function ephemeralMessage(
  content
) {
  return {
    type: 4,
    data: {
      content,
      flags: 64
    }
  };
}

function parseModerationAction(
  customId
) {
  if (!customId) {
    return null;
  }

  const value =
    String(customId).trim();

  // -------------------------------
  // DISMISS
  // -------------------------------

  if (
    value === "report_dismiss" ||
    value === "dismiss" ||
    value === "report:dismiss"
  ) {
    return {
      action: "dismiss",
      postId: null
    };
  }

  // -------------------------------
  // HIDE
  // -------------------------------

  const hidePrefixes = [
    "report_hide:",
    "report_hide_post:",
    "hide:",
    "hide_post:",
    "report:hide:"
  ];

  for (
    const prefix of hidePrefixes
  ) {
    if (
      value.startsWith(prefix)
    ) {
      return {
        action: "hide",
        postId:
          value.substring(
            prefix.length
          )
      };
    }
  }

  // -------------------------------
  // DELETE
  // -------------------------------

  const deletePrefixes = [
    "report_delete:",
    "report_delete_post:",
    "delete:",
    "delete_post:",
    "report:delete:"
  ];

  for (
    const prefix of deletePrefixes
  ) {
    if (
      value.startsWith(prefix)
    ) {
      return {
        action: "delete",
        postId:
          value.substring(
            prefix.length
          )
      };
    }
  }

  return null;
}

function isModerator(
  interaction
) {
  const requiredRole =
    process.env.DISCORD_MODERATOR_ROLE_ID;

  if (!requiredRole) {
    return true;
  }

  const roles =
    interaction.member?.roles || [];

  return roles.includes(
    requiredRole
  );
}

// --------------------------------------------------
// FIND POST
// --------------------------------------------------

async function findPost(
  db,
  postId
) {
  if (!postId) {
    return null;
  }

  // Normal KrispySkin post ID.
  let post =
    await db.collection("posts").findOne({
      id: postId
    });

  if (post) {
    return post;
  }

  // Fallback for MongoDB ObjectId.
  try {
    if (
      /^[a-fA-F0-9]{24}$/.test(
        postId
      )
    ) {
      const { ObjectId } =
        await import("mongodb");

      post =
        await db
          .collection("posts")
          .findOne({
            _id:
              new ObjectId(postId)
          });

      if (post) {
        return post;
      }
    }
  } catch (error) {
    console.error(
      "ObjectId lookup failed:",
      error
    );
  }

  return null;
}

// --------------------------------------------------
// HIDE POST
// --------------------------------------------------

async function hidePost(
  db,
  postId,
  moderator
) {
  const post =
    await findPost(
      db,
      postId
    );

  if (!post) {
    return {
      success: false,
      message:
        `Post \`${postId}\` was not found.`
    };
  }

  const result =
    await db
      .collection("posts")
      .updateOne(
        {
          _id: post._id
        },
        {
          $set: {
            hidden: true,
            hiddenAt:
              new Date(),
            hiddenBy:
              moderator
          }
        }
      );

  if (
    result.matchedCount === 0
  ) {
    return {
      success: false,
      message:
        "Failed to update the post."
    };
  }

  return {
    success: true,
    message:
      `Post \`${post.id || postId}\` has been hidden.`
  };
}

// --------------------------------------------------
// DELETE POST
// --------------------------------------------------

async function deletePost(
  db,
  postId
) {
  const post =
    await findPost(
      db,
      postId
    );

  if (!post) {
    return {
      success: false,
      message:
        `Post \`${postId}\` was not found.`
    };
  }

  const result =
    await db
      .collection("posts")
      .deleteOne({
        _id: post._id
      });

  if (
    result.deletedCount === 0
  ) {
    return {
      success: false,
      message:
        "Failed to delete the post."
    };
  }

  return {
    success: true,
    message:
      `Post \`${post.id || postId}\` has been deleted.`
  };
}

// --------------------------------------------------
// POST
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
    // DISCORD VERIFICATION
    // ------------------------------------------------

    if (
      interaction.type === 1
    ) {
      return jsonResponse({
        type: 1
      });
    }

    // ------------------------------------------------
    // BUTTON
    // ------------------------------------------------

    if (
      interaction.type !== 3
    ) {
      return jsonResponse(
        ephemeralMessage(
          "Unsupported interaction."
        )
      );
    }

    const customId =
      interaction.data?.custom_id;

    const username =
      interaction.member?.user
        ?.username ||
      interaction.user?.username ||
      "Unknown";

    console.log(
      "Discord moderation interaction:",
      {
        customId,
        username
      }
    );

    // ------------------------------------------------
    // MODERATOR
    // ------------------------------------------------

    if (
      !isModerator(
        interaction
      )
    ) {
      return jsonResponse(
        ephemeralMessage(
          "You don't have permission to use moderation controls."
        )
      );
    }

    // ------------------------------------------------
    // PARSE BUTTON
    // ------------------------------------------------

    const parsed =
      parseModerationAction(
        customId
      );

    if (!parsed) {
      console.error(
        "Unknown moderation custom_id:",
        customId
      );

      return jsonResponse(
        ephemeralMessage(
          `Unknown moderation action: \`${customId || "empty"}\``
        )
      );
    }

    // ------------------------------------------------
    // DISMISS
    // ------------------------------------------------

    if (
      parsed.action ===
      "dismiss"
    ) {
      return jsonResponse(
        ephemeralMessage(
          `Report dismissed by **${username}**.`
        )
      );
    }

    // ------------------------------------------------
    // POST ID
    // ------------------------------------------------

    if (!parsed.postId) {
      return jsonResponse(
        ephemeralMessage(
          "Missing post ID."
        )
      );
    }

    console.log(
      "Moderation target post:",
      parsed.postId
    );

    // ------------------------------------------------
    // DATABASE
    // ------------------------------------------------

    const client =
      await clientPromise;

    const db =
      client.db("krispyskin");

    // ------------------------------------------------
    // HIDE
    // ------------------------------------------------

    if (
      parsed.action ===
      "hide"
    ) {
      try {
        const result =
          await hidePost(
            db,
            parsed.postId,
            username
          );

        return jsonResponse(
          ephemeralMessage(
            result.success
              ? `${result.message}\nModerator: **${username}**`
              : result.message
          )
        );
      } catch (error) {
        console.error(
          "Hide post error:",
          error
        );

        return jsonResponse(
          ephemeralMessage(
            "Failed to hide the post."
          )
        );
      }
    }

    // ------------------------------------------------
    // DELETE
    // ------------------------------------------------

    if (
      parsed.action ===
      "delete"
    ) {
      try {
        const result =
          await deletePost(
            db,
            parsed.postId
          );

        return jsonResponse(
          ephemeralMessage(
            result.success
              ? `${result.message}\nModerator: **${username}**`
              : result.message
          )
        );
      } catch (error) {
        console.error(
          "Delete post error:",
          error
        );

        return jsonResponse(
          ephemeralMessage(
            "Failed to delete the post."
          )
        );
      }
    }

    return jsonResponse(
      ephemeralMessage(
        "Unknown moderation action."
      )
    );
  } catch (error) {
    console.error(
      "Discord interaction error:",
      error
    );

    return jsonResponse(
      {
        error:
          "Internal server error"
      },
      500
    );
  }
}
