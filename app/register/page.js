"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function register(event) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Registration failed.");
        return;
      }

      setMessage("Account created successfully!");

      setTimeout(() => {
        router.push("/login");
      }, 1000);
    } catch (error) {
      setMessage("Could not connect to KrispySkin.");
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
        padding: "20px",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <form
        onSubmit={register}
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "30px",
          border: "1px solid #ddd",
          borderRadius: "14px"
        }}
      >
        <h1>KrispySkin</h1>

        <p>Create your KrispySkin account.</p>

        <label>Username</label>

        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Username"
          required
          minLength={3}
          maxLength={20}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "6px",
            marginBottom: "15px",
            boxSizing: "border-box"
          }}
        />

        <label>Password</label>

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          required
          minLength={8}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "6px",
            marginBottom: "15px",
            boxSizing: "border-box"
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            cursor: loading ? "wait" : "pointer"
          }}
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>

        {message && (
          <p style={{ marginTop: "15px" }}>
            {message}
          </p>
        )}
      </form>
    </main>
  );
            }
