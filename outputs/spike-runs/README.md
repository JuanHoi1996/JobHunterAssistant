# Spike run logs

Each `/api/spike/optimize-resume` response includes a `runLog` payload. In local `vinext dev`, the browser POSTs it to Vite middleware `POST /__dev/spike-run-log`, which writes a JSON file here (Workers VFS cannot write the real project tree).

Contents:

- full JD + resume text (local review only)
- model / provider / pipeline version
- analysis payload when available
- error + stage + optional model preview on failure

Files are gitignored. Restart `pnpm dev` after pulling the Vite plugin, then re-run analyze once — you should see `*-ok.json` / `*-fail.json` appear here.
