"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  const canvasRef = useRef(null);
  const viewerRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState("3d");

  useEffect(() => {
    async function loadUser() {
      try {
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
          router.replace("/login");
          return;
        }

        setUser(data.user);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  useEffect(() => {
    if (
      loading ||
      !user ||
      viewMode !== "3d"
    ) {
      return;
    }

    if (!canvasRef.current) {
      return;
    }

    let destroyed = false;

    async function createViewer() {
      try {
        const skinview3d =
          await import("skinview3d");

        if (destroyed) {
          return;
        }

        const viewer =
          new skinview3d.SkinViewer({
            canvas: canvasRef.current,
            width: 350,
            height: 500
          });

        viewerRef.current = viewer;

        viewer.controls.enableRotate = true;
        viewer.controls.enableZoom = true;
        viewer.controls.enablePan = false;

        viewer.camera.position.set(
          0,
          0,
          35
        );

        if (
          skinview3d.WalkingAnimation
        ) {
          viewer.animation =
            new skinview3d.WalkingAnimation();
        }

        if (user.skinId) {
          await viewer.loadSkin(
            `/api/skin/${encodeURIComponent(
              user.skinId
            )}`
          );
        }
      } catch (error) {
        console.error(
          "3D viewer error:",
          error
        );
      }
    }

    createViewer();

    return () => {
      destroyed = true;

      if (viewerRef.current) {
        try {
          viewerRef.current.dispose();
        } catch {}

        viewerRef.current = null;
      }
    };
  }, [
    loading,
    user,
    viewMode
  ]);

  async function uploadSkin(event) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      file.type !==
      "image/png"
    ) {
      alert(
        "Only PNG files are allowed."
      );

      event.target.value = "";
      return;
    }

    if (
      file.size >
      2 * 1024 * 1024
    ) {
      alert(
        "Maximum skin size is 2 MB."
      );

      event.target.value = "";
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
        alert(
          data.error ||
          "Upload failed."
        );

        return;
      }

      const skinId =
        data.skin.id;

      setUser((oldUser) => ({
        ...oldUser,
        skinId
      }));

      if (
        viewerRef.current
      ) {
        await viewerRef.current.loadSkin(
          `/api/skin/${encodeURIComponent(
            skinId
          )}`
        );
      }
    } catch (error) {
      console.error(error);

      alert(
        "Failed to upload skin."
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
          minHeight:
            "100vh",
          display:
            "flex",
          justifyContent:
            "center",
          alignItems:
            "center",
          fontFamily:
            "Arial, sans-serif"
        }}
      >
        <h1>
          Loading KrispySkin...
        </h1>
      </main>
    );
  }

  const skinUrl = user?.skinId
    ? `/api/skin/${encodeURIComponent(
        user.skinId
      )}`
    : null;

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

      {/* View mode buttons */}
      <div
        style={{
          display:
            "flex",
          gap:
            "10px",
          marginBottom:
            "15px"
        }}
      >
        <button
          onClick={() =>
            setViewMode("3d")
          }
          style={{
            padding:
              "10px 20px",
            borderRadius:
              "8px",
            border:
              "1px solid #ccc",
            cursor:
              "pointer",
            fontWeight:
              viewMode === "3d"
                ? "bold"
                : "normal"
          }}
        >
          3D
        </button>

        <button
          onClick={() =>
            setViewMode("2d")
          }
          style={{
            padding:
              "10px 20px",
            borderRadius:
              "8px",
            border:
              "1px solid #ccc",
            cursor:
              "pointer",
            fontWeight:
              viewMode === "2d"
                ? "bold"
                : "normal"
          }}
        >
          2D
        </button>
      </div>

      {/* 3D VIEW */}
      {viewMode === "3d" && (
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
      )}

      {/* 2D VIEW */}
      {viewMode === "2d" && (
        <div
          style={{
            width:
              "350px",
            maxWidth:
              "100%",
            height:
              "500px",
            display:
              "flex",
            justifyContent:
              "center",
            alignItems:
              "center",
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
          {skinUrl ? (
            <img
              src={skinUrl}
              alt="Minecraft Skin"
              style={{
                imageRendering:
                  "pixelated",
                width:
                  "256px",
                height:
                  "256px",
                objectFit:
                  "contain"
              }}
            />
          ) : (
            <p>
              No active skin
            </p>
          )}
        </div>
      )}

      <p>
        {user?.skinId
          ? `Active skin: ${user.skinId}`
          : "No active skin"}
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
    </main>
  );
                }
