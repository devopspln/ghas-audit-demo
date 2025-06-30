# Build a **“GHAS‑Audit‑Demo”** repo

*A self‑contained, private, org‑owned project that both powers your 8‑min screencast **and** gives students a turnkey audit template.*

---

## 1. What Success Looks Like

| Need                 | How the repo delivers                                                              |
| -------------------- | ---------------------------------------------------------------------------------- |
| **Live demo**        | `workflow_dispatch` + `ghas-audit.yml` shows a full security audit in ≤5 min.      |
| **Student takeaway** | Fork/clone → update org name → run → get their own audit report.                   |
| **Meta value**       | Repo demonstrates GH best‑practice structure, Actions security, and audit outputs. |

---

## 2. Repo Skeleton

```
ghas-audit-demo/
├─ .github/
│  ├─ workflows/
│  │  ├─ ghas-audit.yml          # main audit pipeline
│  │  └─ metrics-report.yml      # optional nightly stats
│  └─ dependabot.yml             # keeps Actions & deps current
├─ scripts/
│  └─ run-ghas-audit.sh          # CLI helper for local demos
├─ templates/
│  └─ executive-dashboard.md     # board‑ready summary
├─ samples/                      # toy vulnerable repo(s)
│  └─ payment-api/
├─ docs/
│  ├─ HOW_IT_WORKS.md
│  └─ STUDENT_LAB_GUIDE.md
└─ README.md
```

---

## 3. Key Moving Parts

### 3.1 **`ghas-audit.yml`** – the star of the show

```yaml
name: Run GHAS Audit
on:
  workflow_dispatch:
  schedule:
    - cron: "0 7 * * 1"      # every Monday 07:00 UTC
permissions:
  security-events: read
  actions: read
  contents: read
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Install gh‑ghas‑audit
      run: gh extension install advanced-security/gh-ghas-audit
    - name: Run audit
      env:
        GH_TOKEN: ${{ secrets.GH_PAT_READ_ORG }}
      run: |
        gh ghas-audit --org $ORG_NAME --format json --out report.json
    - name: Generate dashboard
      uses: advanced-security/github-advanced-security-metrics-report@v2
      with:
        alert-json: report.json
        template-file: templates/executive-dashboard.md
    - name: Upload artifact
      uses: actions/upload-artifact@v4
      with:
        path: report.*
```

*Uses two open‑source tools already on GitHub Marketplace:*

* **GHAS Metrics Report action** – builds readable summaries ([github.com][1])
* **`gh-ghas-audit` CLI extension** – quick org‑wide scan ([github.com][2])

### 3.2 **Security & Secrets**

| Secret                     | Scope                                        | Why                                                    |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| `GH_PAT_READ_ORG`          | Fine‑grained PAT with `security_events:read` | Lets the workflow query Code/Secret/Dependabot alerts. |
| *No long‑lived Azure keys* | Use OIDC & SAS for any storage pushes.       |                                                        |

Add a branch protection rule so students can’t accidentally leak secrets.

### 3.3 **Sample vulnerable repo (optional)**

The `/samples/payment-api` subfolder contains a tiny Node app with an intentional SQL‑inj, an old `lodash`, and an exposed demo token. CodeQL + secret scanning light up instantly during demos.

---

## 4. Screencast Flow (8 min)

| Min | Screen                                                                           | Action                                                   |
| --- | -------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 0‑1 | Org → **GHAS‑Audit‑Demo** repo                                                   | “This repo runs our audit.”                              |
| 1‑2 | **Actions** tab → `Run GHAS Audit` → **Run workflow**                            | Kick it off live.                                        |
| 2‑4 | Jump to last successful run → show **Steps** & artifact                          | Explain each stage; download `executive-dashboard.html`. |
| 4‑6 | Open the dashboard in browser                                                    | Highlight counts: secrets, vulns, coverage %.            |
| 6‑7 | Switch to **samples/payment-api** repo                                           | Show CodeQL alerts lighting up.                          |
| 7‑8 | Wrap: “Students fork, drop their org name, press Run, get a board‑ready report.” |                                                          |

---

## 5. Student Lab Guide ‑ High Level

1. **Fork** `GHAS‑Audit‑Demo` into their org.
2. Add a fine‑grained PAT secret named `GH_PAT_READ_ORG`.
3. Edit `README.md` → set `ORG_NAME`.
4. **Run** the workflow, download the report, paste screenshot into course assignment.

---

## 6. Next‑Level Enhancements

| Idea                                                     | Payoff                                               |
| -------------------------------------------------------- | ---------------------------------------------------- |
| **Scheduled upload to Azure Blob** (same SAS you built)  | End‑to‑end pipeline from GitHub → long‑term storage. |
| **Grafana dashboard** fed by blobs                       | Live security scorecards.                            |
| **GitHub Pages site** in this repo                       | Publishes the latest HTML dashboard automatically.   |
| **Matrix strategy** per repo tier (critical, high, etc.) | Mirrors the “Repository Assessment Matrix” slides.   |

---

## 7. Quick Wins Checklist

* [ ] Create repo under org root, private.
* [ ] Push skeleton; protect `main`.
* [ ] Add PAT secret (read‑only).
* [ ] Test manual run; confirm artifact.
* [ ] Record the screencast using this run.
* [ ] Ship **STUDENT\_LAB\_GUIDE.md** before course launch.

---

**Need the full YAML files or lab guide copy‑ready?**
Say the word—I'll drop them in turnkey.

[1]: https://github.com/marketplace/actions/github-advanced-security-metrics-report?utm_source=chatgpt.com "GitHub Advanced Security Metrics Report · Actions"
[2]: https://github.com/advanced-security/gh-ghas-audit?utm_source=chatgpt.com "advanced-security/gh-ghas-audit: GitHub CLI extension to audit ..."
