'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AffiliateSettings = {
  programEnabled: boolean;
  commissionPercent: number;
};

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AffiliateSettings>({
    programEnabled: true,
    commissionPercent: 5,
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const response = await fetch('/api/admin/affiliates/settings');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to load settings');
      setSettings(payload.settings);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Couldn’t load settings',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setLoadingSettings(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const saveAffiliateSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await fetch('/api/admin/affiliates/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Failed to save');
      setSettings(payload.settings);
      toast({ title: 'Affiliate settings saved' });
    } catch (error) {
      toast({
        title: 'Couldn’t save',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card className="border-border/70">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div>
            <p className="text-sm font-medium">Affiliate program</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Account holders can share links for events that allow affiliates and earn a commission
              on completed ticket sales.
            </p>
          </div>

          {loadingSettings ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5">
                <div>
                  <p className="text-sm">Enable affiliate program</p>
                  <p className="text-xs text-muted-foreground">
                    When off, no new commissions are awarded
                  </p>
                </div>
                <Switch
                  checked={settings.programEnabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, programEnabled: checked }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="commission-percent">Default commission rate (%)</Label>
                <Input
                  id="commission-percent"
                  type="number"
                  min={5}
                  max={100}
                  step={0.1}
                  value={settings.commissionPercent}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      commissionPercent: Number(e.target.value),
                    }))
                  }
                  className="max-w-[12rem]"
                />
                <p className="text-xs text-muted-foreground">
                  Suggested default for new events. Organizers set the actual rate per event
                  (minimum 5%). Awards use each event&apos;s rate.
                </p>
              </div>

              <Button
                size="sm"
                className="rounded-xl"
                onClick={saveAffiliateSettings}
                disabled={savingSettings}
              >
                {savingSettings ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Save affiliate settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <p className="text-sm font-medium">Profile</p>
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Name" defaultValue="Admin User" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="Email" defaultValue="admin@ticket95.com" />
          </div>
          <Button size="sm" className="rounded-xl" disabled>
            <Save className="mr-1.5 h-4 w-4" />
            Save
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="space-y-3 p-4 sm:p-5">
          <p className="text-sm font-medium">Notifications</p>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5">
            <span className="text-sm">Email</span>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5">
            <span className="text-sm">Browser</span>
            <Switch />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <p className="text-sm font-medium">Security</p>
          <div className="grid gap-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input id="current-password" type="password" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" />
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" disabled>
            <Lock className="mr-1.5 h-4 w-4" />
            Update
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
