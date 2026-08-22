export const metadata = {
  title: "KrispySkin",
  description: "Minecraft Java third-party skin service"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
