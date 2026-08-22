"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function uploadSkin() {
    if (!file) {
      setResult({
        success: false,
        error: "Pilih file PNG terlebih dahulu."
      });
      return;
    }

    if (file.type !== "image/png") {
      setResult({
        success: false,
        error: "File harus berupa PNG."
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/skin", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: "Gagal menghubungi KrispySkin API."
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          textAlign: "center"
        }}
      >
        <h1>KrispySkin</h1>

        <p>
          Minecraft Java third-party skin service
        </p>

        <div
          style={{
            border: "2px dashed #888",
            borderRadius: "12px",
            padding: "30px",
            marginTop: "25px"
          }}
        >
          <input
            type="file"
            accept="image/png"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setResult(null);
            }}
          />

          {file && (
            <p>
              Selected: <strong>{file.name}</strong>
            </p>
          )}

          <button
            onClick={uploadSkin}
            disabled={!file || loading}
            style={{
              marginTop: "15px",
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer"
            }}
          >
            {loading ? "Uploading..." : "Upload Skin"}
          </button>
        </div>

        {result && (
          <pre
            style={{
              textAlign: "left",
              marginTop: "25px",
              padding: "15px",
              borderRadius: "10px",
              overflowX: "auto"
            }}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
              }
