import { HypersyncClient, Query, FieldSelection, BlockField, TransactionField, LogField } from '@envio-dev/hypersync-client';
import type { Address } from 'viem';

// Envio HyperSync configuration for Monad Testnet
const HYPERSYNC_URL = 'https://monad-testnet.hypersync.xyz';
const HYPERSYNC_TOKEN = process.env.ENVIO_API_KEY || '';

if (!HYPERSYNC_TOKEN) {
  console.warn('ENVIO_API_KEY environment variable not set. Envio features will not work.');
}

// ERC-20 Transfer event signature
const TRANSFER_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export interface NativeBalance {
  address: string;
  received: string;
  sent: string;
  balance: string;
}

export interface TokenTransfer {
  blockNumber: number;
  timestamp: number;
  transactionHash: string;
  tokenAddress: string;
  from: string;
  to: string;
  value: string;
  direction: 'incoming' | 'outgoing';
}

export interface TokenBalance {
  tokenAddress: string;
  balance: string;
  received: string;
  sent: string;
}

/**
 * Initialize HyperSync client for Monad Testnet
 */
function createHypersyncClient() {
  return HypersyncClient.new({
    url: HYPERSYNC_URL,
    bearerToken: HYPERSYNC_TOKEN,
  });
}

/**
 * Get native MON balance for an address using HyperSync
 * This is MUCH faster than RPC calls (1000-2000x faster)
 */
export async function getNativeBalance(address: Address): Promise<NativeBalance> {
  const client = createHypersyncClient();
  
  const query: Query = {
    fromBlock: 0,
    fieldSelection: {
      block: [BlockField.Number, BlockField.Timestamp],
      transaction: [
        TransactionField.Hash,
        TransactionField.From,
        TransactionField.To,
        TransactionField.Value,
        TransactionField.BlockNumber,
      ],
    },
    transactions: [
      {
        from: [address],
      },
      {
        to: [address],
      },
    ],
  };

  let totalReceived = BigInt(0);
  let totalSent = BigInt(0);

  try {
    const stream = await client.stream(query, {});
    
    while (true) {
      const res = await stream.recv();
      if (!res) break;
      
      if (res.data.transactions) {
        for (const tx of res.data.transactions) {
          const value = BigInt(tx.value || '0x0');
          
          if (tx.to && tx.to.toLowerCase() === address.toLowerCase()) {
            totalReceived += value;
          }
          
          if (tx.from && tx.from.toLowerCase() === address.toLowerCase()) {
            totalSent += value;
          }
        }
      }
      
      if (!res.nextBlock) break;
    }

    return {
      address,
      received: totalReceived.toString(),
      sent: totalSent.toString(),
      balance: (totalReceived - totalSent).toString(),
    };
  } catch (error) {
    console.error('Error fetching native balance from HyperSync:', error);
    return {
      address,
      received: '0',
      sent: '0',
      balance: '0',
    };
  }
}

/**
 * Get incoming token transfers for an address
 */
export async function getIncomingTokenTransfers(
  address: Address,
  limit: number = 50
): Promise<TokenTransfer[]> {
  const client = createHypersyncClient();
  
  const paddedAddress = '0x' + '0'.repeat(24) + address.slice(2).toLowerCase();
  
  const query: Query = {
    fromBlock: 0,
    fieldSelection: {
      block: [BlockField.Number, BlockField.Timestamp],
      log: [
        LogField.Address,
        LogField.Topic0,
        LogField.Topic1,
        LogField.Topic2,
        LogField.Data,
        LogField.TransactionHash,
        LogField.BlockNumber,
      ],
    },
    logs: [
      {
        topics: [
          [TRANSFER_SIGNATURE],
          [],
          [paddedAddress],
        ],
      },
    ],
  };

  const transfers: TokenTransfer[] = [];

  try {
    const stream = await client.stream(query, {});
    
    while (true) {
      const res = await stream.recv();
      if (!res) break;
      
      if (res.data.logs) {
        for (const log of res.data.logs) {
          const topics = log.topics || [];
          const from = '0x' + (topics[1]?.slice(26) || '');
          const to = '0x' + (topics[2]?.slice(26) || '');
          const value = BigInt(log.data || '0x0');
          
          const block = res.data.blocks?.find((b: any) => b.number === log.blockNumber);
          
          transfers.push({
            blockNumber: log.blockNumber || 0,
            timestamp: block?.timestamp || 0,
            transactionHash: log.transactionHash || '',
            tokenAddress: log.address || '',
            from,
            to,
            value: value.toString(),
            direction: 'incoming',
          });
        }
      }
      
      if (!res.nextBlock) break;
    }

    return transfers.slice(-limit).reverse();
  } catch (error) {
    console.error('Error fetching token transfers from HyperSync:', error);
    return [];
  }
}

/**
 * Get all token balances for an address
 */
export async function getTokenBalances(address: Address): Promise<Record<string, TokenBalance>> {
  const client = createHypersyncClient();
  
  const paddedAddress = '0x' + '0'.repeat(24) + address.slice(2).toLowerCase();
  
  const query: Query = {
    fromBlock: 0,
    fieldSelection: {
      log: [
        LogField.Address,
        LogField.Topic0,
        LogField.Topic1,
        LogField.Topic2,
        LogField.Data,
      ],
    },
    logs: [
      {
        topics: [
          [TRANSFER_SIGNATURE],
          [],
          [paddedAddress],
        ],
      },
      {
        topics: [
          [TRANSFER_SIGNATURE],
          [paddedAddress],
          [],
        ],
      },
    ],
  };

  const balances: Record<string, { balance: bigint; received: bigint; sent: bigint }> = {};

  try {
    const stream = await client.stream(query, {});
    
    while (true) {
      const res = await stream.recv();
      if (!res) break;
      
      if (res.data.logs) {
        for (const log of res.data.logs) {
          const topics = log.topics || [];
          const tokenAddress = log.address || '';
          const fromAddr = topics[1] || '';
          const toAddr = topics[2] || '';
          const value = BigInt(log.data || '0x0');
          
          if (!balances[tokenAddress]) {
            balances[tokenAddress] = {
              balance: BigInt(0),
              received: BigInt(0),
              sent: BigInt(0),
            };
          }
          
          if (toAddr.toLowerCase() === paddedAddress.toLowerCase()) {
            balances[tokenAddress].received += value;
            balances[tokenAddress].balance += value;
          }
          
          if (fromAddr.toLowerCase() === paddedAddress.toLowerCase()) {
            balances[tokenAddress].sent += value;
            balances[tokenAddress].balance -= value;
          }
        }
      }
      
      if (!res.nextBlock) break;
    }

    const result: Record<string, TokenBalance> = {};
    for (const [addr, bal] of Object.entries(balances)) {
      if (bal.balance > BigInt(0)) {
        result[addr] = {
          tokenAddress: addr,
          balance: bal.balance.toString(),
          received: bal.received.toString(),
          sent: bal.sent.toString(),
        };
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching token balances from HyperSync:', error);
    return {};
  }
}
