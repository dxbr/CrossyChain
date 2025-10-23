import { 
  createPublicClient, 
  createWalletClient, 
  custom, 
  http, 
  type Address
} from "viem";
import { toMetaMaskSmartAccount, Implementation } from "@metamask/delegation-toolkit";
import { createBundlerClient } from "viem/account-abstraction";

export const MONAD_TESTNET = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "MON",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.ankr.com/monad_testnet"],
    },
    public: {
      http: ["https://rpc.ankr.com/monad_testnet"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
} as const;

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || "0x0877c473BCe3aAEa4705AB5C3e24d7b0f630C956") as Address;

export const SCORE_STORE_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "_score", type: "uint256" }],
    name: "saveScore",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "player", type: "address" },
      { indexed: false, internalType: "uint256", name: "score", type: "uint256" },
      { indexed: false, internalType: "bool", name: "isNewHighScore", type: "bool" },
    ],
    name: "ScoreSaved",
    type: "event",
  },
  {
    inputs: [{ internalType: "address", name: "_player", type: "address" }],
    name: "getScore",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "scores",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const MONAD_RPC_URL = import.meta.env.VITE_MONAD_RPC || "https://rpc.ankr.com/monad_testnet";
const ZERODEV_PROJECT_ID = import.meta.env.VITE_ZERODEV_PROJECT_ID || "";
const ENVIO_API_KEY = import.meta.env.ENVIO_API_KEY || "";

// Validate ZeroDev project ID on init
if (ZERODEV_PROJECT_ID) {
  console.log("ZeroDev Project ID loaded:", ZERODEV_PROJECT_ID.substring(0, 8) + "...");
} else {
  console.warn("VITE_ZERODEV_PROJECT_ID not set - Gasless transactions will not work");
}

// ZeroDev RPC with selfFunded=true (smart wallet pays with its own MON tokens)
const BUNDLER_URL = ZERODEV_PROJECT_ID
  ? `https://rpc.zerodev.app/api/v3/${ZERODEV_PROJECT_ID}/chain/${MONAD_TESTNET.id}?selfFunded=true`
  : "";

export const publicClient = createPublicClient({
  chain: MONAD_TESTNET,
  transport: http(MONAD_RPC_URL),
});

let currentEOAWalletClient: any = null;
let currentEOAAddress: Address | null = null;
let currentSmartAccount: any = null;
let currentSmartAccountAddress: Address | null = null;

export async function connectWallet(): Promise<Address> {
  if (typeof window.ethereum === "undefined") {
    const error = new Error("MetaMask not installed");
    error.name = "MetaMaskNotInstalledError";
    throw error;
  }

  let accounts: Address[] = [];
  try {
    accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    }) as Address[];
  } catch (error: any) {
    if (error?.code === 4001) {
      const cancelError = new Error("User rejected connection");
      cancelError.name = "UserRejectedError";
      throw cancelError;
    }
    throw error;
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${MONAD_TESTNET.id.toString(16)}` }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${MONAD_TESTNET.id.toString(16)}`,
            chainName: MONAD_TESTNET.name,
            nativeCurrency: MONAD_TESTNET.nativeCurrency,
            rpcUrls: [MONAD_TESTNET.rpcUrls.default.http[0]],
            blockExplorerUrls: [MONAD_TESTNET.blockExplorers.default.url],
          },
        ],
      });
    }
  }

  const eoaAddress = accounts[0];
  currentEOAAddress = eoaAddress;

  const walletClient = createWalletClient({
    account: eoaAddress,
    chain: MONAD_TESTNET,
    transport: custom(window.ethereum),
  });

  currentEOAWalletClient = walletClient;

  console.log("Connected EOA wallet:", eoaAddress);

  try {
    console.log("Creating MetaMask Smart Account...");
    const smartAccount = await toMetaMaskSmartAccount({
      client: publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [eoaAddress, [], [], []],
      deploySalt: "0x",
      signer: { walletClient },
    });

    currentSmartAccount = smartAccount;
    currentSmartAccountAddress = smartAccount.address;
    console.log("Smart Account address:", currentSmartAccountAddress);
  } catch (error) {
    console.error("Failed to create Smart Account (will use EOA fallback):", error);
    currentSmartAccount = null;
    currentSmartAccountAddress = null;
  }

  return eoaAddress;
}

export function getCurrentSmartAccountAddress(): Address | null {
  return currentSmartAccountAddress;
}

export function getCurrentEOAAddress(): Address | null {
  return currentEOAAddress;
}

// Fetch EOA balance
// Note: For comprehensive balance data with Envio HyperSync, use WalletBalanceCard component
// which accesses server-side Envio integration at /api/balance/${address}
export async function getEOABalance(address?: Address): Promise<bigint> {
  const targetAddress = address || currentEOAAddress;
  
  if (!targetAddress) {
    throw new Error("No address provided");
  }

  try {
    const balance = await publicClient.getBalance({ address: targetAddress });
    console.log(`EOA Balance (${targetAddress}):`, balance.toString(), "wei");
    return balance;
  } catch (error) {
    console.error("Error fetching EOA balance:", error);
    // Return 0 on error rather than throwing
    return BigInt(0);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error(timeoutMessage);
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

async function saveScoreViaSmartAccount(
  score: number,
  onProgress?: (stage: string, secondsElapsed: number) => void
): Promise<{ hash: string; method: "smartAccount" }> {
  if (!currentSmartAccount) {
    throw new Error("Smart Account not initialized");
  }

  if (!BUNDLER_URL) {
    throw new Error("Bundler not configured - ZeroDev Project ID missing");
  }

  console.log("🚀 Starting Smart Account gasless transaction...");
  console.log("   Smart Account:", currentSmartAccountAddress);
  console.log("   ZeroDev Bundler:", BUNDLER_URL.substring(0, 60) + "...");
  console.log("   Score:", score);
  console.log("   Gas: Sponsored by smart wallet (selfFunded=true)");

  const startTime = Date.now();
  const TIMEOUT_MS = 90000; // 90 seconds total timeout for ZeroDev bundler
  let progressInterval: any = null;

  if (onProgress) {
    onProgress("Preparing gasless transaction...", 0);
    progressInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      onProgress(`Processing gasless transaction... (${elapsed}s)`, elapsed);
    }, 1000);
  }

  try {
    // Create bundler client with ZeroDev RPC
    // ZeroDev's selfFunded=true parameter automatically handles gas sponsorship from the smart wallet
    console.log("Creating ZeroDev bundler client...");
    const bundlerClient = createBundlerClient({
      client: publicClient,
      transport: http(BUNDLER_URL, {
        timeout: TIMEOUT_MS,
        retryCount: 2,
        retryDelay: 1000,
      }),
    });

    if (onProgress) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      onProgress("Submitting to ZeroDev bundler...", elapsed);
    }

    console.log("Preparing user operation...");

    // Wrap the entire operation with timeout
    const executeTransaction = async () => {
      // Submit the user operation - ZeroDev bundler with selfFunded=true handles gas automatically
      const userOpHash = await bundlerClient.sendUserOperation({
        account: currentSmartAccount,
        calls: [
          {
            to: CONTRACT_ADDRESS,
            abi: SCORE_STORE_ABI,
            functionName: "saveScore",
            args: [BigInt(score)],
          },
        ],
      });

      console.log("✅ User operation sent:", userOpHash);

      if (onProgress) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        onProgress("Waiting for confirmation...", elapsed);
      }

      // Wait for the receipt with polling
      console.log("Waiting for receipt...");
      const maxWaitTime = 60000; // 60 seconds max for receipt
      const pollInterval = 2000; // Poll every 2 seconds
      const endTime = Date.now() + maxWaitTime;

      let receipt = null;
      while (Date.now() < endTime) {
        try {
          receipt = await bundlerClient.getUserOperationReceipt({
            hash: userOpHash,
          });

          if (receipt) {
            console.log("✅ Receipt received:", receipt);
            break;
          }
        } catch (e: any) {
          // Receipt not ready yet, continue polling
          if (!e?.message?.includes("not found") && !e?.message?.includes("UserOperation not found")) {
            console.warn("Receipt check error:", e?.message);
          }
        }

        if (!receipt) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }

        if (onProgress && receipt) {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          onProgress(`Confirming... (${elapsed}s)`, elapsed);
        }
      }

      if (!receipt) {
        console.warn("Receipt not received after 60 seconds, but transaction may have succeeded");
        // Return userOpHash as fallback - transaction may still succeed
        return { hash: userOpHash, method: "smartAccount" as const };
      }

      const txHash = receipt.receipt?.transactionHash || userOpHash;
      return { hash: txHash, method: "smartAccount" as const };
    };

    // Execute with overall timeout
    const result = await withTimeout(
      executeTransaction(),
      TIMEOUT_MS,
      "Smart Account transaction timeout after 90 seconds"
    );

    if (progressInterval) {
      clearInterval(progressInterval);
    }

    console.log("✅ Smart Account gasless transaction complete:", result.hash);

    if (onProgress) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      onProgress(`Success! (${elapsed}s)`, elapsed);
    }

    return result;
  } catch (error: any) {
    if (progressInterval) {
      clearInterval(progressInterval);
    }

    console.error("❌ Smart Account error:", error?.message || error);

    // Log detailed error for debugging
    if (error?.cause) {
      console.error("Error cause:", error.cause);
    }
    if (error?.response) {
      console.error("Error response:", error.response);
    }
    if (error?.details) {
      console.error("Error details:", error.details);
    }

    // Check for specific error types
    const errorMsg = error?.message || String(error);
    
    // If timeout, provide helpful message
    if (error?.name === "TimeoutError" || errorMsg.includes("timeout")) {
      const timeoutError = new Error("Transaction timed out - this may be due to network congestion. Please try again.");
      (timeoutError as any).code = "TIMEOUT";
      throw timeoutError;
    }

    // If insufficient funds in smart wallet
    if (errorMsg.includes("insufficient") || errorMsg.includes("INSUFFICIENT")) {
      const fundError = new Error("Smart wallet has insufficient MON tokens to pay gas fees");
      (fundError as any).userFriendlyMessage = "Your Smart Account doesn't have enough MON to pay gas fees. Please fund it with more MON.";
      throw fundError;
    }

    throw error;
  }
}

async function saveScoreViaEOA(score: number): Promise<{ hash: string; method: "eoa" }> {
  if (!currentEOAWalletClient || !currentEOAAddress) {
    throw new Error("EOA wallet not connected");
  }

  console.log("Submitting score via EOA wallet:", currentEOAAddress);
  console.log("Score:", score);
  console.log("Contract Address:", CONTRACT_ADDRESS);

  // Check balance with timeout
  let balance: bigint;
  try {
    balance = await withTimeout(
      publicClient.getBalance({ address: currentEOAAddress }),
      5000,
      "Failed to check EOA balance"
    );
  } catch (balanceError: any) {
    console.error("Error checking EOA balance:", balanceError);
    // Continue anyway, let the transaction attempt and fail if no balance
    balance = BigInt(0);
  }

  console.log("EOA wallet balance:", balance.toString(), "wei");

  if (balance === BigInt(0)) {
    const fundError = new Error(`INSUFFICIENT_FUNDS:${currentEOAAddress}`);
    fundError.name = "InsufficientFundsError";
    throw fundError;
  }

  console.log("Sending transaction from EOA wallet...");

  try {
    const txHash = await currentEOAWalletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: SCORE_STORE_ABI,
      functionName: "saveScore",
      args: [BigInt(score)],
    });

    console.log("EOA transaction successful! Hash:", txHash);
    return { hash: txHash, method: "eoa" };
  } catch (txError: any) {
    console.error("EOA transaction error:", txError);
    throw txError;
  }
}

export async function saveScoreToBlockchain(
  score: number,
  onProgress?: (stage: string, secondsElapsed: number) => void
): Promise<{ hash: string; method: "smartAccount" | "eoa" }> {
  if (typeof window.ethereum === "undefined") {
    throw new Error("MetaMask not installed");
  }

  if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    throw new Error("Contract not deployed. Please deploy the ScoreStore contract and set VITE_CONTRACT_ADDRESS environment variable.");
  }

  if (!currentEOAWalletClient || !currentEOAAddress) {
    throw new Error("Wallet not connected. Please connect your wallet first.");
  }

  try {
    // Check if Smart Account and Bundler are properly configured
    const hasSmartAccount = !!currentSmartAccount;
    const hasValidBundler = ZERODEV_PROJECT_ID && ZERODEV_PROJECT_ID.length > 0 && BUNDLER_URL;

    console.log("Transaction submission analysis:");
    console.log("- Smart Account available:", hasSmartAccount);
    console.log("- ZeroDev Bundler available:", hasValidBundler);
    console.log("- Using Smart Account (gasless):", hasSmartAccount && hasValidBundler);

    // Attempt Smart Account transaction only if both conditions are met
    if (hasSmartAccount && hasValidBundler) {
      console.log("Smart Account available, attempting gasless transaction...");
      console.log("ZeroDev Project ID configured:", ZERODEV_PROJECT_ID.substring(0, 8) + "...");
      console.log("Bundler URL:", BUNDLER_URL.substring(0, 50) + "...");

      // Wrap Smart Account attempt with overall timeout
      try {
        console.log("Attempting Smart Account transaction...");
        const result = await saveScoreViaSmartAccount(score, onProgress);
        console.log("✅ Smart Account transaction successful!");
        return result;
      } catch (smartAccountError: any) {
        const errorMsg = smartAccountError?.message || String(smartAccountError);
        console.error("Smart Account error:", errorMsg);

        // Check for specific error types
        const isUserRejected = errorMsg.includes("User rejected") || smartAccountError?.code === 4001;
        const isInsufficientFunds =
          errorMsg.includes("INSUFFICIENT_FUNDS") ||
          errorMsg.includes("insufficient funds") ||
          errorMsg.includes("Insufficient funds");

        // User rejected - don't fallback, fail immediately
        if (isUserRejected) {
          console.log("❌ User rejected the transaction");
          const error = new Error("Transaction rejected by user");
          (error as any).userFriendlyMessage = "You rejected the transaction. Please try again.";
          throw error;
        }

        // Insufficient funds - don't fallback, fail immediately
        if (isInsufficientFunds) {
          console.log("❌ Insufficient funds in Smart Account");
          const error = new Error("Not enough funds to pay gas fees");
          (error as any).userFriendlyMessage = "Your Smart Account doesn't have enough MON to pay gas fees. Please fund it with more MON.";
          throw error;
        }

        // For all other errors, try to fall back to EOA
        console.log("ℹ️ Smart Account failed, trying fallback to EOA wallet...");
        if (onProgress) {
          onProgress("Attempting with EOA wallet...", 0);
        }

        try {
          const result = await saveScoreViaEOA(score);
          console.log("✅ EOA transaction successful!");

          // Mark that we used fallback
          (result as any).usedFallback = true;

          return result;
        } catch (eoaError: any) {
          console.error("❌ EOA fallback also failed:", eoaError?.message || eoaError);

          // Combine error messages
          const combined = new Error(
            `Both Smart Account and EOA failed. ${eoaError?.message || "Transaction failed"}`
          );
          (combined as any).userFriendlyMessage =
            "Unable to submit your score to the blockchain. Please check your network connection and try again.";

          throw combined;
        }
      }
    } else {
      console.log("Smart Account not fully configured, using EOA wallet directly");
      if (!hasSmartAccount) {
        console.log("Reason: Smart Account failed to initialize");
      }
      if (!hasValidBundler) {
        console.log("Reason: ZeroDev bundler not configured (missing VITE_ZERODEV_PROJECT_ID)");
      }
      if (onProgress) {
        onProgress("Using EOA wallet for transaction...", 0);
      }
      return await saveScoreViaEOA(score);
    }
  } catch (error: any) {
    console.error("Error saving score:", error);

    if (error?.code === 4001 || error?.message?.includes("User rejected")) {
      const userRejectionError = new Error("User rejected");
      (userRejectionError as any).code = 4001;
      throw userRejectionError;
    }

    if (error?.name === "InsufficientFundsError" || error?.message?.includes("INSUFFICIENT_FUNDS")) {
      throw error;
    }

    if (error?.message?.includes("insufficient funds") || error?.message?.includes("exceeds balance")) {
      const fundError = new Error(`INSUFFICIENT_FUNDS:${currentEOAAddress}`);
      fundError.name = "InsufficientFundsError";
      throw fundError;
    }

    throw error;
  }
}

export async function getPlayerScore(playerAddress: Address): Promise<number> {
  const score = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: SCORE_STORE_ABI,
    functionName: "getScore",
    args: [playerAddress],
  });

  return Number(score);
}

export function getExplorerUrl(hash: string): string {
  return `${MONAD_TESTNET.blockExplorers.default.url}/tx/${hash}`;
}

export interface LeaderboardEntry {
  rank: number;
  player: Address;
  score: number;
  timestamp: number;
}

async function fetchLogsWithRetry(
  fromBlock: number,
  toBlock: number,
  maxRetries: number = 3
): Promise<any[]> {
  const SCORE_SAVED_TOPIC = "0xfe94b07f0f0fc9cac42c49cffaa7b7ecfcc7b97d12dc0c4b6d6b8a3b9c8d7e6f5";

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const params = {
        address: CONTRACT_ADDRESS.toLowerCase(),
        topics: [SCORE_SAVED_TOPIC],
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
      };

      const logsResponse = await fetch("https://rpc.ankr.com/monad_testnet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getLogs",
          params: [params],
          id: 1,
        }),
      });

      if (!logsResponse.ok) {
        throw new Error(`HTTP ${logsResponse.status}`);
      }

      const data = await logsResponse.json();

      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message}`);
      }

      if (!Array.isArray(data.result)) {
        return [];
      }

      return data.result || [];
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      const delay = Math.pow(2, attempt) * 1000;

      if (isLastAttempt) {
        console.error(
          `Failed to fetch logs for block range ${fromBlock} - ${toBlock} after ${maxRetries} attempts:`,
          error
        );
        return [];
      }

      console.warn(
        `Attempt ${attempt + 1} failed for block range ${fromBlock} - ${toBlock}, retrying in ${delay}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return [];
}

export async function getTopScoresFromBlockchain(): Promise<LeaderboardEntry[]> {
  try {
    if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
      console.warn(
        "Smart contract address not configured. Please set VITE_CONTRACT_ADDRESS environment variable."
      );
      return [];
    }

    const playerScores = new Map<string, { score: number; blockNumber: number }>();

    const blockResponse = await fetch("https://rpc.ankr.com/monad_testnet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
        id: 1,
      }),
    });

    const blockData = await blockResponse.json();
    const latestBlockNumber = parseInt(blockData.result || "0", 16);

    const chunkSize = 100;

    for (let fromBlock = 0; fromBlock <= latestBlockNumber; fromBlock += chunkSize) {
      const toBlock = Math.min(fromBlock + chunkSize - 1, latestBlockNumber);

      const logs = await fetchLogsWithRetry(fromBlock, toBlock);

      for (const log of logs) {
        if (!log.topics || log.topics.length < 2 || !log.data) continue;

        try {
          const player = `0x${log.topics[1].slice(-40)}` as Address;
          const scoreHex = log.data;
          const score = parseInt(scoreHex, 16);
          const blockNumber = parseInt(log.blockNumber, 16);

          if (isNaN(score) || isNaN(blockNumber)) continue;

          const existing = playerScores.get(player);
          if (!existing || blockNumber > existing.blockNumber) {
            playerScores.set(player, { score, blockNumber });
          }
        } catch (e) {
          console.error("Error parsing log:", e);
          continue;
        }
      }
    }

    const sorted = Array.from(playerScores.entries())
      .map(([player, data]) => ({
        player: player as Address,
        score: data.score,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const entries: LeaderboardEntry[] = sorted.map((entry, index) => ({
      rank: index + 1,
      player: entry.player,
      score: entry.score,
      timestamp: Math.floor(Date.now() / 1000),
    }));

    return entries;
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return [];
  }
}

declare global {
  interface Window {
    ethereum?: any;
    THREE?: any;
  }
}
