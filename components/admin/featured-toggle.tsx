'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FeaturedToggleProps {
  eventId: string;
  isFeatured: boolean;
  onToggle?: () => void;
}

export function FeaturedToggle({ eventId, isFeatured: initialIsFeatured, onToggle }: FeaturedToggleProps) {
  const [isFeatured, setIsFeatured] = useState(initialIsFeatured);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsFeatured(initialIsFeatured);
  }, [initialIsFeatured]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/events/${eventId}/featured`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !isFeatured }),
      });

      if (response.ok) {
        setIsFeatured(!isFeatured);
        toast({
          title: 'Success',
          description: `Event ${!isFeatured ? 'marked as featured' : 'removed from featured'}`,
        });
        onToggle?.();
      } else {
        throw new Error('Failed to update featured status');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update featured status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isFeatured ? 'secondary' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        'h-8 gap-1.5 rounded-full px-3 text-xs',
        isFeatured ? 'border-yellow-500/40 bg-yellow-500/15 text-yellow-800 hover:bg-yellow-500/25' : ''
      )}
    >
      {isFeatured ? <Star className="h-3.5 w-3.5 fill-current" /> : <Sparkles className="h-3.5 w-3.5" />}
      {isFeatured ? 'Featured' : 'Set featured'}
    </Button>
  );
}
