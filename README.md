# rke-poc-platform-v5

Static catalogue of the tools deployed across the BFSI POC's RKE2 DC/DR
clusters and shared infrastructure VMs.

- Live at <https://rke-poc-platform-v5.pages.dev>
- One page per tool under `tools/<id>.html`
- Plain static HTML + CSS, no build step

## Layout

```
index.html       # landing — overview, summary table, tile grid
styles.css       # shared styles
tools/*.html     # one file per tool (sidebar duplicated, active link set by inline JS)
```

## Editing

See **[AGENTS.md](./AGENTS.md)** for the full editor's guide
(checklists for adding/removing tools, deploy command, link audits,
gotchas).

## Deploy

Cloudflare Pages, Direct Upload — `git push` does **not** auto-deploy:

```bash
CLOUDFLARE_API_TOKEN=$(cat ~/cloud-init/scripts/agent3/cloudflare-token) \
CLOUDFLARE_ACCOUNT_ID=f0385fc5f0057b2573ae2a6b4c034c45 \
  npx --yes wrangler@latest pages deploy . \
    --project-name=rke-poc-platform-v5 \
    --branch=main \
    --commit-dirty=true
```
