# brac-poc-wiki-v5

Static catalogue of the tools deployed across the BRAC POC's RKE2 DC/DR
clusters and shared infrastructure VMs.

- Deployed via Cloudflare Pages: <https://brac-poc-wiki-v5.pages.dev>
- Source: `index.html` + `styles.css` (no build step)

## Layout

- `index.html` — single-page catalogue, left sidebar navigation
- `styles.css` — dark theme, responsive

## Update flow

Edit `index.html` directly; commits to `main` are deployed by Cloudflare
Pages (or via `wrangler pages deploy . --project-name=brac-poc-wiki-v5`).
