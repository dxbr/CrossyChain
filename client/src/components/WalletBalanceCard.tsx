import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowDownIcon, ArrowUpIcon, CoinsIcon, RefreshCwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { publicClient } from '@/lib/web3';
import type { Address } from 'viem';

interface NativeBalance {
  address: string;
  received: string;
  sent: string;
  balance: string;
}

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

interface TokenBalance {
  tokenAddress: string;
  balance: string;
  received: string;
  sent: string;
}

interface WalletBalanceCardProps {
  address: string;
  label?: string;
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

export function WalletBalanceCard({ address, label = 'Wallet' }: WalletBalanceCardProps) {
  const { data: nativeBalance, isLoading: balanceLoading, refetch: refetchBalance } = useQuery<NativeBalance>({
    queryKey: ['balance', address],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/balance/${address}`);
        if (!response.ok) {
          console.warn('Envio balance fetch failed, falling back to RPC');
          const balance = await publicClient.getBalance({ address: address as Address });
          return {
            address,
            received: '0',
            sent: '0',
            balance: balance.toString(),
          };
        }
        return response.json();
      } catch (error) {
        console.warn('Failed to fetch balance from Envio:', error);
        const balance = await publicClient.getBalance({ address: address as Address });
        return {
          address,
          received: '0',
          sent: '0',
          balance: balance.toString(),
        };
      }
    },
    enabled: !!address,
    staleTime: 5000,
    refetchInterval: 10000,
  });

  const { data: transfers, isLoading: transfersLoading, refetch: refetchTransfers } = useQuery<TokenTransfer[]>({
    queryKey: ['transfers', address],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/transfers/${address}?limit=50`);
        if (!response.ok) {
          return [];
        }
        return response.json();
      } catch (error) {
        console.warn('Failed to fetch transfers from Envio:', error);
        return [];
      }
    },
    enabled: !!address,
    staleTime: 5000,
    refetchInterval: 30000,
  });

  const { data: tokenBalances, isLoading: tokensLoading, refetch: refetchTokens } = useQuery<Record<string, TokenBalance>>({
    queryKey: ['token-balances', address],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/token-balances/${address}`);
        if (!response.ok) {
          return {};
        }
        return response.json();
      } catch (error) {
        console.warn('Failed to fetch token balances from Envio:', error);
        return {};
      }
    },
    enabled: !!address,
    staleTime: 5000,
    refetchInterval: 30000,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchBalance(), refetchTransfers(), refetchTokens()]);
    setIsRefreshing(false);
  };

  const isLoading = balanceLoading || transfersLoading || tokensLoading;
  const tokenCount = Object.keys(tokenBalances || {}).length;

  if (isLoading) {
    return (
      <Card className="bg-black/40 backdrop-blur-md border-2 border-purple-500/30">
        <CardHeader>
          <CardTitle className="font-['Press_Start_2P'] text-sm text-purple-400 flex items-center gap-2">
            <CoinsIcon className="w-4 h-4" />
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full bg-purple-900/20" />
          <Skeleton className="h-6 w-3/4 bg-purple-900/20" />
          <Skeleton className="h-6 w-1/2 bg-purple-900/20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/40 backdrop-blur-md border-2 border-purple-500/30 hover:border-purple-400/50 transition-all" data-testid="card-wallet-balance">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-['Press_Start_2P'] text-xs text-purple-400 flex items-center gap-2">
            <CoinsIcon className="w-4 h-4" />
            {label}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-6 w-6 p-0"
            data-testid="button-refresh-balance"
          >
            <RefreshCwIcon className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Native MON Balance */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="font-['Press_Start_2P'] text-2xl text-green-400" data-testid="text-mon-balance">
              {formatTokenAmount(nativeBalance?.balance || '0', 18)}
            </span>
            <span className="text-sm text-gray-400">MON</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 text-green-400">
              <ArrowDownIcon className="w-3 h-3" />
              <span data-testid="text-mon-received">+{formatTokenAmount(nativeBalance?.received || '0', 18)}</span>
            </div>
            <div className="flex items-center gap-1 text-red-400">
              <ArrowUpIcon className="w-3 h-3" />
              <span data-testid="text-mon-sent">-{formatTokenAmount(nativeBalance?.sent || '0', 18)}</span>
            </div>
          </div>
        </div>

        {/* Token Balances */}
        {tokenCount > 0 && (
          <div className="space-y-2 pt-2 border-t border-purple-500/20">
            <div className="font-['Press_Start_2P'] text-xs text-purple-300">
              Tokens ({tokenCount})
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {Object.values(tokenBalances || {}).map((token) => (
                <div
                  key={token.tokenAddress}
                  className="flex items-center justify-between text-xs p-2 bg-purple-900/10 rounded border border-purple-500/20"
                  data-testid={`token-balance-${token.tokenAddress}`}
                >
                  <div className="flex-1 truncate">
                    <div className="text-purple-300 truncate" title={token.tokenAddress}>
                      {token.tokenAddress.slice(0, 6)}...{token.tokenAddress.slice(-4)}
                    </div>
                  </div>
                  <div className="text-green-400 font-mono" data-testid={`text-token-amount-${token.tokenAddress}`}>
                    {formatTokenAmount(token.balance, 18)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incoming Transfers */}
        {transfers && transfers.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-purple-500/20">
            <div className="font-['Press_Start_2P'] text-xs text-green-400 flex items-center gap-1">
              <ArrowDownIcon className="w-3 h-3" />
              Recent Incoming
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {transfers.slice(0, 5).map((transfer, idx) => (
                <div
                  key={`${transfer.transactionHash}-${idx}`}
                  className="text-xs p-2 bg-green-900/10 rounded border border-green-500/20 hover:border-green-400/40 transition-colors"
                  data-testid={`transfer-incoming-${idx}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-green-400 font-mono" data-testid={`text-transfer-amount-${idx}`}>
                      +{formatTokenAmount(transfer.value, 18)}
                    </span>
                    <Badge variant="outline" className="text-xs h-4 border-green-500/30 text-green-400">
                      Block {transfer.blockNumber}
                    </Badge>
                  </div>
                  <div className="text-gray-500 text-[10px] truncate" title={transfer.tokenAddress}>
                    Token: {transfer.tokenAddress.slice(0, 8)}...{transfer.tokenAddress.slice(-6)}
                  </div>
                  <div className="text-gray-500 text-[10px] truncate" title={transfer.from}>
                    From: {transfer.from.slice(0, 8)}...{transfer.from.slice(-6)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Balance Info */}
        <div className="pt-2 border-t border-purple-500/20">
          <div className="flex items-center justify-center text-[10px] text-purple-400/60">
            <span>Powered by Envio HyperSync</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
