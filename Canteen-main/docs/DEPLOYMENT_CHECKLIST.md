# Deployment checklist

## Before deploy
- [ ] Apply Supabase migrations in order and review policies.
- [ ] Remove development seed data or ensure it is used only in a dedicated test project.
- [ ] Configure Auth email confirmation, password rules, Google provider and callback URLs.
- [ ] Assign owner role to the correct user UUID through a trusted process.
- [ ] Set Render environment variables; never commit `.env`.
- [ ] Configure Razorpay Test Mode credentials and webhook secret.
- [ ] Configure Resend API key/from address and verify sending domain as required.
- [ ] Configure exact Netlify origin in `FRONTEND_ORIGIN`.
- [ ] Set `APP_BASE_URL` to the frontend production origin.
- [ ] Set `API_BASE_URL` to the Render API URL in `app-config.js`.
- [ ] Verify no service-role key or provider secret exists in frontend files or Git history.
- [ ] Finish remaining frontend migrations listed in `IMPLEMENTATION_STATUS.md`.
- [ ] Run tests and end-to-end checkout/payment tests.

## Render
- Root directory: `backend`
- Build: `npm install`
- Start: `npm start`
- Health check: `/api/health`
- Webhook: `/api/v1/webhooks/razorpay`

## Netlify
- Publish directory: repository root (`.`)
- Build command: none for static HTML
- Keep multi-page HTML navigation; do not add SPA catch-all unless the app is migrated to an SPA.
- Configure custom domain and HTTPS; update Supabase Auth redirect allowlist.

## Supabase
- Enable backups appropriate to the plan.
- Restrict project access and rotate any accidentally exposed secrets.
- Keep service-role key only in Render environment variables.
- Review database logs and Auth logs after the first staging checkout.
