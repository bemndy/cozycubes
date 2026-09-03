import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import { DEFAULT_THEME, THEME_IDS, THEME_STORAGE_KEY } from "@/lib/theme";

// Two faces, everywhere:
//   UI chrome + hero digits -> Inter, as the variable font ("Inter var") —
//                     one file covering every weight instead of a static cut
//                     per weight, so the timer's bold display weight and the
//                     UI's regular text share a single download. This also
//                     replaced the dedicated pixel face (DotGothic16, then
//                     VT323) the timer digits used to run on; Inter's tabular
//                     figures (the tabular-nums utility) cover the "digits
//                     can't jitter width as they change" requirement that was
//                     the whole reason a monospaced face was there.
//   Technical data  -> JetBrains Mono: scramble notation, stat values, the
//                     solve list, the ASCII boot art, the session readout,
//                     and now the header's own controls too.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: "variable",
});

export const metadata: Metadata = {
  title: "CozyCubes",
  description: "A colorful, sound-rich Rubik's Cube speedsolving timer.",
  // Fixed royal-blue square, not theme-conditional — unlike the two wordmark
  // SVGs, the tab icon has its own background baked in rather than sitting on
  // the browser chrome's colour, so there's nothing for a theme to contrast
  // against here.
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
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
      className={`${jetbrainsMono.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
