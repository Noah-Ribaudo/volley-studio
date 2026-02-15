import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
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

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  var fallbackTheme = 'dark';
  try {
    var chicagoHour = Number(
      new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hourCycle: 'h23',
        timeZone: 'America/Chicago',
      }).format(new Date())
    );
    fallbackTheme = chicagoHour >= 6 && chicagoHour < 18 ? 'light' : 'dark';
  } catch (e) { /* Timezone parsing failed - use dark */ }

  try {
    document.documentElement.setAttribute('data-theme', fallbackTheme);
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
