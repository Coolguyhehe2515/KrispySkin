import Link from "next/link";

export default function Home() {
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
          maxWidth: "600px",
          textAlign: "center"
        }}
      >
        <h1>KrispySkin</h1>

        <p>
          Minecraft Java third-party skin service
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            marginTop: "25px"
          }}
        >
          <Link
            href="/login"
            style={{
              padding: "12px 24px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              textDecoration: "none"
            }}
          >
            Login
          </Link>

          <Link
            href="/register"
            style={{
              padding: "12px 24px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              textDecoration: "none"
            }}
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
