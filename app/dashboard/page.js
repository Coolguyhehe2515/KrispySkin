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

  const [loadingSkin, setLoadingSkin] =
    useState(null);

  const [deletingSkin, setDeletingSkin] =
    useState(null);

  const [postingSkin, setPostingSkin] =
    useState(null);

  const [viewMode, setViewMode] =
    useState("3d");

  const [postTitle, setPostTitle] =
    useState("");

  const [postDescription, setPostDescription] =
    useState("");

  const [postModalSkin, setPostModalSkin] =
    useState(null);

  // --------------------------------------------------
  // LOAD USER + SKIN LIBRARY
  // --------------------------------------------------

  useEffect(() => {
    async function loadData() {
      try {
        const meResponse =
          await fetch(
            "/api/auth/me",
            {
              method: "GET",
              credentials: "include",
              cache: "no-store"
            }
          );

        const meData =
          await meResponse.json();

        if (
          !meResponse.ok ||
          !meData.authenticated
        ) {
          router.replace("/login");
          return;
        }

        setUser(meData.user);

        const libraryResponse =
          await fetch(
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
          setSkins(
            libraryData.skins || []
          );

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
          await import(
            "skinview3d"
          );

        if (destroyed) {
          return;
        }

        const viewer =
          new skinview3d.SkinViewer({
            canvas:
              canvas3DRef.current,
            width: 350,
            height: 500
          });

        viewer3DRef.current =
          viewer;

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
          await import(
            "skinview3d"
          );

        if (destroyed) {
          return;
        }

        const viewer =
          new skinview3d.SkinViewer({
            canvas:
              canvas2DRef.current,
            width: 350,
            height: 500
          });

        viewer2DRef.current =
          viewer;

        viewer.controls.enableRotate =
          false;

        viewer.controls.enableZoom =
          false;

        viewer.controls.enablePan =
          false;

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
          filename:
            data.skin.filename,
          model:
            data.skin.model,
          size:
            data.skin.size
        },
        ...oldSkins.filter(
          (skin) => {
            const id =
              typeof skin ===
              "string"
                ? skin
                : skin.id;

            return id !== skinId;
          }
        )
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
    if (
      skinId ===
      user?.skinId
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
  // DELETE SKIN
  // --------------------------------------------------

  async function deleteSkin(skinId) {
    const confirmed =
      window.confirm(
        "Delete this skin permanently?\n\nThe skin will also be removed from the Community."
      );

    if (!confirmed) {
      return;
    }

    setDeletingSkin(skinId);

    try {
      const response =
        await fetch(
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

      setSkins(
        (oldSkins) =>
          oldSkins.filter(
            (skin) => {
              const id =
                typeof skin ===
                "string"
                  ? skin
                  : skin.id;

              return id !==
                skinId;
            }
          )
      );

      setUser((oldUser) => ({
        ...oldUser,
        skinId:
          data.activeSkin ||
          null
      }));

      if (
        postModalSkin ===
        skinId
      ) {
        setPostModalSkin(
          null
        );
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
  // OPEN POST MODAL
  // --------------------------------------------------

  function openPostModal(
    skinId
  ) {
    setPostTitle("");
    setPostDescription("");
    setPostModalSkin(
      skinId
    );
  }

  // --------------------------------------------------
  // POST SKIN
  // --------------------------------------------------

  async function postSkin() {
    if (!postModalSkin) {
      return;
    }

    if (!postTitle.trim()) {
      alert(
        "Please enter a title."
      );

      return;
    }

    setPostingSkin(
      postModalSkin
    );

    try {
      const response =
        await fetch(
          "/api/posts",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              skinId:
                postModalSkin,
              title:
                postTitle.trim(),
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

      setPostModalSkin(
        null
      );

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
  // LOADING
  // --------------------------------------------------

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

  // --------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------

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

      {/* VIEW SWITCHER */}

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
            setViewMode(
              "3d"
            )
          }
          style={{
            padding:
              "10px 22px",
            borderRadius:
              "8px",
            border:
              "1px solid #ccc",
            cursor:
              "pointer",
            fontWeight:
              viewMode ===
              "3d"
                ? "bold"
                : "normal"
          }}
        >
          3D
        </button>

        <button
          onClick={() =>
            setViewMode(
              "2d"
            )
          }
          style={{
            padding:
              "10px 22px",
            borderRadius:
              "8px",
            border:
              "1px solid #ccc",
            cursor:
              "pointer",
            fontWeight:
              viewMode ===
              "2d"
                ? "bold"
                : "normal"
          }}
        >
          2D
        </button>
      </div>

      {/* 3D VIEW */}

      {viewMode ===
        "3d" && (
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
            ref={
              canvas3DRef
            }
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

      {viewMode ===
        "2d" && (
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
            ref={
              canvas2DRef
            }
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
          marginTop:
            "20px"
        }}
      >
        <strong>
          Upload New Skin
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

      {/* MY SKINS */}

      <section
        style={{
          marginTop:
            "35px"
        }}
      >
        <h2>
          My Skins
        </h2>

        {skins.length ===
        0 ? (
          <p>
            You haven't saved
            any skins yet.
          </p>
        ) : (
          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(240px, 1fr))",
              gap:
                "15px"
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
                    key={
                      skinId
                    }
                    style={{
                      padding:
                        "15px",
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
                        display:
                          "flex",
                        flexWrap:
                          "wrap",
                        gap:
                          "7px",
                        marginTop:
                          "12px"
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
                            "8px 12px",
                          borderRadius:
                            "7px",
                          border:
                            "1px solid #ccc",
                          cursor:
                            "pointer"
                        }}
                      >
                        {active

                        ? "Active"
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
                        display:
                          "flex",
                        flexWrap:
                          "wrap",
                        gap:
                          "7px",
                        marginTop:
                          "12px"
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
                            "8px 12px",
                          borderRadius:
                            "7px",
                          border:
                            "1px solid #ccc",
                          cursor:
                            "pointer"
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
                          padding:
                            "8px 12px",
                          borderRadius:
                            "7px",
                          border:
                            "1px solid #ccc",
                          cursor:
                            "pointer"
                        }}
                      >
                        Post
                      </button>

                      <button
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
                          padding:
                            "8px 12px",
                          borderRadius:
                            "7px",
                          border:
                            "1px solid #ccc",
                          cursor:
                            "pointer"
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
              }
            )}
          </div>
        )}
      </section>

      {/* COMMUNITY */}

      <div
        style={{
          marginTop:
            "35px"
        }}
      >
        <a
          href="/posts"
          style={{
            display:
              "inline-block",
            padding:
              "11px 18px",
            borderRadius:
              "8px",
            background:
              "#111",
            color:
              "#fff",
            textDecoration:
              "none"
          }}
        >
          Browse Community
        </a>
      </div>

      {/* POST MODAL */}

      {postModalSkin && (
        <div
          style={{
            position:
              "fixed",
            inset: 0,
            background:
              "rgba(0,0,0,0.55)",
            display:
              "flex",
            justifyContent:
              "center",
            alignItems:
              "center",
            padding:
              "20px",
            zIndex:
              9999
          }}
        >
          <div
            style={{
              width:
                "100%",
              maxWidth:
                "450px",
              background:
                "#fff",
              borderRadius:
                "14px",
              padding:
                "25px",
              boxSizing:
                "border-box"
            }}
          >
            <h2>
              Post Skin
            </h2>

            <p>
              Share this skin with
              the KrispySkin
              community.
            </p>

            <label>
              Title
            </label>

            <input
              value={
                postTitle
              }
              onChange={(event) =>
                setPostTitle(
                  event.target.value
                )
              }
              maxLength={100}
              placeholder="My Awesome Skin"
              style={{
                width:
                  "100%",
                boxSizing:
                  "border-box",
                marginTop:
                  "6px",
                marginBottom:
                  "15px",
                padding:
                  "10px",
                border:
                  "1px solid #ccc",
                borderRadius:
                  "8px"
              }}
            />

            <label>
              Description
            </label>

            <textarea
              value={
                postDescription
              }
              onChange={(event) =>
                setPostDescription(
                  event.target.value
                )
              }
              maxLength={500}
              rows={5}
              placeholder="Tell people about your skin..."
              style={{
                width:
                  "100%",
                boxSizing:
                  "border-box",
                marginTop:
                  "6px",
                padding:
                  "10px",
                border:
                  "1px solid #ccc",
                borderRadius:
                  "8px",
                resize:
                  "vertical"
              }}
            />

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                gap:
                  "10px",
                marginTop:
                  "20px"
              }}
            >
              <button
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
                  padding:
                    "10px 15px",
                  borderRadius:
                    "8px",
                  border:
                    "1px solid #ccc",
                  cursor:
                    "pointer"
                }}
              >
                Cancel
              </button>

              <button
                onClick={
                  postSkin
                }
                disabled={
                  postingSkin !==
                  null
                }
                style={{
                  padding:
                    "10px 15px",
                  borderRadius:
                    "8px",
                  border:
                    "1px solid #111",
                  background:
                    "#111",
                  color:
                    "#fff",
                  cursor:
                    "pointer"
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
    </main>
  );
                  }
  
                 
