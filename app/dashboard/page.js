"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_PROFILE_PICTURE =
  "https://i.postimg.cc/JhwdnS9p/651c6da502353948bdc929f02da2b8e0.jpg";

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
  const [deletingSkin, setDeletingSkin] = useState(null);
  const [postingSkin, setPostingSkin] = useState(null);

  const [viewMode, setViewMode] = useState("3d");
  const [darkMode, setDarkMode] = useState(false);

  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [postModalSkin, setPostModalSkin] = useState(null);

  const profilePicture =
    user?.profilePicture || DEFAULT_PROFILE_PICTURE;

  // --------------------------------------------------
  // THEME
  // --------------------------------------------------

  useEffect(() => {
    function updateTheme() {
      const saved =
        localStorage.getItem("krispy_theme") || "system";

      const dark =
        saved === "dark" ||
        (
          saved === "system" &&
          window.matchMedia(
            "(prefers-color-scheme: dark)"
          ).matches
        );

      setDarkMode(dark);
    }

    updateTheme();

    const media = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    media.addEventListener("change", updateTheme);
    window.addEventListener("storage", updateTheme);

    return () => {
      media.removeEventListener("change", updateTheme);
      window.removeEventListener("storage", updateTheme);
    };
  }, []);

  const colors = darkMode
    ? {
        background: "#111",
        text: "#eee",
        muted: "#aaa",
        card: "#1c1c1c",
        input: "#252525",
        border: "#444",
        button: "#2b2b2b",
        viewer: "#202020",
        active: "#183d22"
      }
    : {
        background: "#fff",
        text: "#171717",
        muted: "#666",
        card: "#fff",
        input: "#fff",
        border: "#ccc",
        button: "#fff",
        viewer: "#eeeeee",
        active: "#e9ffe9"
      };

  // --------------------------------------------------
  // LOAD ACCOUNT + SKINS
  // --------------------------------------------------

  useEffect(() => {
    async function loadData() {
      try {
        // Use the same profile endpoint that already
        // correctly identifies the logged-in account.
        const profileResponse = await fetch(
          "/api/account/profile",
          {
            method: "GET",
            credentials: "include",
            cache: "no-store"
          }
        );

        const profileData =
          await profileResponse.json();

        if (
          !profileResponse.ok ||
          !profileData.success
        ) {
          router.replace("/login");
          return;
        }

        const account =
          profileData.user || profileData.profile;

        if (!account) {
          router.replace("/login");
          return;
        }

        setUser(account);

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

        viewer.camera.position.set(0, 0, 35);

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
  // 2D VIEWER
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

        viewer.camera.position.set(0, 0, 35);
        viewer.camera.lookAt(0, 0, 0);

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
  // UPLOAD SKIN
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
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
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

      setSkins((oldSkins) => [
        {
          id: skinId,
          filename: data.skin.filename,
          model: data.skin.model,
          size: data.skin.size
        },
        ...oldSkins.filter((skin) => {
          const id =
            typeof skin === "string"
              ? skin
              : skin.id;

          return id !== skinId;
        })
      ]);

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
  // LOAD SKIN
  // --------------------------------------------------

  async function loadSkin(skinId) {
    if (skinId === user?.skinId) {
      return;
    }

    setLoadingSkin(skinId);

    try {
      const response = await fetch(
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
        skinId: data.activeSkin
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
  // DELETE SKIN
  // --------------------------------------------------

  async function deleteSkin(skinId) {
    const confirmed =
      window.confirm(
        "Delete this skin permanently?\n\nThe skin will also be removed from the Community."
      );

    if (!confirmed) return;

    setDeletingSkin(skinId);

    try {
      const response = await fetch(
        "/api/skin/delete",
        {
          method: "DELETE",
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
            "Failed to delete skin."
        );
        return;
      }

      setSkins((oldSkins) =>
        oldSkins.filter((skin) => {
          const id =
            typeof skin === "string"
              ? skin
              : skin.id;

          return id !== skinId;
        })
      );

      setUser((oldUser) => ({
        ...oldUser,
        skinId:
          data.activeSkin || null
      }));

      if (postModalSkin === skinId) {
        setPostModalSkin(null);
      }
    } catch (error) {
      console.error(
        "Delete skin error:",
        error
      );

      alert(
        "Failed to delete skin."
      );
    } finally {
      setDeletingSkin(null);
    }
  }

  // --------------------------------------------------
  // POST MODAL
  // --------------------------------------------------

  function openPostModal(skinId) {
    setPostTitle("");
    setPostDescription("");
    setPostModalSkin(skinId);
  }

  // --------------------------------------------------
  // POST SKIN
  // --------------------------------------------------

  async function postSkin() {
    if (!postModalSkin) return;

    if (!postTitle.trim()) {
      alert(
        "Please enter a title."
      );
      return;
    }

    setPostingSkin(postModalSkin);

    try {
      const response = await fetch(
        "/api/posts",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            skinId: postModalSkin,
            title: postTitle.trim(),
            description:
              postDescription.trim()
          })
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Failed to post skin."
        );
        return;
      }

      alert(
        "Skin posted successfully!"
      );

      setPostModalSkin(null);
      setPostTitle("");
      setPostDescription("");
    } catch (error) {
      console.error(
        "Post skin error:",
        error
      );

      alert(
        "Failed to post skin."
      );
    } finally {
      setPostingSkin(null);
    }
  }

  // --------------------------------------------------
  // COMMON STYLES
  // --------------------------------------------------

  const pageStyle = {
    minHeight: "100vh",
    padding: "30px",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
    background: colors.background,
    color: colors.text,
    transition:
      "background 0.2s ease, color 0.2s ease"
  };

  const buttonStyle = {
    padding: "10px 16px",
    borderRadius: "8px",
    border:
      `1px solid ${colors.border}`,
    background: colors.button,
    color: colors.text,
    cursor: "pointer",
    fontWeight: "600"
  };

  const smallButtonStyle = {
    padding: "8px 12px",
    borderRadius: "7px",
    border:
      `1px solid ${colors.border}`,
    background: colors.button,
    color: colors.text,
    cursor: "pointer"
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px",
    border:
      `1px solid ${colors.border}`,
    borderRadius: "8px",
    background: colors.input,
    color: colors.text
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <main
        style={{
          ...pageStyle,
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
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
    <main style={pageStyle}>
      {/* PROFILE HEADER */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: "20px",
          marginBottom: "30px",
          flexWrap: "wrap"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px"
          }}
        >
          <button
            type="button"
            onClick={() =>
              router.push(
                "/account/settings"
              )
            }
            title="Account Settings"
            style={{
              width: "64px",
              height: "64px",
              padding: 0,
              border: "none",
              borderRadius: "50%",
              overflow: "hidden",
              background: colors.viewer,
              cursor: "pointer",
              flexShrink: 0
            }}
          >
            <img
              src={profilePicture}
              alt="Profile"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block"
              }}
              onError={(event) => {
                event.currentTarget.src =
                  DEFAULT_PROFILE_PICTURE;
              }}
            />
          </button>

          <div>
            <h1
              style={{
                margin: 0
              }}
            >
              KrispySkin Dashboard
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                color: colors.muted
              }}
            >
              Welcome,{" "}
              <strong>
                {user?.username ||
                  "User"}
              </strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push(
              "/account/settings"
            )
          }
          style={buttonStyle}
        >
          Account Settings
        </button>
      </div>

      <h2>Your Skin</h2>

      {/* VIEW SWITCHER */}

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "15px"
        }}
      >
        <button
          type="button"
          onClick={() =>
            setViewMode("3d")
          }
          style={{
            ...buttonStyle,
            fontWeight:
              viewMode === "3d"
                ? "bold"
                : "normal"
          }}
        >
          3D
        </button>

        <button
          type="button"
          onClick={() =>
            setViewMode("2d")
          }
          style={{
            ...buttonStyle,
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
            width: "350px",
            maxWidth: "100%",
            height: "500px",
            background:
              colors.viewer,
            border:
              `1px solid ${colors.border}`,
            borderRadius: "14px",
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

      {/* 2D VIEW */}

      {viewMode === "2d" && (
        <div
          style={{
            width: "350px",
            maxWidth: "100%",
            height: "500px",
            background:
              colors.viewer,
            border:
              `1px solid ${colors.border}`,
            borderRadius: "14px",
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
          {user?.skinId || "None"}
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
        <h2>My Skins</h2>

        {skins.length === 0 ? (
          <p
            style={{
              color: colors.muted
            }}
          >
            You haven't saved any
            skins yet.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "15px"
            }}
          >
            {skins.map((skin) => {
              const skinId =
                typeof skin === "string"
                  ? skin
                  : skin.id;

              const filename =
                typeof skin === "string"
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
                      `1px solid ${colors.border}`,
                    borderRadius: "12px",
                    background:
                      active
                        ? colors.active
                        : colors.card,
                    color: colors.text
                  }}
                >
                  <strong>
                    {active
                      ? "Active Skin"
                      : "Saved Skin"}
                  </strong>

                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "12px",
                      overflow: "hidden",
                      textOverflow:
                        "ellipsis",
                      whiteSpace:
                        "nowrap",
                      color:
                        colors.muted
                    }}
                  >
                    {filename ||
                      skinId}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "7px",
                      marginTop: "12px"
                    }}
                  >
                    <button
                      type="button"
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
                        ...smallButtonStyle,
                        opacity:
                          active ||
                          loadingSkin ===
                            skinId
                            ? 0.5
                            : 1
                      }}
                    >
                      {active
                        ? "Active"
                        : loadingSkin ===
                          skinId
                        ? "Loading..."
                        : "Load"}
                    </button>

                    <button
                      type="button"
                      disabled={
                        postingSkin ===
                        skinId
                      }
                      onClick={() =>
                        openPostModal(
                          skinId
                        )
                      }
                      style={{
                        ...smallButtonStyle,
                        opacity:
                          postingSkin ===
                          skinId
                            ? 0.5
                            : 1
                      }}
                    >
                      Post
                    </button>

                    <button
                      type="button"
                      disabled={
                        deletingSkin ===
                        skinId
                      }
                      onClick={() =>
                        deleteSkin(
                          skinId
                        )
                      }
                      style={{
                        ...smallButtonStyle,
                        opacity:
                          deletingSkin ===
                          skinId
                            ? 0.5
                            : 1
                      }}
                    >
                      {deletingSkin ===
                      skinId
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* COMMUNITY */}

      <div
        style={{
          marginTop: "35px"
        }}
      >
        <a
          href="/posts"
          style={{
            display:
              "inline-block",
            padding:
              "11px 18px",
            borderRadius: "8px",
            background:
              darkMode
                ? "#eee"
                : "#111",
            color:
              darkMode
                ? "#111"
                : "#fff",
            textDecoration:
              "none",
            fontWeight: "600"
          }}
        >
          Browse Community
        </a>
      </div>

      {/* POST MODAL */}

      {postModalSkin && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.55)",
            display: "flex",
            justifyContent:
              "center",
            alignItems: "center",
            padding: "20px",
            zIndex: 9999
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "450px",
              background:
                colors.card,
              color: colors.text,
              borderRadius: "14px",
              padding: "25px",
              boxSizing:
                "border-box",
              border:
                `1px solid ${colors.border}`
            }}
          >
            <h2>
              Post Skin
            </h2>

            <p
              style={{
                color: colors.muted
              }}
            >
              Share this skin with
              the KrispySkin
              community.
            </p>

            <label>
              Title
            </label>

            <input
              value={postTitle}
              onChange={(event) =>
                setPostTitle(
                  event.target.value
                )
              }
              maxLength={100}
              placeholder="My Awesome Skin"
              style={{
                ...inputStyle,
                marginTop: "6px",
                marginBottom:
                  "15px"
              }}
            />

            <label>
              Description
            </label>

            <textarea
              value={postDescription}
              onChange={(event) =>
                setPostDescription(
                  event.target.value
                )
              }
              maxLength={500}
              rows={5}
              placeholder="Tell people about your skin..."
              style={{
                ...inputStyle,
                marginTop: "6px",
                resize: "vertical"
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                gap: "10px",
                marginTop: "20px"
              }}
            >
                <button
                  type="button"
                  onClick={() =>
                    setPostModalSkin(
                      null
                    )
                  }
                  disabled={
                    postingSkin !==
                    null
                  }
                  style={{
                    ...smallButtonStyle,
                    opacity:
                      postingSkin !==
                      null
                        ? 0.5
                        : 1
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={postSkin}
                  disabled={
                    postingSkin !==
                    null
                  }
                  style={{
                    ...smallButtonStyle,
                    background:
                      darkMode
                        ? "#eee"
                        : "#111",
                    color:
                      darkMode
                        ? "#111"
                        : "#fff",
                    border:
                      `1px solid ${
                        darkMode
                          ? "#eee"
                          : "#111"
                      }`,
                    opacity:
                      postingSkin !==
                      null
                        ? 0.5
                        : 1
                  }}
                >
                  {postingSkin
                    ? "Posting..."
                    : "Post Skin"}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* MOBILE / DARK MODE OVERRIDES */}

      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
        }

        body {
          background: ${
            darkMode ? "#111" : "#fff"
          };
          color: ${
            darkMode ? "#eee" : "#171717"
          };
          transition:
            background 0.2s ease,
            color 0.2s ease;
        }

        input[type="file"] {
          color: ${
            darkMode ? "#eee" : "#171717"
          };
        }

        input[type="file"]::file-selector-button {
          padding: 8px 12px;
          margin-right: 8px;
          border-radius: 7px;
          border: 1px solid ${
            darkMode ? "#444" : "#ccc"
          };
          background: ${
            darkMode ? "#252525" : "#fff"
          };
          color: ${
            darkMode ? "#eee" : "#171717"
          };
          cursor: pointer;
        }

        button:disabled {
          cursor: not-allowed !important;
        }

        @media (max-width: 600px) {
          main {
            padding: 20px 14px !important;
          }

          h1 {
            font-size: 26px;
          }

          h2 {
            font-size: 21px;
          }
        }
      `}</style>
    </main>
  );
}
