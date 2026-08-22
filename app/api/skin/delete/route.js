import { NextResponse } from "next/server";
import clientPromise from "../../../../lib/mongodb";

export const runtime = "nodejs";

export async function DELETE(request) {
  try {
    const sessionToken =
      request.cookies.get("krispyskin_session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated"
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const skinId = body?.skinId;

    if (!skinId) {
      return NextResponse.json(
        {
          success: false,
          error: "skinId is required"
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("krispyskin");

    const session = await db.collection("sessions").findOne({
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

    const user = await db.collection("users").findOne({
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

    // Only the owner can delete the skin.
    const skin = await db.collection("skins").findOne({
      id: skinId,
      userId: user.id
    });

    if (!skin) {
      return NextResponse.json(
        {
          success: false,
          error: "Skin not found or you do not own it"
        },
        { status: 404 }
      );
    }

    // Delete the actual skin data.
    await db.collection("skins").deleteOne({
      id: skinId,
      userId: user.id
    });

    // Remove it from the user's saved skin list.
    await db.collection("users").updateOne(
      {
        id: user.id
      },
      {
        $pull: {
          skins: skinId
        }
      }
    );

    // Remove community posts belonging to this skin.
    await db.collection("posts").deleteMany({
      skinId,
      userId: user.id
    });

    // If the deleted skin was active,
    // select another saved skin if available.
    if (user.skinId === skinId) {
      const remainingSkin =
        await db.collection("skins").findOne(
          {
            userId: user.id
          },
          {
            sort: {
              createdAt: -1
            }
          }
        );

      await db.collection("users").updateOne(
        {
          id: user.id
        },
        {
          $set: {
            skinId: remainingSkin?.id || null,
            updatedAt: new Date()
          }
        }
      );
    } else {
      await db.collection("users").updateOne(
        {
          id: user.id
        },
        {
          $set: {
            updatedAt: new Date()
          }
        }
      );
    }

    return NextResponse.json({
      success: true,
      deletedSkin: skinId,
      message: "Skin deleted successfully"
    });
  } catch (error) {
    console.error(
      "KrispySkin delete skin error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete skin"
      },
      { status: 500 }
    );
  }
        }
