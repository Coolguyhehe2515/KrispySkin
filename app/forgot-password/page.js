"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [step, setStep] =
    useState("email");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  function clearMessages() {
    setMessage("");
    setError("");
  }

  async function requestCode(event) {
    event.preventDefault();

    clearMessages();
    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            action: "request",
            email
          })
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Failed to send reset code."
        );
        return;
      }

      setMessage(
        data.message ||
          "Password reset code has been sent to your email."
      );

      setStep("code");
    } catch (err) {
      console.error(
        "Forgot password request error:",
        err
      );

      setError(
        "Could not connect to KrispySkin."
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();

    clearMessages();

    if (!/^\d{6}$/.test(code)) {
      setError(
        "Enter the 6-digit verification code."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            action: "verify",
            email,
            code
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

      setMessage(
        "Code verified. You can now choose a new password."
      );

      setStep("reset");
    } catch (err) {
      console.error(
        "Code verification error:",
        err
      );

      setError(
        "Could not verify the code."
      );
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();

    clearMessages();

    if (newPassword.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            action: "reset",
            email,
            code,
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
            "Failed to reset password."
        );
        return;
      }

      setMessage(
        "Password reset successfully. Redirecting to login..."
      );

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err) {
      console.error(
        "Password reset error:",
        err
      );

      setError(
        "Could not connect to KrispySkin."
      );
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    clearMessages();

    if (step === "code") {
      setStep("email");
      setCode("");
      return;
    }

    if (step === "reset") {
      setStep("code");
      setNewPassword("");
      setConfirmPassword("");
      return;
    }

    router.push("/login");
  }

  return (
    <main className="forgot-page">
      <div className="forgot-card">
        <div className="header">
          <h1>
            Forgot Password
          </h1>

          <p>
            Recover your KrispySkin
            account.
          </p>
        </div>

        {message && (
          <div className="message">
            {message}
          </div>
        )}

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {step === "email" && (
          <form
            onSubmit={requestCode}
          >
            <label>
              Email address
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="you@example.com"
              required
              autoComplete="email"
            />

            <p className="hint">
              Your email must be
              verified before it can
              be used for password
              recovery.
            </p>

            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Sending..."
                : "Send Reset Code"}
            </button>
          </form>
        )}

        {step === "code" && (
          <form
            onSubmit={verifyCode}
          >
            <label>
              Verification code
            </label>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value
                    .replace(
                      /\D/g,
                      ""
                    )
                )
              }
              placeholder="6-digit code"
              required
              autoComplete="one-time-code"
            />

            <p className="hint">
              Enter the 6-digit code
              sent to your verified
              email address.
            </p>

            <button
              type="submit"
              disabled={
                loading ||
                code.length !== 6
              }
            >
              {loading
                ? "Verifying..."
                : "Verify Code"}
            </button>
          </form>
        )}

        {step === "reset" && (
          <form
            onSubmit={resetPassword}
          >
            <label>
              New password
            </label>

            <input
              type="password"
              value={newPassword}
              onChange={(event) =>
                setNewPassword(
                  event.target.value
                )
              }
              placeholder="New password"
              minLength={8}
              required
              autoComplete="new-password"
            />

            <label>
              Confirm new password
            </label>

            <input
              type="password"
              value={
                confirmPassword
              }
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              placeholder="Confirm new password"
              minLength={8}
              required
              autoComplete="new-password"
            />

            <p className="hint">
              Your password must be at
              least 8 characters long.
            </p>

            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Resetting..."
                : "Reset Password"}
            </button>
          </form>
        )}

        <button
          type="button"
          className="back-button"
          onClick={goBack}
          disabled={loading}
        >
          {step === "email"
            ? "Back to Login"
            : "Back"}
        </button>
      </div>

      <style jsx>{`
        .forgot-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
          background: #f5f5f5;
          color: #171717;
          font-family:
            Arial,
            sans-serif;
        }

        .forgot-card {
          width: 100%;
          max-width: 420px;
          padding: 30px;
          box-sizing: border-box;
          background: #ffffff;
          border: 1px solid #e5e5e5;
          border-radius: 16px;
          box-shadow:
            0 8px 30px
            rgba(0, 0, 0, 0.06);
        }

        .header {
          margin-bottom: 24px;
        }

        .header h1 {
          margin: 0 0 8px;
          font-size: 28px;
        }

        .header p {
          margin: 0;
          color: #666;
        }

        form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        label {
          margin-top: 4px;
          font-weight: 600;
        }

        input {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 14px;
          border: 1px solid #d8d8d8;
          border-radius: 10px;
          background: #fff;
          color: #171717;
          font-size: 15px;
          outline: none;
        }

        input:focus {
          border-color: #777;
        }

        button {
          width: 100%;
          padding: 12px 16px;
          margin-top: 8px;
          border: 0;
          border-radius: 10px;
          background: #171717;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .back-button {
          background: transparent;
          color: #555;
          border: 1px solid #ddd;
          margin-top: 12px;
        }

        .hint {
          margin: 2px 0 4px;
          color: #777;
          font-size: 13px;
          line-height: 1.5;
        }

        .message,
        .error {
          padding: 12px 14px;
          border-radius: 10px;
          margin-bottom: 16px;
          font-size: 14px;
          line-height: 1.5;
        }

        .message {
          background: #e8f7ec;
          color: #176b2c;
        }

        .error {
          background: #fdeaea;
          color: #a32020;
        }

        @media (max-width: 600px) {
          .forgot-page {
            padding: 14px;
          }

          .forgot-card {
            padding: 22px;
          }

          .header h1 {
            font-size: 25px;
          }
        }

        :global([data-theme="dark"])
          .forgot-page {
          background: #111;
          color: #eee;
        }

        :global([data-theme="dark"])
          .forgot-card {
          background: #1c1c1c;
          border-color: #333;
          box-shadow:
            0 8px 30px
            rgba(0, 0, 0, 0.3);
        }

        :global([data-theme="dark"])
          .header p {
          color: #aaa;
        }

        :global([data-theme="dark"])
          input {
          background: #252525;
          color: #eee;
          border-color: #444;
        }

        :global([data-theme="dark"])
          input::placeholder {
          color: #888;
        }

        :global([data-theme="dark"])
          .hint {
          color: #aaa;
        }

        :global([data-theme="dark"])
          .back-button {
          color: #ccc;
          border-color: #444;
        }
      `}</style>
    </main>
  );
    }
