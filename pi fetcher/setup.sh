#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  FIFA 2026 Pi Fetcher — Raspberry Pi Setup Script
#  Run this once on a fresh Raspberry Pi 3 B v1.2
#
#  Usage:
#    chmod +x setup.sh
#    ./setup.sh
# ═══════════════════════════════════════════════════════════

set -e  # exit on any error

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FIFA 2026 Pi Fetcher — Setup Starting"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ─── Step 1: Update the system ───────────────────────────
echo "📦 Step 1: Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

# ─── Step 2: Install Node.js 20 (LTS) ───────────────────
echo ""
echo "📦 Step 2: Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
echo "   Node version: $(node -v)"
echo "   npm  version: $(npm -v)"

# ─── Step 3: Install pm2 (process manager) ───────────────
echo ""
echo "📦 Step 3: Installing pm2..."
sudo npm install -g pm2

# ─── Step 4: Create project folder ───────────────────────
echo ""
echo "📁 Step 4: Creating project folder at ~/fifa2026-pi..."
mkdir -p ~/fifa2026-pi/scripts
cd ~/fifa2026-pi

# ─── Step 5: Install dependencies ────────────────────────
echo ""
echo "📦 Step 5: Installing Node dependencies..."
npm install

# ─── Step 6: Create .env from example ───────────────────
echo ""
echo "📝 Step 6: Setting up .env file..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "   ⚠️  .env file created. You MUST fill it in before starting."
  echo "   Edit it now with: nano ~/fifa2026-pi/.env"
  echo ""
  echo "   Required values:"
  echo "     BACKEND_URL   → your Render/Railway backend URL"
  echo "     PI_SECRET     → same value as backend .env PI_SECRET"
  echo "     SPORTS_API_KEY → your api-football.com key"
else
  echo "   .env already exists, skipping."
fi

# ─── Step 7: pm2 startup (auto-restart on reboot) ────────
echo ""
echo "🔧 Step 7: Configuring pm2 to start on reboot..."
pm2 startup | tail -1 | sudo bash || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Setup complete!"
echo ""
echo "  NEXT STEPS:"
echo ""
echo "  1. Fill in your .env file:"
echo "       nano ~/fifa2026-pi/.env"
echo ""
echo "  2. Test the fetcher manually first:"
echo "       node fetcher.js"
echo "     (press Ctrl+C to stop)"
echo ""
echo "  3. Once working, start it with pm2:"
echo "       pm2 start fetcher.js --name fifa-fetcher"
echo "       pm2 save"
echo ""
echo "  4. Useful pm2 commands:"
echo "       pm2 status              → see if it's running"
echo "       pm2 logs fifa-fetcher   → view live logs"
echo "       pm2 restart fifa-fetcher"
echo "       pm2 stop fifa-fetcher"
echo ""
echo "  5. To sync teams/players to DB (run once before WC):"
echo "       node scripts/syncTeamsPlayers.js"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
