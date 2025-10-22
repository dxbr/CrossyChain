# Setup Guide for Crossy Chain - MetaMask Smart Accounts Integration

## Prerequisites

1. **MetaMask Browser Extension** installed
2. **Monad Testnet MON tokens** from faucet
3. **Alchemy API Key** for ERC-4337 bundler (free for testnet)

## Step 1: Get Monad Testnet MON Tokens

Visit one of these faucets to get free testnet MON:
- **Official Faucet**: https://testnet.monad.xyz/
- **QuickNode Faucet**: https://faucet.quicknode.com/monad/testnet
- **Alchemy Faucet**: https://www.alchemy.com/faucets/monad-testnet

## Step 2: Get Alchemy API Key (Required for Smart Accounts)

MetaMask Smart Accounts require an ERC-4337 bundler to submit user operations. We use Alchemy's bundler service.

1. Visit **https://dashboard.alchemy.com/**
2. Sign up for a free account
3. Create a new app for Monad Testnet
4. Copy your API key

## Step 3: Deploy ScoreStore Smart Contract

The game needs a deployed smart contract on Monad testnet to store scores.

1. Set your deployer private key:
   ```bash
   export PRIVATE_KEY=your_deployer_private_key_here
   ```

2. Deploy the contract:
   ```bash
   npx hardhat run web3/scripts/deploy.js --network monad
   ```

3. Copy the deployed contract address from the output

## Step 4: Configure Environment Variables

Create a `.env` file in the project root with:

```env
# Smart Contract Address (from Step 3)
VITE_CONTRACT_ADDRESS=0xYourContractAddressHere

# Alchemy API Key (from Step 2)
VITE_ALCHEMY_API_KEY=your_alchemy_api_key_here

# Monad RPC URL (optional, defaults to Ankr)
MONAD_RPC=https://rpc.ankr.com/monad_testnet
```

## Step 5: Run the Application

```bash
npm install
npm run dev
```

The app will be available at http://localhost:5000

## Step 6: Play the Game

1. Click **"Connect Wallet"** - This will:
   - Connect your MetaMask extension
   - Create a MetaMask Smart Account (Hybrid implementation)
   - Show your Smart Account address in the UI

2. **Play the game**:
   - Use arrow keys or on-screen buttons to move the chicken
   - Cross lanes to earn points
   - Avoid vehicles!

3. **Submit your score**:
   - When you get hit, click **"Submit Score On-Chain"**
   - MetaMask will ask you to sign the transaction
   - Your score will be submitted via ERC-4337 user operation
   - If this is your first transaction, the Smart Account will auto-deploy
   - Wait for confirmation and view the transaction on Monad Explorer

## Deploy to Netlify

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**:
   - Upload the `dist` folder to Netlify
   - Or connect your GitHub repo for automatic deployments
   - The `netlify.toml` and `client/public/_redirects` files are already configured

3. **Set environment variables** in Netlify:
   - `VITE_CONTRACT_ADDRESS`
   - `VITE_ALCHEMY_API_KEY`

## Troubleshooting

### "Smart Account not initialized" error
- Make sure you clicked "Connect Wallet" before playing
- Refresh the page and try connecting again

### "User operations may fail" warning in console
- Your `VITE_ALCHEMY_API_KEY` is not set
- Get a free API key from https://dashboard.alchemy.com

### "Contract not deployed" error
- Deploy the ScoreStore contract to Monad testnet (see Step 3)
- Set `VITE_CONTRACT_ADDRESS` in your `.env` file

### Transaction fails
- Make sure you have enough MON tokens in your wallet for gas
- The Smart Account deployment requires gas on the first transaction
- Get more MON from the faucets listed in Step 1

## Hackathon Requirements Checklist

✅ **Uses MetaMask Smart Accounts** - via Delegation Toolkit SDK  
✅ **Deployed on Monad testnet** - Chain ID: 10143  
✅ **Integration in main flow** - Score submission uses Smart Accounts  
✅ **Signer agnostic** - Works with MetaMask extension  
✅ **ERC-4337 compliant** - User operations via Alchemy bundler  

## Resources

- **Monad Testnet Hub**: https://testnet.monad.xyz
- **Monad Explorer**: https://testnet.monadexplorer.com
- **Alchemy Docs**: https://docs.alchemy.com
- **MetaMask Delegation Toolkit**: https://docs.metamask.io/delegation-toolkit/
- **Project Documentation**: See `replit.md` for technical details
