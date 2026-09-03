"use client";

import { Dialog } from "./ui/Dialog";

export type InfoTopic = "contact" | "terms" | "privacy" | "security";

/**
 * Placeholder copy for the footer's informational dialogs.
 *
 * These are dialogs rather than routes on purpose. The spec lists Privacy and
 * Terms as real pages (section 2.6), but shipping four footer links to routes
 * that 404 is worse than showing honest placeholder text — and this keeps the
 * user on the timer, which is the whole argument for the footer being dialogs
 * in the first place. Swapping any one of these for a route later is a one-line
 * change in the footer.
 */
const CONTENT: Record<InfoTopic, { title: string; body: string[] }> = {
  contact: {
    title: "📬 Contact",
    body: [
      "CozyCubes is an open-source hobby project.",
      "Bug reports and feature requests belong on the GitHub issue tracker, which is the fastest way to get a response.",
      "Placeholder — real contact details to be filled in before launch.",
    ],
  },
  terms: {
    title: "📄 Terms",
    body: [
      "CozyCubes is provided as-is, with no warranty, under the MIT licence.",
      "There are no accounts and no subscriptions. Nothing here is a paid service.",
      "Placeholder — full terms to be written before launch.",
    ],
  },
  privacy: {
    title: "🔒 Privacy",
    body: [
      "CozyCubes has no accounts, no analytics, and no servers holding your data.",
      "Your solves, settings, and theme live in this browser only — IndexedDB and localStorage on this device. Clearing site data erases them permanently, and nothing is synced anywhere.",
      "Placeholder — full policy to be written before launch.",
    ],
  },
  security: {
    title: "🛡️ Security",
    body: [
      "Everything runs client-side. Scramble generation, timing, and statistics never leave your device.",
      "If you find a security issue, please report it privately through the repository's security advisory form rather than opening a public issue.",
      "Placeholder — disclosure policy to be written before launch.",
    ],
  },
};

export function InfoDialog({
  topic,
  open,
  onClose,
}: {
  topic: InfoTopic;
  open: boolean;
  onClose: () => void;
}) {
  const { title, body } = CONTENT[topic];

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-3" style={{ color: "var(--ink-dim)" }}>
        {body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </Dialog>
  );
}
