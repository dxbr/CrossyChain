import { useEffect, useRef } from 'react';
import { useToast } from './use-toast';
import type { Address } from 'viem';

interface TokenTransfer {
  blockNumber: number;
  timestamp: number;
  transactionHash: string;
  tokenAddress: string;
  from: string;
  to: string;
  value: string;
  direction: 'incoming' | 'outgoing';
}

export function useBlockchainNotifications(address: Address | undefined) {
  const { toast } = useToast();
  const lastSeenHashesRef = useRef<Set<string>>(new Set());
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!address) return;

    const pollTransactions = async () => {
      try {
        const response = await fetch(`/api/transfers/${address}?limit=10`);
        if (!response.ok) return;

        const transfers: TokenTransfer[] = await response.json();

        for (const transfer of transfers) {
          if (!lastSeenHashesRef.current.has(transfer.transactionHash)) {
            lastSeenHashesRef.current.add(transfer.transactionHash);

            const formattedAmount = formatTokenAmount(transfer.value, 18);
            const explorer = `https://testnet.monadexplorer.com/tx/${transfer.transactionHash}`;

            if (transfer.direction === 'incoming') {
              toast({
                title: '💰 Incoming Transaction',
                description: `Received ${formattedAmount} tokens in block ${transfer.blockNumber}`,
                duration: 5000,
              });
            } else {
              toast({
                title: '📤 Outgoing Transaction',
                description: `Sent ${formattedAmount} tokens in block ${transfer.blockNumber}`,
                duration: 5000,
              });
            }
          }
        }
      } catch (error) {
        console.warn('Error polling blockchain notifications:', error);
      }
    };

    // Initial poll
    pollTransactions();

    // Poll every 15 seconds for new transactions
    pollIntervalRef.current = setInterval(pollTransactions, 15000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [address, toast]);
}

function formatTokenAmount(value: string, decimals: number = 18): string {
  const valueBigInt = BigInt(value);
  const divisor = BigInt(10 ** decimals);
  const whole = valueBigInt / divisor;
  const remainder = valueBigInt % divisor;

  if (remainder === BigInt(0)) {
    return whole.toString();
  }

  const decimalsStr = remainder.toString().padStart(decimals, '0');
  const trimmed = decimalsStr.replace(/0+$/, '');

  return `${whole}.${trimmed}`;
}
