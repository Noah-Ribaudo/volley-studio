import type { Metadata, Viewport } from "next";
import "./globals.css";
import TextureModeLoader from "@/components/TextureModeLoader";
import ThemeInitializer from "@/components/ThemeInitializer";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Volley Studio",
  description: "Volleyball rotation visualization and training system",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Inline script to apply theme before React hydrates (prevents flash)
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('volleyball-theme');
    if (stored) {
      var parsed = JSON.parse(stored);
      var theme = parsed.state && parsed.state.theme;
      if (theme) {
        document.documentElement.setAttribute('data-theme', theme);
      }
    }
  } catch (e) { /* Theme parsing failed - use default */ }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-texture="low" data-theme="blue" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className="antialiased min-h-screen bg-background text-foreground"
      >
        <ThemeInitializer />
        <TextureModeLoader />
        <Toaster richColors position="top-center" />
        {children}
      </body>
    </html>
  );
}
