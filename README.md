# Airpak Express Website Deployment Guide

## Quick Deploy to Vercel

### Option 1: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to the project directory
cd airpak-express-clone/airpak-express.com

# Login to Vercel
vercel login

# Deploy to Vercel
vercel --prod
```

### Option 2: Deploy via GitHub

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com)
3. Import the repository
4. Vercel will automatically detect the configuration from `vercel.json`
5. Deploy!

## Custom Domain Setup (airpak-express.site)

### For Vercel:

1. **After deployment, go to your project settings in Vercel Dashboard**
2. **Navigate to "Domains"**
3. **Add your custom domain:** `airpak-express.site`
4. **Configure DNS records:**

   **Option A: Using Vercel DNS (Recommended)**
   - Add these DNS records in your domain registrar:
   ```
   Type    Name    Value
   A       @       76.76.21.21
   CNAME   www     cname.vercel-dns.com
   ```

   **Option B: Using CNAME**
   ```
   Type    Name    Value
   CNAME   @       cname.vercel-dns.com
   CNAME   www     your-project.vercel.app
   ```

5. **Wait for SSL certificate** (automatic)

### DNS Configuration Guide:

For **Namecheap**:
1. Go to Domain Management → Advanced DNS
2. Add records as shown above
3. Set TTL to "Automatic"

For **GoDaddy**:
1. Go to Settings → DNS Management
2. Add records
3. Save and wait for propagation

For **Cloudflare**:
1. Set proxy status to "DNS only" (grey cloud) initially
2. After Vercel verification, you can enable proxy

## Features Configured

### ✅ Security Headers
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy

### ✅ Page Redirects
All pages are configured with proper redirects:
- `/` → `/index.html`
- `/about-us` → `/aboutus.html`
- `/tracking` → `/tracking.html`
- etc.

### ✅ API Proxy
- `/api/*` routes are proxied to `shipnow.airpak-express.site`
- This connects the frontend to the backend API

### ✅ Netlify Compatibility
- `_redirects` file included for Netlify deployments

## File Structure

```
airpak-express-clone/airpak-express.com/
├── index.html
├── aboutus.html
├── contact.html
├── tracking.html
├── careers.html
├── ... (all other pages)
├── vercel.json          # Vercel configuration
├── _redirects           # Netlify configuration
├── apps/                # Assets, CSS, JS
├── js/                  # Custom JavaScript
└── README.md            # This file
```

## Supabase Backend Connection

To connect to your Supabase backend:

1. **Create a `.env` file** in the root directory:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

2. **Update tracking.html** to use Supabase:
```javascript
// Replace the API call with Supabase client
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Use supabase for tracking queries
const { data, error } = await supabase
  .from('shipments')
  .select('*')
  .eq('tracking_number', trackingNumber)
```

## Troubleshooting

### Issue: Pages not loading
- Check if `vercel.json` is valid JSON
- Run `vercel --debug` for detailed logs

### Issue: Custom domain not working
- Ensure DNS records are correctly set
- Wait up to 48 hours for DNS propagation
- Check domain verification status in Vercel

### Issue: SSL certificate errors
- Vercel auto-provisions SSL
- Force HTTPS in vercel.json:
```json
{
  "redirects": [{
    "source": "/(.*)",
    "destination": "https://airpak-express.site/$1"
  }]
}
```

## Support

For deployment issues, refer to:
- Vercel Docs: https://vercel.com/docs
- Domain Setup: https://vercel.com/docs/concepts/dns