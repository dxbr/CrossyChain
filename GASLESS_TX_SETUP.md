# Gasless Transaction Setup Guide

## Current Status

✅ **ZeroDev Integration is Working Correctly**
- ZeroDev Project ID is loaded: `ad98c804-b2c4-4eca-af23-27ee8ee947b6`
- Bundler URL is correctly configured with `selfFunded=true` parameter
- MetaMask Smart Account is created successfully
- EOA balance display via Envio HyperSync is working

## Why Gasless Transactions Are Failing

The gasless transactions are failing with error:
```
AA21 didn't pay prefund - Smart Account does not have sufficient funds
```

### Root Cause

**Your Smart Account wallet has 0 MON tokens.**

With `selfFunded=true`, the Smart Account pays for its own gas fees (not a third-party paymaster). This means **you must deposit MON tokens into the Smart Account address** for it to pay gas.

## How to Fix

### Step 1: Get Your Smart Account Address

When you connect your wallet, the UI shows two addresses:
- **EOA Address**: Your regular MetaMask wallet (currently has ~0.17 MON)
- **Smart Account**: The smart wallet address (currently has 0 MON) ⚠️

Copy the Smart Account address from the UI (or see it in the console logs).

**Example from logs:**
- EOA: `0x5ed9af744aa29a3e96bcdb2a519f9ac30db79f87`
- Smart Account: `0xdc8E3860A002F7dDA46eA355F272D13D9aC37CA9` ← **This needs funding!**

### Step 2: Send MON Tokens to Smart Account

Transfer MON tokens from your EOA wallet (or another source) to your Smart Account address:

1. Open MetaMask
2. Send transaction to Smart Account address
3. Amount: At least 0.01 MON (recommended: 0.1 MON for multiple transactions)

### Step 3: Verify Balance

After sending MON tokens:
- The UI will show "Smart Balance: X.XXXX MON"
- The yellow warning "Fund Smart Account" will disappear
- Gasless transactions will now work!

## Architecture

### How It Works

```
User plays game
    ↓
Submits score
    ↓
System tries Smart Account first (gasless from EOA perspective)
    ↓
Smart Account uses its own MON balance to pay gas (selfFunded=true)
    ↓
If Smart Account fails → Falls back to EOA wallet
```

### Why This Design?

1. **Gasless for User's EOA**: The user's main wallet (EOA) doesn't pay gas
2. **Smart Account Self-Funded**: The smart account wallet uses its own MON tokens
3. **ZeroDev Bundler**: Handles the UserOperation submission
4. **Fallback Safety**: If smart account fails, transactions still work via EOA

## Technical Details

### Environment Variables (.env)

Located in `client/.env`:
```bash
VITE_MONAD_RPC=https://rpc.ankr.com/monad_testnet
VITE_CONTRACT_ADDRESS=0x0877c473BCe3aAEa4705AB5C3e24d7b0f630C956
VITE_ZERODEV_PROJECT_ID=ad98c804-b2c4-4eca-af23-27ee8ee947b6
```

### Smart Account Creation

Uses MetaMask Delegation Toolkit:
```typescript
import { createMetaMaskSmartAccount } from "@metamask/delegation-toolkit";

const smartAccount = await createMetaMaskSmartAccount({
  client: publicClient,
  owner: eoaWalletClient,
});
```

### Transaction Submission

```typescript
// 1. Try Smart Account (gasless from EOA perspective)
const hash = await smartAccount.sendUserOperation({
  calls: [{ to: contractAddress, data: callData }],
  // Gas paid by Smart Account's own MON balance
});

// 2. Fallback to EOA if Smart Account fails
if (error) {
  await eoaWalletClient.writeContract({ ... });
}
```

## Next Steps

1. **Fund your Smart Account** with MON tokens
2. **Test a transaction** - it should now use gasless (Smart Account pays from its own balance)
3. **Monitor balances** - UI shows both EOA and Smart Account balances
4. **Refill as needed** - Add more MON when Smart Account balance runs low

## Troubleshooting

### Issue: "AA21 didn't pay prefund"
**Solution**: Send MON tokens to Smart Account address

### Issue: "User rejected transaction"
**Solution**: Approve the transaction in MetaMask

### Issue: Environment variable not loaded
**Solution**: Ensure `client/.env` exists (not root `.env`) and restart server
