# Deploy WiseView on Render

This guide deploys the Flask WiseView application in `wiseview/` to Render as a
single Python web service. The service serves both the classic WiseView UI and
the bundled SPHEREx Explorer React build:

| Route | Content |
|-------|---------|
| `/` | Classic WiseView homepage |
| `/viewer` | Classic WiseView viewer |
| `/spectrum` | Classic WiseView spectrum view |
| `/explorer` | SPHEREx Explorer React app |
| `/api/*` | Flask API |
| `/media/*` | Cached FITS/PNG media |
| `/legacy`, `/legacy/viewer`, `/legacy/spectrum` | Redirects to the new routes |

Use Render, not Vercel, for this application. WiseView is a long-running Flask
server that downloads FITS cutouts, renders PNG frames, and writes them to disk.
Vercel's serverless functions are a poor fit for that workload and for the
repository's cached data size.

---

## 1. Prerequisites

- A Render account: <https://render.com>
- The repository pushed to GitHub, GitLab, or Bitbucket
- Python 3.12 locally for testing
- Optional: a custom domain

The repository already contains:

- `wiseview/requirements.txt` with `gunicorn`
- `render.yaml` at the repository root
- The route changes that put classic WiseView at `/`

---

## 2. Verify locally first

From the repository root:

```powershell
cd wiseview
.\run.ps1
```

Open and check these URLs:

```text
http://127.0.0.1:5000/
http://127.0.0.1:5000/viewer
http://127.0.0.1:5000/spectrum
http://127.0.0.1:5000/explorer
http://127.0.0.1:5000/legacy
http://127.0.0.1:5000/legacy/viewer
http://127.0.0.1:5000/api/health
```

Expected:

- `/` shows the classic WiseView homepage.
- `/viewer` opens the flash3 control surface.
- `/explorer` shows the React SPHEREx Explorer.
- `/legacy` redirects to `/`.
- `/legacy/viewer` redirects to `/viewer`.
- `/api/health` returns JSON with `"status": "ok"`.

You can also print the Flask route map:

```powershell
cd wiseview
python -c "from wv.www.unoverse import app; print(app.url_map)"
```

---

## 3. Understand the deployment layout

Render runs commands from the service's **Root Directory**. The blueprint uses:

```text
Root Directory: wiseview
Build Command:  pip install -r requirements.txt
Start Command:  gunicorn wv.www.unoverse:app --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 180 --access-logfile -
```

`--workers 1 --threads 4` keeps memory use predictable. Astropy and NumPy are
memory-heavy; start with one worker. Increase workers only after checking the
instance's memory usage.

---

## 4. Deploy with the Render Blueprint

The repository root contains `render.yaml`. The simplest path is a Render
Blueprint.

1. Push the changes to your Git provider.
2. In Render, choose **New -> Blueprint**.
3. Connect the repository.
4. Render reads `render.yaml` and proposes a `wiseview` web service.
5. Review the plan and disk settings.
6. Apply the blueprint.
7. Wait for the build and deploy to finish.
8. Open the service URL and verify `/`, `/viewer`, `/explorer`, and `/api/health`.

The blueprint requests:

- Branch `prod`
- Python 3.12.5
- No persistent disk, because the M101 D2 cache ships inside the repo checkout
- Health check at `/api/health`

The blueprint does not set `WV_DATA_DIR`. The app therefore uses its bundled
`wiseview/data` directory, which contains the tracked M101 D2 cache. That cache
is available on the very first request after a deploy, with no IRSA download.

### Free-plan note

Change `plan: starter` to `plan: free` in `render.yaml` if you are on the free
plan. The 66 MB bundled cache still works, because it is part of the checkout
and not of a Render disk. Frames generated at runtime are ephemeral on both
plans and are rebuilt on demand.

---

## 5. Deploy manually from the Render dashboard

Use this if you do not want to use `render.yaml`.

1. Render dashboard -> **New -> Web Service**.
2. Connect the repository.
3. Set:

```text
Name:              wiseview
Branch:            prod
Root Directory:    wiseview
Runtime:           Python 3.12
Build Command:     pip install -r requirements.txt
Start Command:     gunicorn wv.www.unoverse:app --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 180 --access-logfile -
Health Check Path: /api/health
```

4. Add environment variables:

```text
PYTHON_VERSION=3.12.5
```

5. Do not add `WV_DATA_DIR` unless you also attach a persistent disk. Leaving it
   unset makes the app read the bundled `wiseview/data` cache.
6. Choose an instance type with enough memory. Astropy, NumPy, and FITS
   processing can exceed a small 512 MB instance during a SPHEREx frame build.
7. Deploy the `prod` branch.

---

## 6. Environment variables

Only these are required for a basic Render deployment:

| Variable | Value | Purpose |
|----------|-------|---------|
| `PYTHON_VERSION` | `3.12.5` | Render Python runtime |

`WV_DATA_DIR` is optional. Leave it unset for the bundled cache. Set it to a
persistent disk mount (for example `/var/data`) only if you attach a disk and
seed it yourself.

Optional tuning variables, based on `wiseview/.env.example`:

```text
WV_SPHEREX_COLLECTION=spherex_dr1
WV_SPHEREX_CUTOUT_SIZE_DEG=0.08
WV_SPHEREX_MAX_VISITS=24
WV_SPHEREX_FRAME_PIXELS=512
WV_SPHEREX_DOWNLOAD_WORKERS=8
WV_GAIA_TABLE=gaiadr3.gaia_source
```

If SPHEREx requests time out on a small instance, reduce:

```text
WV_SPHEREX_MAX_VISITS=12
WV_SPHEREX_DOWNLOAD_WORKERS=4
WV_SPHEREX_FRAME_PIXELS=384
```

The unWISE legacy mode uses public remote endpoints by default. Local unWISE
index files are optional. If they are missing, `/api/health` reports
`unwise_ready: false`; SPHEREx mode still works.

---

## 7. Bundled data policy for the `prod` branch

The `prod` branch intentionally tracks only one cached field:

```text
wiseview/data/spherex/ra210.8023_decp54.3490/
  manifest.json
  manifest_D2.json
  cutouts/D2_*.fits
  frames/D2_*
wiseview/data/gaia/ra210.8023_decp54.3490_r0.0500.json
```

That is about 66 MB. The other cached fields are kept on the development branch
and local working copy, but are not part of the `prod` deployment.

On `prod`, the five other featured targets are marked **Temporarily
Unavailable**. They remain visible in the catalogue but their action buttons are
disabled, so visitors are not sent to a missing cache.

The first request for any field that is not bundled will query IRSA and cache the
result under `wiseview/data`. On Render that data is ephemeral unless a disk is
attached.

Only the branch tip is trimmed. Older commits in this repository still contain
the original 732 MB cache, so a fresh `git clone` downloads that history. If the
clone size becomes a problem, rewrite history with `git filter-repo` or push
`prod` as an orphan branch. That is a separate, destructive decision.

---

## 8. Verify the deployment

Replace `<service>` with your Render service hostname.

```powershell
curl.exe -I https://<service>.onrender.com/
curl.exe -I https://<service>.onrender.com/viewer
curl.exe -I https://<service>.onrender.com/explorer
curl.exe https://<service>.onrender.com/api/health
```

Check redirects:

```powershell
curl.exe -I https://<service>.onrender.com/legacy
curl.exe -I https://<service>.onrender.com/legacy/viewer
```

Expected:

- `/legacy` returns `301` and `Location: /`.
- `/legacy/viewer` returns `301` and `Location: /viewer`.
- `/api/health` returns `200` with JSON.

Then open in a browser:

- `/` classic landing page
- `/viewer` SPHEREx/unWISE viewer
- `/explorer` React explorer
- a target card from the homepage

If the viewer loads but images do not, check Render logs for IRSA download
errors and confirm the service has enough memory and timeout headroom.

---

## 9. Custom domain

1. Render service -> **Settings -> Custom Domains**.
2. Add your domain or subdomain.
3. Create the DNS record Render shows.
4. Wait for TLS certificate issuance.

No code changes are needed. The frontend uses relative API and media URLs.

---

## 10. Updating the deployment

Push to the connected branch. Render rebuilds and redeploys automatically by
default.

Before pushing:

```powershell
cd wiseview
python -c "from wv.www.unoverse import app; print(app.url_map)"
```

To rebuild manually, use **Manual Deploy -> Deploy latest commit** in Render.

---

## 11. Troubleshooting

### Build fails while installing scientific packages

Check the Render build log for the failing package. The service uses Python
3.12. If a package has no wheel for that version, pin `PYTHON_VERSION` to a
supported version or install a newer package release.

### Service starts but `/` returns 500

Check the Render logs. Common causes:

- `WV_DATA_DIR` is not writable.
- The disk is not mounted.
- The target catalogue import failed.

The app falls back to a built-in target catalogue if `backend/` is unavailable,
but SPHEREx and spectrum API routes return `503` without the backend package.

### Viewer is slow or requests time out

The first request for a field downloads multiple FITS cutouts. Reduce
`WV_SPHEREX_MAX_VISITS` and `WV_SPHEREX_DOWNLOAD_WORKERS`, or pre-populate the
persistent disk with cached fields.

### Images disappear after a restart

Runtime-generated frames live in the ephemeral filesystem. That is expected
without a persistent disk. The bundled M101 D2 frames come from the checkout and
survive restarts.

If you attach a disk, set `WV_DATA_DIR` to its mount path and copy the bundled
cache into it:

```text
WV_DATA_DIR=/var/data
```

### unWISE mode reports unavailable

This is expected on a fresh checkout. The classic home page and SPHEREx mode do
not require local unWISE index files. The health endpoint reports the exact
`unwise_error`.

### Gunicorn timeout

The start command uses `--timeout 180`. If a field takes longer, lower the
number of visits or increase the Render instance size rather than raising the
timeout indefinitely.

---

## 12. Why not Vercel for this app

Vercel can serve the React frontend, but it is not suitable for the WiseView
Flask server:

- Serverless function bundle limits are far below the repository's data size.
- The app writes cutouts, manifests, and PNG frames to disk.
- SPHEREx frame generation is long-running compared with serverless limits.
- Astropy and NumPy create large cold starts.

If you later split the frontend to Vercel, point its API calls at the Render
service and configure CORS. Serving everything from one Render service is
simpler and avoids that extra configuration.
