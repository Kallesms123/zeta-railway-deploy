# QR Code Broadcasting Platform

Real-time QR code broadcasting platform for Swedish banking systems.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 14.0.0
- npm or yarn

### Installation
```bash
npm install
```

### Run Locally
```bash
npm start
# or for development
npm run dev
```

## 📦 Project Structure

```
├── server.js              # Main Express server with Socket.IO
├── config.js              # Server configuration
├── public/                # Static files and display pages
├── extension/             # Browser extensions
└── package.json           # Dependencies
```

## 🔗 GitHub Workflow

### Your Repository
**GitHub URL:** `https://github.com/martenlarsson09/skolproject.git`

### Making Changes & Pushing to GitHub

1. **Make your code changes** in any file

2. **Check what changed:**
   ```bash
   git status
   ```

3. **Add files to staging:**
   ```bash
   git add .
   # or add specific files:
   git add server.js config.js
   ```

4. **Commit your changes:**
   ```bash
   git commit -m "Description of what you changed"
   ```

5. **Push to GitHub:**
   ```bash
   git push origin main
   ```

### Quick Commands Reference

```bash
# See what files changed
git status

# Add all changes
git add .

# Commit with message
git commit -m "Your commit message here"

# Push to GitHub
git push origin main

# Pull latest from GitHub
git pull origin main

# See commit history
git log --oneline
```

## 🌐 Deployment

The platform is configured for:
- **Railway.app** (Primary): `web-production-c116.up.railway.app`
- **Vercel** (Alternative)
- **PM2** (Process manager)

## 🏦 Supported Banks

- Nordea
- Swedbank
- Handelsbanken
- SEB
- Skandia
- Länsförsäkringar
- Danske Bank
- BankID
- Drag

## 📡 API Endpoints

- `POST /api/qr` - Submit QR code data
- `POST /api/generate-temp-url` - Generate temporary URL
- `POST /api/expire-url` - Expire temporary URL
- `GET /health` - Health check

## 🔧 Configuration

Edit `config.js` to change:
- Production domain
- Bank-specific URLs
- Server settings

## 📝 Notes

- All changes should be committed and pushed to GitHub
- The repository is already connected and ready to use
- Use descriptive commit messages for better tracking
