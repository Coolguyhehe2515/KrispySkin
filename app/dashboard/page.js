"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  const canvas3DRef = useRef(null);
  const canvas2DRef = useRef(null);

  const viewer3DRef = useRef(null);
  const viewer2DRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState("3d");

  // --------------------------------------------------
  // Load account
  // --------------------------------------------------

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.authenticated) {
          router.replace("/login");
          return;
        }

        setUser(data.user);
      } catch (error) {
        console.error("Account error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  // --------------------------------------------------
  // 3D VIEWER
  // --------------------------------------------------

  useEffect(() => {
    if (
      loading ||
      !user ||
      viewMode !== "3d" ||
      !canvas3DRef.current
    ) {
      return;
    }

    let destroyed = false;

    async function create3DViewer() {
      try {
        const skinview3d = await import("skinview3d");

        if (destroyed) return;

        const viewer = new skinview3d.SkinViewer({
          canvas: canvas3DRef.current,
          width: 350,
          height: 500,
        });

        viewer3DRef.current = viewer;

        viewer.controls.enableRotate = true;
        viewer.controls.enableZoom = true;
        viewer.controls.enablePan = false;

        viewer.camera.position.set(0, 0, 35);

        if (skinview3d.WalkingAnimation) {
          viewer.animation =
            new skinview3d.WalkingAnimation();
        }

        if (user.skinId) {
          await viewer.loadSkin(
            `/api/skin/${encodeURIComponent(user.skinId)}`
          );
        }
      } catch (error) {
        console.error(
          "3D viewer error:",
          error
        );
      }
    }

    create3DViewer();

    return () => {
      destroyed = true;

      if (viewer3DRef.current) {
        try {
          viewer3DRef.current.dispose();
        } catch {}

        viewer3DRef.current = null;
      }
    };
  }, [loading, user, viewMode]);

  // --------------------------------------------------
  // 2D FRONT VIEW
  // --------------------------------------------------

  useEffect(() => {
    if (
      loading ||
      !user ||
      viewMode !== "2d" ||
      !canvas2DRef.current
    ) {
      return;
    }

    let destroyed = false;

    async function create2DViewer() {
      try {
        const skinview3d = await import("skinview3d");

        if (destroyed) return;

        const viewer = new skinview3d.SkinViewer({
          canvas: canvas2DRef.current,
          width: 350,
          height: 500,
        });

        viewer2DRef.current = viewer;

        // No animation in 2D mode
        viewer.animation = null;

        // Disable all interaction
        viewer.controls.enableRotate = false;
        viewer.controls.enableZoom = false;
        viewer.controls.enablePan = false;

        /*
         * Front-facing Minecraft player.
         *
         * skinview3d's default player faces the camera.
         * Keep the camera centered and lock interaction.
         */
        viewer.camera.position.set(
          0,
          0,
          35
        );

        viewer.camera.lookAt(
          0,
          0,
          0
        );

        if (user.skinId) {
          await viewer.loadSkin(
            `/api/skin/${encodeURIComponent(user.skinId)}`
          );
        }
      } catch (error) {
        console.error(
          "2D viewer error:",
          error
        );
      }
    }

    create2DViewer();

    return () => {
      destroyed = true;

      if (viewer2DRef.current) {
        try {
          viewer2DRef.current.dispose();
        } catch {}

        viewer2DRef.current = null;
      }
    };
  }, [loading, user, viewMode]);

  // --------------------------------------------------
  // Upload
  // --------------------------------------------------

  async function uploadSkin(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.type !== "image/png") {
      alert("Only PNG files are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("Maximum skin size is 2 MB.");
      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
        "/api/skin",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error || "Upload failed."
        );

        return;
      }

      const skinId = data.skin.id;

      setUser((oldUser) => ({
        ...oldUser,
        skinId,
      }));

      /*
       * Immediately update whichever viewer
       * is currently active.
       */

      if (
        viewMode === "3d" &&
        viewer3DRef.current
      ) {
        await viewer3DRef.current.loadSkin(
          `/api/skin/${encodeURIComponent(
            skinId
          )}`
        );
      }

      if (
        viewMode === "2d" &&
        viewer2DRef.current
      ) {
        await viewer2DRef.current.loadSkin(
          `/api/skin/${encodeURIComponent(
            skinId
          )}`
        );
      }
    } catch (error) {
      console.error(
        "Upload error:",
        error
      );

      alert(
        "Failed to upload skin."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1>
          Loading KrispySkin...
        </h1>
      </main>
    );
  }

  // --------------------------------------------------
  // Dashboard
  // --------------------------------------------------

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "30px",
        fontFamily: "Arial, sans-serif",
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

      {/* VIEW SWITCHER */}

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "15px",
        }}
      >
        <button
          onClick={() =>
            setViewMode("3d")
          }
          style={{
            padding: "10px 22px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            cursor: "pointer",
            fontWeight:
              viewMode === "3d"
                ? "bold"
                : "normal",
          }}
        >
          3D
        </button>

        <button
          onClick={() =>
            setViewMode("2d")
          }
          style={{
            padding: "10px 22px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            cursor: "pointer",
            fontWeight:
              viewMode === "2d"
                ? "bold"
                : "normal",
          }}
        >
          2D
        </button>
      </div>

      {/* 3D */}

      {viewMode === "3d" && (
        <div
          style={{
            width: "350px",
            maxWidth: "100%",
            height: "500px",
            background: "#eeeeee",
            border: "1px solid #cccccc",
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          <canvas
            ref={canvas3DRef}
            width={350}
            height={500}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      )}

      {/* 2D FRONT PLAYER */}

      {viewMode === "2d" && (
        <div
          style={{
            width: "350px",
            maxWidth: "100%",
            height: "500px",
            background: "#eeeeee",
            border: "1px solid #cccccc",
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          <canvas
            ref={canvas2DRef}
            width={350}
            height={500}
            style={{
              display: "block",
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      )}

      <p>
        {user?.skinId
          ? `Active skin: ${user.skinId}`
          : "No active skin"}
      </p>

      {/* UPLOAD */}

      <div
        style={{
          marginTop: "20px",
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
            marginTop: "10px",
          }}
        />
      </div>
    </main>
  );
}
