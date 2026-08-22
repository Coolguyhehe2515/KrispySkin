"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  const canvasRef = useRef(null);
  const viewerRef = useRef(null);

  const [user, setUser] = useState(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [debug, setDebug] = useState([]);

  function log(message) {
    setDebug((old) => [
      ...old,
      `${new Date().toLocaleTimeString()} — ${message}`
    ]);
  }

  // --------------------------------------------------
  // Load user
  // --------------------------------------------------

  useEffect(() => {
    async function loadUser() {
      try {
        log("Checking KrispySkin session...");

        const response = await fetch(
          "/api/auth/me",
          {
            cache: "no-store"
          }
        );

        const data = await response.json();

        if (
          !response.ok ||
          !data.authenticated
        ) {
          log(
            "❌ User is not authenticated."
          );

          router.replace("/login");
          return;
        }

        setUser(data.user);

        log(
          `✓ Logged in as ${data.user.username}`
        );

        if (data.user.skinId) {
          log(
            `✓ Skin ID: ${data.user.skinId}`
          );
        } else {
          log(
            "⚠ No active skin."
          );
        }
      } catch (error) {
        log(
          `❌ Session error: ${
            error?.message ||
            String(error)
          }`
        );
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  // --------------------------------------------------
  // Create 3D viewer AFTER canvas exists
  // --------------------------------------------------

  useEffect(() => {
    if (loading) return;

    if (!user) return;

    if (!canvasRef.current) {
      log(
        "❌ Canvas still unavailable."
      );
      return;
    }

    let destroyed = false;

    async function createViewer() {
      try {
        log(
          "Loading skinview3d..."
        );

        const skinview3d =
          await import(
            "skinview3d"
          );

        if (destroyed) return;

        log(
          "✓ skinview3d imported."
        );

        if (
          !skinview3d.SkinViewer
        ) {
          throw new Error(
            "SkinViewer class not found."
          );
        }

        log(
          "✓ SkinViewer class found."
        );

        const viewer =
          new skinview3d.SkinViewer({
            canvas:
              canvasRef.current,
            width: 350,
            height: 500
          });

        viewerRef.current =
          viewer;

        log(
          "✓ SkinViewer created."
        );

        viewer.controls.enableRotate =
          true;

        viewer.controls.enableZoom =
          true;

        viewer.controls.enablePan =
          false;

        viewer.camera.position.set(
          0,
          0,
          35
        );

        log(
          "✓ Camera configured."
        );

        if (
          skinview3d.WalkingAnimation
        ) {
          viewer.animation =
            new skinview3d.WalkingAnimation();

          log(
            "✓ Walking animation enabled."
          );
        }

        setViewerReady(true);

        // Load existing skin
        if (user.skinId) {
          const skinUrl =
            `/api/skin/${encodeURIComponent(
              user.skinId
            )}`;

          log(
            `Loading skin: ${skinUrl}`
          );

          await viewer.loadSkin(
            skinUrl
          );

          if (!destroyed) {
            log(
              "✓ Skin loaded successfully."
            );
          }
        } else {
          log(
            "No skin to load."
          );
        }
      } catch (error) {
        log(
          `❌ 3D ERROR: ${
            error?.message ||
            String(error)
          }`
        );

        if (error?.stack) {
          log(
            `STACK: ${error.stack}`
          );
        }
      }
    }

    createViewer();

    return () => {
      destroyed = true;

      if (viewerRef.current) {
        try {
          viewerRef.current.dispose();
        } catch {}

        viewerRef.current =
          null;
      }

      setViewerReady(false);
    };
  }, [loading, user]);

  // --------------------------------------------------
  // Upload skin
  // --------------------------------------------------

  async function uploadSkin(event) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (
      file.type !==
      "image/png"
    ) {
      log(
        "❌ Only PNG files are allowed."
      );

      event.target.value = "";
      return;
    }

    if (
      file.size >
      2 * 1024 * 1024
    ) {
      log(
        "❌ Maximum skin size is 2 MB."
      );

      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      log(
        "Uploading new skin..."
      );

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/skin",
          {
            method: "POST",
            body: formData
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        log(
          `❌ Upload failed: ${
            data.error ||
            "Unknown error"
          }`
        );

        return;
      }

      const skinId =
        data.skin.id;

      log(
        `✓ Uploaded: ${skinId}`
      );

      setUser((oldUser) => ({
        ...oldUser,
        skinId
      }));

      // Immediately update 3D model
      if (
        viewerRef.current
      ) {
        log(
          "Updating 3D viewer..."
        );

        await viewerRef.current.loadSkin(
          `/api/skin/${encodeURIComponent(
            skinId
          )}`
        );

        log(
          "✓ 3D viewer updated."
        );
      } else {
        log(
          "⚠ Viewer is not ready yet."
        );
      }
    } catch (error) {
      log(
        `❌ Upload error: ${
          error?.message ||
          String(error)
        }`
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  // --------------------------------------------------
  // Loading screen
  // --------------------------------------------------

  if (loading) {
    return (
      <main
        style={{
          minHeight:
            "100vh",
          padding:
            "30px",
          fontFamily:
            "Arial, sans-serif"
        }}
      >
        <h1>
          Loading KrispySkin...
        </h1>

        <pre
          style={{
            whiteSpace:
              "pre-wrap"
          }}
        >
          {debug.join("\n")}
        </pre>
      </main>
    );
  }

  // --------------------------------------------------
  // Dashboard
  // --------------------------------------------------

  return (
    <main
      style={{
        minHeight:
          "100vh",
        padding:
          "20px",
        fontFamily:
          "Arial, sans-serif"
      }}
    >
      <h1>
        KrispySkin Dashboard
      </h1>

      <p>
        Welcome,{" "}
        <strong>
          {user?.username}
        </strong>{" "}
        👋
      </p>

      <h2>
        Your Skin
      </h2>

      <div
        style={{
          width:
            "350px",
          maxWidth:
            "100%",
          height:
            "500px",
          background:
            "#eeeeee",
          border:
            "1px solid #cccccc",
          borderRadius:
            "14px",
          overflow:
            "hidden"
        }}
      >
        <canvas
          ref={canvasRef}
          width={350}
          height={500}
          style={{
            display:
              "block",
            width:
              "100%",
            height:
              "100%"
          }}
        />
      </div>

      <p>
        {user?.skinId
          ? `Active skin: ${user.skinId}`
          : "No active skin"}
      </p>

      <p>
        {viewerReady
          ? "🟢 3D viewer ready"
          : "🟡 Starting 3D viewer..."}
      </p>

      <div
        style={{
          marginTop:
            "20px"
        }}
      >
        <strong>
          Upload new skin
        </strong>

        <br />

        <input
          type="file"
          accept="image/png"
          disabled={
            uploading
          }
          onChange={
            uploadSkin
          }
          style={{
            marginTop:
              "10px"
          }}
        />
      </div>

      <hr
        style={{
          margin:
            "30px 0"
        }}
      />

      <h2>
        3D Debug
      </h2>

      <pre
        style={{
          whiteSpace:
            "pre-wrap",
          overflowWrap:
            "anywhere",
          background:
            "#111",
          color:
            "#fff",
          padding:
            "15px",
          borderRadius:
            "10px",
          fontSize:
            "12px"
        }}
      >
        {debug.length
          ? debug.join("\n")
          : "No debug information yet."}
      </pre>
    </main>
  );
        }
