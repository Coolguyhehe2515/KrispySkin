"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SkinViewer, WalkingAnimation } from "skinview3d";

export default function Dashboard() {
  const router = useRouter();
  const canvasRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let viewer;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store"
        });

        const data = await response.json();

        if (!response.ok || !data.authenticated) {
          router.replace("/login");
          return;
        }

        setUser(data.user);

        viewer = new SkinViewer({
          canvas: canvasRef.current,
          width: 350,
          height: 500
        });

        viewer.camera.position.set(0, 0, 35);

        viewer.controls.enableRotate = true;
        viewer.controls.enableZoom = true;
        viewer.controls.enablePan = false;

        viewer.animation = new WalkingAnimation();

        if (data.user.skinId) {
          const skinUrl =
            `/api/skin/${encodeURIComponent(data.user.skinId)}`;

          await viewer.loadSkin(skinUrl);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load your KrispySkin profile.");
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    return () => {
      if (viewer) {
        viewer.dispose();
      }
    };
  }, [router]);

  if (loading) {
    return (
      <main>
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

      {user && (
        <p>
          Welcome, <strong>{user.username}</strong> 👋
        </p>
      )}

      {error && (
        <p>{error}</p>
      )}

      <section
        style={{
          marginTop: "30px",
          maxWidth: "500px"
        }}
      >
        <h2>Your Skin</h2>

        <div
          style={{
            width: "350px",
            maxWidth: "100%",
            minHeight: "500px",
            border: "1px solid #ddd",
            borderRadius: "14px",
            overflow: "hidden"
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              height: "500px",
              display: "block"
            }}
          />
        </div>

        {!user?.skinId && (
          <p>
            You don't have an active skin yet.
          </p>
        )}
      </section>
    </main>
  );
}
