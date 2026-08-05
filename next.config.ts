import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Repo already has its own memory/CLAUDE.md convention (see that file for
  // why) — don't let Next regenerate a root CLAUDE.md/AGENTS.md on every dev run.
  agentRules: false,
};

export default nextConfig;
