"use client";

import { useEffect, useState } from "react";

export default function CommunityPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [reportPostId, setReportPostId] =
    useState(null);

  const [reportReason, setReportReason] =
    useState("");

  const [reportDescription, setReportDescription] =
    useState("");

  const [otherReason, setOtherReason] =
    useState("");

  const [reporting, setReporting] =
    useState(false);

  async function loadPosts() {
    try {
      const response = await fetch(
        "/api/posts",
        {
          method: "GET",
          cache: "no-store"
        }
      );

      const data =
        await response.json();

      if (response.ok) {
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error(
        "Failed to load community:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  function openReportModal(postId) {
    setReportPostId(postId);
    setReportReason("");
    setReportDescription("");
    setOtherReason("");
  }

  function closeReportModal() {
    if (reporting) {
      return;
    }

    setReportPostId(null);
    setReportReason("");
    setReportDescription("");
    setOtherReason("");
  }

  async function submitReport() {
    if (!reportPostId) {
      return;
    }

    if (!reportReason) {
      alert(
        "Please select a reason for the report."
      );
      return;
    }

    if (
      reportReason === "other" &&
      !otherReason.trim()
    ) {
      alert(
        "Please explain the reason for this report."
      );
      return;
    }

    setReporting(true);

    try {
      const description =
        reportReason === "other"
          ? otherReason.trim()
          : reportDescription.trim();

      const response = await fetch(
        "/api/reports",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            postId: reportPostId,
            reason: reportReason,
            description
          })
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Failed to submit report."
        );
        return;
      }

      alert(
        "Report submitted successfully. Thank you for helping keep KrispySkin safe."
      );

      closeReportModal();
    } catch (error) {
      console.error(
        "Report error:",
        error
      );

      alert(
        "Failed to submit report."
      );
    } finally {
      setReporting(false);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "30px",
          fontFamily: "Arial"
        }}
      >
        <h1>
          KrispySkin Community
        </h1>

        <p>
          Loading skins...
        </p>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "30px",
        fontFamily: "Arial"
      }}
    >
      <h1>
        KrispySkin Community
      </h1>

      <p>
        Discover skins shared by
        the KrispySkin community.
      </p>

      {posts.length === 0 ? (
        <p>
          No skins have been posted
          yet.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "20px",
            marginTop: "25px"
          }}
        >
          {posts.map((post) => (
            <article
              key={post.id}
              style={{
                border:
                  "1px solid #ddd",
                borderRadius:
                  "14px",
                padding: "15px",
                background: "#fff"
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "280px",
                  background:
                    "#eeeeee",
                  borderRadius:
                    "10px",
                  overflow:
                    "hidden",
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center"
                }}
              >
                <img
                  src={`/api/skin/${encodeURIComponent(
                    post.skinId
                  )}`}
                  alt={post.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit:
                      "contain",
                    imageRendering:
                      "pixelated"
                  }}
                />
              </div>

              <h2
                style={{
                  marginBottom:
                    "5px"
                }}
              >
                {post.title}
              </h2>

              <p
                style={{
                  marginTop: "5px",
                  color: "#666"
                }}
              >
                by{" "}
                <strong>
                  {post.username}
                </strong>
              </p>

              {post.description && (
                <p>
                  {post.description}
                </p>
              )}

              <a
                href={`/api/skin/download?id=${encodeURIComponent(
                  post.skinId
                )}`}
                style={{
                  display:
                    "block",
                  textAlign:
                    "center",
                  padding:
                    "10px",
                  marginTop:
                    "15px",
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
                Download Skin
              </a>

              <button
                onClick={() =>
                  openReportModal(
                    post.id
                  )
                }
                style={{
                  width: "100%",
                  padding: "9px",
                  marginTop: "8px",
                  borderRadius: "8px",
                  border:
                    "1px solid #ccc",
                  background:
                    "#fff",
                  cursor:
                    "pointer"
                }}
              >
                Report
              </button>
            </article>
          ))}
        </div>
      )}
