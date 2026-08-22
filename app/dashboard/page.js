"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SkinViewer,
  WalkingAnimation
} from "skinview3d";

export default function Dashboard() {
  const router = useRouter();
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let viewer;
    let cancelled = false;

    async function initialize() {
      try {
        // 1. Check login
        const response = await fetch("/api/auth/me", {
          cache: "no-store"
        });

        const data = await response.json();

        if (!response.ok || !data.authenticated) {
          router.replace("/login");
          return;
        }

        if (cancelled) return;

        setUser(data.user);

        // 2. Create Minecraft 3D viewer
        viewer = new SkinViewer({
          canvas: canvasRef.current,
          width: 350,
          height: 500
        });

        viewerRef.current = viewer;

        viewer.camera.position.set(0, 0, 35);

        viewer.controls.enableRotate = true;
        viewer.controls.enableZoom = true;
        viewer.controls.enablePan = false;

        viewer.animation = new WalkingAnimation();

        // 3. Load the user's saved skin
        if (data.user.skinId) {
          const skinUrl =
            `/api/skin/${encodeURIComponent(data.user.skinId)}`;

          await viewer.loadSkin(skinUrl);

          if (!cancelled) {
            setMessage("Skin loaded successfully.");
          }
        } else {
          if (!cancelled) {
            setMessage("You don't have an active skin yet.");
          }
        }
      } catch (error) {
        console.error("Dashboard error:", error);

        if (!cancelled) {
          setMessage("Failed to load your skin.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;

      if (viewer) {
        viewer.dispose();
      }

      viewerRef.current = null;
    };
  }, [router]);

  async function uploadSkin(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.type !== "image/png") {
      setMessage("Only PNG files are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Maximum skin size is 2 MB.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setMessage("Uploading skin...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/skin", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Upload failed.");
        return;
      }

      const skinId = data.skin.id;

      // Update the 3D viewer immediately
      if (viewerRef.current) {
        await viewerRef.current.loadSkin(
          `/api/skin/${encodeURIComponent(skinId)}`
        );
      }

      // Update local user state
      setUser((currentUser) => ({
        ...currentUser,
        skinId
      }));

      setMessage(
        `Skin uploaded successfully: ${skinId}`
      );
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("Failed to upload skin.");
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
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Arial, sans-serif"
        }}
      >
        <h1>Loading KrispySkin...</h1>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "30px",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <h1>KrispySkin Dashboard</h1>

      <p>
        Welcome,{" "}
        <strong>{user?.username}</strong> 👋
      </p>

      <section
        style={{
          marginTop: "30px"
        }}
      >
        <h2>Your Skin</h2>

        <div
          style={{
            width: "350px",
            maxWidth: "100%",
            border: "1px solid #ddd",
            borderRadius: "14px",
            overflow: "hidden"
          }}
        >
          <canvas
            ref={canvasRef}
            width={350}
            height={500}
            style={{
              display: "block",
              width: "100%",
              height: "500px"
            }}
          />
        </div>

        <p>
          {user?.skinId
            ? `Active skin: ${user.skinId}`
            : "No active skin"}
        </p>

        <div style={{ marginTop: "20px" }}>
          <label>
            <strong>Upload new skin</strong>

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
          </label>
        </div>

        {uploading && (
          <p>Uploading...</p>
        )}

        {message && (
          <p>{message}</p>
        )}
      </section>
    </main>
  );
          }
