import { NextResponse } from "next/server";
import crypto from "crypto";
import clientPromise from "../../../lib/mongodb";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

export async function POST(request) {
  try {
    // ---------------------------------------------
    // CHECK LOGIN SESSION
    // ---------------------------------------------

    const sessionToken =
      request.cookies.get("krispyskin_session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          error: "You must be logged in to upload a skin"
        },
        { status: 401 }
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
          error:
            "Your session has expired. Please login again."
        },
        { status: 401 }
      );
    }

    // ---------------------------------------------
    // FIND USER
    // ---------------------------------------------

    const user = await db.collection("users").findOne({
      id: session.userId
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User account not found"
        },
        { status: 401 }
      );
    }

    // ---------------------------------------------
    // READ FILE
    // ---------------------------------------------

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No PNG file provided"
        },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file"
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------
    // VALIDATE PNG
    // ---------------------------------------------

    if (file.type !== "image/png") {
      return NextResponse.json(
        {
          success: false,
          error: "Only PNG files are allowed"
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error:
            "File is too large. Maximum size is 2 MB."
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pngSignature = Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a
    ]);

    if (
      buffer.length < 8 ||
      !buffer.subarray(0, 8).equals(pngSignature)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid PNG file"
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------
    // GENERATE SKIN ID
    // ---------------------------------------------

    const skinId =
      `ks_${crypto.randomBytes(8).toString("hex")}`;

    // ---------------------------------------------
    // SAVE SKIN
    // ---------------------------------------------

    await db.collection("skins").insertOne({
      id: skinId,
      userId: user.id,
      filename: file.name,
      contentType: "image/png",
      size: file.size,
      data: buffer.toString("base64"),
      model: "classic",
      createdAt: new Date()
    });

    // ---------------------------------------------
    // ADD TO USER SKIN LIBRARY
    //
    // $addToSet = don't duplicate the same ID
    // ---------------------------------------------

    await db.collection("users").updateOne(
      {
        id: user.id
      },
      {
        $set: {
          skinId: skinId,
          updatedAt: new Date()
        },
        $addToSet: {
          skins: skinId
        }
      }
    );

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return NextResponse.json(
      {
        success: true,
        service: "KrispySkin",
        version: "0.1.0",

        skin: {
          id: skinId,
          filename: file.name,
          type: "image/png",
          size: file.size,
          model: "classic"
        },

        message:
          "Skin uploaded and added to your skin library"
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "KrispySkin skin upload error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Failed to store skin"
      },
      { status: 500 }
    );
  }
},
