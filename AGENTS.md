# AGENTS.md — brac-poc-wiki-v5

Guide for any agent (or human) editing this site. **Read this first.**

The site is a static catalogue of tools deployed across the BRAC POC's
RKE2 DC/DR clusters. It is a multi-page site: one landing page, one
page per tool. It's served from this repo on Cloudflare Pages.

---

## What this site is

- **Repo:** <https://github.com/zeshaq/brac-poc-wiki-v5>
- **Production URL:** <https://brac-poc-wiki-v5.pages.dev>
- **Cloudflare project:** `brac-poc-wiki-v5` (Pages, **Direct Upload — not git-integrated**)
- **Cloudflare account ID:** `f0385fc5f0057b2573ae2a6b4c034c45`
- **Production branch:** `main`

> A `git push` alone **does not deploy.** You must run
> `wrangler pages deploy` after every change (see "Deploy" below).

---

## Repo layout

```
.
├── AGENTS.md           # this guide
├── README.md           # short readme for human visitors
├── index.html          # landing page (overview + summary table + tool tile grid)
├── styles.css          # shared styles, dark theme, responsive
└── tools/
    ├── argocd.html
    ├── awx.html
    ├── cert-manager.html
    ├── gitlab.html
    ├── haproxy.html
    ├── jenkins.html
    ├── kafka.html
    ├── keycloak.html
    ├── longhorn.html
    ├── minio.html
    ├── mirrormaker2.html
    ├── nexus.html
    ├── pdns.html
    ├── redis-applier.html
    ├── redis-operator.html
    ├── redis.html
    ├── redisinsight.html
    ├── signoz.html
    ├── strimzi.html
    ├── terrakube.html
    ├── vault.html
    └── webhook-pdns.html
```

No build step, no framework, no runtime dependencies. Just static HTML
+ CSS + ~5 lines of JS to mark the active sidebar link. **Don't add a
toolchain.** Adding one is a one-way door for the next agent.

### Why one file per tool

Each tool has its own page so you can grow it independently —
diagrams, runbook content, configuration values, failover logs. The
sidebar is duplicated across all 23 pages (index + 22 tools); a tiny
inline `<script>` at the bottom of every page sets the active link
based on `window.location.pathname`, so the markup is identical and
sed-friendly.

---

## When to update the site

Edit when the underlying state in either cluster changes:

- A new app reaches Synced/Healthy in DC and DR (or DR-only).
- An app is decommissioned (delete its page + sidebar links + index references).
- A material fact changes: chart/app version, hostname, failover
  times, topology (e.g. brokers count), authn/authz mode, OIDC issuer URL.
- A failover smoke test produces a new measurement worth surfacing.

Don't add cards/pages for:

- Things in the GitOps repo but not actually deployed.
- Per-MR plumbing details — those belong in `infra/gitops-rke2`'s
  commit history, not in a presentation surface.
- Internal TODOs or known cosmetic OOS issues — those live in
  `~/cloud-init/scripts/agent3/STATE.md`.

When in doubt: if `STATE.md` shows the row Synced/Healthy in both
clusters, it can go on the site. If not, leave it off.

---

## How to make a change

### 0. Get the working tree

If `/tmp/brac-poc-wiki-v5/` exists from a prior session you can reuse
it. Otherwise:

```bash
git clone https://github.com/zeshaq/brac-poc-wiki-v5.git /tmp/brac-poc-wiki-v5
cd /tmp/brac-poc-wiki-v5
```

For pushes, authenticate with the `zeshaq` GitHub PAT:

```bash
GH_TOKEN=$(cat ~/cloud-init/scripts/agent3/gh-zeshaq-token)
git push "https://zeshaq:${GH_TOKEN}@github.com/zeshaq/brac-poc-wiki-v5.git" main
```

The token (`ghp_…`) is at `~/cloud-init/scripts/agent3/gh-zeshaq-token`
(chmod 600). **Never echo it, never commit it, never paste it into a
URL that ends up in shell history.**

### 1. Edit content on a single tool page

Most edits land here. Just open `tools/<id>.html` and add detail to
the existing sections — they're pre-stubbed with placeholders so you
have clear places for content.

Each tool page has this structure (top to bottom):

| Section | Class / role | What goes there |
|---|---|---|
| Breadcrumb | `nav.breadcrumb` | "Catalogue / &lt;Layer&gt; / &lt;Tool&gt;". Layer label is hard-coded — update if you re-categorise. |
| Page header | `header.page-header` | Kicker (layer name), `<h1>` (tool name), badges, lede sentence. |
| Quick facts | `.card` + `dl.meta.meta-grid` | Two-column key/value table. |
| What it is | `.card` | Multi-paragraph prose describing the component. |
| Architecture | `.card.placeholder` | Add diagrams or topology notes. Drop the `.placeholder` class once it has real content. |
| Configuration | `.card.placeholder` | Chart values, env, OIDC client config. Link to source files in `infra/gitops-rke2` rather than copying YAML wholesale. |
| Operations | `.card.placeholder` | Runbook notes: backup, restore, common troubleshooting. |
| Failover | `.card.placeholder` | DC/DR cutover/cutback notes: HAProxy backend, healthcheck, measured times. |
| References | `.card.placeholder` | Upstream chart/project links, ADR refs, MR links, cross-references. |
| Page nav | `nav.page-nav` | Prev/next links to adjacent tool pages. |

**When a placeholder section gets real content, remove the
`placeholder` class on its `<section>`** so the dashed outline goes
away.

The sidebar is the same `<aside class="sidebar">` block on every page;
the active link is set at runtime by the inline `<script>` near
`</body>`. You normally don't touch the sidebar when editing a single
tool page.

### 2. Add a new tool

This touches more files. Checklist:

1. **Create the tool page.** Easiest: copy an existing one with a
   similar shape, e.g.
   ```bash
   cp tools/argocd.html tools/<new-id>.html
   ```
   Then edit:
   - `<title>…</title>`
   - The breadcrumb's layer label.
   - The `kicker`, `<h1>`, badges, and lede in the page header.
   - The Quick facts `<dl>`.
   - The "What it is" prose.
   - The prev/next links at the bottom (`<nav class="page-nav">`).

2. **Add a sidebar link in every page.** This is the duplicated bit.
   Use sed:
   ```bash
   # Insert under the right group heading (e.g. CI / CD & IaC):
   sed -i 's|<a href="/tools/awx.html">AWX</a>|&\n    <a href="/tools/<new-id>.html"><New name></a>|' \
     index.html tools/*.html
   ```
   Or add it manually to each file. Either way, all 23 files must end
   up with the same sidebar markup. There's an audit script for this
   below.

3. **Update `index.html`.** Two places:
   - The Overview summary table (`<table class="summary">`) — append
     to or extend the right layer's row.
   - The tool tile grid for that layer (`<div class="tool-grid">`
     under the matching `<h2 class="section-rule">`) — append a new
     `<a class="tool-tile" …>`.

4. **Fix prev/next on the neighbours.** The new tool inserts into the
   ordering. Find the page that previously linked to your neighbour
   and update its "next" link, and update the new neighbour's "prev"
   link.

### 3. Remove a tool

1. `rm tools/<id>.html`
2. Sed the sidebar entry out of all 23 files (`index.html` +
   `tools/*.html`).
3. Remove the row in `index.html`'s summary table and the tile in the
   tool grid.
4. Fix prev/next on the neighbours in the tools that bordered it.

### 4. Smoke-check locally

```bash
cd /tmp/brac-poc-wiki-v5
python3 -m http.server 8080 &
SERVER_PID=$!
sleep 1
curl -sI http://127.0.0.1:8080/                          | head -1   # 200
curl -sI http://127.0.0.1:8080/styles.css                | head -1   # 200
curl -sI http://127.0.0.1:8080/tools/<some-tool>.html    | head -1   # 200
kill $SERVER_PID
```

**Internal-link audit** (catch sidebar drift and dead links):

```bash
python3 - <<'PY'
import re, pathlib
root = pathlib.Path('.')
hrefs = set()
for f in [root/'index.html'] + sorted((root/'tools').glob('*.html')):
    for m in re.finditer(r'href="(/[^"#?]+)"', f.read_text()):
        hrefs.add(m.group(1))
missing = []
for h in sorted(hrefs):
    p = root / h.lstrip('/')
    if h == '/':
        p = root / 'index.html'
    if not p.exists():
        missing.append(h)
print('total internal hrefs:', len(hrefs))
print('missing targets:', missing or 'none')
PY
```

**Sidebar consistency check** — every page should have the same
`<aside class="sidebar">…</aside>` block, modulo the per-page
`class="active"` / `aria-current="page"` attributes that mark the
sidebar entry for the current page. The check below strips those
before hashing:

```bash
python3 - <<'PY'
import re, pathlib, hashlib
from collections import Counter
root = pathlib.Path('.')
files = [root/'index.html'] + sorted((root/'tools').glob('*.html'))
sb = set()
for f in files:
    m = re.search(r'<aside class="sidebar".*?</aside>', f.read_text(), re.S)
    if not m:
        sb.add('NONE'); continue
    b = re.sub(r'\s*class="active"', '', m.group(0))
    b = re.sub(r'\s*aria-current="page"', '', b)
    sb.add(hashlib.sha1(b.encode()).hexdigest())
print('sidebar variants (after stripping per-page active state):', len(sb))
# Expected output: 1
PY
```

> The earlier one-liner that hashed the raw `<aside>` block (without
> stripping `class="active"`) reported 23 variants on a healthy tree
> — false positive. Use the script above.

### 5. Commit & push

```bash
git -c user.name="Zahid Eshaque" -c user.email="zeshaq@gmail.com" \
  commit -am "Update <Tool>: <what changed>"
GH_TOKEN=$(cat ~/cloud-init/scripts/agent3/gh-zeshaq-token)
git push "https://zeshaq:${GH_TOKEN}@github.com/zeshaq/brac-poc-wiki-v5.git" main
```

### 6. Deploy to Cloudflare Pages

```bash
CLOUDFLARE_API_TOKEN=$(cat ~/cloud-init/scripts/agent3/cloudflare-token) \
CLOUDFLARE_ACCOUNT_ID=f0385fc5f0057b2573ae2a6b4c034c45 \
  npx --yes wrangler@latest pages deploy . \
    --project-name=brac-poc-wiki-v5 \
    --branch=main \
    --commit-dirty=true
```

Wrangler prints a preview URL (`<hash>.brac-poc-wiki-v5.pages.dev`)
and promotes the production URL. Verify:

```bash
curl -sI https://brac-poc-wiki-v5.pages.dev/                       | head -1
curl -sI https://brac-poc-wiki-v5.pages.dev/styles.css             | head -1
curl -sI https://brac-poc-wiki-v5.pages.dev/tools/keycloak.html    | head -1
```

If any check fails, scroll back through the wrangler output for upload
errors before re-trying.

### 7. Log the change

Per the project's session-continuity convention:

- Append a one-line entry under today's heading in
  `~/cloud-init/scripts/agent3/CHANGELOG.md`
  (e.g. *"brac-poc-wiki-v5: filled Architecture section on
  tools/kafka.html; redeployed; HTTP 200"*).
- For material changes (new tool page, version bump, deprecation),
  also touch `~/cloud-init/scripts/agent3/STATE.md`.

---

## Tokens & accounts (read once, never echo)

| Purpose | Path | Notes |
|---|---|---|
| GitHub PAT (zeshaq) | `~/cloud-init/scripts/agent3/gh-zeshaq-token` | Repo creation, push. `ghp_…`. chmod 600. |
| Cloudflare API token | `~/cloud-init/scripts/agent3/cloudflare-token` | Pages projects + Direct Upload. `cfut_…`. chmod 600. |
| Cloudflare account ID | `f0385fc5f0057b2573ae2a6b4c034c45` | Public id, fine to commit. |

Other tokens in `~/cloud-init/` (`gitlab-md-pat`, `gitlab-root-pat`,
`github-pat`, etc.) are **for other systems** — don't reuse them
here. The `~/cloud-init/github-pat` file is a separate token from
`~/cloud-init/scripts/agent3/gh-zeshaq-token`; this site uses the
agent3 one (it was provisioned for `zeshaq`'s personal repos).

---

## Operational tips & gotchas

- **No git integration on the Pages project.** A `git push` alone
  does not deploy. Always run wrangler. If a future agent flips the
  project to Git integration, update this guide and remove this
  caveat.
- **Sidebar drift across pages is the easiest mistake.** Every page
  must carry the same `<aside class="sidebar">` block. The audit
  one-liner above catches it.
- **Index summary table & tile grid drift.** After adding/removing a
  tool, both must be in sync with the actual `tools/*.html` set.
- **Keep placeholders honest.** When you fill a placeholder section
  with real content, drop the `placeholder` class on the `<section>`
  so the dashed outline goes away — that's the visual cue to readers
  that the page is no longer stubbed in that area.
- **No analytics, no tracking scripts.** Intentional for the BRAC
  presentation context. Don't add any.
- **Don't introduce a SPA framework, build step, or CSS preprocessor.**
  The whole site is plain HTML + one CSS file. That's a feature.
- **Don't put real secrets, internal IPs, or admin URLs on the site.**
  It's a public Pages domain. Hostnames like
  `auth.apps.sub.comptech-lab.com` are fine (already public via cert
  transparency); cluster-internal addresses, root passwords, Vault
  tokens, etc. are not.

---

## How this was first stood up (for reference)

1. Created GitHub repo `zeshaq/brac-poc-wiki-v5` via REST API with
   the zeshaq PAT.
2. Created Cloudflare Pages project `brac-poc-wiki-v5` (Direct
   Upload, prod branch `main`) via API on account
   `f0385fc5f0057b2573ae2a6b4c034c45`.
3. Initial deploy was a single-page site (`index.html` only). It was
   then expanded to one page per tool under `tools/<id>.html`, with
   the landing page becoming an overview + summary table + tile
   grid. Pages were initially scaffolded by a one-shot Python
   generator from a tools manifest; that generator was **not**
   committed — once written, the static HTML files are canonical and
   are edited directly.
4. `npx wrangler pages deploy . --project-name=brac-poc-wiki-v5
   --branch=main` for every redeploy.

If you ever need to nuke and redo: delete the GitHub repo + the
Cloudflare Pages project, then repeat the steps above. Account ID and
tokens are stable.
