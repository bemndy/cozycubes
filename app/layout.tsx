import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Courier_Prime, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { DEFAULT_THEME, THEME_IDS, THEME_STORAGE_KEY } from "@/lib/theme";

// Exactly three fonts in the whole app, each its own token defined directly
// in globals.css (--font-sans, --font-mono, --font-pixel — no --font-ui or
// --font-chonky layer of indirection behind them), each kept to a short,
// deliberate chain rather than a long tail of redundant generic fallbacks:
//   --font-sans (UI chrome, body text)
//     BlinkMacSystemFont -> Inter -> sans-serif. BlinkMacSystemFont costs
//     nothing on Apple devices since it's just a system keyword; Inter is
//     the one real webfont loaded here, then exactly one generic keyword —
//     not several near-duplicate system-font aliases behind it.
//   --font-mono (technical data: scramble notation, stats, the solve list,
//   the header's own controls)
//     JetBrains Mono -> Courier Prime -> monospace, same idea: one real
//     second webfont before the single generic fallback.
//   --font-pixel (the timer's hero digits only)
//     Chonky Bits, self-hosted (see the @font-face in globals.css) — the one
//     deliberate exception to plain sans/mono text, since the digits are
//     meant to read as a distinct pixel-flavoured display face rather than
//     just bold body text.
//   All three run at 300 rather than each face's own 400 default — see the
//   body rule in globals.css. font-bold (TimerDisplay) overrides that
//   inherited 300 same as any other property.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
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
      className={`${jetbrainsMono.variable} ${courierPrime.variable} ${inter.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
