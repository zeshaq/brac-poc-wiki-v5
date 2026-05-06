# AGENTS.md — brac-poc-wiki-v5

Guide for any agent (or human) editing this site. Read this first.

The site is a single-page static catalogue of tools deployed across the
BRAC POC's RKE2 DC/DR clusters. It is rendered live from this repo on
Cloudflare Pages.

---

## What this site is

- **Repo:** <https://github.com/zeshaq/brac-poc-wiki-v5>
- **Production URL:** <https://brac-poc-wiki-v5.pages.dev>
- **Cloudflare project:** `brac-poc-wiki-v5` (Pages, Direct Upload — not git-integrated)
- **Cloudflare account ID:** `f0385fc5f0057b2573ae2a6b4c034c45`
- **Production branch:** `main`

The Cloudflare Pages project is **not** wired to GitHub today. New
commits to `main` do not auto-deploy. You must run `wrangler pages
deploy` after each change (see "Deploy" below). If we later switch to
Git integration, this section should be updated.

---

## Repo layout

```
.
├── AGENTS.md      # this guide
├── README.md      # short readme for human visitors
├── index.html     # single page, sections + left sidebar
└── styles.css     # all styling, dark theme, responsive
```

No build step, no framework, no JS dependencies beyond a tiny inline
IntersectionObserver in `index.html` that highlights the current section
in the sidebar. Keep it that way unless there's a strong reason to add a
toolchain — adding one is a one-way door for the next agent.

---

## When to update this site

The site is a snapshot of the **deployed** DC/DR tooling, not a roadmap.
Add or change a card when the underlying state in either cluster
changes:

- A new app reaches Synced/Healthy in DC and DR (or DR-only).
- An app is decommissioned (delete its card and its sidebar link).
- A material fact changes: chart/app version, hostname, failover times,
  topology (e.g. brokers count), authn/authz mode, OIDC issuer URL.
- A failover smoke test produces a new measurement worth surfacing.

Do **not** add cards for:

- Things that exist in the GitOps repo but aren't deployed yet.
- Per-MR plumbing details — those belong in `infra/gitops-rke2`'s commit
  history, not in a presentation surface.
- Internal TODOs or known cosmetic OOS issues — those live in
  `~/cloud-init/scripts/agent3/STATE.md`.

When in doubt: if `STATE.md` shows the row Synced/Healthy in both
clusters, it can go on the site. If not, leave it off.

---

## How to make a change

### 1. Get the working tree

If `/tmp/brac-poc-wiki-v5/` exists from a prior session you can reuse
it. Otherwise:

```bash
git clone https://github.com/zeshaq/brac-poc-wiki-v5.git /tmp/brac-poc-wiki-v5
cd /tmp/brac-poc-wiki-v5
```

For pushes, authenticate with the `zeshaq` GitHub PAT at
`~/cloud-init/scripts/agent3/gh-zeshaq-token` (chmod 600). **Never**
echo it into chat, commit it, or paste it into a URL that ends up in
shell history. Read it at runtime:

```bash
GH_TOKEN=$(cat ~/cloud-init/scripts/agent3/gh-zeshaq-token)
git push "https://zeshaq:${GH_TOKEN}@github.com/zeshaq/brac-poc-wiki-v5.git" main
```

(Or use the GitHub CLI / SSH if your environment has them set up.)

### 2. Edit the content

- All copy and structure live in `index.html`.
- Sections are `<section class="card" id="...">`. The id must match the
  sidebar `<a href="#...">`.
- Per-card structure:
  ```html
  <section id="<id>" class="card">
    <div class="card-head">
      <h3>Display name</h3>
      <div class="badges">
        <span class="badge dc">DC</span>
        <span class="badge dr">DR</span>
        <!-- or .dr-only / .shared -->
      </div>
    </div>
    <p>One-paragraph description (concrete: what it is, what role it plays here).</p>
    <dl class="meta">
      <dt>Field</dt><dd>Value</dd>
      <!-- repeat -->
    </dl>
  </section>
  ```
- Badges (`styles.css` defines the colors):
  - `.badge.dc` — present in DC RKE2.
  - `.badge.dr` — present in DR RKE2.
  - `.badge.dr-only` — DR cluster only (e.g. MirrorMaker 2).
  - `.badge.shared` — shared infra VM, not a per-cluster deployment.
- Sections grouped by layer with `<h2 class="section-rule">…</h2>`.
  Don't add new layer headings unless you genuinely need a new layer.
- The Overview summary table at the top must stay in sync with the
  sections. If you add or remove a tool, update both.

### 3. Add a new tool (full checklist)

1. Add a sidebar entry under the right `nav-group` in `index.html`.
2. Add the matching `<section id="…" class="card">` in the body, under
   the right layer heading.
3. Update the Overview summary table row for that layer.
4. If introducing a new badge color (DR-only, shared, etc.) make sure
   the legend block in the page header still covers what's used.

### 4. Remove a tool

1. Delete the sidebar `<a>` link.
2. Delete the `<section>`.
3. Update the Overview summary table.

### 5. Smoke-check locally

```bash
cd /tmp/brac-poc-wiki-v5
python3 -m http.server 8080
# open http://localhost:8080/  in a browser, or:
curl -sI http://localhost:8080/ | head -1
curl -s  http://localhost:8080/ | grep -oE '<title>[^<]+</title>'
```

Both should succeed. Visually confirm the sidebar + section
highlighting work and there are no broken anchors.

### 6. Commit & push

Commit on `main`. Keep messages short and present-tense; no co-author
trailer is required for this repo.

```bash
git -c user.name="Zahid Eshaque" -c user.email="zeshaq@gmail.com" \
  commit -am "Add <Tool> card; refresh overview table"
git push  # uses the auth above
```

### 7. Deploy to Cloudflare Pages

```bash
cd /tmp/brac-poc-wiki-v5
CLOUDFLARE_API_TOKEN=$(cat ~/cloud-init/scripts/agent3/cloudflare-token) \
CLOUDFLARE_ACCOUNT_ID=f0385fc5f0057b2573ae2a6b4c034c45 \
  npx --yes wrangler@latest pages deploy . \
    --project-name=brac-poc-wiki-v5 \
    --branch=main \
    --commit-dirty=true
```

Wrangler prints a preview URL (`<hash>.brac-poc-wiki-v5.pages.dev`) and
the production URL becomes the same on the next propagation. Verify:

```bash
curl -sI https://brac-poc-wiki-v5.pages.dev/        | head -1   # 200
curl -sI https://brac-poc-wiki-v5.pages.dev/styles.css | head -1 # 200
curl -s  https://brac-poc-wiki-v5.pages.dev/ | grep -oE '<title>[^<]+</title>'
```

If any check fails, look at the wrangler tail of the output for upload
errors before re-trying.

### 8. Log the change

Per the project's session-continuity convention:

- Append a one-line entry under today's heading in
  `~/cloud-init/scripts/agent3/CHANGELOG.md` (e.g. *"brac-poc-wiki-v5:
  added Foo card; redeployed; HTTP 200"*).
- If the change is material (new section, version bump, deprecation),
  also touch `~/cloud-init/scripts/agent3/STATE.md`.

---

## Tokens & accounts (read once, never echo)

| Purpose | Path | Notes |
|---|---|---|
| GitHub PAT (zeshaq) | `~/cloud-init/scripts/agent3/gh-zeshaq-token` | Repo creation, push. `ghp_…`. chmod 600. |
| Cloudflare API token | `~/cloud-init/scripts/agent3/cloudflare-token` | Pages projects + Direct Upload. `cfut_…`. chmod 600. |
| Cloudflare account ID | `f0385fc5f0057b2573ae2a6b4c034c45` | Public id, fine to commit. |

Other tokens in `~/cloud-init/` (`gitlab-md-pat`, `gitlab-root-pat`,
`github-pat`, etc.) are **for other systems** — don't reuse them here.
The `~/cloud-init/github-pat` file is a separate token from
`~/cloud-init/scripts/agent3/gh-zeshaq-token`; this site uses the
agent3 one (it was provisioned for `zeshaq`'s personal repos).

---

## Operational tips & gotchas

- **No git integration on the Pages project.** A `git push` alone does
  not deploy. Always run wrangler. If a future agent flips the project
  to Git integration, update this guide and remove this caveat.
- **Sidebar / section drift.** If a sidebar link points at a missing id
  the page renders fine but the in-page nav silently breaks. After any
  rename, grep the file for the old id:
  `grep -nE 'href="#<old-id>"|id="<old-id>"' index.html`.
- **Overview table drift.** It is the second thing readers see; it must
  match the cards. Treat it as part of the card-add/remove checklist.
- **No analytics, no tracking scripts.** This is intentional for the
  BRAC presentation context. Don't add any.
- **Don't introduce a SPA framework, build step, or CSS preprocessor.**
  The whole site loads in two HTTP requests. That's a feature.
- **Don't put real secrets, internal IPs, or admin URLs on the site.**
  It's a public Pages domain. Hostnames like
  `auth.apps.sub.comptech-lab.com` are acceptable (already public via
  cert transparency); cluster-internal addresses, root passwords,
  Vault tokens, etc. are not.

---

## How this was first stood up (for reference)

1. `POST https://api.github.com/user/repos` with the zeshaq PAT, body
   `{"name":"brac-poc-wiki-v5","private":false,...}` — creates the
   GitHub repo.
2. Local `git init -b main`, add `index.html` + `styles.css` +
   `README.md` + `.gitignore`, commit, push to `main`.
3. `POST https://api.cloudflare.com/client/v4/accounts/<acct>/pages/projects`
   body `{"name":"brac-poc-wiki-v5","production_branch":"main"}` —
   creates the Pages project (Direct Upload, no git source).
4. `npx wrangler pages deploy . --project-name=brac-poc-wiki-v5
   --branch=main` — uploads the static assets and promotes to
   production.

If you ever need to nuke and redo: delete the GitHub repo + the
Cloudflare Pages project, then repeat steps 1–4. Account ID and tokens
above are stable.
