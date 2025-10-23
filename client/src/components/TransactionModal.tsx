import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TransactionModalProps {
  isOpen: boolean;
  status: "idle" | "pending" | "success" | "failed";
  hash?: string;
  error?: string;
  explorerUrl?: string;
  method?: "smartAccount" | "eoa";
  progressMessage?: string;
  secondsElapsed?: number;
  onClose: () => void;
}

export function TransactionModal({
  isOpen,
  status,
  hash,
  error,
  explorerUrl,
  method,
  progressMessage,
  secondsElapsed,
  onClose,
}: TransactionModalProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "pending":
        return <Loader2 className="h-16 w-16 text-accent animate-spin" data-testid="icon-tx-pending" />;
      case "success":
        return <CheckCircle2 className="h-16 w-16 text-primary" data-testid="icon-tx-success" />;
      case "failed":
        return <XCircle className="h-16 w-16 text-destructive" data-testid="icon-tx-failed" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "pending":
        return "Saving Score On-Chain...";
      case "success":
        return "Score Saved!";
      case "failed":
        return "Transaction Failed";
      default:
        return "";
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case "pending":
        if (progressMessage) {
          return progressMessage;
        }
        return "Your score is being recorded on the Monad blockchain. This may take a few moments.";
      case "success":
        return "Your high score has been permanently saved on-chain and is now part of the blockchain!";
      case "failed":
        return error || "An error occurred while submitting your score to the blockchain.";
      default:
        return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md backdrop-blur-md bg-card/95 border-2 border-border"
        data-testid="modal-transaction"
      >
        <DialogHeader>
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <DialogTitle className="text-center font-sans text-lg" data-testid="text-tx-title">
            {getStatusText()}
          </DialogTitle>
          <DialogDescription className="text-center text-sm font-mono" data-testid="text-tx-description">
            {getStatusDescription()}
          </DialogDescription>
          {status === "pending" && secondsElapsed !== undefined && (
            <div className="mt-2 text-center">
              <Badge variant="outline" className="text-xs font-mono" data-testid="badge-timer">
                ⏱️ {secondsElapsed}s elapsed
              </Badge>
            </div>
          )}
        </DialogHeader>

        {method && status === "success" && (
          <div className="flex justify-center mb-2">
            <Badge 
              variant={method === "smartAccount" ? "default" : "secondary"}
              className="text-[10px] font-mono"
              data-testid={`badge-method-${method}`}
            >
              {method === "smartAccount" ? "Smart Account Transaction" : "EOA Wallet Transaction"}
            </Badge>
          </div>
        )}

        {hash && (
          <div className="bg-muted/50 p-3 rounded-md border border-border" data-testid="container-tx-hash">
            <p className="text-xs text-muted-foreground mb-1 font-mono">Transaction Hash:</p>
            <p className="text-xs font-mono break-all text-foreground" data-testid="text-tx-hash">
              {hash}
            </p>
          </div>
        )}

        <DialogFooter className="sm:justify-center gap-2">
          {explorerUrl && status === "success" && (
            <Button
              variant="default"
              onClick={() => window.open(explorerUrl, "_blank")}
              className="text-xs font-mono"
              data-testid="button-view-explorer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on Explorer
            </Button>
          )}
          {status !== "pending" && (
            <Button
              variant="outline"
              onClick={onClose}
              className="text-xs font-mono"
              data-testid="button-close-modal"
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
