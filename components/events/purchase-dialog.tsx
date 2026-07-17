'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PurchaseDialogProps {
  event: {
    id: string;
    name: string;
    price: number;
    available_tickets: number;
  };
  onCloseAction: () => void;
  onSuccessAction: () => void;
}

export function PurchaseDialog({ event, onCloseAction, onSuccessAction }: PurchaseDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalPrice = event.price * quantity;

  const handlePurchase = async () => {
    if (quantity < 1 || quantity > event.available_tickets) {
      setError('Invalid quantity');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          quantity,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        setError(data.error || 'Purchase failed');
        return;
      }

      onSuccessAction();
      onCloseAction();
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleBackButton = (event: PopStateEvent) => {
      event.preventDefault();
      onCloseAction();
    };

    window.addEventListener('popstate', handleBackButton);

    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [onCloseAction]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg transform transition-transform duration-300 ease-in-out scale-95 hover:scale-100">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-primary">Purchase Tickets</CardTitle>
          <CardDescription className="text-muted-foreground text-sm">{event.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-100 p-3 text-sm text-red-600 border border-red-300">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <label htmlFor="quantity" className="text-sm font-medium text-gray-700">
              Number of Tickets <span className="text-red-500">*</span>
            </label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={event.available_tickets}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={loading}
              className="border-gray-300 focus:ring-primary focus:border-primary rounded-md"
            />
            <p className="text-xs text-gray-500">
              Available: {event.available_tickets} tickets
            </p>
          </div>

          <div className="p-4 rounded-md bg-gray-50 border border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Price per ticket:</span>
                <span className="font-medium">${Math.floor(event.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium">{quantity}</span>
              </div>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
              <span>Total:</span>
              <span>${Math.floor(totalPrice)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button
              onClick={onCloseAction}
              variant="outline"
              className="flex-1 border-gray-300 hover:bg-gray-100"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePurchase}
              className="flex-1 bg-primary text-white hover:bg-primary-dark"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Complete Purchase'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
