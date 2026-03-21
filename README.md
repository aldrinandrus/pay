# Prompt402: Pay-As-You-Prompt AI

Prompt402 is a blockchain-based micropayment system for AI prompts using the **x402 protocol**. Users pay per prompt in USDC (Base Sepolia), ensuring bounded execution and no prompt runs without payment.

## 🚀 Key Features

- **Pay per prompt**: No subscription models, only pay for what you use.
- **x402 Integration**: Automatic HTTP 402 "Payment Required" handling.
- **Bounded Execution**: Prompt execution only occurs after payment verification.
- **Wallet Integration**: Automatic network switching to **Base Sepolia**.

## 🏗️ Architecture

Frontend (Next.js) → x402 Protocol Handler → Backend (Node/Express) → AI Execution

## 🔧 Setup

### Prerequisites
- Node.js & npm
- A Web3 Wallet (MetaMask, Coinbase Wallet, etc.)
- Base Sepolia Testnet tokens (USDC)

### Backend
1. `cd backend`
2. `npm install`
3. `node server.js`
   Server runs on `http://localhost:4020`

### Frontend
1. `cd frontend`
2. `npm install --legacy-peer-deps`
3. `npm run dev`
   App runs on `http://localhost:3000`

## 👥 Team Roles

1. **Backend Engineer**: Implemented prompt handling and payment logic.
2. **Blockchain Engineer**: Integrated x402 flow and payment verification.
3. **AI Integration Engineer**: Connected AI execution to prompt flow after payment confirmation.
4. **Frontend Enhancer**: Built a neo-brutalist UI with real-time prompt state tracking.
