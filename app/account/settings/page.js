"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AccountSettings() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("profile");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailStep, setEmailStep] = useState("email");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [theme, setTheme] = useState("system");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store"
        });

        const data = await response.json();

        if (!response.ok || !data.authenticated) {
          router.replace("/login");
          return;
        }

        setUser(data.user);
        setUsername(data.user?.username || "");
        setEmail(data.user?.email || "");
      } catch (err) {
        console.error(err);
        setError("Failed to load account.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  useEffect(() => {
    const saved = localStorage.getItem("krispyskin_theme");

    if (
      saved === "light" ||
      saved === "dark" ||
      saved === "system"
    ) {
      setTheme(saved);
      applyTheme(saved);
    }
  }, []);

  function applyTheme(value) {
    if (value === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute(
        "data-theme",
        value
      );
    }
  }

  function changeTheme(value) {
    setTheme(value);
    localStorage.setItem("krispyskin_theme", value);
    applyTheme(value);
  }

  function clearStatus() {
    setMessage("");
    setError("");
  }

  async function api(path, body) {
    const response = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Request failed."
      );
    }

    return data;
  }

  async function saveUsername(event) {
    event.preventDefault();
    clearStatus();
    setBusy(true);

    try {
      const data = await api(
        "/api/account/username",
        {
          username: username.trim()
        }
      );

      setUsername(data.username);

      setUser((old) => ({
        ...old,
        username: data.username
      }));

      setMessage("Username updated successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail(event) {
    event.preventDefault();
    clearStatus();
    setBusy(true);

    try {
      await api(
        "/api/account/email/send",
        {
          email: email.trim()
        }
      );

      setEmailStep("code");
      setMessage(
        "Verification code sent to your email."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmail(event) {
    event.preventDefault();
    clearStatus();
    setBusy(true);

    try {
      const data = await api(
        "/api/account/email/verify",
        {
          email: email.trim(),
          code: emailCode.trim()
        }
      );

      const verifiedEmail =
        data.email || email.trim();

      setEmail(verifiedEmail);

      setUser((old) => ({
        ...old,
        email: verifiedEmail
      }));

      setEmailCode("");
      setEmailStep("email");
      setMessage("Email updated successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

    async function changePassword(event) {
    event.preventDefault();
    clearStatus();

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      await api("/api/account/password", {
        currentPassword,
        newPassword,
        confirmPassword
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setMessage(
        "Password changed successfully. Please log in again."
      );

      setTimeout(() => {
        router.replace("/login");
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "Arial, sans-serif"
        }}
      >
        <h1>Loading...</h1>
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
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto"
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
        >
          ← Dashboard
        </button>

        <h1>Account Settings</h1>

        <p>
          Signed in as{" "}
          <strong>{user?.username}</strong>
        </p>

        {message && (
          <p style={{ color: "green" }}>
            {message}
          </p>
        )}

        {error && (
          <p style={{ color: "red" }}>
            {error}
          </p>
        )}

        <nav
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            margin: "20px 0"
          }}
        >
          {["profile", "security", "theme"].map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  clearStatus();
                  setSection(item);
                }}
              >
                {item === "profile"
                  ? "Profile"
                  : item === "security"
                  ? "Security"
                  : "Theme"}
              </button>
            )
          )}
        </nav>

        {section === "profile" && (
          <section>
            <h2>Profile</h2>

            <form onSubmit={saveUsername}>
              <label>Username</label>

              <br />

              <input
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value)
                }
                maxLength={24}
                autoComplete="username"
              />

              <br />

              <button
                type="submit"
                disabled={busy}
              >
                {busy
                  ? "Saving..."
                  : "Save Username"}
              </button>
            </form>

            <hr />

            <form
              onSubmit={
                emailStep === "email"
                  ? sendEmail
                  : verifyEmail
              }
            >
              <label>Email Address</label>

              <br />

              <input
                type="email"
                value={email}
                disabled={emailStep === "code"}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                autoComplete="email"
              />

              {emailStep === "email" ? (
                <button
                  type="submit"
                  disabled={busy}
                >
                  {busy
                    ? "Sending..."
                    : "Send Verification Code"}
                </button>
              ) : (
                <>
                  <br />

                  <input
                    value={emailCode}
                    onChange={(e) =>
                      setEmailCode(
                        e.target.value
                      )
                    }
                    maxLength={6}
                    inputMode="numeric"
                    placeholder="6-digit code"
                    autoComplete="one-time-code"
                  />

                  <button
                    type="submit"
                    disabled={busy}
                  >
                    {busy
                      ? "Verifying..."
                      : "Verify Email"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmailStep("email");
                      setEmailCode("");
                      clearStatus();
                    }}
                  >
                    Change Email
                  </button>
                </>
              )}
            </form>
          </section>
        )}

        {section === "security" && (
          <section>
            <h2>Security</h2>

            <form onSubmit={changePassword}>
              <label>Current Password</label>

              <br />

              <input
                type="password"
                value={currentPassword}
                onChange={(e) =>
                  setCurrentPassword(
                    e.target.value
                  )
                }
                autoComplete="current-password"
              />

              <br />

              <label>New Password</label>

              <br />

              <input
                type="password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(
                    e.target.value
                  )
                }
                autoComplete="new-password"
              />

              <br />

              <label>
                Confirm New Password
              </label>

              <br />

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                autoComplete="new-password"
              />

              <br />

              <button
                type="submit"
                disabled={busy}
              >
                {busy
                  ? "Changing..."
                  : "Change Password"}
              </button>
            </form>
          </section>
        )}

        {section === "theme" && (
          <section>
            <h2>Theme</h2>

            <p>
              Choose your preferred KrispySkin theme.
            </p>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap"
              }}
            >
              <button
                type="button"
                onClick={() => changeTheme("system")}
              >
                System
              </button>

              <button
                type="button"
                onClick={() => changeTheme("light")}
              >
                Light
              </button>

              <button
                type="button"
                onClick={() => changeTheme("dark")}
              >
                Dark
              </button>
            </div>

            <p>
              Current theme:{" "}
              <strong>{theme}</strong>
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
