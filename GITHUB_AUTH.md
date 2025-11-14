# GitHub Authentication Guide

## Quick Steps to Push to GitHub

### Option 1: Use Personal Access Token (Recommended)

1. **Create a Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Give it a name like "therevo-maj-project"
   - Select scopes: ✅ `repo` (full control of private repositories)
   - Click "Generate token"
   - **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)

2. **When pushing, use the token as password:**
   - Username: `martenlarsson09`
   - Password: `[paste your token here]`

### Option 2: Update Remote URL with Token

If you have your token ready, you can update the remote URL:

```bash
git remote set-url origin https://YOUR_TOKEN@github.com/martenlarsson09/skolproject.git
```

Then push normally:
```bash
git push origin main
```

### Option 3: Use SSH (Alternative)

If you prefer SSH keys, you can set up SSH authentication instead.

---

**Note:** The repository must exist at: `https://github.com/martenlarsson09/skolproject`

If it doesn't exist, create it on GitHub first!

