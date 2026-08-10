import type { Metadata } from "next";
import { DotGothic16, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { DEFAULT_THEME, THEME_IDS, THEME_STORAGE_KEY } from "@/lib/theme";

// Three faces, three jobs:
//   UI chrome      -> the platform's own system font (see --font-ui in
//                     globals.css). Not loaded here; it's already on the device.
//   Technical data -> JetBrains Mono: scramble notation, stat values, the solve
//                     list, the ASCII boot art, the session readout.
//   Hero digits    -> DotGothic16, a bitmap face drawn on a 16-pixel grid.
//                     Silkscreen before it sat on roughly a 5-pixel grid, which
//                     is what made it hard to read at a glance: there simply
//                     aren't enough pixels to separate a 6 from an 8. Four times
//                     the vertical resolution keeps the pixel character while
//                     making the digits legible mid-solve. Uniform digit widths,
//                     so the running timer can't jitter as the numbers change.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const pixelFace = DotGothic16({
  variable: "--font-pixel-src",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "CozyCubes",
  description: "A colorful, sound-rich Rubik's Cube speedsolving timer.",
  // The black-framed mark is the default. The white-framed one takes over when
  // the browser's own chrome is dark, since a black frame on a dark tab strip
  // would leave only the pink monogram floating.
  icons: {
    icon: [
      { url: "/cozycube_dark.svg", type: "image/svg+xml" },
      {
        url: "/cozycube_light.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
};

// Runs before first paint, ahead of React hydrating, so the stored theme is
// already on <html> when the page paints. Without it every load flashes the
// default theme for a frame before useTheme's read corrects it.
//
// The stored value is checked against the known list rather than trusted.
// Theme ids do get renamed, and a stale one would otherwise be written to the
// attribute, match no theme block, and leave React and the DOM disagreeing
// about which theme is active.
const themeScript = `(function(){try{var ids=${JSON.stringify(THEME_IDS)};
var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
if(ids.indexOf(t)<0)t=${JSON.stringify(DEFAULT_THEME)};
document.documentElement.setAttribute("data-theme",t);}
catch(e){document.documentElement.setAttribute("data-theme",${JSON.stringify(
  DEFAULT_THEME
)});}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      className={`${jetbrainsMono.variable} ${pixelFace.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
