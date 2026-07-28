'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MIN_PAYOUT_AMOUNT_UGX, PAYOUT_COOLDOWN_DAYS } from '@/lib/payout-constants';

function formatUgx(amount: number) {
  try {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `UGX ${Math.round(amount).toLocaleString()}`;
  }
}

const DEFAULT_DESCRIPTION = `Payouts are sent to Uganda mobile money via Paytota. Minimum ${formatUgx(MIN_PAYOUT_AMOUNT_UGX)}. Disbursements are limited to once every ${PAYOUT_COOLDOWN_DAYS} days.`;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  available: number;
  defaultPhone?: string | null;
  title: string;
  description?: string;
  submitting?: boolean;
  onSubmit: (input: { amount: number; phone: string }) => Promise<void> | void;
};

export function RequestPayoutDialog({
  open,
  onOpenChange,
  available,
  defaultPhone,
  title,
  description,
  submitting,
  onSubmit,
}: Props) {
  const [amount, setAmount] = useState(String(Math.floor(available)));
  const [phone, setPhone] = useState(defaultPhone || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAmount(String(Math.floor(available)));
      setPhone(defaultPhone || '');
      setError(null);
    }
  }, [open, available, defaultPhone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < MIN_PAYOUT_AMOUNT_UGX) {
      setError(`Minimum payout is ${formatUgx(MIN_PAYOUT_AMOUNT_UGX)}.`);
      return;
    }
    if (parsed > available + 0.001) {
      setError('Amount exceeds your available balance.');
      return;
    }
    if (!phone.trim()) {
      setError('Enter your mobile money number.');
      return;
    }
    try {
      await onSubmit({ amount: parsed, phone: phone.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description || DEFAULT_DESCRIPTION}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
            Available:{' '}
            <span className="font-semibold tabular-nums">{formatUgx(available)}</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payout-amount">Amount (UGX)</Label>
            <Input
              id="payout-amount"
              type="number"
              min={MIN_PAYOUT_AMOUNT_UGX}
              max={Math.floor(available)}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payout-phone">Mobile money number</Label>
            <Input
              id="payout-phone"
              type="tel"
              placeholder="2567XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Use MTN or Airtel Uganda format (256… or 07…).
            </p>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || available < MIN_PAYOUT_AMOUNT_UGX}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                'Request payout'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { formatUgx };
