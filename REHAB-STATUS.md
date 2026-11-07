# Airpak Express — Site-Wide Rehabilitation Status

Last updated: 2026-11-07

## Product surface (bigger picture)

| Area | URL / Host | Role | Status |
|------|------------|------|--------|
| Marketing homepage | https://airpak-express.site/ | Brand + CTAs | Live (original template) |
| About | /about-us | Global company story | Rehabbed (photo hero) |
| Contact | /contact | USA/UK HQ + regions | Rehabbed (photo hero) |
| Tracking | /tracking | Track shipments | Rehabbed (video hero) |
| Create Shipment | /create-shipment | Onboarding form | Rehabbed (photo hero + wizard) |
| Careers | /careers | Jobs | Live (original template) |
| Services — Domestic/Express | /services/domestic | Service detail | Live (original) |
| Services — Warehousing | /services/warehousing | Service detail | Live (original) |
| Services — International | /services/international | Service detail | Live (original) |
| Services — Freight | /services/freight | Service detail | Live (original) |
| International shipping | /international-shipping | Content | Live |
| Logistics partner SG | /logistics-partner | Partner page | Live |
| Media | /media | News/media | Live |
| Enterprise tools | /enterprise-tools | Tools | Live |
| Legal (privacy/terms/conditions/fuel) | /privacy-policy etc. | Legal | Live |
| ShipNow portal | https://shipnow.airpak-express.site | Customer portal | Live (200) |
| Admin | https://admin.airpak-express.site | Admin | Live (200) |
| API | /api/* → shipnow | Proxy | Configured |

## Infrastructure completed

- Redirect loops removed (vercel.json + _redirects clean 200 rewrites only)
- Hobby plan function limit bypassed (.vercelignore excludes api/)
- Full clean URL map for all marketing pages
- Source of truth: GitHub `RUSTYBM7/Landing-Exterior`
- Production still on Vercel; Cloudflare Pages project `airpak-express-rehab` created for cutover

## Homepage (index) notes

- Still on **original full template** (correct — brand design preserved)
- Internal links still use `*.html` in many places (works; clean URLs also work)
- CTAs: Create Shipment, Track, ShipNow portal, Sign Up present
- Homepage video: `apps/airpak/img/homepage_small.mp4`

## Remaining site-wide work (priority order)

1. **Homepage link hygiene** — prefer `/tracking`, `/create-shipment`, `/about-us`, `/contact` over `.html` (surgical; file is large)
2. **Global positioning pass** on original service/careers/legal pages (text only: less Singapore-primary where appropriate)
3. **ShipNow / admin integration** — deep links, shared auth, tracking API reliability
4. **Cloudflare full cutover** — DNS + Pages from `Landing-Exterior`, retire Vercel when ready
5. **Asset audit** — ensure all service banners/logos load on every template page
6. **Contact data** — unify support emails (usa@ / uk@ / support@) across footer templates site-wide

## Rule for all future edits

- Keep original layout, logo (`apps/airpak/img/logo.png`), CSS, and assets
- Video hero **only** on tracking
- Photo heroes on marketing content pages
- Text/content and routing changes preferred over redesign
