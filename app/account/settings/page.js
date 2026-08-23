"use client";

import { useEffect, useState } from "react";

const DEFAULT_AVATAR =
  "https://i.postimg.cc/JhwdnS9p/651c6da502353948bdc929f02da2b8e0.jpg";

export default function AccountSettingsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [theme, setTheme] = useState("system");

  const [username, setUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const [profilePicture, setProfilePicture] =
    useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [sendingCode, setSendingCode] = useState(false);
  const [changingUsername, setChangingUsername] =
    useState(false);
  const [changingPassword, setChangingPassword] =
    useState(false);
  const [savingProfile, setSavingProfile] =
    useState(false);

  useEffect(() => {
    loadAccount();
  }, []);

  useEffect(() => {
    const savedTheme =
      localStorage.getItem("krispy_theme") ||
      "system";

    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  async function loadAccount() {
    try {
      const response = await fetch(
        "/api/account/profile",
        {
          credentials: "include"
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to load account"
        );
      }

      setUser(data.user);
      setUsername(data.user.username || "");
      setEmail(data.user.email || "");
      setProfilePicture(
        data.user.profilePicture || ""
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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
      "krispy_theme",
      value
    );

    applyTheme(value);
  }

  async function handleUsernameChange(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setChangingUsername(true);

    try {
      const response = await fetch(
        "/api/account/username",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            username: newUsername
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to change username"
        );
      }

      setUsername(data.username);
      setNewUsername("");

      setUser((current) => ({
        ...current,
        username: data.username
      }));

      setMessage(
        "Username changed successfully."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingUsername(false);
    }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setChangingPassword(true);

    try {
      const response = await fetch(
        "/api/account/password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to change password"
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setMessage(
        "Password changed successfully. Please log in again."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingPassword(false);
    }
  }

  async function sendVerificationCode() {
    if (!email) {
      setError(
        "Please enter your email address first."
      );
      return;
    }

    setError("");
    setMessage("");
    setSendingCode(true);

    try {
      const response = await fetch(
        "/api/account/email/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            email
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to send verification code"
        );
      }

      setMessage(
        "A verification code has been sent to your email."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingCode(false);
    }
  }

  async function verifyEmail() {
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/account/email/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            code: verificationCode
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to verify email"
        );
      }

      setVerificationCode("");

      setUser((current) => ({
        ...current,
        email,
        emailVerified: true
      }));

      setMessage(
        "Email verified successfully."
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveProfile() {
    setError("");
    setMessage("");
    setSavingProfile(true);

    try {
      const response = await fetch(
        "/api/account/profile",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            profilePicture
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Failed to save profile"
        );
      }

      setUser((current) => ({
        ...current,
        profilePicture:
          data.user.profilePicture
      }));

      setMessage(
        "Profile picture saved successfully."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  if (loading) {
    return (
      <main className="account-settings">
        <div className="settings-card">
          Loading account settings...
        </div>
      </main>
    );
  }

  const avatar =
    profilePicture || DEFAULT_AVATAR;

  return (
    <main className="account-settings">
      <div className="settings-container">
        <header className="settings-header">
          <h1>Account Settings</h1>

          <p>
            Manage your KrispySkin account
            and preferences.
          </p>
        </header>

        {message && (
          <div className="settings-message">
            {message}
          </div>
        )}

        {error && (
          <div className="settings-error">
            {error}
          </div>
        )}

        <section className="settings-card">
          <h2>Profile</h2>

          <div className="profile-preview">
            <img
              src={avatar}
              alt="Profile"
              className="profile-avatar"
            />

            <div>
              <strong>
                {username || "User"}
              </strong>

              <p>
                {user?.email ||
                  "Email not verified"}
              </p>
            </div>
          </div>

          <label>
            Profile picture URL
          </label>

          <input
            type="url"
            value={profilePicture}
            placeholder={DEFAULT_AVATAR}
            onChange={(event) =>
              setProfilePicture(
                event.target.value
              )
            }
          />

          <button
            onClick={saveProfile}
            disabled={savingProfile}
          >
            {savingProfile
              ? "Saving..."
              : "Save Profile"}
          </button>
        </section>

        <section className="settings-card">
          <h2>Theme</h2>

          <p>
            Choose your KrispySkin
            appearance.
          </p>

          <select
            value={theme}
            onChange={(event) =>
              changeTheme(
                event.target.value
              )
            }
          >
            <option value="system">
              System
            </option>

            <option value="light">
              Light
            </option>

            <option value="dark">
              Dark
            </option>
          </select>
        </section>

        <section className="settings-card">
          <h2>Change Username</h2>

          <p>
            Current username:{" "}
            <strong>{username}</strong>
          </p>

          <form
            onSubmit={
              handleUsernameChange
            }
          >
            <input
              type="text"
              value={newUsername}
              placeholder="New username"
              maxLength={24}
              onChange={(event) =>
                setNewUsername(
                  event.target.value
                )
              }
            />

            <button
              type="submit"
              disabled={
                changingUsername ||
                !newUsername
              }
            >
              {changingUsername
                ? "Changing..."
                : "Change Username"}
            </button>
          </form>
        </section>

        <section className="settings-card">
          <h2>Change Password</h2>

          <p>
            Enter your current password
            before changing it.
          </p>

          <form
            onSubmit={
              handlePasswordChange
            }
          >
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(event) =>
                setCurrentPassword(
                  event.target.value
                )
              }
            />

            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(
                  event.target.value
                )
              }
            />

            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
            />

            <button
              type="submit"
              disabled={
                changingPassword
              }
            >
              {changingPassword
                ? "Changing..."
                : "Change Password"}
            </button>
          </form>
        </section>

        <section className="settings-card">
          <h2>Email Authorization</h2>

          {user?.emailVerified ? (
            <div className="verified">
              Verified email:
              <strong>
                {user.email}
              </strong>
            </div>
          ) : (
            <>
              <p>
                Verify your email so your
                account can be used for
                password recovery.
              </p>

              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
              />

              <button
                onClick={
                  sendVerificationCode
                }
                disabled={sendingCode}
              >
                {sendingCode
                  ? "Sending..."
                  : "Send Verification Code"}
              </button>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit code"
                value={verificationCode}
                onChange={(event) =>
                  setVerificationCode(
                    event.target.value
                  )
                }
              />

              <button
                onClick={verifyEmail}
                disabled={
                  verificationCode.length !==
                  6
                }
              >
                Verify Email
              </button>
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        .account-settings {
          min-height: 100vh;
          padding: 40px 20px;
          background: #f5f5f5;
          color: #171717;
        }

        .settings-container {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
        }

        .settings-header {
          margin-bottom: 25px;
        }

        .settings-header h1 {
          margin: 0;
          font-size: 32px;
        }

        .settings-header p {
          color: #666;
        }

        .settings-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 18px;
          box-shadow:
            0 4px 20px
            rgba(0, 0, 0, 0.06);
        }

        .settings-card h2 {
          margin-top: 0;
        }

        .settings-card p {
          color: #666;
        }

        .settings-card form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        input,
        select {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 14px;
          border: 1px solid #ddd;
          border-radius: 10px;
          font-size: 15px;
          margin: 8px 0;
          background: white;
          color: #171717;
        }

        button {
          border: 0;
          border-radius: 10px;
          padding: 12px 16px;
          margin-top: 8px;
          cursor: pointer;
          font-weight: 600;
          background: #171717;
          color: white;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .profile-preview {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          display: block;
        }

        .profile-preview strong {
          font-size: 20px;
        }

        .profile-preview p {
          margin: 4px 0 0;
        }

        .settings-message,
        .settings-error {
          padding: 14px;
          border-radius: 10px;
          margin-bottom: 16px;
        }

        .settings-message {
          background: #e8f7ec;
          color: #176b2c;
        }

        .settings-error {
          background: #fdeaea;
          color: #a32020;
        }

        .verified {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 14px;
          border-radius: 10px;
          background: #e8f7ec;
          color: #176b2c;
        }

        @media (max-width: 600px) {
          .account-settings {
            padding: 20px 12px;
          }

          .settings-card {
            padding: 18px;
          }

          .settings-header h1 {
            font-size: 26px;
          }
        }

        :global([data-theme="dark"])
          .account-settings {
          background: #111;
          color: #eee;
        }

        :global([data-theme="dark"])
          .settings-card {
          background: #1c1c1c;
          color: #eee;
        }

        :global([data-theme="dark"])
          .settings-card p {
          color: #aaa;
        }

        :global([data-theme="dark"])
          input,
        :global([data-theme="dark"])
          select {
          background: #252525;
          color: #eee;
          border-color: #444;
        }

        :global([data-theme="dark"])
          .settings-header p {
          color: #aaa;
        }
      `}</style>
    </main>
  );
              }
