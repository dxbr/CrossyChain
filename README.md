# Crossy Chain - Monad Blockchain Game

A blockchain-enabled 3D game where players navigate a chicken across lanes of traffic and their high scores are permanently recorded on the Monad blockchain using MetaMask Smart Accounts with Alchemy bundler.

Built for the MetaMask Smart Accounts x Monad Dev Cook Off hackathon.

## Overview

Crossy Chain is a Web3-enabled Crossy Road clone that combines classic arcade gameplay with blockchain technology. All high scores are stored permanently on the Monad testnet via ERC-4337 Smart Account transactions using Alchemy's bundler infrastructure.

### Key Features

- **3D Arcade Gameplay** - Three.js powered retro-style game with smooth controls
- **Smart Account Integration** - MetaMask Delegation Toolkit SDK for ERC-4337 accounts
- **Alchemy Bundler** - Reliable transaction processing via Alchemy's infrastructure
- **Automatic Fallback** - Seamlessly switches from Smart Account to EOA if timeout occurs
- **On-Chain Scores** - Permanent, verifiable high score storage on Monad blockchain
- **Real-Time Balance** - Live MON balance updates using standard RPC calls
- **Transaction Progress** - Live countdown and status updates during score submission
- **Netlify Compatible** - Fully static deployment, works on all hosting platforms

## Technology Stack

### Frontend
- React with TypeScript
- Three.js for 3D rendering
- Viem for Ethereum interactions
- Shadcn UI components
- Tailwind CSS for styling
- Wouter for routing

### Blockchain
- Monad Testnet (Chain ID: 10143)
- MetaMask Delegation Toolkit for Smart Accounts
- Alchemy bundler for ERC-4337 operations
- Solidity 0.8.20
- Hardhat development environment

### Smart Contract
- ScoreStore.sol: Simple score storage contract
- Only accepts scores higher than previous records
- Emits events for off-chain indexing

## Quick Start

### Prerequisites

- Node.js 20 or higher
- MetaMask browser extension
- Monad testnet MON tokens
- Alchemy API key

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at http://localhost:5000

### Environment Variables

Required environment variables (stored in Replit Secrets):

- `VITE_CONTRACT_ADDRESS`: Deployed ScoreStore contract address
- `VITE_ALCHEMY_API_KEY`: Alchemy API key for bundler operations

Optional:
- `VITE_MONAD_RPC`: Monad RPC URL (defaults to https://rpc.ankr.com/monad_testnet)

### Smart Contract Deployment

```bash
# Set your private key for deployment
export PRIVATE_KEY=your_private_key_here

# Deploy to Monad Testnet
npx hardhat run web3/scripts/deploy.js --network monad

# Copy the deployed contract address
# Add it to VITE_CONTRACT_ADDRESS in Replit Secrets
```

## How to Play

1. Click "Connect Wallet" to create a MetaMask Smart Account
2. Fund your Smart Account with MON tokens (displayed in the balance)
3. Use arrow keys or on-screen buttons to move the chicken
4. Cross lanes to earn points, avoid vehicles
5. When game ends, scores are automatically submitted to blockchain
6. View your transaction on Monad Explorer

## Project Structure

```
crossy-chain/
├── client/src/
│   ├── components/       # React UI components
│   ├── pages/           # Game and leaderboard pages
│   ├── lib/             # Web3 integration and game logic
│   └── index.css        # Design system
├── server/              # Express backend
├── shared/              # Shared TypeScript types
├── web3/
│   ├── contracts/       # Solidity contracts
│   └── scripts/         # Deployment scripts
└── package.json
```

## Smart Account Integration & Transaction Flow

This project uses MetaMask's Delegation Toolkit with **Alchemy bundler** (NOT Pimlico) for reliable Smart Account transactions.

### Connection Flow

1. **User connects MetaMask** - Standard EOA (Externally Owned Account) connection
2. **Smart Account creation** - System automatically creates ERC-4337 Smart Account linked to EOA
3. **Address display** - Both EOA and Smart Account addresses shown in UI
4. **Balance monitoring** - RPC polling updates balances every 10 seconds

### Transaction Submission Flow

When a player submits their score, the following happens:

#### Smart Account Path (Primary - via Alchemy)

1. **Initialization** (0s)
   - Transaction modal opens
   - Progress message: "Preparing Smart Account transaction..."
   
2. **Bundler submission** (0-5s)
   - Creates user operation for `saveScore()` call
   - Submits to Alchemy bundler: `https://monad-testnet.g.alchemy.com/v2/{API_KEY}`
   - Progress message: "Sending transaction to Alchemy bundler..."
   - Timer starts counting seconds
   
3. **Waiting for confirmation** (5-30s)
   - Polls for user operation receipt
   - Progress message: "Waiting for transaction confirmation... (Xs)"
   - **30 second timeout** - If exceeded, falls back to EOA
   
4. **Success**
   - Transaction hash received
   - Progress message: "Transaction confirmed! (Xs total)"
   - Success toast: "Score saved via Smart Account using Alchemy bundler!"

#### EOA Fallback Path (Automatic)

If Smart Account times out (>30s) or fails:

1. **Automatic switch notification**
   - Progress message: "Smart Account timed out, switching to EOA wallet..."
   
2. **Direct transaction**
   - Standard MetaMask transaction popup
   - User approves directly from EOA wallet
   - No bundler, direct blockchain submission
   
3. **Success**
   - Transaction hash received
   - Fallback toast: "Smart Account timed out. Score saved successfully via EOA wallet!"

### Why Alchemy Instead of Pimlico?

- **Alchemy bundler** is more reliable on Monad testnet
- **Faster processing** - Typically completes in 5-15 seconds
- **Better support** - Alchemy has dedicated Monad testnet infrastructure
- **Pimlico was removed** due to slow/inconsistent performance on Monad

### Real-Time Progress Updates

The transaction modal shows:
- **Live status messages** - Updates as transaction progresses through stages
- **Countdown timer** - Shows seconds elapsed (updates every second)
- **Stage indicators** - Preparing → Sending → Waiting → Confirmed
- **Method badge** - Shows whether Smart Account or EOA was used

### Smart Account Benefits

- **Account Abstraction (ERC-4337)** - Programmable wallet logic
- **Better UX** - Single-step transactions, no multiple approvals
- **Future Features** - Can add gasless transactions with paymasters
- **Security** - Separation of signing key and account logic
- **Flexibility** - Can batch multiple operations

## Network Details

| Parameter | Value |
|-----------|-------|
| Network Name | Monad Testnet |
| RPC URL | https://rpc.ankr.com/monad_testnet |
| Chain ID | 10143 |
| Currency Symbol | MON |
| Block Explorer | https://testnet.monadexplorer.com |
| Bundler | Alchemy (https://monad-testnet.g.alchemy.com) |

## Smart Contract

### ScoreStore.sol - v2 (Current)

**Contract Address:** `0x0877c473BCe3aAEa4705AB5C3e24d7b0f630C956` (Monad Testnet)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ScoreStore {
    mapping(address => uint256) public scores;

    event ScoreSaved(address indexed player, uint256 score, bool isNewHighScore);

    function saveScore(uint256 _score) external {
        bool isNewHighScore = false;

        // Only update if it's a new high score
        if (_score > scores[msg.sender]) {
            scores[msg.sender] = _score;
            isNewHighScore = true;
        }

        // Always emit the event (useful for analytics or tracking)
        emit ScoreSaved(msg.sender, _score, isNewHighScore);
    }

    function getScore(address _player) external view returns (uint256) {
        return scores[_player];
    }
}
```

### Contract Features

- **Score Validation** - Only saves scores higher than previous best
- **Event Tracking** - Emits `isNewHighScore` flag for analytics
- **Always Emits** - Events fire even if score isn't saved (for tracking attempts)
- **Gas Efficient** - Uses simple mapping for O(1) lookups
- **Auditable** - Simple, readable code with no complex logic
- **No Fees** - No contract owner, no fees, fully decentralized

### Contract ABI

The ABI is integrated in `client/src/lib/web3.ts` and includes:
- `saveScore(uint256 _score)` - Submit score transaction
- `getScore(address _player)` - Query player's best score
- `ScoreSaved` event - Indexed by player address with score and new high score flag

## Wallet Balance Display

### Real-Time Balance Monitoring

The game displays the Smart Account's MON balance in real-time using standard RPC calls via viem:

- **Current balance** - Live MON token balance
- **Auto-refresh** - Updates every 10 seconds
- **Netlify compatible** - Works on all hosting platforms

### Balance Implementation

```typescript
// Uses viem publicClient for Netlify compatibility
const balance = await publicClient.getBalance({ 
  address: smartAccountAddress 
});
```

### Why Not Envio HyperSync?

While Envio HyperSync is 1000-2000x faster, it uses native Node.js bindings that cannot run in the browser. For Netlify compatibility (static hosting), we use standard RPC calls which work everywhere but are slower for historical data queries.

**For local development**, you can optionally enable Envio HyperSync backend routes for enhanced balance display with:
- Total received/sent amounts
- ERC-20 token balances  
- Recent incoming transfers

See `server/envio.ts` and `server/routes.ts` for the backend implementation.

## Building for Production

### Local Build

```bash
# Build the application
npm run build

# The output will be in the dist/ folder
```

### Netlify Deployment

This project is **fully compatible with Netlify** static hosting:

1. **No backend required** - Pure frontend application, works on static hosting
2. **Environment variables** - Set in Netlify dashboard:
   - `VITE_CONTRACT_ADDRESS=0x0877c473BCe3aAEa4705AB5C3e24d7b0f630C956`
   - `VITE_ALCHEMY_API_KEY=your_alchemy_key`
   - `VITE_MONAD_RPC=https://testnet-rpc.monad.xyz/`

3. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist/public`
   
4. **Redirects** - Configured in `netlify.toml` for SPA routing

### Deployment Configuration

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist/public"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Other Hosting Options

The project also works on:
- **Vercel** - Static deployment with environment variables
- **Cloudflare Pages** - Static deployment
- **GitHub Pages** - Static deployment (requires base path config)
- **Any static host** - Just needs environment variable support

## Troubleshooting

### Transaction Loading Too Long
- Ensure you have VITE_ALCHEMY_API_KEY set correctly
- Check that your Smart Account has sufficient MON balance
- Monad testnet may experience congestion during peak times

### Smart Account Has No Balance
- Copy your Smart Account address from the game UI
- Send MON tokens from MetaMask to the Smart Account address
- Balance updates automatically every 5 seconds

### MetaMask Connection Issues
- Ensure MetaMask extension is installed
- Check that you're on Monad Testnet network
- Try refreshing the page and reconnecting

## Hackathon Compliance

This project meets all requirements for the MetaMask Smart Accounts x Monad Dev Cook Off:

- Uses MetaMask Smart Accounts via Delegation Toolkit SDK
- Deployed on Monad testnet
- Integration shown in main application flow (score submission)
- Signer-agnostic approach (works with MetaMask extension)
- ERC-4337 compliant user operations

## Documentation

Additional documentation files:

- `SETUP.md`: Detailed setup instructions
- `SMART_ACCOUNT_SETUP.md`: Smart Account technical details
- `ARCHITECTURE_EXPLANATION.md`: System architecture
- `replit.md`: Project overview and development status

## License

MIT License

## Contact

Built for the MetaMask Smart Accounts x Monad Dev Cook Off hackathon.

Contract Address: 0x8c2b26d35c3c749ff1f4dc91c36a81b304ce36ee (Monad Testnet)
