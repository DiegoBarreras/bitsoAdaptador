# Bitso Adapter

> Chrome extension that automatically pays SPEI checkouts on Mercado Libre using your Bitso crypto balance.

---

## The Problem

In Mexico, millions of people hold crypto on Bitso but can't use it to pay at online stores. When shopping on Mercado Libre and choosing SPEI as payment method, users have to manually copy the CLABE, amount, and reference — then switch to their bank app to complete the transfer. It's slow, error-prone, and disconnects crypto from everyday commerce.

## The Solution

Bitso Adapter bridges Web2 SPEI payments with your Bitso crypto balance. It automatically detects SPEI checkout pages on Mercado Libre, extracts all payment data, and executes the transfer — converting crypto to MXN and sending the SPEI payment in a single confirmation click.

---

## How It Works

1. **Detect** — The extension automatically detects SPEI payment screens on Mercado Libre
2. **Convert** — Sells your selected cryptocurrency to MXN at market price via Bitso API
4. **Pay** — Executes the SPEI transfer to the exact CLABE with the correct reference

---

## Features

- Automatic SPEI checkout detection using stable DOM selectors
- Real-time crypto prices and portfolio balance display
- CLABE validation using Banxico's official checksum algorithm
- Transaction history with filtering by type
- One-click payment confirmation with PIN verification
- System notifications when a payment is detected

---

## Tech Stack

**Frontend:** React + Vite + Chrome Extension Manifest V3

**Backend:** Node.js + Express, deployed on Render

**Authentication:** Bitso API with HMAC-SHA256 Nonce v2

**Payments:** Bitso REST API — market orders + SPEI withdrawals

**Webhooks:** Registered callback URL for real-time payment status

---

## Requirements

- Node.js 18+
- Chrome or Brave browser
- Bitso account with API Keys (Place orders + View balances permissions enabled)

---

## Installation

### Backend

```bash
git clone https://github.com/DiegoBarreras/bitsoAdaptador
cd backend
npm install
npm start
```

### Extension

```bash
cd frontend
npm install
npm run build
```

1. Open `chrome://extensions/` in Chrome or Brave
2. Enable **Developer mode** (top right toggle)
3. Click **"Load unpacked"** and select the `/frontend/dist` folder
4. The Bitso Adapter icon will appear in your toolbar

---

## Usage

1. Click the extension icon and enter your Bitso API Key and Secret
2. Navigate to any Mercado Libre product and proceed to SPEI checkout
3. The extension will automatically detect the payment and prompt you to confirm
4. Select your crypto, review the conversion, and confirm with your PIN

---

## Team

Built at EthMexico 2026

---

## License

MIT
