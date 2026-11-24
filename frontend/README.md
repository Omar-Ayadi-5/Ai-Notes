# AI Notes frontend

React workspace, authentication screens, shared-note viewer, and a browser-only interactive demo.

```bash
npm ci
npm run dev
```

- Application: http://localhost:5173
- Signup-free sample workspace: http://localhost:5173/#/demo
- Development API: `/api`, proxied to http://localhost:8000
- Separate hosting: set `VITE_API_URL=https://your-backend.example/api` before building

```bash
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Node.js 22.13+ is required. See the [project README](../README.md), [architecture](../docs/ARCHITECTURE.md), and [deployment guide](../docs/DEPLOYMENT.md).
