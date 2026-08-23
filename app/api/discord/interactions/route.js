import crypto from "crypto";
import { NextResponse } from "next/server";

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

export async function POST(request) {
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

    // --------------------------------------------------
    // DISCORD ENDPOINT VERIFICATION
    // --------------------------------------------------

    // Discord sends type 1 when checking
    // whether this endpoint is valid.
    if (
      interaction.type === 1
    ) {
      return discordResponse({
        type: 1
      });
    }

    // --------------------------------------------------
    // BUTTON INTERACTION
    // --------------------------------------------------

    if (
      interaction.type === 3
    ) {
      const customId =
        interaction.data?.custom_id;

      const member =
        interaction.member;

      const username =
        member?.user?.username ||
        "Unknown";

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
        customId ===
        "report_dismiss"
      ) {
        return discordResponse({
          type: 4,
          data: {
            content:
              "Report dismissed.",
            flags: 64
          }
        });
      }

      // ------------------------------------------------
      // HIDE POST
      // ------------------------------------------------

      if (
        customId.startsWith(
          "report_hide:"
        )
      ) {
        const postId =
          customId.substring(
            "report_hide:".length
          );

        if (!postId) {
          return discordResponse({
            type: 4,
            data: {
              content:
                "Missing post ID.",
              flags: 64
            }
          });
        }

        try {
          const response =
            await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL || "https://krispy-skin.vercel.app"}/api/moderation/hide`,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                  "x-discord-moderation":
                    process.env.DISCORD_MODERATION_SECRET ||
                    ""
                },
                body:
                  JSON.stringify({
                    postId,
                    moderator:
                      username
                  })
              }
            );

          const result =
            await response
              .json()
              .catch(
                () => ({})
              );

          if (!response.ok) {
            console.error(
              "Hide post failed:",
              result
            );

            return discordResponse({
              type: 4,
              data: {
                content:
                  "Failed to hide the post.",
                flags: 64
              }
            });
          }

          return discordResponse({
            type: 4,
            data: {
              content:
                `Post \`${postId}\` has been hidden by ${username}.`,
              flags: 64
            }
          });
        } catch (error) {
          console.error(
            "Hide post error:",
            error
          );

          return discordResponse({
            type: 4,
            data: {
              content:
                "An error occurred while hiding the post.",
              flags: 64
            }
          });
        }
      }

      // ------------------------------------------------
      // DELETE POST
      // ------------------------------------------------

      if (
        customId.startsWith(
          "report_delete:"
        )
      ) {
        const postId =
          customId.substring(
            "report_delete:".length
          );

        if (!postId) {
          return discordResponse({
            type: 4,
            data: {
              content:
                "Missing post ID.",
              flags: 64
            }
          });
        }

        try {
          const response =
            await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL || "https://krispy-skin.vercel.app"}/api/moderation/delete`,
              {
                method: "DELETE",
                headers: {
                  "Content-Type":
                    "application/json",
                  "x-discord-moderation":
                    process.env.DISCORD_MODERATION_SECRET ||
                    ""
                },
                body:
                  JSON.stringify({
                    postId,
                    moderator:
                      username
                  })
              }
            );

          const result =
            await response
              .json()
              .catch(
                () => ({})
              );

          if (!response.ok) {
            console.error(
              "Delete post failed:",
              result
            );

            return discordResponse({
              type: 4,
              data: {
                content:
                  "Failed to delete the post.",
                flags: 64
              }
            });
          }

          return discordResponse({
            type: 4,
            data: {
              content:
                `Post \`${postId}\` has been deleted by ${username}.`,
              flags: 64
            }
          });
        } catch (error) {
          console.error(
            "Delete post error:",
            error
          );

          return discordResponse({
            type: 4,
            data: {
              content:
                "An error occurred while deleting the post.",
              flags: 64
            }
          });
        }
      }

      // ------------------------------------------------
      // UNKNOWN BUTTON
      // ------------------------------------------------

      return discordResponse({
        type: 4,
        data: {
          content:
            "Unknown moderation action.",
          flags: 64
        }
      });
    }

    // --------------------------------------------------
    // UNKNOWN INTERACTION
    // --------------------------------------------------

    return discordResponse({
      type: 4,
      data: {
        content:
          "Unsupported interaction.",
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
