# Disc Golf Course Finder (Vite + React + Azure Static Web Apps)

## Local dev
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Edit the data
Open `src/data.ts` and update the `COURSES` array.

## Deploy to Azure Static Web Apps
1. Push this repo to GitHub (default branch: `main`).
2. In Azure Portal: **Create resource → Static Web App**.
   - Deployment source: **GitHub** (authorize if prompted)
   - App location: `/`
   - Build command: `npm run build`
   - Output folder: `dist`
3. Finish. Azure will create a GitHub Actions workflow — every push to `main` auto-deploys.
4. Add a custom domain (optional) in the SWA resource → **Custom domains**.
