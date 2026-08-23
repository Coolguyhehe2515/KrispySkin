"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AccountSettings() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeSection, setActiveSection] = useState("profile");

  const [username, setUsername] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailStep, setEmailStep] = useState("email");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [theme, setTheme] = useState("system");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
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
        console.error("Account settings error:", err);
        setError("Failed to load account information.");
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  useEffect(() => {
    const savedTheme = localStorage.getItem(
      "krispyskin_theme"
    );

    if (
      savedTheme === "light" ||
      savedTheme === "dark" ||
      savedTheme === "system"
    ) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  function applyTheme(value) {
    const root = document.documentElement;

    if (value === "system") {
      root.removeAttribute("data-theme");
      return;
    }

    root.setAttribute("data-theme", value);
  }

  function changeTheme(value) {
    setTheme(value);
    localStorage.setItem(
      "krispyskin_theme",
      value
    );
    applyTheme(value);
  }

  function clearMessages() {
    setMessage("");
    setError("");
  }

  async function changeUsername(event) {
    event.preventDefault();

    clearMessages();

    if (!username.trim()) {
      setError("Username is required.");
      return;
    }

    setUsernameLoading(true);

    try {
      const response = await fetch(
        "/api/account/username",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username: username.trim()
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Failed to change username."
        );
        return;
      }

      setUser((oldUser) => ({
        ...oldUser,
        username: data.username
      }));

      setUsername(data.username);

      setMessage(
        "Username changed successfully."
      );
    } catch (err) {
      console.error(
        "Username change error:",
        err
      );

      setError(
        "Failed to change username."
      );
    } finally {
      setUsernameLoading(false);
    }
  }

  async function sendEmailVerification(event) {
    event.preventDefault();

    clearMessages();

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setEmailLoading(true);

    try {
      const response = await fetch(
        "/api/account/email/send",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: email.trim()
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Failed to send verification code."
        );
        return;
      }

      setEmailStep("code");

      setMessage(
        "Verification code sent to your email."
      );
    } catch (err) {
      console.error(
        "Email verification error:",
        err
      );

      setError(
        "Failed to send verification email."
      );
    } finally {
      setEmailLoading(false);
    }
  }

  async function verifyEmail(event) {
    event.preventDefault();

    clearMessages();

    if (!emailCode.trim()) {
      setError(
        "Verification code is required."
      );
      return;
    }

    setEmailLoading(true);

    try {
      const response = await fetch(
        "/api/account/email/verify",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: email.trim(),
            code: emailCode.trim()
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Invalid verification code."
        );
        return;
      }

      setUser((oldUser) => ({
        ...oldUser,
        email: data.email || email
      }));

      setEmail(
        data.email || email
      );

      setEmailCode("");
      setEmailStep("email");

      setMessage(
        "Email address updated successfully."
      );
    } catch (err) {
      console.error(
        "Email verification error:",
        err
      );

      setError(
        "Failed to verify email."
      );
    } finally {
      setEmailLoading(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();

    clearMessages();

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setError(
        "All password fields are required."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "New passwords do not match."
      );
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await fetch(
        "/api/account/password",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Failed to change password."
        );
        return;
      }

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
      console.error(
        "Password change error:",
        err
      );

      setError(
        "Failed to change password."
      );
    } finally {
      setPasswordLoading(false);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Arial, sans-serif"
        }}
      >
        <h1>Loading account settings...</h1>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "30px",
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
        background:
          "var(--background, #f5f5f5)",
        color:
          "var(--foreground, #111)"
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto"
        }}
      >
        <button
          type="button"
          onClick={() =>
            router.push("/dashboard")
          }
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
            marginBottom: "20px"
          }}
        >
          Back to Dashboard
        </button>

        <h1>Account Settings</h1>

        <p
          style={{
            color: "#666"
          }}
        >
          Manage your KrispySkin account.
        </p>

        {message && (
          <div
            style={{
              marginTop: "20px",
              padding: "12px 15px",
              borderRadius: "8px",
              background: "#e9ffe9",
              border: "1px solid #9bd49b"
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: "20px",
              padding: "12px 15px",
              borderRadius: "8px",
              background: "#ffe9e9",
              border: "1px solid #d49b9b"
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "220px minmax(0, 1fr)",
            gap: "25px",
            marginTop: "30px",
            alignItems: "start"
          }}
        >
          <aside
            style={{
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "10px"
            }}
          >
            <button
              type="button"
              onClick={() => {
                clearMessages();
                setActiveSection("profile");
              }}
              style={{
                width: "100%",
                padding: "12px",
                textAlign: "left",
                border: "none",
                borderRadius: "8px",
                background:
                  activeSection === "profile"
                    ? "#111"
                    : "transparent",
                color:
                  activeSection === "profile"
                    ? "#fff"
                    : "#111",
                cursor: "pointer"
              }}
            >
              Profile
            </button>

            <button
              type="button"
              onClick={() => {
                clearMessages();
                setActiveSection("security");
              }}
              style={{
                width: "100%",
                padding: "12px",
                textAlign: "left",
                border: "none",
                borderRadius: "8px",
                background:
                  activeSection === "security"
                    ? "#111"
                    : "transparent",
                color:
                  activeSection === "security"
                    ? "#fff"
                    : "#111",
                cursor: "pointer"
              }}
            >
              Security
            </button>

            <button
              type="button"
              onClick={() => {
                clearMessages();
                setActiveSection("theme");
              }}
              style={{
                width: "100%",
                padding: "12px",
                textAlign: "left",
                border: "none",
                borderRadius: "8px",
                background:
                  activeSection === "theme"
                    ? "#111"
                    : "transparent",
                color:
                  activeSection === "theme"
                    ? "#fff"
                    : "#111",
                cursor: "pointer"
              }}
            >
              Theme
            </button>
          </aside>

          <section
            style={{
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "25px"
            }}
          >
            {activeSection === "profile" && (
              <>
                <h2>Profile</h2>

                <p
                  style={{
                    color: "#666"
                  }}
                >
                  Manage your public account
                  information.
                </p>

                <div
                  style={{
                    marginTop: "25px",
                    padding: "20px",
                    border: "1px solid #ddd",
                    borderRadius: "12px"
                  }}
                >
                  <h3>Account Information</h3>

                  <p>
                    <strong>User ID:</strong>{" "}
                    {user?.id || "Unknown"}
                  </p>

                  <p>
                    <strong>Current username:</strong>{" "}
                    {user?.username || "Unknown"}
                  </p>

                  <p>
                    <strong>Email:</strong>{" "}
                    {user?.email || "Not set"}
                  </p>
                </div>

                <form
                  onSubmit={changeUsername}
                  style={{
                    marginTop: "25px"
                  }}
                >
                  <h3>Change Username</h3>

                  <label
                    htmlFor="username"
                    style={{
                      display: "block",
                      marginBottom: "6px"
                    }}
                  >
                    Username
                  </label>

                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(event) =>
                      setUsername(
                        event.target.value
                      )
                    }
                    minLength={3}
                    maxLength={24}
                    autoComplete="username"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px",
                      border: "1px solid #ccc",
                      borderRadius: "8px"
                    }}
                  />

                  <p
                    style={{
                      fontSize: "13px",
                      color: "#777"
                    }}
                  >
                    3-24 characters. Letters,
                    numbers, and underscores only.
                  </p>

                  <button
                    type="submit"
                    disabled={usernameLoading}
                    style={{
                      marginTop: "8px",
                      padding: "11px 18px",
                      borderRadius: "8px",
                      border: "none",
                      background: "#111",
                      color: "#fff",
                      cursor: usernameLoading
                        ? "not-allowed"
                        : "pointer"
                    }}
                  >
                    {usernameLoading
                      ? "Saving..."
                      : "Save Username"}
                  </button>
                </form>

                <form
                  onSubmit={sendEmailVerification}
                  style={{
                    marginTop: "35px"
                  }}
                >
                  <h3>Email Address</h3>

                  <p
                    style={{
                      color: "#666"
                    }}
                  >
                    Changing your email address
                    requires verification.
                  </p>

                  <label
                    htmlFor="email"
                    style={{
                      display: "block",
                      marginBottom: "6px"
                    }}
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    autoComplete="email"
                    disabled={
                      emailStep === "code"
                    }
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px",
                      border: "1px solid #ccc",
                      borderRadius: "8px"
                    }}
                  />

                  {emailStep === "email" && (
                    <button
                      type="submit"
                      disabled={emailLoading}
                      style={{
                        marginTop: "12px",
                        padding: "11px 18px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#111",
                        color: "#fff",
                        cursor: emailLoading
                          ? "not-allowed"
                          : "pointer"
                      }}
                    >
                      {emailLoading
                        ? "Sending..."
                        : "Send Verification Code"}
                    </button>
                  )}
                </form>

                {emailStep === "code" && (
                  <form
                    onSubmit={verifyEmail}
                    style={{
                      marginTop: "20px",
                      padding: "20px",
                      border: "1px solid #ddd",
                      borderRadius: "10px"
                    }}
                  >
                    <h3>
                      Verify Your Email
                    </h3>

                    <p
                      style={{
                        color: "#666"
                      }}
                    >
                      Enter the verification
                      code sent to your email.
                    </p>

                    <input
                      type="text"
                      inputMode="numeric"
                      value={emailCode}
                      onChange={(event) =>
                        setEmailCode(
                          event.target.value
                        )
                      }
                      maxLength={6}
                      placeholder="123456"
                      autoComplete="one-time-code"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "11px",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        letterSpacing: "5px"
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        marginTop: "12px"
                      }}
                    >
                      <button
                        type="submit"
                        disabled={emailLoading}
                        style={{
                          padding:
                            "11px 18px",
                          borderRadius: "8px",
                          border: "none",
                          background: "#111",
                          color: "#fff",
                          cursor:
                            emailLoading

                                        {activeSection === "theme" && (
              <>
                <h2>Theme</h2>

                <p
                  style={{
                    color: "#666"
                  }}
                >
                  Choose how KrispySkin should
                  appear on your device.
                </p>

                <div
                  style={{
                    display: "grid",
                    gap: "12px",
                    marginTop: "25px"
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      changeTheme("light")
                    }
                    style={{
                      padding: "18px",
                      textAlign: "left",
                      borderRadius: "10px",
                      border:
                        theme === "light"
                          ? "2px solid #111"
                          : "1px solid #ccc",
                      background: "#fff",
                      color: "#111",
                      cursor: "pointer"
                    }}
                  >
                    <strong>
                      Light
                    </strong>

                    <div
                      style={{
                        marginTop: "5px",
                        fontSize: "13px",
                        color: "#666"
                      }}
                    >
                      Always use the light
                      theme.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      changeTheme("dark")
                    }
                    style={{
                      padding: "18px",
                      textAlign: "left",
                      borderRadius: "10px",
                      border:
                        theme === "dark"
                          ? "2px solid #111"
                          : "1px solid #ccc",
                      background: "#222",
                      color: "#fff",
                      cursor: "pointer"
                    }}
                  >
                    <strong>
                      Dark
                    </strong>

                    <div
                      style={{
                        marginTop: "5px",
                        fontSize: "13px",
                        color: "#bbb"
                      }}
                    >
                      Always use the dark
                      theme.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      changeTheme("system")
                    }
                    style={{
                      padding: "18px",
                      textAlign: "left",
                      borderRadius: "10px",
                      border:
                        theme === "system"
                          ? "2px solid #111"
                          : "1px solid #ccc",
                      background:
                        "linear-gradient(90deg, #fff 50%, #222 50%)",
                      color:
                        theme === "system"
                          ? "#111"
                          : "#fff",
                      cursor: "pointer"
                    }}
                  >
                    <strong>
                      System
                    </strong>

                    <div
                      style={{
                        marginTop: "5px",
                        fontSize: "13px"
                      }}
                    >
                      Follow your device
                      theme.
                    </div>
                  </button>
                </div>

                <div
                  style={{
                    marginTop: "30px",
                    padding: "15px",
                    borderRadius: "10px",
                    background: "#f5f5f5",
                    border: "1px solid #ddd"
                  }}
                >
                  Current theme:{" "}
                  <strong>
                    {theme}
                  </strong>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
                        }
          
