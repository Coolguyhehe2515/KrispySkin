import { NextResponse } from "next/server";
import clientPromise from "../../../lib/mongodb";

export const runtime = "nodejs";

const DISCORD_BOT_TOKEN =
  process.env.DISCORD_BOT_TOKEN;

const DISCORD_REPORT_CHANNEL_ID =
  process.env.DISCORD_REPORT_CHANNEL_ID;

const DISCORD_API =
  "https://discord.com/api/v10";

// --------------------------------------------------
// DISCORD SEND MESSAGE
// --------------------------------------------------

async function sendDiscordReport(report) {
  if (!DISCORD_BOT_TOKEN) {
    throw new Error(
      "DISCORD_BOT_TOKEN is not configured."
    );
  }

  if (!DISCORD_REPORT_CHANNEL_ID) {
    throw new Error(
      "DISCORD_REPORT_CHANNEL_ID is not configured."
    );
  }

  const description =
    report.description ||
    "No description provided.";

  const username =
    report.username ||
    "Unknown user";

  const category =
    report.category ||
    "other";

  const postTitle =
    report.postTitle ||
    report.title ||
    "Unknown post";

  const postId =
    report.postId ||
    "Unknown";

  const reportId =
    report.id;

  const response =
    await fetch(
      `${DISCORD_API}/channels/${DISCORD_REPORT_CHANNEL_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          embeds: [
            {
              title:
                "KrispySkin Content Report",

              description:
                "A user submitted a content report.",

              fields: [
                {
                  name:
                    "Report ID",
                  value:
                    `\`${reportId}\``,
                  inline: false
                },

                {
                  name:
                    "Category",
                  value:
                    category,
                  inline: true
                },

                {
                  name:
                    "Reporter",
                  value:
                    username,
                  inline: true
                },

                {
                  name:
                    "Post",
                  value:
                    postTitle,
                  inline: false
                },

                {
                  name:
                    "Post ID",
                  value:
                    `\`${postId}\``,
                  inline: false
                },

                {
                  name:
                    "Reason",
                  value:
                    description.substring(
                      0,
                      1024
                    ),
                  inline: false
                }
              ],

              footer: {
                text:
                  "Status: Pending"
              },

              timestamp:
                new Date().toISOString()
            }
          ],

          components: [
            {
              type: 1,

              components: [
                {
                  type: 2,
                  style: 2,
                  label:
                    "Dismiss",
                  custom_id:
                    `report:dismiss:${reportId}`
                },

                {
                  type: 2,
                  style: 1,
                  label:
                    "Hide Post",
                  custom_id:
                    `report:hide:${reportId}`
                },

                {
                  type: 2,
                  style: 4,
                  label:
                    "Delete Post",
                  custom_id:
                    `report:delete:${reportId}`
                }
              ]
            }
          ]
        })
      }
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Discord API ${response.status}: ${text}`
    );
  }

  return response.json();
}

// --------------------------------------------------
// POST REPORT
// --------------------------------------------------

export async function POST(
  request
) {
  try {
    // ------------------------------------------------
    // SESSION
    // ------------------------------------------------

    const sessionToken =
      request.cookies.get(
        "krispyskin_session"
      )?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You must be logged in to submit a report."
        },
        {
          status: 401
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

    const session =
      await db
        .collection("sessions")
        .findOne({
          token:
            sessionToken
        });

    if (
      !session ||
      new Date(
        session.expiresAt
      ) <= new Date()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Your session has expired. Please login again."
        },
        {
          status: 401
        }
      );
    }

    const user =
      await db
        .collection("users")
        .findOne({
          id:
            session.userId
        });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "User account not found."
        },
        {
          status: 401
        }
      );
    }

    // ------------------------------------------------
    // REQUEST DATA
    // ------------------------------------------------

    const body =
      await request.json();

    const postId =
      typeof body.postId ===
      "string"
        ? body.postId.trim()
        : "";

    const category =
      typeof body.category ===
      "string"
        ? body.category.trim()
        : "other";

    const description =
      typeof body.description ===
      "string"
        ? body.description.trim()
        : "";

    if (!postId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Post ID is required."
        },
        {
          status: 400
        }
      );
    }

    // ------------------------------------------------
    // VALID REPORT CATEGORIES
    // ------------------------------------------------

    const allowedCategories = [
      "nsfw",
      "racist",
      "predatoric",
      "harassment",
      "other"
    ];

    if (
      !allowedCategories.includes(
        category
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid report category."
        },
        {
          status: 400
        }
      );
    }

    // ------------------------------------------------
    // OTHER REQUIRES REASON
    // ------------------------------------------------

    if (
      category === "other" &&
      !description
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please provide a reason for Other."
        },
        {
          status: 400
        }
      );
    }

    // ------------------------------------------------
    // CHECK POST
    // ------------------------------------------------

    const post =
      await db
        .collection("posts")
        .findOne({
          id:
            postId
        });

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Post not found."
        },
        {
          status: 404
        }
      );
    }

    // ------------------------------------------------
    // PREVENT REPORTING OWN POST
    // ------------------------------------------------

    if (
      post.userId &&
      post.userId ===
        user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You cannot report your own post."
        },
        {
          status: 400
        }
      );
    }

    // ------------------------------------------------
    // PREVENT DUPLICATE ACTIVE REPORT
    // ------------------------------------------------

    const existingReport =
      await db
        .collection("reports")
        .findOne({
          postId,
          userId:
            user.id,
          status: {
            $in: [
              "pending",
              "reviewing"
            ]
          }
        });

    if (existingReport) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You have already reported this post."
        },
        {
          status: 409
        }
      );
    }

    // ------------------------------------------------
    // CREATE REPORT ID
    // ------------------------------------------------

    const reportId =
      `report_${cryptoRandomId()}`;

    // ------------------------------------------------
    // GET POST OWNER
    // ------------------------------------------------

    let postOwner = null;

    if (post.userId) {
      postOwner =
        await db
          .collection("users")
          .findOne({
            id:
              post.userId
          });
    }

    // ------------------------------------------------
    // CREATE REPORT
    // ------------------------------------------------

    const report = {
      id:
        reportId,

      postId:
        postId,

      postTitle:
        post.title ||
        "Untitled Skin",

      postOwnerId:
        post.userId ||
        null,

      postOwnerUsername:
        postOwner?.username ||
        "Unknown",

      userId:
        user.id,

      username:
        user.username ||
        "Unknown",

      category:
        category,

      description:
        description,

      status:
        "pending",

      createdAt:
        new Date(),

      updatedAt:
        new Date()
    };

    await db
      .collection("reports")
      .insertOne(
        report
      );

    // ------------------------------------------------
    // SEND TO DISCORD
    // ------------------------------------------------

    let discordSent =
      false;

    let discordMessageId =
      null;

    try {
      const discordMessage =
        await sendDiscordReport(
          report
        );

      discordSent =
        true;

      discordMessageId =
        discordMessage?.id ||
        null;

      await db
        .collection("reports")
        .updateOne(
          {
            id:
              reportId
          },
          {
            $set: {
              discordSent:
                true,

              discordMessageId:
                discordMessageId,

              updatedAt:
                new Date()
            }
          }
        );
    } catch (discordError) {
      console.error(
        "Discord report notification failed:",
        discordError
      );

      await db
        .collection("reports")
        .updateOne(
          {
            id:
              reportId
          },
          {
            $set: {
              discordSent:
                false,

              discordError:
                discordError.message,

              updatedAt:
                new Date()
            }
          }
        );
    }

    // ------------------------------------------------
    // RESPONSE
    // ------------------------------------------------

    return NextResponse.json(
      {
        success: true,

        report: {
          id:
            reportId,

          postId:
            postId,

          category:
            category,

          status:
            "pending"
        },

        notification: {
          discordSent:
            discordSent,

          discordMessageId:
            discordMessageId
        },

        message:
          "Report submitted successfully."
      },
      {
        status: 201
      }
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
      {
        status: 500
      }
    );
  }
}

// --------------------------------------------------
// RANDOM REPORT ID
// --------------------------------------------------

function cryptoRandomId() {
  const bytes =
    new Uint8Array(8);

  if (
    typeof crypto !==
    "undefined" &&
    crypto.getRandomValues
  ) {
    crypto.getRandomValues(
      bytes
    );
  } else {
    for (
      let i = 0;
      i < bytes.length;
      i++
    ) {
      bytes[i] =
        Math.floor(
          Math.random() * 256
        );
    }
  }

  return Array.from(
    bytes,
    (byte) =>
      byte
        .toString(16)
        .padStart(2, "0")
  ).join("");
}
