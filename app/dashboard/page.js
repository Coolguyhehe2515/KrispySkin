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

  async function loadUser() {
    const response = await fetch(
      "/api/auth/me",
      {
        cache: "no-store"
      }
    );

    const data = await response.json();

    if (!response.ok || !data.authenticated) {
      router.replace("/login");
      return;
    }

    setUser(data.user);
  }

  async function uploadSkin(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.type !== "image/png") {
      setMessage("Only PNG files are allowed.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
        "/api/skin",
        {
          method: "POST",
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Upload failed.");
        return;
      }

      setMessage(
        `Skin uploaded: ${data.skin.id}`
      );

      await loadUser();

      if (viewerRef.current) {
        await viewerRef.current.loadSkin(
          `/api/skin/${encodeURIComponent(
            data.skin.id
          )}`
        );
      }
    } catch (error) {
      console.error(error);
      setMessage(
        "Failed to upload skin."
      );
    } finally {
      setUploading(false);

      event.target.value = "";
    }
  }

  useEffect(() => {
    async function initialize() {
      try {
        await loadUser();

        const viewer = new SkinViewer({
          canvas: canvasRef.current,
          width: 350,
          height: 500
        });

        viewerRef.current = viewer;

        viewer.camera.position.set(
          0,
          0,
          35
        );

        viewer.controls.enableRotate = true;
        viewer.controls.enableZoom = true;
        viewer.controls.enablePan = false;

        viewer.animation =
          new WalkingAnimation();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    initialize();

    return () => {
      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (
      user?.skinId &&
      viewerRef.current
    ) {
      viewerRef.current.loadSkin(
        `/api/skin/${encodeURIComponent(
          user.skinId
        )}`
      );
    }
  }, [user]);

  if (loading) {
    return (
      <main
        style={{
          padding: "30px",
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
        <strong>
          {user?.username}
        </strong>{" "}
        👋
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
            style={{
              display: "block",
              width: "100%",
              height: "500px"
            }}
          />
        </div>

        {!user?.skinId && (
          <p>
            You don't have an active skin yet.
          </p>
        )}

        <div
          style={{
            marginTop: "20px"
          }}
        >
          <label>
            <strong>
              Upload new skin
            </strong>

            <br />

            <input
              type="file"
              accept="image/png"
              onChange={uploadSkin}
              disabled={uploading}
              style={{
                marginTop: "10px"
              }}
            />
          </label>
        </div>

        {uploading && (
          <p>
            Uploading skin...
          </p>
        )}

        {message && (
          <p>
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
