<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git workflow

- Record each completed logical change in Git with a clear commit message before handing work back to the user.
- Review the diff and run checks appropriate to the change before committing.
- Stage only files belonging to the current task. Keep secrets, environment files, generated builds, and dependencies out of new commits.
- Preserve unrelated user changes. Push only when the user asks.
