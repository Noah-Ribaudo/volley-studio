import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import {
  GeistPixelSquare,
  GeistPixelGrid,
  GeistPixelCircle,
  GeistPixelTriangle,
  GeistPixelLine,
} from "geist/font/pixel";
import "./globals.css";
import TextureModeLoader from "@/components/TextureModeLoader";
import ThemeInitializer from "@/components/ThemeInitializer";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { UserSettingsSync } from "@/components/settings/UserSettingsSync";
import { Toaster } from "sonner";
import { Agentation } from "agentation";

const barlow = localFont({
  src: [
    { path: "../public/fonts/barlow/Barlow-Light.woff2", weight: "300" },
    { path: "../public/fonts/barlow/Barlow-Regular.woff2", weight: "400" },
    { path: "../public/fonts/barlow/Barlow-Medium.woff2", weight: "500" },
    { path: "../public/fonts/barlow/Barlow-SemiBold.woff2", weight: "600" },
    { path: "../public/fonts/barlow/Barlow-Bold.woff2", weight: "700" },
  ],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCondensed = localFont({
  src: [
    { path: "../public/fonts/barlow/BarlowCondensed-Regular.woff2", weight: "400" },
    { path: "../public/fonts/barlow/BarlowCondensed-Medium.woff2", weight: "500" },
    { path: "../public/fonts/barlow/BarlowCondensed-SemiBold.woff2", weight: "600" },
    { path: "../public/fonts/barlow/BarlowCondensed-Bold.woff2", weight: "700" },
  ],
  variable: "--font-barlow-condensed",
  display: "swap",
});

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
  var resolvedTheme = 'dark';
  var getSystemTheme = function() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) { /* Ignore media query failures */ }
    return 'light';
  };

  resolvedTheme = getSystemTheme();
  try {
    var stored = localStorage.getItem('volleyball-theme');
    if (stored) {
      var parsed = JSON.parse(stored);
      var state = parsed && parsed.state ? parsed.state : null;
      var preference = state && state.themePreference;
      var storedTheme = state && state.theme;

      if (preference === 'light' || preference === 'dark') {
        resolvedTheme = preference;
      } else if (preference === 'auto') {
        resolvedTheme = getSystemTheme();
      } else if (storedTheme === 'light' || storedTheme === 'dark') {
        resolvedTheme = storedTheme;
      }
    }
  } catch (e) { /* Theme parsing failed - use default */ }

  document.documentElement.setAttribute('data-theme', resolvedTheme);
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-texture="low" data-theme="dark" suppressHydrationWarning className={`${barlow.variable} ${barlowCondensed.variable} ${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable} ${GeistPixelGrid.variable} ${GeistPixelCircle.variable} ${GeistPixelTriangle.variable} ${GeistPixelLine.variable}`}>
      <head>
        {process.env.NODE_ENV === "development" && (
          // eslint-disable-next-line @next/next/no-css-tags
          <link rel="stylesheet" href="/dev-theme-fonts.css" />
        )}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className="antialiased min-h-screen bg-background text-foreground"
      >
        <ConvexClientProvider>
          <ThemeInitializer />
          <TextureModeLoader />
          <UserSettingsSync />
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
          {process.env.NODE_ENV === "development" && <Agentation />}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
