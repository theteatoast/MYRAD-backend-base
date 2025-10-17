# 🚀 Complete Vercel/Netlify Deployment Guide

## Step-by-Step Deployment Instructions

---

## 📋 Option A: Deploy to Vercel

### Step 1: Prepare for Deployment

1. **Create GitHub Repository** (if not already done)
   ```bash
   git init
   git add .
   git commit -m "Initial MYRAD DataCoin platform"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/myrad-datacoin.git
   git push -u origin main
   ```

2. **Create `.gitignore` to exclude sensitive files**
   ```
   node_modules/
   .env
   .env.local
   dist/
   cache/
   artifacts/
   .DS_Store
   ```

3. **Create `vercel.json` configuration**
   ```json
   {
     "version": 2,
     "buildCommand": "npm install",
     "devCommand": "npm run dev",
     "env": {
       "BASE_SEPOLIA_RPC_URL": "@base_sepolia_rpc_url",
       "PRIVATE_KEY": "@private_key",
       "MYRAD_TREASURY": "@myrad_treasury",
       "DOWNLOAD_SECRET": "@download_secret",
       "PORT": "4000",
       "LIGHTHOUSE_API_KEY": "@lighthouse_api_key",
       "FACTORY_ADDRESS": "@factory_address"
     },
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

### Step 2: Deploy to Vercel

1. **Go to Vercel Dashboard**
   - Open: https://vercel.com
   - Sign up/Login with GitHub

2. **Import Project**
   - Click "New Project"
   - Select your GitHub repository
   - Click "Import"

3. **Configure Environment Variables**
   - Go to "Settings" → "Environment Variables"
   - Add these variables:
     ```
     BASE_SEPOLIA_RPC_URL = https://sepolia.base.org
     PRIVATE_KEY = 03031b4a3e28790d8c67fa17e199360b72bcdbc8b1861c19da505de1be2fd77c
     MYRAD_TREASURY = 0x342F483f1dDfcdE701e7dB281C6e56aC4C7b05c9
     DOWNLOAD_SECRET = myrad-secret-key-change-in-production
     LIGHTHOUSE_API_KEY = 169a714e.cd7a6e5bf6ea4a2db25905d89a333ada
     FACTORY_ADDRESS = 0x2Ad81eeA7D01997588bAEd83E341D1324e85930A
     ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~5-10 minutes)
   - Get your production URL: `https://your-project.vercel.app`

---

## 📋 Option B: Deploy to Netlify

### Step 1: Prepare for Deployment

1. **Create `netlify.toml` configuration**
   ```toml
   [build]
   command = "npm install && npx hardhat compile"
   functions = "backend"
   publish = "frontend"

   [dev]
   command = "npm run dev"
   port = 4000

   [[redirects]]
   from = "/*"
   to = "/index.html"
   status = 200

   [env]
   BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org"
   PRIVATE_KEY = "03031b4a3e28790d8c67fa17e199360b72bcdbc8b1861c19da505de1be2fd77c"
   MYRAD_TREASURY = "0x342F483f1dDfcdE701e7dB281C6e56aC4C7b05c9"
   DOWNLOAD_SECRET = "myrad-secret-key-change-in-production"
   LIGHTHOUSE_API_KEY = "169a714e.cd7a6e5bf6ea4a2db25905d89a333ada"
   FACTORY_ADDRESS = "0x2Ad81eeA7D01997588bAEd83E341D1324e85930A"
   ```

2. **Push to GitHub**
   ```bash
   git add netlify.toml
   git commit -m "Add Netlify configuration"
   git push
   ```

### Step 2: Deploy to Netlify

1. **Go to Netlify Dashboard**
   - Open: https://netlify.com
   - Sign up/Login with GitHub

2. **Import from Git**
   - Click "New site from Git"
   - Select GitHub
   - Choose your repository

3. **Configure Build Settings**
   - Build command: `npm install && npx hardhat compile`
   - Publish directory: `frontend`
   - Click "Deploy site"

4. **Add Environment Variables**
   - Go to "Site settings" → "Build & deploy" → "Environment"
   - Add same variables as Vercel
   - Redeploy site

---

## 🔧 Post-Deployment Verification

### Test Your Deployed URL

1. **Open your deployed URL**
   - Vercel: `https://your-project.vercel.app`
   - Netlify: `https://your-project.netlify.app`

2. **Test Endpoints**
   ```
   GET https://your-url/                          → Health check
   GET https://your-url/datasets                  → List tokens
   GET https://your-url/price/0x2492f...          → Get price
   GET https://your-url/quote/buy/0x2492f.../0.1 → Buy quote
   ```

3. **Test Frontend**
   - Connect MetaMask wallet
   - See WORK token with price
   - Try buying tokens
   - Try selling tokens
   - Try burning for download

4. **Monitor Logs**
   - Vercel: "Deployments" → "View Function Logs"
   - Netlify: "Netlify functions" → View logs

---

## 🚨 Troubleshooting Deployment Issues

### Issue: "Module not found" error
**Solution:**
```bash
# Install dependencies
npm install

# Recompile contracts
npx hardhat compile

# Push and redeploy
git add .
git commit -m "Fix dependencies"
git push
```

### Issue: Environment variables not loading
**Solution:**
1. Vercel/Netlify dashboard → Environment Variables
2. Verify all variables are set
3. Redeploy after adding variables
4. Check function logs for `process.env` values

### Issue: "Port already in use"
**Solution:**
- This is normal on serverless platforms
- Vercel/Netlify handle port assignment automatically
- No action needed

### Issue: CORS errors
**Solution:**
Add CORS headers in `backend/server.js`:
```javascript
const cors = require('cors');
app.use(cors({
  origin: ['https://your-project.vercel.app', 'https://your-project.netlify.app'],
  credentials: true
}));
```

### Issue: Private key exposed in logs
**Solution:**
1. Rotate private key (create new wallet)
2. Update in Vercel/Netlify environment variables
3. Add `.env` to `.gitignore`
4. Check git history doesn't expose key

---

## 🔐 Security Checklist Before Going Live

- [ ] Private key is NOT in repository
- [ ] Environment variables set in platform dashboard
- [ ] DOWNLOAD_SECRET is strong (change from default)
- [ ] RPC URL is correct (not hardcoded in code)
- [ ] Factory address is correct
- [ ] Lighthouse API key is valid
- [ ] Database files are not exposed
- [ ] Error messages don't leak sensitive data
- [ ] CORS is properly configured
- [ ] All third-party APIs are accessible

---

## 📊 Performance Optimization

### For Vercel:

1. **Enable Edge Functions** (faster responses)
   - Go to "Settings" → "Functions"
   - Enable "Edge Functions"

2. **Use Serverless Functions** for API routes
   - Move backend logic to `/api` directory
   - Vercel auto-deploys as serverless functions

### For Netlify:

1. **Use Netlify Functions**
   - Put backend logic in `/netlify/functions`
   - Netlify auto-deploys and manages scaling

2. **Enable CDN Caching**
   - Go to "Site settings" → "Cache"
   - Configure cache headers

---

## 🔄 Continuous Deployment Setup

Both Vercel and Netlify automatically deploy when you push to `main`:

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Automatic Deployment**
   - Platform detects push
   - Runs build command
   - Deploys if build succeeds
   - Shows status in GitHub pull request

3. **Roll Back if Needed**
   - Vercel: Click "Deployments" → Select previous version
   - Netlify: Click "Deploys" → Select previous version

---

## 📈 Monitoring & Analytics

### Vercel Analytics:
- Go to "Analytics" dashboard
- Monitor page load times
- Track function performance
- View error rates

### Netlify Analytics:
- Go to "Analytics" → "Overview"
- Monitor build times
- Track function invocations
- View error logs

---

## 💾 Database Migration (If Needed Later)

If you need to move from JSON to real database:

1. **Update `backend/server.js`**
   ```javascript
   // Replace file system calls with database calls
   // Example using PostgreSQL:
   const { Pool } = require('pg');
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL
   });
   
   app.get('/datasets', async (req, res) => {
     const result = await pool.query('SELECT * FROM datasets');
     res.json(result.rows);
   });
   ```

2. **Add Database URL to Environment**
   - Vercel/Netlify → Add `DATABASE_URL` variable

3. **Create Migration Script**
   - Export current datasets.json
   - Import into PostgreSQL
   - Test thoroughly

---

## 🎯 Final Deployment Checklist

Before going live:

- [ ] All code pushed to GitHub
- [ ] Vercel/Netlify project created
- [ ] Environment variables added
- [ ] Deployment successful (no build errors)
- [ ] Health check endpoint responds
- [ ] Can view datasets
- [ ] Can fetch price data
- [ ] Wallet connection works
- [ ] Buy/sell/burn functions work
- [ ] Error handling working
- [ ] Logs are readable (no sensitive data exposed)
- [ ] Performance is acceptable
- [ ] Security checklist passed

---

## 📞 Production Support

### If Issues Arise:

1. **Check Vercel/Netlify Logs**
   - Identify error messages
   - Check environment variables
   - Verify RPC connectivity

2. **Monitor Performance**
   - Track function execution time
   - Monitor error rates
   - Check database query times

3. **Scale if Needed**
   - Vercel: Scales automatically
   - Netlify: Scales automatically
   - No manual scaling needed

---

## 🎉 Congratulations!

Your MYRAD DataCoin platform is now live on production!

**What's Running:**
- ✅ Smart contracts on Base Sepolia
- ✅ Backend API on Vercel/Netlify
- ✅ Frontend UI on CDN
- ✅ File storage on Lighthouse IPFS
- ✅ Download access control with JWT

**What Users Can Do:**
- ✅ Connect MetaMask wallet
- ✅ Buy dataset tokens
- ✅ Sell tokens back
- ✅ Burn tokens for download access
- ✅ Create new datasets

---

## 📚 Additional Resources

- Vercel Docs: https://vercel.com/docs
- Netlify Docs: https://docs.netlify.com
- Base Documentation: https://docs.base.org
- Ethers.js Docs: https://docs.ethers.org
- Hardhat Docs: https://hardhat.org/docs

---

**Status: Ready for Production Deployment! 🚀**
