import "./globals.css";

const resolvedMetadataBase = (() => {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3000");
  }
})();

export const metadata = {
  metadataBase: resolvedMetadataBase,
  title: "Records Management System",
  description: "JWT auth records management with admin panel",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png"
  },
  openGraph: {
    title: "Records Management System",
    description: "JWT auth records management with admin panel",
    images: ["/logo.png"]
  },
  twitter: {
    card: "summary",
    images: ["/logo.png"]
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
