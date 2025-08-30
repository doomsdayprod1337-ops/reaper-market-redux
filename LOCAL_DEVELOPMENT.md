# Local Development Setup

## Option 1: Use Netlify CLI (Recommended)

This approach uses your actual Netlify environment variables locally:

1. **Install Netlify CLI globally:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify:**
   ```bash
   netlify login
   ```

3. **Link your project (if not already linked):**
   ```bash
   netlify link
   ```

4. **Run locally with Netlify environment:**
   ```bash
   netlify dev
   ```

This will automatically load your Netlify environment variables and run your app locally.

## Option 2: Create Local .env File

If you prefer to run with `npm run dev`, create a `.env` file in your project root:

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-actual-gmail@gmail.com
SMTP_PASSWORD=your-actual-app-password
SMTP_FROM_EMAIL=your-actual-gmail@gmail.com
SMTP_FROM_NAME=Your App Name

# Supabase Configuration
SUPABASE_URL=your-actual-supabase-url
SUPABASE_ANON_KEY=your-actual-supabase-key
```

**⚠️ Security Note:** Never commit this file to version control!

## Current Status

Your server is configured to work with both approaches:
- ✅ Netlify environment variables (SMTP_USERNAME, SMTP_PASSWORD, etc.)
- ✅ Local .env file variables
- ✅ Fallback to legacy EMAIL_USER/EMAIL_PASS variables

## Testing Email

Once configured, your server will show:
- ✅ Email server is ready to send messages
- 📧 Using SMTP: smtp.gmail.com:587
- 👤 From: your-email@gmail.com
