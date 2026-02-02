import type { Metadata, Viewport } from "next";
import "./globals.css";
import TextureModeLoader from "@/components/TextureModeLoader";
import ThemeInitializer from "@/components/ThemeInitializer";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Volley Studio",
  description: "Volleyball rotation visualization and training system",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
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
        <ConvexClientProvider>
          <ThemeInitializer />
          <TextureModeLoader />
          <Toaster 
            richColors 
            position="top-center" 
            toastOptions={{
              style: {
                marginTop: 'env(safe-area-inset-top, 0px)',
              },
            }}
          />
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
