"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_PROFILE_PICTURE =
  "https://i.postimg.cc/JhwdnS9p/651c6da502353948bdc929f02da2b8e0.jpg";

export default function AccountSettings() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const [profilePicture, setProfilePicture] = useState("");
  const [theme, setTheme] = useState("system");

  const [sendingEmail, setSendingEmail] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [changingUsername, setChangingUsername] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [emailSent, setEmailSent] = useState(false);

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

        const currentUser = data.user;

        setUser(currentUser);
        setUsername(currentUser.username || "");
        setEmail(currentUser.email || "");
        setProfilePicture(
          currentUser.profilePicture || ""
        );
        setTheme(currentUser.theme || "system");
      } catch (error) {
        console.error("Account settings error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  function getProfilePicture() {
    return (
      profilePicture ||
      user?.profilePicture ||
      DEFAULT_PROFILE_PICTURE
    );
  }

  async function changeUsername(event) {
    event.preventDefault();

    if (!username.trim()) {
      alert("Username is required.");
      return;
    }

    setChangingUsername(true);

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
        alert(data.error || "Failed to change username.");
        return;
      }

      setUser((oldUser) => ({
        ...oldUser,
        username: data.username
      }));

      setUsername(data.username);

      alert("Username changed successfully.");
    } catch (error) {
      console.error("Username error:", error);
      alert("Failed to change username.");
    } finally {
      setChangingUsername(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();

    if (!currentPassword) {
      alert("Current password is required.");
      return;
    }

    if (!newPassword) {
      alert("New password is required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("New passwords do not match.");
      return;
    }

    setChangingPassword(true);

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
        alert(data.error || "Failed to change password.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      alert(
        "Password changed successfully. Please log in again."
      );

      router.replace("/login");
    } catch (error) {
      console.error("Password error:", error);
      alert("Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();

    setSavingProfile(true);

    try {
      const response = await fetch(
        "/api/account/profile",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            profilePicture: profilePicture.trim(),
            theme
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to save profile.");
        return;
      }

      setUser((oldUser) => ({
        ...oldUser,
        profilePicture:
          data.profilePicture || "",
        theme: data.theme || "system"
      }));

      alert("Profile settings saved.");
    } catch (error) {
      console.error("Profile error:", error);
      alert("Failed to save profile settings.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function sendVerificationCode() {
    if (!email.trim()) {
      alert("Please enter your email address.");
      return;
    }

    setSendingEmail(true);

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
        alert(
          data.error ||
            "Failed to send verification code."
        );
        return;
      }

      setEmailSent(true);

      alert(
        "Verification code sent. Check your email."
      );
    } catch (error) {
      console.error("Email send error:", error);
      alert(
        "Failed to send verification code."
      );
    } finally {
      setSendingEmail(false);
    }
  }

  async function verifyEmail(event) {
    event.preventDefault();

    if (!verificationCode.trim()) {
      alert("Please enter the verification code.");
      return;
    }

    setVerifyingEmail(true);

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
            code: verificationCode.trim()
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.error ||
            "Failed to verify email."
        );
        return;
      }

      setUser((oldUser) => ({
        ...oldUser,
        email,
        emailVerified: true
      }));

      setVerificationCode("");
      setEmailSent(false);

      alert(
        "Email authorized successfully."
      );
    } catch (error) {
      console.error("Email verification error:", error);
      alert(
        "Failed to verify email."
      );
    } finally {
      setVerifyingEmail(false);
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
        <h1>Loading Account Settings...</h1>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        padding: "30px 20px",
        fontFamily: "Arial, sans-serif",
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          maxWidth: "850px",
          margin: "0 auto"
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            marginBottom: "20px",
            padding: "9px 15px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            background: "#fff",
            cursor: "pointer"
          }}
        >
          ← Back
        </button>

        <h1
          style={{
            marginBottom: "8px"
          }}
        >
          Account Settings
        </h1>

        <p
          style={{
            color: "#666",
            marginBottom: "25px"
          }}
        >
          Manage your KrispySkin profile and account.
        </p>

        {/* PROFILE */}

        <section
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "14px",
            padding: "25px",
            marginBottom: "20px"
          }}
        >
          <h2>Profile</h2>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              marginTop: "20px",
              marginBottom: "25px",
              flexWrap: "wrap"
            }}
          >
            <img
              src={getProfilePicture()}
              alt="Profile"
              onError={(event) => {
                event.currentTarget.src =
                  DEFAULT_PROFILE_PICTURE;
              }}
              style={{
                width: "110px",
                height: "110px",
                objectFit: "cover",
                borderRadius: "50%",
                border: "3px solid #ddd"
              }}
            />

            <div>
              <h3
                style={{
                  margin: "0 0 5px"
                }}
              >
                {user?.username || "User"}
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#777"
                }}
              >
                {user?.email || "No email authorized"}
              </p>
            </div>
          </div>

          <form onSubmit={saveProfile}>
            <label
              style={{
                display: "block",
                fontWeight: "bold",
                marginBottom: "7px"
              }}
            >
              Profile Picture URL
            </label>

            <input
              type="url"
              value={profilePicture}
              onChange={(event) =>
                setProfilePicture(
                  event.target.value
                )
              }
              placeholder="https://example.com/avatar.jpg"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "11px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                marginBottom: "15px"
              }}
            />

            <button
              type="button"
              onClick={() =>
                setProfilePicture("")
              }
              style={{
                padding: "9px 14px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                background: "#fff",
                cursor: "pointer",
                marginBottom: "20px"
              }}
            >
              Use Default Picture
            </button>

            <h3>Theme</h3>

            <select
              value={theme}
              onChange={(event) =>
                setTheme(event.target.value)
              }
              style={{
                width: "100%",
                padding: "11px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                marginBottom: "18px",
                background: "#fff"
              }}
            >
              <option value="system">
                System Default
              </option>

              <option value="light">
                Light
              </option>

              <option value="dark">
                Dark
              </option>
            </select>

            <button
              type="submit"
              disabled={savingProfile}
              style={{
                padding: "11px 18px",
                border: "none",
                borderRadius: "8px",
                background: "#111",
                color: "#fff",
                cursor: "pointer"
              }}
            >
              {savingProfile
                ? "Saving..."
                : "Save Profile"}
            </button>
          </form>
        </section>

        {/* USERNAME */}

        <section
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "14px",
            padding: "25px",
            marginBottom: "20px"
          }}
        >
          <h2>Username</h2>

          <p
            style={{
              color: "#666"
            }}
          >
            Change the username displayed on your
            KrispySkin profile.
          </p>

          <form onSubmit={changeUsername}>
            <input
              type="text"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              minLength={3}
              maxLength={24}
              placeholder="Username"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "11px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                marginBottom: "12px"
              }}
            />

            <button
              type="submit"
              disabled={changingUsername}
              style={{
                padding: "11px 18px",
                border: "none",
                borderRadius: "8px",
                background: "#111",
                color: "#fff",
                cursor: "pointer"
              }}
            >
              {changingUsername
                ? "Changing..."
                : "Change Username"}
            </button>
          </form>
        </section>

        {/* PASSWORD */}

        <section
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "14px",
            padding: "25px",
            marginBottom: "20px"
          }}
        >
          <h2>Password</h2>

          <p
            style={{
              color: "#666"
            }}
          >
            You must enter your current password
            before creating a new one.
          </p>

          <form onSubmit={changePassword}>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) =>
                setCurrentPassword(
                  event.target.value
                )
              }
              placeholder="Current Password"
              autoComplete="current-password"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "11px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                marginBottom: "10px"
              }}
            />

            <input
              type="password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(
                  event.target.value
                )
              }
              placeholder="New Password"
              autoComplete="new-password"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "11px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                marginBottom: "10px"
              }}
            />

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              placeholder="Confirm New Password"
              autoComplete="new-password"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "11px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                marginBottom: "12px"
              }}
            />

            <button
              type="submit"
              disabled={changingPassword}
              style={{
                padding: "11px 18px",
                border: "none",
                borderRadius: "8px",
                background: "#111",
                color: "#fff",
                cursor: "pointer"
              }}
            >
              {changingPassword
                ? "Changing..."
                : "Change Password"}
            </button>
          </form>
        </section>

        {/* EMAIL */}

        <section
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "14px",
            padding: "25px",
            marginBottom: "20px"
          }}
        >
          <h2>Email Authorization</h2>

          <p
            style={{
              color: "#666"
            }}
          >
            Authorize your email so you can recover
            your account if you forget your password.
          </p>

          <div
            style={{
              padding: "12px",
              borderRadius: "8px",
              background:
                user?.emailVerified
                  ? "#e8f8e8"
                  : "#fff4d6",
              marginBottom: "15px"
            }}
          >
            {user?.emailVerified
              ? "Email authorized"
              : "Email not authorized"}
          </div>

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="your@email.com"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "11px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              marginBottom: "10px"
            }}
          />

          <button
            type="button"
            disabled={sendingEmail}
            onClick={sendVerificationCode}
            style={{
              padding: "11px 18px",
              border: "none",
              borderRadius: "8px",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
              marginBottom: "15px"
            }}
          >
            {sendingEmail
              ? "Sending..."
              : user?.emailVerified
              ? "Change Email"
              : "Authorize Email"}
          </button>

          {emailSent && (
            <form onSubmit={verifyEmail}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verificationCode}
                onChange={(event) =>
                  setVerificationCode(
                    event.target.value
                      .replace(/\D/g, "")
                  )
                }
                placeholder="6-digit verification code"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "11px",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  marginBottom: "10px"
                }}
              />

              <button
                type="
