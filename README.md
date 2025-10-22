# Crossy Chain

A blockchain-enabled 3D game where players navigate a chicken across lanes of traffic and their high scores are permanently recorded on the Monad blockchain using MetaMask Smart Accounts.

Built for the MetaMask Smart Accounts x Monad Dev Cook Off hackathon.

## Overview

Crossy Chain is a Web3-enabled Crossy Road clone that combines classic arcade gameplay with blockchain technology. All high scores are stored permanently on the Monad testnet via ERC-4337 Smart Account transactions.

### Key Features

- 3D gameplay powered by Three.js
- MetaMask Smart Account integration using the Delegation Toolkit SDK
- ERC-4337 user operations via Alchemy bundler
- On-chain score storage on Monad testnet
- Retro pixel aesthetic with Press Start 2P font
- Real-time balance display for Smart Accounts
- Automatic Smart Account deployment on first transaction

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
- `MONAD_RPC`: Monad RPC URL (defaults to https://rpc.ankr.com/monad_testnet)

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

## Smart Account Integration

This project uses MetaMask's Delegation Toolkit to create ERC-4337 Smart Accounts:

### Flow
1. User connects MetaMask (EOA wallet)
2. System creates a Smart Account linked to the EOA
3. Smart Account address and balance displayed in UI
4. Score submissions use user operations via Alchemy bundler
5. First transaction automatically deploys the Smart Account

### Benefits
- Account abstraction (ERC-4337 compliant)
- Better UX for blockchain transactions
- Future support for gasless transactions with paymasters
- Separation of signing key and account logic

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

### ScoreStore.sol

```solidity
contract ScoreStore {
    mapping(address => uint256) public scores;
    event ScoreSaved(address indexed player, uint256 score);

    function saveScore(uint256 _score) external {
        require(_score > scores[msg.sender], "Lower score");
        scores[msg.sender] = _score;
        emit ScoreSaved(msg.sender, _score);
    }

    function getScore(address _player) external view returns (uint256) {
        return scores[_player];
    }
}
```

Features:
- Only accepts higher scores to prevent score manipulation
- Gas-efficient storage using mappings
- Event emission for indexing and verification
- Simple and auditable code

## Building for Production

```bash
# Build the application
npm run build

# The output will be in the dist/ folder
# Deploy to your hosting service (Netlify, Vercel, etc.)
```

For deployment configuration, see `netlify.toml` and `client/public/_redirects`.

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
