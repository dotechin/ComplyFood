# Deployment Notes

## Runtime services
- Web application (`apps/web`)
- API (`apps/api`)
- PostgreSQL
- S3-compatible object storage
- Reverse proxy / ingress

## Required environment variables
- `DATABASE_URL`
- `JWT_SECRET`
- `PASSWORD_RESET_TOKEN_SALT`
- `JWT_EXPIRES_IN`
- `WEB_URL`
- `NEXT_PUBLIC_API_URL` (frontend build time; omit for same-origin API access)
- `API_PROXY_URL` (optional frontend build-time HTTP(S) origin for a private API proxy)
- `STORAGE_DRIVER`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE`

## Deployment flow
1. Install dependencies with pnpm
2. Run database migrations from `apps/api`
3. Start the API with the S3-compatible storage configuration
4. Start the web application with the public API URL configured
5. Verify login, password reset, document upload, reminders, and report export

## Production checks
- Enforce HTTPS
- Rotate JWT and storage credentials through environment management
- Back up PostgreSQL and object storage
- Verify bucket lifecycle and retention policies

## Public frontend with a local backend over Tailscale

The frontend sends API requests from the user's browser. Joining only the frontend
host to Tailscale does not make a private backend reachable by public browsers.
Choose either a public HTTPS API with Funnel or a same-origin server-side proxy.
The local backend machine must remain powered on, online, and running the API.

### Prepare the backend

1. Install Tailscale on the backend machine using the
   [official installation instructions](https://tailscale.com/download), then run
   `sudo tailscale up` and authenticate to your tailnet.
2. Configure the API's existing database, JWT, password-reset salt, and storage
   settings. Use strong production secrets, not the development example values.
   Set `PORT=4000` and `WEB_URL=https://app.example.com`, replacing the latter
   with the frontend's exact origin (no trailing slash or path).
3. Run database migrations and start the API. Confirm it responds locally before
   enabling Tailscale forwarding. For a native (non-Docker) API process, use host
   firewall rules to prevent direct network access to port 4000; Tailscale
   Serve/Funnel connects to it locally.

For a Docker backend, the Tailscale override publishes only the API to the host's
loopback interface, waits for PostgreSQL, and runs migrations before starting the
API. It also mounts a persistent volume for local document storage.

On your Linux PC, install Docker with Compose and prepare the backend settings
(these commands use this checkout's absolute path; replace it with your Linux
checkout's absolute path if different):

```sh
cp /home/runner/work/ComplyFood/ComplyFood/.env.example \
  /home/runner/work/ComplyFood/ComplyFood/.env
chmod 600 /home/runner/work/ComplyFood/ComplyFood/.env
```

If `.env` already exists, edit it instead of overwriting it. Set:

- `POSTGRES_PASSWORD`, `JWT_SECRET`, and `PASSWORD_RESET_TOKEN_SALT` to separate,
  strong secrets. Generate each independently with `openssl rand -hex 32`.
  Do not retain the development example secrets.
- `WEB_URL=https://app.example.com,https://your-project.vercel.app,http://localhost:3100`,
  replacing the example domains with your actual frontend origins. Include only
  origins you use, without paths or trailing slashes. This is the CORS allowlist,
  not the backend URL. Restart the API after changing it.
- `STORAGE_DRIVER=local` for documents stored on this PC. S3 settings are not
  needed in local mode; existing S3 deployments can keep `STORAGE_DRIVER=s3` with
  their configured bucket and credentials.

Start the backend:

```sh
docker compose --project-directory /path/to/ComplyFood \
  --env-file /path/to/ComplyFood/.env \
  -f /path/to/ComplyFood/infra/docker-compose.prod.yml \
  -f /path/to/ComplyFood/infra/docker-compose.tailscale.yml \
  up -d --build api
```

This does not start the web or nginx services and does not publish PostgreSQL.
Use the override with the production compose file, **not** the development file,
which already publishes database and API ports. It assumes Tailscale runs on the
host, not inside the API container. The `migrate` service runs the compiled
TypeORM migrations; if it fails, the API does not start. Inspect `migrate` and
`api` logs using the same Compose options above followed by `logs migrate api`.
For S3 mode, provision the bucket separately.

Before enabling Funnel, check the API without sending credentials:

```sh
curl -i http://127.0.0.1:4000/api/v1/auth/me
```

An HTTP **401** JSON response is expected for this protected endpoint and confirms
the API is responding. Connection refusal means the backend is not ready.
Back up both the database and local document volume; do not use `down -v` unless
you intend to delete their data.

### Option 1: Funnel for public browser access

Traffic: **browser → HTTPS Funnel origin → local API**. The frontend itself stays
on your public hosting provider.

1. Enable MagicDNS, HTTPS certificates, and Funnel permission for the backend
   node in your tailnet settings. See the
   [Funnel requirements](https://tailscale.com/kb/1223/funnel).
2. On the backend machine, run:

   ```sh
   tailscale funnel --bg 4000
   tailscale funnel status
   ```

   Follow any permission/setup prompts. Use the HTTPS origin printed by Tailscale,
   for example `https://backend.example-tailnet.ts.net`.
3. On Vercel, open **Project Settings → Environment Variables** and set
   `NEXT_PUBLIC_API_URL=https://backend.example-tailnet.ts.net` and leave
   `API_PROXY_URL` unset. Use the actual HTTPS origin from Funnel, with no trailing
   slash. Do not append `/api/v1`: the client adds that prefix. Apply the setting
   to Production and to any Preview/Development environments you use. Keep your
   public frontend domain attached to Vercel; it does not need to point to the PC.
4. Rebuild and redeploy the frontend with this setting available during the build.
   Setting it only when starting an already-built container is insufficient.
   On Vercel, create a new deployment after changing the environment variable.
   Normal Vercel hosting does not automatically join your tailnet:
   `API_PROXY_URL` alone cannot reach a private Tailscale backend from Vercel.
   For a standalone frontend image:

   ```sh
   docker build -f /path/to/ComplyFood/infra/Dockerfile.web \
     --target production \
     --build-arg NEXT_PUBLIC_API_URL=https://backend.example-tailnet.ts.net \
     -t complyfood-web /path/to/ComplyFood
   ```

   The production compose web build also accepts `NEXT_PUBLIC_API_URL`, with
   `API_URL` retained as a legacy fallback.

Funnel makes the API **publicly reachable**; it does not add application
authentication. Keep JWT and authorization checks enabled. CORS is not an access
control boundary. Expose only port 4000, never the database or storage
administration service. Use HTTPS for both browser-facing origins. Funnel uses
the assigned `*.ts.net` hostname; do not point an arbitrary custom API domain at
it and expect its certificate to match.

To stop forwarding, run `tailscale funnel --https=443 off` (adjust the HTTPS port
if you changed it). Funnel and Serve cannot share the same listener simultaneously.

### Local frontend on port 3100

For a native Next.js development server, set
`NEXT_PUBLIC_API_URL=https://backend.example-tailnet.ts.net` in
`/home/runner/work/ComplyFood/ComplyFood/apps/web/.env.local` (replace the checkout
path and Funnel origin as appropriate). Leave `API_PROXY_URL` unset there and in
the shell environment. Next.js loads environment files from `apps/web`; the
repository root `.env` used by Compose is not automatically the web app's env file.

Start or restart the frontend from the workspace root:

```sh
cd /home/runner/work/ComplyFood/ComplyFood
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @complyfood/web run start:dev --port 3100
```

Open `http://localhost:3100`. The backend CORS allowlist must include that exact
origin. If the browser and backend are on the same PC, local development can use
`NEXT_PUBLIC_API_URL=http://localhost:4000` instead. Never use that localhost URL
for a public Vercel deployment: it refers to each visitor's own computer.

### Option 2: Private API with a same-origin Next.js proxy

Traffic: **browser → public frontend `/api/v1/*` → Next.js server → tailnet API**.

1. Run the frontend on a server capable of joining your tailnet, or use a gateway
   with equivalent tailnet connectivity. A static frontend deployment or a
   serverless host without tailnet access cannot use this configuration directly.
2. On the backend host, use private HTTPS forwarding instead of Funnel:

   ```sh
   tailscale serve --bg 4000
   tailscale serve status
   ```

   If Funnel was previously enabled, disable it first. Use the private HTTPS
   origin reported by Serve.
3. Join the frontend server to the tailnet. Restrict tailnet grants/ACLs so only
   the frontend server can reach the backend node's Serve port (443). Ensure no
   broader existing rule grants other nodes unintended access.
4. At frontend build time, **unset** `NEXT_PUBLIC_API_URL` and any legacy `API_URL`
   setting, and set `API_PROXY_URL=https://backend.example-tailnet.ts.net`.
   The Next.js server forwards only `/api/v1/*`, preserving the API prefix.
   Authentication headers, query strings, uploads, and downloads use the proxy.
   These API paths bypass the frontend's page-login redirect; the backend still
   enforces authentication and authorization on protected endpoints.
   The target must be an HTTP(S) origin with no credentials, path, query, or
   fragment; conflicting direct/proxy settings fail configuration loading.
5. Rebuild and deploy the frontend. For a standalone image, use the Docker build
   command above with `--build-arg API_PROXY_URL=https://backend.example-tailnet.ts.net`
   instead of `--build-arg NEXT_PUBLIC_API_URL=...`. Both settings are build-time
   configuration; rebuild when the target changes.
6. Ensure the actual frontend runtime (including its container) can resolve the
   backend's MagicDNS name and reach Serve. Host tailnet membership alone may not
   provide container DNS/routing. Verify connectivity from inside the container.
   Put the public frontend behind your normal HTTPS ingress, routing `/api/v1/*`
   to the Next.js server as well as the page routes.

The existing all-in-one production nginx config routes `/api/` directly to its
local API container; it is not the split-host private-proxy gateway. Do not use
that route unchanged for this option. The Next.js rewrite is the proxy for a
separately hosted frontend. Leave `API_PROXY_URL` unset for existing deployments.

`API_PROXY_URL` is server configuration, not a browser API URL or a place to store
credentials. The backend stays private at the network layer, but its application
endpoints are reachable through the public proxy and still require authentication.
Ensure ingress upload limits/timeouts allow the application's 20 MB uploads.

### Tailnet-only users

If every user device has Tailscale, use Serve rather than Funnel and set
`NEXT_PUBLIC_API_URL` to Serve's private HTTPS origin. Leave `API_PROXY_URL` unset,
rebuild the frontend, and grant the user devices access to the backend Serve port.
The public frontend will load for everyone, but API access requires tailnet
membership and application authentication.

### Verify the deployment

- Check `tailscale funnel status` or `tailscale serve status` for the chosen mode.
- For Funnel, test from a device **outside** the tailnet. For the private proxy,
  test the public frontend from outside the tailnet and confirm the backend Serve
  origin itself is inaccessible there.
- In browser developer tools, check that requests go to the intended HTTPS
  origin and include exactly one `/api/v1` prefix, not `localhost` or a private
  tailnet address in the public-user proxy mode.
- Verify login/logout, password reset, document upload, preview/download, and
  report export. Confirm unauthenticated requests to protected endpoints fail.
- For Funnel/direct Serve, check CORS preflight responses allow the frontend's
  exact `WEB_URL` and credentials. Do not use a wildcard origin.
- If requests fail, check API availability, machine sleep, tailnet permissions,
  frontend build settings, and proxy runtime connectivity before changing CORS.
- The login message "Is the backend running?" can also indicate CORS, DNS, TLS, or
  mixed-content failures. In browser DevTools, inspect Network and Console:
  the login request should be `POST https://<funnel-origin>/api/v1/auth/login`.
  A localhost/private-IP target on the public deployment indicates incorrect
  frontend build settings; a CORS error indicates a mismatched `WEB_URL`; HTTP
  401 from login means the API is reachable but the credentials were rejected.
- Check CORS without sending login credentials (replace both example origins):

  ```sh
  curl -i -X OPTIONS https://backend.example-tailnet.ts.net/api/v1/auth/login \
    -H 'Origin: https://app.example.com' \
    -H 'Access-Control-Request-Method: POST' \
    -H 'Access-Control-Request-Headers: content-type'
  ```

  The response must include `Access-Control-Allow-Origin` matching the requested
  frontend origin. Repeat for `http://localhost:3100` and your Vercel origin if
  used. Curl does not enforce CORS; a successful curl alone does not prove the
  browser will allow access. Test Funnel from outside the tailnet as well.
