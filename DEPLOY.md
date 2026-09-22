# PREVORA — Deploy to Public URL
## Render (backend) + Vercel (frontend) — Free, ~10 minutes

---

## Step 1 — Push to GitHub

Go to **https://github.com/new** → create a repo called `prevora-sih`  
Make it **Public**. Don't add README/gitignore.

Then run in PowerShell from `d:\SIH2026\Welware\`:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/prevora-sih.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Deploy Backend on Render (free)

1. Go to **https://render.com** → Sign in with GitHub
2. Click **New → Web Service**
3. Connect your `prevora-sih` repo
4. Render auto-detects `render.yaml` — review settings:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Region**: Singapore
5. Click **Deploy Web Service**
6. Wait ~3 min → you get a URL like: `https://prevora-sif-sentinel.onrender.com`
7. **Copy this URL** — you need it for Step 3

> Health check: `https://prevora-sif-sentinel.onrender.com/health` should return `{"status":"ok"}`

---

## Step 3 — Deploy Frontend on Vercel (free)

1. Go to **https://vercel.com** → Sign in with GitHub
2. Click **Add New → Project**
3. Import your `prevora-sih` repo
4. Set:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add **Environment Variable**:
   - Key: `VITE_API_URL`
   - Value: `https://prevora-sif-sentinel.onrender.com`  ← your Render URL from Step 2
6. Click **Deploy**
7. Wait ~1 min → you get a URL like: `https://prevora-sih.vercel.app`

---

## Final URLs

| Service | URL |
|---------|-----|
| **🌐 App (share this)** | `https://prevora-sih.vercel.app` |
| Backend API | `https://prevora-sif-sentinel.onrender.com` |
| API Docs | `https://prevora-sif-sentinel.onrender.com/docs` |

**Login**: Click "ENTER PREVORA" — one button, no email/password needed.  
**Profile**: SHAIK AFZAL HAMEED on every account.

---

## Notes

- Render free tier **sleeps after 15 min idle** — first load after sleep takes ~30s  
  (spin it up before your demo by visiting the health check URL)
- SQLite auto-reseeds on every deploy (225 synthetic reports)
- To update: just `git push` — both services auto-deploy

