# 🚀 Deployment Guide - Paco the Chicken

This guide covers how to deploy your Paco the Chicken landing page to various hosting platforms.

## 📋 Pre-Deployment Checklist

- [ ] Test all features locally with `npm start`
- [ ] Update contract address in `script.js`
- [ ] Update social media links
- [ ] Verify all images load correctly
- [ ] Test PFP generator functionality
- [ ] Check responsive design on mobile

## 🌟 Recommended Hosting Platforms

### 1. Netlify (Recommended)

**Why Netlify?**
- Free SSL certificates
- Global CDN
- Easy custom domain setup
- Great for static sites

**Steps:**
1. Create account at [netlify.com](https://netlify.com)
2. Connect your GitHub repository
3. Build settings:
   - Build command: `npm run build` (optional)
   - Publish directory: `.` (root directory)
4. Deploy!

**Custom Domain:**
- Add your domain in Site Settings > Domain Management
- Update DNS records as instructed

### 2. Vercel

**Steps:**
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project directory
3. Follow prompts to deploy

### 3. GitHub Pages

**Steps:**
1. Push code to GitHub repository
2. Go to Settings > Pages
3. Select source branch (usually `main`)
4. Your site will be at `https://yourusername.github.io/repository-name`

### 4. Traditional Web Hosting

**For shared hosting (GoDaddy, Bluehost, etc.):**
1. Upload all files via FTP
2. Ensure `index.html` is in the root directory
3. Test all paths are correct

## 🔧 Production Optimizations

### 1. Image Optimization
```bash
# Install optimization tools
npm install -g imagemin-cli imagemin-pngquant

# Optimize images
imagemin Public/**/*.png --out-dir=optimized --plugin=pngquant
```

### 2. Code Minification
```bash
# Minify HTML (optional)
npm install -g html-minifier
html-minifier --collapse-whitespace --remove-comments index.html -o index.min.html
```

### 3. Performance Tips
- Enable gzip compression on your server
- Set proper cache headers for static assets
- Consider using a CDN for global distribution

## 🌍 Custom Domain Setup

### 1. DNS Configuration
Create these DNS records:

```
Type    Name    Value
A       @       [Your hosting IP]
CNAME   www     yourdomain.com
```

### 2. SSL Certificate
Most modern hosts provide free SSL. Ensure HTTPS is enabled.

## 📊 Analytics Setup

### Google Analytics
1. Create GA4 property
2. Add tracking code to `index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🔐 Security Headers

Add these headers for security:

```
Content-Security-Policy: default-src 'self' 'unsafe-inline' data: https:
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

## 🎯 SEO Optimization

### 1. Sitemap
Create `sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yourdomain.com/</loc>
    <lastmod>2025-01-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

### 2. Robots.txt
```
User-agent: *
Allow: /
Sitemap: https://yourdomain.com/sitemap.xml
```

## 🔗 Social Media Integration

### 1. Update Contract Address
Replace placeholder in `script.js`:
```javascript
const contractAddress = 'YOUR_ACTUAL_CONTRACT_ADDRESS';
```

### 2. Update Social Links
Update these functions in `script.js`:
```javascript
function openTelegram() {
    window.open('https://t.me/your-telegram-channel', '_blank');
}

function openTwitter() {
    window.open('https://twitter.com/your-twitter-handle', '_blank');
}

function openDEX() {
    window.open('https://your-dex-link.com', '_blank');
}
```

## 🚨 Troubleshooting

### Common Issues:

1. **Images not loading**
   - Check file paths are correct
   - Ensure images are uploaded
   - Verify case sensitivity

2. **PFP generator not working**
   - Check browser console for errors
   - Verify all asset files are present
   - Test locally first

3. **Sounds not playing**
   - Modern browsers require user interaction before audio
   - Check browser console for audio errors

## 📱 Mobile Optimization

- Test on actual devices
- Use Chrome DevTools mobile emulation
- Verify touch interactions work properly
- Check loading times on slower connections

## 🎉 Post-Deployment

1. Test all functionality on live site
2. Submit to search engines
3. Share on social media
4. Monitor analytics and user feedback
5. Keep contract address and links updated

---

**Need help?** Check the [README.md](README.md) for more information or create an issue on GitHub. 