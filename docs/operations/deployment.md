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
- `NEXT_PUBLIC_API_URL`
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
