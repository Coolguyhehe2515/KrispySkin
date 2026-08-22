"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  const canvasRef = useRef(null);
  const viewerRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState([]);
  const [uploading, setUploading] = useState(false);

  function log(message) {
    setDebug((old) => [
      ...old,
      `${new Date().toLocaleTimeString()} — ${message}`
    ]);
  }

  useEffect(() => {
    let destroyed = false;

    async function initialize() {
      try {
        log("Starting dashboard...");

        // Check login
        log("Checking KrispySkin session...");

        const response = await fetch("/api/auth/me", {
          cache: "no-store"
        });

        const data = await response.json();

        if (!response.ok || !data.authenticated) {
          log("❌ User is not authenticated.");
          router.replace("/login");
          return;
        }

        if (destroyed) return;

        setUser(data.user);

        log(`✓ Logged in as ${data.user.username}`);

        if (data.user.skinId) {
          log(`✓ Skin ID: ${data.user.skinId}`);
        } else {
          log("⚠ No active skin.");
        }

        // Wait until browser renders canvas
        log("Waiting for canvas...");

        await new Promise((resolve) =>
          requestAnimationFrame(resolve)
        );

        if (destroyed) return;

        if (!canvasRef.current) {
          throw new Error(
            "Canvas element was not found."
          );
        }

        log("✓ Canvas found.");

        // Dynamically import skinview3d
        log("Loading skinview3d...");

        const skinview3d =
          await import("skinview3d");

        log("✓ skinview3d imported.");

        if (
          !skinview3d ||
          !skinview3d.SkinViewer
        ) {
          throw new Error(
            "SkinViewer class was not found in skinview3d."
          );
        }

        log("✓ SkinViewer class found.");

        const viewer =
          new skinview3d.SkinViewer({
            canvas: canvasRef.current,
            width: 350,
            height: 500
          });

        viewerRef.current = viewer;

        log("✓ SkinViewer created.");

        viewer.controls.enableRotate = true;
        viewer.controls.enableZoom = true;
        viewer.controls.enablePan = false;

        viewer.camera.position.set(
          0,
          0,
          35
        );

        log("✓ Camera configured.");

        if (
          skinview3d.WalkingAnimation
        ) {
          viewer.animation =
            new skinview3d.WalkingAnimation();

          log("✓ Walking animation enabled.");
        } else {
          log(
            "⚠ WalkingAnimation unavailable."
          );
        }

        if (data.user.skinId) {
          const skinUrl =
            `/api/skin/${encodeURIComponent(
              data.user.skinId
            )}`;

          log(
            `Loading skin: ${skinUrl}`
          );

          await viewer.loadSkin(
            skinUrl
          );

          log("✓ Skin loaded successfully.");
        } else {
          log(
            "No skin to load."
          );
        }
      } catch (error) {
        console.error(error);

        log(
          `❌ ERROR: ${
            error?.message ||
            String(error)
          }`
        );

        if (
          error?.stack
        ) {
          log(
            `STACK: ${error.stack}`
          );
        }
      } finally {
        if (!destroyed) {
          setLoading(false);
          log("Dashboard initialization finished.");
        }
      }
    }

    initialize();

    return () => {
      destroyed = true;

      if (viewerRef.current) {
        try {
          viewerRef.current.dispose();
        } catch {}

        viewerRef.current = null;
      }
    };
  }, [router]);

  async function uploadSkin(event) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (file.type !== "image/png") {
      alert(
        "Only PNG files are allowed."
      );
      return;
    }

    if (
      file.size >
      2 * 1024 * 1024
    ) {
      alert(
        "Maximum file size is 2 MB."
      );
      return;
    }

    setUploading(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      log(
        "Uploading new skin..."
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

      log(
        `✓ Uploaded: ${data.skin.id}`
      );

      setUser((old) => ({
        ...old,
        skinId: data.skin.id
      }));

      if (
        viewerRef.current
      ) {
        log(
          "Updating 3D viewer..."
        );

        await viewerRef.current.loadSkin(
          `/api/skin/${encodeURIComponent(
            data.skin.id
          )}`
        );

        log(
          "✓ 3D viewer updated."
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

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "30px",
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
              "pre-wrap",
            background:
              "#f1f1f1",
            padding: "15px",
            borderRadius: "10px"
          }}
        >
          {debug.join("\n")}
        </pre>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "20px",
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
          width: "350px",
          maxWidth: "100%",
          height: "500px",
          background:
            "#eeeeee",
          border:
            "1px solid #cccccc",
          borderRadius:
            "14px",
          overflow: "hidden"
        }}
      >
        <canvas
          ref={canvasRef}
          width="350"
          height="500"
          style={{
            display: "block",
            width: "100%",
            height: "100%"
          }}
        />
      </div>

      <p>
        {user?.skinId
          ? `Active skin: ${user.skinId}`
          : "No active skin"}
      </p>

      <div
        style={{
          marginTop: "20px"
        }}
      >
        <strong>
          Upload new skin
        </strong>

        <br />

        <input
          type="file"
          accept="image/png"
          disabled={uploading}
          onChange={uploadSkin}
          style={{
            marginTop: "10px"
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
