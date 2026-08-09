import type { Metadata } from "next";
import { JetBrains_Mono, Pixelify_Sans } from "next/font/google";
import "./globals.css";
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/theme";

// Three faces, three jobs:
//   UI chrome      -> the platform's own system font (see --font-ui in
//                     globals.css). Not loaded here; it's already on the device.
//   Technical data -> JetBrains Mono: scramble notation, stat values, the solve
//                     list, the ASCII boot art, the session readout.
//   Hero digits    -> Pixelify Sans, a grid-built pixel face. Its digits are
//                     uniform width by construction, so the running timer can't
//                     jitter as the numbers change.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const pixelifySans = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "CozyCubes",
  description: "A colorful, sound-rich Rubik's Cube speedsolving timer.",
};

// Runs before first paint, ahead of React hydrating, so the stored theme is
// already on <html> when the page paints. Without it every load flashes the
// default theme for a frame before the provider's effect corrects it.
const themeScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});document.documentElement.setAttribute("data-theme",t||${JSON.stringify(
  DEFAULT_THEME
)});}catch(e){document.documentElement.setAttribute("data-theme",${JSON.stringify(
  DEFAULT_THEME
)});}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      className={`${jetbrainsMono.variable} ${pixelifySans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
