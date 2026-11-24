# Deployment

## One origin: frontend and backend together

The root Dockerfile builds the frontend and serves it with FastAPI. This avoids cross-origin configuration and uses `/api` for browser requests.

Required runtime variables:

- `MONGODB_URL`: a private MongoDB connection URI
- `SECRET_KEY`: generate a unique secret with `python -c "import secrets; print(secrets.token_urlsafe(48))"`
- `DATABASE_NAME`: optional, defaults to `ai_notes`
- `OPENROUTER_API_KEY`: optional
- `PORT`: supplied by many hosts; otherwise 8000

Readiness is `/api/health`. It returns 503 when MongoDB is unavailable. The container runs as a non-root user. Secrets are runtime settings and are excluded from the image build context.

### Railway

Connect the repository using its root Dockerfile. Set the required variables privately and configure `/api/health` as the readiness endpoint. Keep the service root at the repository root so the Docker build can access both frontend and backend. Restrict database network access before deploying. This does not repair or redeploy a previous Railway service automatically.

For platform settings, use Railway's current dashboard or Infrastructure as Code workflow. Legacy `railway.json` configuration is not included.

Verify the new public URL with `/api/health`, account creation, note saving, sharing, unsharing, and a fresh page load. Add that verified URL to the GitHub About website field.

### Reverse proxies

IP-based throttling uses the client address accepted by Uvicorn. Set `FORWARDED_ALLOW_IPS` only to known proxy IPs/networks that overwrite forwarding headers. Do not trust arbitrary forwarding headers on a directly accessible server. Without proxy configuration, users behind the same proxy share its IP limits.

Use HTTPS for public traffic. Keep MongoDB private. Production users should not connect to an unauthenticated database exposed on the internet.

## Separate frontend hosting

Set `VITE_API_URL=https://your-api.example/api` when building the frontend, and set the backend's `CORS_ORIGINS` to the actual frontend origin. Frontend configuration is public. Never place secrets in it.

The signup-free `/#/demo` route works without a backend. Real accounts, private notes, public sharing, and provider analysis require the backend.

For static hosting without a backend, build with `VITE_DEMO_ONLY=true`. Account routes redirect to the demo and links lead to the project instead of unusable signup forms. The Pages workflow sets this automatically when no `VITE_API_URL` repository variable is configured.

### GitHub Pages demo

1. Push the reviewed files to GitHub.
2. In repository Settings → Pages, select **GitHub Actions** as the source.
3. If hosting a backend separately, set repository variable `VITE_API_URL` to its HTTPS `/api` URL. Otherwise only the browser demo is usable.
4. Run **Publish interactive demo** from the Actions tab.
5. Open the deployment URL with `#/demo` appended.
6. Add the verified link to About and the README.

The Pages workflow is manual. It does not publish a site on every push. Hash routing supports the repository subdirectory without server rewrite rules.

## Existing deployments

- Replace the former public default signing secret. Rotating it invalidates old sessions.
- The schema script no longer creates a fixed demo account. If an earlier deployment ran the original seed script, remove that old demo account and its notes after reviewing their contents.
- Existing bcrypt accounts upgrade after successful login. Legacy passwords longer than 72 UTF-8 bytes are rejected rather than truncated and need an account recovery/reset outside this app.
- A public repository's old commits remain public. Deleting a value from current files does not remove it from history.
