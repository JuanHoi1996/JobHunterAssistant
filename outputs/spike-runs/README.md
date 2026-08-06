# Spike run logs

Each successful or failed `/api/spike/optimize-resume` call writes a JSON file here:

- full JD + resume text (local review only)
- model / provider / pipeline version
- analysis payload when available
- error + stage on failure

Files are gitignored. Open a few `*-ok.json` in chat when you want the agent to judge rewrite quality.
