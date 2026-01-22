# 🎨 Pigment

> **Automated DeFi savings powered by AI, x402 payments, and VVS Finance yield generation on Cronos**

An intelligent savings application that automatically manages user savings goals through AI-driven decision making, gasless x402 micropayments, and DeFi yield optimization via VVS Finance liquidity provision.

**Drop by drop, build your financial masterpiece.**

Built for the **Cronos x402 Hackathon** (Dec 2024 - Jan 2025)

---

## 🎯 Overview

Pigment bridges traditional finance habits with DeFi opportunities by:

- **🧠 AI Decision Engine**: Analyzes wallet balances, safety buffers, and savings goals to make intelligent saving decisions
- **⚡ x402 Payments**: Enables gasless, instant USDC transfers using EIP-3009 signatures
- **📈 Automated Yield**: Routes deposits to VVS Finance USDC/USDT liquidity pools for passive income
- **🎨 Beautiful UX**: Modern, colorful interface with real-time updates and transaction tracking

Like an artist building a masterpiece with careful brushstrokes, Pigment helps you build wealth through consistent, automated micro-savings—adding color to your financial future, drop by drop.

---

## 🏗️ Architecture

```
┌─────────────┐      x402 Payment      ┌──────────────┐
│   Frontend  │─────────────────────────▶│   Backend    │
│  (React TS) │◀────────────────────────│  (Node.js)   │
└─────────────┘    Account Data         └──────────────┘
                                               │
                                               │ depositFor()
                                               ▼
                                    ┌─────────────────────┐
                                    │  SavingsVault.sol   │
                                    │   (Smart Contract)  │
                                    └─────────────────────┘
                                               │
                                               │ _depositToYield()
                                               ▼
                                    ┌─────────────────────┐
                                    │ VVSYieldStrategy    │
                                    │   (Yield Optimizer) │
                                    └─────────────────────┘
                                               │
                                               │ addLiquidity()
                                               ▼
                                    ┌─────────────────────┐
                                    │   VVS Finance       │
                                    │  USDC/USDT Pool     │
                                    └─────────────────────┘
```

### Technology Stack

**Smart Contracts** (Solidity 0.8.20)

- Foundry framework for development and testing
- OpenZeppelin contracts for security
- Custom vault and yield strategy implementations

**Backend** (Node.js / TypeScript)

- Express.js REST API
- Ethers.js v6 for blockchain interactions
- x402 Facilitator SDK for payment verification
- Node-cron for automated AI scheduling

**Frontend** (React 18 / TypeScript)

- Vite for fast development
- Ethers.js for wallet integration
- x402 Facilitator Client for payment signing
- Modern CSS with vibrant gradients and animations

---

## 📦 Project Structure

```
pigment/
├── contracts/               # Smart contracts (Foundry)
│   ├── src/
│   │   ├── SavingsVault.sol           # Core vault contract
│   │   └── VVSYieldStrategy.sol       # Yield generation strategy
│   ├── script/
│   │   ├── Deploy.s.sol               # Vault deployment
│   │   └── DeployMockVVS.s.sol        # VVS mocks deployment
│   └── test/                          # Contract tests
│
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── routes/                    # API endpoints
│   │   ├── agent/                     # AI Agent
│   │   │   ├── decision-engine.ts     # AI Agent Decision Engine
│   │   │   ├── types.ts               # Types for Decision Engine
│   │   ├── services/
│   │   │   ├── blockchain.service.ts  # Smart contract interactions
│   │   │   ├── x402.service.ts        # Payment verification
│   │   │   ├── decision.service.ts    # AI decision engine
│   │   │   └── scheduler.service.ts   # Automated checks
│   │   └── config/                    # Configuration
│   └── scripts/                       # Utility scripts
│
└── frontend/                # React application
    ├── src/
    │   ├── components/                # UI components
    │   ├── hooks/                     # Custom React hooks
    │   ├── services/                  # API clients
    │   └── types/                     # TypeScript types
    └── public/                        # Static assets
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ and npm
- **Foundry** for smart contracts
- **MetaMask** browser extension
- **Cronos testnet** CRO and devUSDC.e (from faucet)

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/MBarralDevs/Pigment-Finance
cd pigment

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Smart Contract Deployment

```bash
cd contracts

# Create .env file
cp .env.example .env
# Add your PRIVATE_KEY

# Deploy SavingsVault
forge script script/Deploy.s.sol \
  --rpc-url https://evm-t3.cronos.org \
  --broadcast

# Deploy VVS Mock Contracts
forge script script/DeployMockVVS.s.sol \
  --rpc-url https://evm-t3.cronos.org \
  --broadcast

# Set backend server and yield strategy (see deployment output)
```

### 3. Backend Configuration

```bash
cd backend

# Create .env file
cp .env.example .env

# Configure with deployed contract addresses:
# SAVINGS_VAULT_ADDRESS=0x...
# USDC_ADDRESS=0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0
# VVS_YIELD_STRATEGY_ADDRESS=0x...
# BACKEND_PRIVATE_KEY=0x...

# Start backend
npm run dev
```

### 4. Frontend Setup

```bash
cd frontend

# Create .env file (optional for custom config)
cp .env.example .env

# Start development server
npm run dev
```

### 5. Create Account & Test

```bash
cd backend

# Create user account on-chain
npm run test:setup-user

# Get testnet USDC from faucet
# https://faucet.cronos.org

# Open frontend and test save flow
# http://localhost:5173
```

---

## 🔑 Key Features

### 1. **AI-Powered Savings**

The Decision Engine analyzes:

- Current wallet balance
- Configured safety buffer (minimum emergency funds)
- Weekly savings goal
- Time since last save (24h rate limit)

**Algorithm:**

```
Available Funds = Wallet Balance - Safety Buffer
Should Save = Available Funds ≥ Minimum Save Amount (1 USDC)
              AND Time Since Last Save ≥ 24 hours
              AND Trust Mode = AUTO
```

Runs automatically every 5 minutes via node-cron scheduler.

### 2. **x402 Payment Protocol**

Implements gasless USDC transfers using:

- EIP-3009: `transferWithAuthorization` for permit-based transfers
- Off-chain signatures (MetaMask) for authorization
- On-chain settlement by Cronos Facilitator
- Zero gas costs for users

**Payment Flow:**

```
1. User clicks "Save $5"
2. Frontend requests resource (POST /api/save)
3. Backend returns 402 Payment Required with challenge
4. Frontend generates payment signature via MetaMask
5. Backend verifies signature with Facilitator API
6. Facilitator settles on-chain (USDC transfer)
7. Backend updates vault accounting
```

### 3. **VVS Finance Integration**

Automatic yield generation through:

- 50/50 USDC/USDT liquidity provision
- Swap optimization (USDC → USDT via VVS Router)
- LP token management per user
- Automated compounding (yields stay in strategy)

**Yield Process:**

```
User Deposit (5 USDC)
  ↓
Split: 2.5 USDC + 2.5 USDC
  ↓
Swap 2.5 USDC → ~2.5 USDT
  ↓
Add Liquidity: 2.5 USDC + 2.5 USDT → LP tokens
  ↓
Earn trading fees from VVS pool
```

---

## 🔐 Security

### Smart Contract Security

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Pausable**: Emergency stop mechanism
- **Ownable**: Admin-only functions
- **SafeERC20**: Safe token transfers
- **Tested**: Comprehensive Foundry test suite

### Backend Security

- **Rate Limiting**: 24-hour cooldown between saves
- **Authorization**: Backend wallet whitelisted in vault
- **Payment Verification**: x402 signatures verified before settlement
- **Trust Mode**: Users can disable auto-saves (MANUAL mode)

### Frontend Security

- **Read-Only Provider**: No private key exposure
- **MetaMask Integration**: User controls all signatures
- **HTTPS Only**: Secure connections in production
- **Input Validation**: Type-safe TypeScript throughout

---

## 📊 Smart Contract Details

### SavingsVault

**Key Functions:**

- `createAccount()`: Initialize user with goals and safety buffer
- `depositFor()`: Backend-only deposit after x402 payment
- `withdraw()`: User withdraws from vault + yield
- `updateGoal()`: Change weekly savings target
- `updateTrustMode()`: Toggle AUTO/MANUAL mode

**State:**

- Per-user accounting (deposits, withdrawals, balance)
- Savings goals and safety buffers
- Last save timestamp for rate limiting
- Trust mode preference

### VVSYieldStrategy

**Key Functions:**

- `deposit()`: Route USDC to VVS pool
- `withdraw()`: Remove liquidity and return USDC
- `getUserValue()`: Calculate user's total value including yield

**Features:**

- Automatic USDC/USDT swapping
- LP token tracking per user
- Slippage protection (0.5% tolerance)

---

## 🧪 Testing

### Smart Contracts

```bash
cd contracts

# Run all tests
forge test -vvv

# Test specific contract
forge test --match-contract SavingsVaultTest -vvv

# Gas report
forge test --gas-report
```

### Backend

```bash
cd backend

# Test blockchain interactions
npm run test:blockchain

# Test API endpoints
npm run test:api

# Test full save flow
npm run test:full-flow
```

### Frontend

```bash
cd frontend

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🎯 Deployed Contracts (Cronos Testnet)

| Contract             | Address                                      |
| -------------------- | -------------------------------------------- |
| **SavingsVault**     | `0xE2307e3710d108ceC7a4722a020a050681c835b3` |
| **VVSYieldStrategy** | `0x4f1F87d512650f32bf9949C4c5Ef37a3cc891C6D` |
| **USDC**             | `0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0` |
| **Mock USDT**        | `0x54287AaB4D98eA51a3B1FBceE56dAf27E04a56A6` |
| **Mock VVS Router**  | `0xb6aA91E8904d691a10372706e57aE1b390D26353` |
| **USDC/USDT Pair**   | `0xE401FBb0d6828e9f25481efDc9dd18Da9E500983` |

**Explorer:** https://explorer.cronos.org/testnet

---

## 🛣️ Roadmap

### ✅ Completed (Hackathon)

- Smart contract development and testing
- x402 payment integration
- VVS Finance yield strategy
- AI decision engine with scheduling
- Full-stack application with colorful UI
- Testnet deployment and verification

### 🔮 Future Enhancements

- **Multi-Asset Support**: ETH, ATOM, CRO savings
- **Advanced AI**: Machine learning for optimal save timing
- **Social Features**: Savings groups and challenges
- **Mobile App**: Native iOS/Android applications
- **Mainnet Deployment**: Production launch on Cronos
- **Cross-Chain**: Support for other EVM networks
- **NFT Rewards**: Collectible badges for milestones

---

## 📝 API Documentation

### Backend Endpoints

**GET /api/health**

- Health check endpoint
- Returns: Server status and configuration

**GET /api/user/:address**

- Get user account information
- Returns: Account details, balances, goals

**POST /api/save**

- Trigger save with x402 payment
- Without payment: Returns 402 with payment requirements
- With payment: Verifies, settles, and deposits to vault
- Returns: Transaction hashes and save details

**GET /api/scheduler/status**

- Check AI scheduler status
- Returns: Running state, last check time, strategy

---

## 🤝 Contributing

This project was built for the Cronos x402 Hackathon. Contributions welcome!

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🏆 Hackathon Submission

**Track:** Cronos x402 - Main Track  
**Prize Category:** $24K Cronos Ignition Builder Residency  
**Timeline:** December 12, 2024 - January 23, 2025

### Judging Criteria Alignment

- **Innovation**: Novel combination of AI, x402, and DeFi yield with artistic branding
- **Technical Complexity**: Full-stack with advanced protocol integrations
- **User Experience**: Beautiful, colorful UI with intuitive interactions
- **Completeness**: Fully functional end-to-end application
- **x402 Integration**: Proper implementation of payment protocol

---

## 📞 Contact

For questions or support:

- **GitHub Issues**: [https://github.com/MBarralDevs/Pigment-Finance/issues](link-to-issues)
- **Twitter**: [@MBarralWeb3](link)
- **Email**: mbarraldevs@outlook.com

---

## 🙏 Acknowledgments

- **Cronos Labs** for the x402 payment protocol and hackathon
- **VVS Finance** for the DEX infrastructure
- **OpenZeppelin** for secure contract libraries
- **Foundry** team for excellent development tools

---

**Built with 🎨 for the Cronos ecosystem**

_"Drop by drop, build your financial masterpiece."_
