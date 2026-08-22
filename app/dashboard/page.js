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
  const [skins, setSkins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loadingSkin, setLoadingSkin] = useState(null);
  const [viewMode, setViewMode] = useState("3d");

  // --------------------------------------------------
  // LOAD ACCOUNT + SKIN LIBRARY
  // --------------------------------------------------

  useEffect(() => {
    async function loadData() {
      try {
        const meResponse = await fetch(
          "/api/auth/me",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store"
          }
        );

        const meData = await meResponse.json();

        if (
          !meResponse.ok ||
          !meData.authenticated
        ) {
          router.replace("/login");
          return;
        }

        setUser(meData.user);

        const libraryResponse = await fetch(
          "/api/skin/library",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store"
          }
        );

        const libraryData =
          await libraryResponse.json();

        if (libraryResponse.ok) {
          setSkins(libraryData.skins || []);

          setUser((oldUser) => ({
            ...oldUser,
            skinId:
              libraryData.activeSkin ||
              oldUser.skinId ||
              null
          }));
        }
      } catch (error) {
        console.error(
          "Dashboard error:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
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

    async function createViewer() {
      try {
        const skinview3d =
          await import("skinview3d");

        if (destroyed) return;

        const viewer =
          new skinview3d.SkinViewer({
            canvas: canvas3DRef.current,
            width: 350,
            height: 500
          });

        viewer3DRef.current = viewer;

        viewer.controls.enableRotate = true;
        viewer.controls.enableZoom = true;
        viewer.controls.enablePan = false;

        viewer.camera.position.set(
          0,
          0,
          35
        );

        if (skinview3d.WalkingAnimation) {
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

      if (viewer3DRef.current) {
        try {
          viewer3DRef.current.dispose();
        } catch {}

        viewer3DRef.current = null;
      }
    };
  }, [
    loading,
    user?.skinId,
    viewMode
  ]);

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

    async function createViewer() {
      try {
        const skinview3d =
          await import("skinview3d");

        if (destroyed) return;

        const viewer =
          new skinview3d.SkinViewer({
            canvas: canvas2DRef.current,
            width: 350,
            height: 500
          });

        viewer2DRef.current = viewer;

        viewer.controls.enableRotate = false;
        viewer.controls.enableZoom = false;
        viewer.controls.enablePan = false;

        viewer.animation = null;

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
            `/api/skin/${encodeURIComponent(
              user.skinId
            )}`
          );
        }
      } catch (error) {
        console.error(
          "2D viewer error:",
          error
        );
      }
    }

    createViewer();

    return () => {
      destroyed = true;

      if (viewer2DRef.current) {
        try {
          viewer2DRef.current.dispose();
        } catch {}

        viewer2DRef.current = null;
      }
    };
  }, [
    loading,
    user?.skinId,
    viewMode
  ]);

  // --------------------------------------------------
  // UPLOAD
  // --------------------------------------------------

  async function uploadSkin(event) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    if (file.type !== "image/png") {
      alert(
        "Only PNG files are allowed."
      );

      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
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
            credentials: "include",
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

      setSkins((oldSkins) => {
        if (
          oldSkins.includes(
            skinId
          )
        ) {
          return oldSkins;
        }

        return [
          ...oldSkins,
          {
            id: skinId,
            filename:
              data.skin.filename,
            model:
              data.skin.model,
            size:
              data.skin.size
          }
        ];
      });

      setUser((oldUser) => ({
        ...oldUser,
        skinId
      }));

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
  // LOAD SAVED SKIN
  // --------------------------------------------------

  async function loadSkin(skinId) {
    if (
      skinId === user?.skinId
    ) {
      return;
    }

    setLoadingSkin(skinId);

    try {
      const response =
        await fetch(
          "/api/skin/load",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              skinId
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Failed to load skin."
        );
        return;
      }

      setUser((oldUser) => ({
        ...oldUser,
        skinId:
          data.activeSkin
      }));
    } catch (error) {
      console.error(
        "Load skin error:",
        error
      );

      alert(
        "Failed to load skin."
      );
    } finally {
      setLoadingSkin(null);
    }
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
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

  // --------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------

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
          marginBottom: "15px"
        }}
      >
        <button
          onClick={() =>
            setViewMode("3d")
          }
          style={{
            padding:
              "10px 22px",
            borderRadius: "8px",
            border:
              "1px solid #ccc",
            cursor: "pointer",
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
              "10px 22px",
            borderRadius: "8px",
            border:
              "1px solid #ccc",
            cursor: "pointer",
            fontWeight:
              viewMode === "2d"
                ? "bold"
                : "normal"
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
            ref={canvas3DRef}
            width={350}
            height={500}
            style={{
              display: "block",
              width: "100%",
              height: "100%"
            }}
          />
        </div>
      )}

      {/* 2D */}

      {viewMode === "2d" && (
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
            ref={canvas2DRef}
            width={350}
            height={500}
            style={{
              display: "block",
              width: "100%",
              height: "100%"
            }}
          />
        </div>
      )}

      <p>
        Active Skin:{" "}
        <strong>
          {user?.skinId ||
            "None"}
        </strong>
      </p>

      {/* UPLOAD */}

      <div
        style={{
          marginTop: "20px"
        }}
      >
        <strong>
          Upload New Skin
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

      {/* MY SKINS */}

      <section
        style={{
          marginTop: "35px"
        }}
      >
        <h2>
          My Skins
        </h2>

        {skins.length === 0 ? (
          <p>
            You haven't saved
            any skins yet.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "15px"
            }}
          >
            {skins.map(
              (skin) => {
                const skinId =
                  typeof skin ===
                  "string"
                    ? skin
                    : skin.id;

                const filename =
                  typeof skin ===
                  "string"
                    ? skin
                    : skin.filename;

                const active =
                  skinId ===
                  user?.skinId;

                return (
                  <div
                    key={skinId}
                    style={{
                      padding: "15px",
                      border:
                        "1px solid #ccc",
                      borderRadius:
                        "12px",
                      background:
                        active
                          ? "#e9ffe9"
                          : "#fff"
                    }}
                  >
                    <strong>
                      {active
                        ? "Active Skin"
                        : "Saved Skin"}
                    </strong>

                    <div
                      style={{
                        marginTop:
                          "6px",
                        fontSize:
                          "12px",
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap"
                      }}
                    >
                      {filename ||
                        skinId}
                    </div>

                    <div
                      style={{
                        marginTop:
                          "10px"
                      }}
                    >
                      <button
                        disabled={
                          active ||
                          loadingSkin ===
                            skinId
                        }
                        onClick={() =>
                          loadSkin(
                            skinId
                          )
                        }
                        style={{
                          padding:
                            "8px 14px",
                          borderRadius:
                            "7px",
                          border:
                            "1px solid #ccc",
                          cursor:
                            active
                              ? "default"
                              : "pointer"
                        }}
                      >
                        {active
                          ? "Active"
                          : loadingSkin ===
                              skinId
                            ? "Loading..."
                            : "Load"}
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>
    </main>
  );
          }
