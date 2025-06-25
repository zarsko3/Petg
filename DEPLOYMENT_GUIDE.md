# 🚀 PETg Application - Production Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ **Required Before Deployment**

#### 1. **Clerk Production Keys Setup**
Your current keys are **test keys** and won't work in production.

**Get Production Keys:**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your PETg project  
3. Navigate to **"API Keys"** → **"Show API Keys"**
4. Copy your **Production** keys:
   - `pk_live_...` (Publishable Key)
   - `sk_live_...` (Secret Key)

#### 2. **Environment Variables for Production**
Create these environment variables in your hosting platform:

```bash
# Clerk Authentication (PRODUCTION KEYS)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_PRODUCTION_KEY
CLERK_SECRET_KEY=sk_live_YOUR_PRODUCTION_SECRET
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# MongoDB (Production Database)
MONGODB_URI=mongodb+srv://zarsko:089430732zG$@Petg.dka36al.mongodb.net/?retryWrites=true&w=majority&appName=Petg
MONGODB_DB_NAME=Petg

# Next.js Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Security
NEXTAUTH_SECRET=generate-strong-random-secret-32-chars-min
```

#### 3. **Clerk Domain Configuration**
In your Clerk dashboard, you must:
1. Go to **"Domains"** section
2. Add your production domain (e.g., `https://petg-app.vercel.app`)
3. Update **"Allowed redirect URLs"** to include your production URLs

---

## 🌐 **Deployment Platform Options**

### **Option 1: Vercel (Recommended for Next.js)**

**Why Vercel:**
- ✅ Built specifically for Next.js
- ✅ Automatic deployments from Git
- ✅ Built-in SSL certificates
- ✅ Global CDN
- ✅ Serverless functions support
- ✅ Free tier available

**Deployment Steps:**

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables:**
   - Go to your Vercel dashboard
   - Select your project → Settings → Environment Variables
   - Add all the production environment variables listed above

### **Option 2: Netlify**

**Deployment Steps:**

1. **Build Command:** `npm run build`
2. **Publish Directory:** `.next`
3. **Environment Variables:** Add via Netlify dashboard

### **Option 3: Railway**

**Why Railway:**
- ✅ Simple deployment process
- ✅ Built-in database options
- ✅ Good for full-stack apps

### **Option 4: Digital Ocean App Platform**

**Why Digital Ocean:**
- ✅ Predictable pricing
- ✅ Great performance
- ✅ Full control over infrastructure

---

## 🔒 **Security Checklist**

### **Essential Security Configurations:**

#### 1. **Generate Secure Secrets**
```bash
# Generate a secure NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 2. **Database Security**
- ✅ Ensure MongoDB Atlas IP whitelist includes your hosting platform
- ✅ Use strong database passwords
- ✅ Enable MongoDB Atlas firewall rules

#### 3. **Environment Variables Security**
- ✅ Never commit `.env` files to Git
- ✅ Use hosting platform's secure environment variable storage
- ✅ Rotate secrets regularly

#### 4. **Clerk Security Settings**
- ✅ Configure proper redirect URLs
- ✅ Enable multi-factor authentication
- ✅ Set up proper session management
- ✅ Configure password policies

---

## 🚀 **Step-by-Step Vercel Deployment**

### **Step 1: Prepare Your Repository**

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

2. **Test production build locally:**
   ```bash
   npm run build
   npm run start
   ```

### **Step 2: Deploy to Vercel**

1. **Go to [vercel.com](https://vercel.com)**
2. **Click "New Project"**
3. **Import your Git repository**
4. **Configure build settings:**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

### **Step 3: Configure Environment Variables**

In Vercel dashboard:
1. Go to **Settings** → **Environment Variables**
2. Add each variable from the list above
3. Make sure to use **Production** Clerk keys

### **Step 4: Configure Custom Domain (Optional)**

1. **In Vercel:** Settings → Domains
2. **Add your domain**
3. **Update DNS settings** as instructed
4. **Update Clerk allowed domains**

---

## 🧪 **Post-Deployment Testing**

### **Test These Features:**

1. **Authentication Flow:**
   - ✅ Sign up with email
   - ✅ Sign in with existing account
   - ✅ Social login (Google, Apple, Facebook)
   - ✅ Sign out functionality

2. **Dashboard Access:**
   - ✅ Protected routes work
   - ✅ User dashboard loads
   - ✅ Data displays correctly

3. **Mobile Responsiveness:**
   - ✅ Test on various screen sizes
   - ✅ Touch interactions work
   - ✅ Forms are usable on mobile

4. **Performance:**
   - ✅ Page load times < 3 seconds
   - ✅ Lighthouse score > 90
   - ✅ Core Web Vitals pass

---

## 🎯 **Domain Setup**

### **Custom Domain Configuration:**

1. **Buy a domain** (recommendations):
   - Namecheap, Google Domains, or Cloudflare

2. **Suggested domains for PETg:**
   - `petg-app.com`
   - `mypetg.app`
   - `petgsafe.com`
   - `pettracker.app`

3. **DNS Configuration:**
   - Point your domain to Vercel/Netlify
   - Set up SSL certificates (automatic with most platforms)

---

## 📊 **Monitoring & Analytics**

### **Recommended Tools:**

1. **Vercel Analytics** (built-in)
2. **Google Analytics 4**
3. **Sentry** for error tracking
4. **Clerk Analytics** for user insights

---

## 🔄 **Continuous Deployment**

### **Automatic Deployments:**

1. **Production Branch:** Deploy from `main` branch
2. **Preview Deployments:** Automatic for pull requests
3. **Rollback:** Easy one-click rollback in Vercel

### **Git Workflow:**
```bash
# Development
git checkout -b feature/new-feature
# ... make changes ...
git commit -m "Add new feature"
git push origin feature/new-feature

# Create Pull Request → Auto-deploy preview
# Merge to main → Auto-deploy production
```

---

## 🆘 **Troubleshooting Common Issues**

### **Clerk Authentication Issues:**
- Verify production keys are correctly set
- Check allowed domains in Clerk dashboard
- Ensure redirect URLs match exactly

### **Database Connection Issues:**
- Verify MongoDB Atlas IP whitelist
- Check connection string format
- Test database connectivity

### **Build Failures:**
- Check for TypeScript errors
- Verify all dependencies are installed
- Review build logs for specific errors

---

## 📞 **Need Help?**

If you encounter any issues during deployment:

1. **Check the deployment logs** in your platform dashboard
2. **Verify all environment variables** are set correctly
3. **Test locally** with production build first
4. **Check Clerk dashboard** for authentication issues

**Ready to deploy?** Follow the Vercel steps above for the smoothest deployment experience! 