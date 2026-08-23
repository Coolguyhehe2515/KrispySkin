"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AccountSettings() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [activeSection, setActiveSection] =
    useState("profile");

  const [username, setUsername] = useState("");
  const [usernameLoading, setUsernameLoading] =
    useState(false);

  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailStep, setEmailStep] =
    useState("email");
  const [emailLoading, setEmailLoading] =
    useState(false);

  const [currentPassword, setCurrentPassword] =
    useState("");
  const [newPassword, setNewPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [passwordLoading, setPasswordLoading] =
    useState(false);

  const [theme, setTheme] = useState("system");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAccount() {
      try {
        const response = await fetch(
          "/api/auth/me",
          {
            method: "GET",
            credentials: "include",
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
        setUsername(
          data.user?.username || ""
        );
        setEmail(
          data.user?.email || ""
        );
      } catch (err) {
        console.error(
          "Account settings error:",
          err
        );

        setError(
          "Failed to load account information."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, [router]);

  useEffect(() => {
    const savedTheme =
      localStorage.getItem(
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
    if (value === "system") {
      document.documentElement.removeAttribute(
        "data-theme"
      );
      return;
    }

    document.documentElement.setAttribute(
      "data-theme",
      value
    );
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
      setError(
        "Username is required."
      );
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
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            username: username.trim()
          })
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Failed to change username."
        );
        return;
      }

      setUsername(data.username);

      setUser((oldUser) => ({
        ...oldUser,
        username: data.username
      }));

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

  async function sendEmailVerification(
    event
  ) {
    event.preventDefault();

    clearMessages();

    if (!email.trim()) {
      setError(
        "Email is required."
      );
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
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            email: email.trim()
          })
        }
      );

      const data =
        await response.json();

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
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            email: email.trim(),
            code: emailCode.trim()
          })
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Invalid verification code."
        );
        return;
      }

      const verifiedEmail =
        data.email || email.trim();

      setEmail(verifiedEmail);

      setUser((oldUser) => ({
        ...oldUser,
        email: verifiedEmail
      }));

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

    if (newPassword.length < 8) {
      setError(
        "Password must be at least 8 characters."
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
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword
          })
        }
      );

      const data =
        await response.json();

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

  function switchSection(section) {
    clearMessages();
    setActiveSection(section);
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "Arial, sans-serif"
        }}
      >
        <h1>
          Loading account settings...
        </h1>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "30px",
        fontFamily:
          "Arial, sans-serif",
        background:
          "var(--background, #ffffff)",
        color:
          "var(--foreground, #111111)"
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
            padding: "9px 15px",
            borderRadius: "8px",
            border:
              "1px solid #ccc",
            background:
              "transparent",
            cursor: "pointer",
            marginBottom: "20px"
          }}
        >
          ← Back to Dashboard
        </button>

        <h1>
          Account Settings
        </h1>

        <p
          style={{
            color: "#666"
          }}
        >
          Manage your KrispySkin account,
          profile, security, and theme.
        </p>

        {message && (
          <div
            style={{
              padding: "12px 15px",
              marginTop: "20px",
              marginBottom: "15px",
              borderRadius: "8px",
              background:
                "#e8f7e8",
              border:
                "1px solid #9bd39b",
              color:
                "#216b21"
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "12px 15px",
              marginTop: "20px",
              marginBottom: "15px",
              borderRadius: "8px",
              background:
                "#ffecec",
              border:
                "1px solid #e0a0a0",
              color:
                "#9b2222"
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "220px 1fr",
            gap: "25px",
            marginTop: "30px"
          }}
        >
          <aside
            style={{
              border:
                "1px solid #ddd",
              borderRadius: "12px",
              padding: "10px",
              height: "fit-content"
            }}
          >
            <button
              type="button"
              onClick={() =>
                switchSection("profile")
              }
              style={{
                width: "100%",
                padding: "12px",
                textAlign: "left",
                border: "none",
                borderRadius: "8px",
                background:
                  activeSection ===
                  "profile"
                    ? "#111"
                    : "transparent",
                color:
                  activeSection ===
                  "profile"
                    ? "#fff"
                    : "inherit",
                cursor: "pointer"
              }}
            >
              Profile
            </button>

            <button
              type="button"
              onClick={() =>
                switchSection("security")
              }
              style={{
                width: "100%",
                padding: "12px",
                textAlign: "left",
                border: "none",
                borderRadius: "8px",
                background:
                  activeSection ===
                  "security"
                    ? "#111"
                    : "transparent",
                color:
                  activeSection ===
                  "security"
                    ? "#fff"
                    : "inherit",
                cursor: "pointer"
              }}
            >
              Security
            </button>

            <button
              type="button"
              onClick={() =>
                switchSection("theme")
              }
              style={{
                width: "100%",
                padding: "12px",
                textAlign: "left",
                border: "none",
                borderRadius: "8px",
                background:
                  activeSection ===
                  "theme"
                    ? "#111"
                    : "transparent",
                color:
                  activeSection ===
                  "theme"
                    ? "#fff"
                    : "inherit",
                cursor: "pointer"
              }}
            >
              Theme
            </button>
          </aside>

          <section
            style={{
              border:
                "1px solid #ddd",
              borderRadius: "12px",
              padding: "25px"
            }}
          >
            {activeSection ===
              "profile" && (
              <>
                <h2>
                  Profile
                </h2>

                <p
                  style={{
                    color: "#666"
                  }}
                >
                  Update your public
                  KrispySkin profile
                  information.
                </p>

                <form
                  onSubmit={
                    changeUsername
                  }
                  style={{
                    marginTop:
                      "25px"
                  }}
                >
                  <label>
                    Username
                  </label>

                  <input
                    type="text"
                    value={username}
                    onChange={(event) =>
                      setUsername(
                        event.target.value
                      )
                    }
                    maxLength={24}
                    autoComplete="username"
                    style={{
                      display:
                        "block",
                      width:
                        "100%",
                      maxWidth:
                        "500px",
                      boxSizing:
                        "border-box",
                      marginTop:
                        "7px",
                      padding:
                        "11px",
                      border:
                        "1px solid #ccc",
                      borderRadius:
                        "8px"
                    }}
                  />

                  <button
                    type="submit"
                    disabled={
                      usernameLoading
                    }
                    style={{
                      marginTop:
                        "12px",
                      padding:
                        "10px 18px",
                      borderRadius:
                        "8px",
                      border: "none",
                      background:
                        "#111",
                      color:
                        "#fff",
                      cursor:
                        "pointer"
                    }}
                  >
                    {usernameLoading
                      ? "Saving..."
                      : "Save Username"}
                  </button>
                </form>

                <hr
                  style={{
                    margin:
                      "30px 0",
                    border: 0,
                    borderTop:
                      "1px solid #ddd"
                  }}
                />

                <form
                  onSubmit={
                    emailStep ===
                    "email"
                      ? sendEmailVerification
                      : verifyEmail
                  }
                >
                  <label>
                    Email Address
                  </label>

                  <input
                    type="email"
                    value={email}
                    disabled={
                      emailStep ===
                      "code"
                    }
                    onChange={(event) =>
                      setEmail(
                        event.target.value
                      )
                    }
                    autoComplete="email"
                    style={{
                      display:
                        "block",
                      width:
                        "100%",
                      maxWidth:
                        "500px",
                      boxSizing:
                        "border-box",
                      marginTop:
                        "7px",
                      padding:
                        "11px",
                      border:
                        "1px solid #ccc",
                      borderRadius:
                        "8px"
                    }}
                  />

                  {emailStep ===
                    "email" ? (
                    <button
                      type="submit"
                      disabled={
                        emailLoading
                      }
                      style={{
                        marginTop:
                          "12px",
                        padding:
                          "10px 18px",
                        borderRadius:
                          "8px",
                        border:
                          "none",
                        background:
                          "#111",
                        color:
                          "#fff",
                        cursor:
                          "pointer"
                      }}
                    >
                      {emailLoading
                        ? "Sending..."
                        : "Send Verification Code"}
                    </button>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={
                          emailCode
                        }
                        onChange={(
                          event
                        ) =>
                          setEmailCode(
                            event.target
                              .value
                          )
                        }
                        maxLength={6}
                        inputMode="numeric"
                        placeholder="Enter 6-digit code"
                        autoComplete="one-time-code"
                        style={{
                          display:
                            "block",
                          width:
                            "100%",
                          maxWidth:
                            "500px",
                          boxSizing:
                            "border-box",
                          marginTop:
                            "12px",
                          padding:
                            "11px",
                          border:
                            "1px solid #ccc",
                          borderRadius:
                            "8px"
                        }}
                      />

                      <div
                        style={{
                          display:
                            "flex",
                          gap: "10px",
                          flexWrap:
                            "wrap",
                          marginTop:
                            "12px"
                        }}
                      >
                        <button
                          type="submit"
                          disabled={
                            emailLoading
                          }
                          style={{
                            padding:
                              "10px 18px",
                            borderRadius:
                              "8px",
                            border:
                              "none",
                            background:
                              "#111",
                            color:
                              "#fff",
                            cursor:
                              "pointer"
                          }}
                        >
                          {emailLoading
                            ? "Verifying..."
                            : "Verify Email"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEmailStep(
                              "email"
                            );
                            setEmailCode(
                              ""
                            );
                            clearMessages();
                          }}
                          style={{
                            padding:
                              "10px 18px",
                            borderRadius:
                              "8px",
                            border:
                              "1px solid #ccc",
                            background:
                              "transparent",
                            cursor:
                              "pointer"
                          }}
                        >
                          Change Email
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </>
            )}

            {activeSection ===
              "security" && (
              <>
                <h2>
                  Security
                </h2>

                <p
                  style={{
                    color: "#666"
                  }}
                >
                  Change your account
                  password.
                </p>

                <form
                  onSubmit={
                    changePassword
                  }
                  style={{
                    marginTop:
                      "25px"
                  }}
                >
                  <label>
                    Current Password
                  </label>

                  <input
                    type="password"
                    value={
                      currentPassword
                    }
                    onChange={(
                      event
                    ) =>
                      setCurrentPassword(
                        event.target
                          .value
                      )
                    }
                    autoComplete="current-password"
                    style={{
                      display:
                        "block",
                      width:
                        "100%",
                      maxWidth:
                        "500px",
                      boxSizing:
                        "border-box",
                      marginTop:
                        "7px",
                      padding:
                        "11px",
                      border:
                        "1px solid #ccc",
                      borderRadius:
                        "8px"
                    }}
                  />

                  <label
                    style={{
                      display:
                        "block",
                      marginTop:
                        "15px"
                    }}
                  >
                    New Password
                  </label>

                  <input
                    type="password"
                    value={
                      newPassword
                    }
                    onChange={(
                      event
                    ) =>
                      setNewPassword(
                        event.target
                          .value
                      )
                    }
                    autoComplete="new-password"
                    style={{
                      display:
                        "block",
                      width:
                        "100%",
                      maxWidth:
                        "500px",
                      boxSizing:
                        "border-box",
                      marginTop:
                        "7px",
                      padding:
                        "11px",
                      border:
                        "1px solid #ccc",
                      borderRadius:
                        "8px"
                    }}
                  />

                  <label
                    style={{
                      display:
                        "block",
                      marginTop:
                        "15px"
                    }}
                  >
                    Confirm New Password
                  </label>

                  <input
                    type="password"
                    value={
                      confirmPassword
                    }
                    onChange={(
                      event
                    ) =>
                      setConfirmPassword(
                        event.target
                          .value
                      )
                    }
                    autoComplete="new-password"
                    style={{
                      display:
                        "block",
                      width:
                        "100%",
                      maxWidth:
                        "500px",
                      boxSizing:
                        "border-box",
                      marginTop:
                        "7px",
                      padding:
                        "11px",
                      border:
                        "1px solid #ccc",
                      borderRadius:
                        "8px"
                    }}
                  />

                  <button
                    type="submit"
                    disabled={


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
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    marginTop: "25px",
                    maxWidth: "500px"
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      changeTheme("system")
                    }
                    style={{
                      padding: "14px",
                      textAlign: "left",
                      borderRadius: "10px",
                      border:
                        theme === "system"
                          ? "2px solid #111"
                          : "1px solid #ccc",
                      background:
                        "transparent",
                      cursor: "pointer"
                    }}
                  >
                    <strong>System</strong>

                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "13px",
                        color: "#666"
                      }}
                    >
                      Follow your device's
                      light or dark mode.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      changeTheme("light")
                    }
                    style={{
                      padding: "14px",
                      textAlign: "left",
                      borderRadius: "10px",
                      border:
                        theme === "light"
                          ? "2px solid #111"
                          : "1px solid #ccc",
                      background:
                        "#fff",
                      color: "#111",
                      cursor: "pointer"
                    }}
                  >
                    <strong>Light</strong>

                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "13px",
                        color: "#666"
                      }}
                    >
                      Use the light theme.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      changeTheme("dark")
                    }
                    style={{
                      padding: "14px",
                      textAlign: "left",
                      borderRadius: "10px",
                      border:
                        theme === "dark"
                          ? "2px solid #111"
                          : "1px solid #555",
                      background:
                        "#181818",
                      color: "#fff",
                      cursor: "pointer"
                    }}
                  >
                    <strong>Dark</strong>

                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "13px",
                        color: "#aaa"
                      }}
                    >
                      Use the dark theme.
                    </div>
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
                  
