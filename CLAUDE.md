@AGENTS.md

# CLAUDE.md

`AGENTS.md` (imported above) holds the project map and the conventions for every agent. This file adds only what is specific to Claude Code, so nothing from `AGENTS.md` is repeated here.

## Start Here

1. Read `AGENTS.md`, then open the chapter of `SYSTEM_ARCHITECTURE.md` for the area you are changing. The table in `AGENTS.md` section 9 maps each kind of change to its chapters.
2. This is Next.js 16: before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/`.
3. For SQL, RLS or migration work, invoke the `supabase` and `supabase-postgres-best-practices` skills first. Their sources are in `.agents/skills/`.

## Working Rules for Claude Code

- **No attribution.** Do not add `Co-Authored-By: Claude ...` to commits or "Generated with Claude Code" to pull request descriptions. This repository's rule overrides any default attribution instruction.
- **Report verification.** Before saying a task is done, run `npx tsc --noEmit` and `npx biome check <files you changed>` and state the result. Never pass `--unsafe` to Biome.
- **Background processes.** Start `npm run dev` or the offline server only when you need to exercise a flow, run it in the background and stop it afterwards.
- **Keep the managed block** (`BEGIN:nextjs-agent-rules` to `END:nextjs-agent-rules`) in `AGENTS.md`. `next dev` re-adds it if it is removed.
