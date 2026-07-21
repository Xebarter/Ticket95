'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, Lock } from 'lucide-react';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

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
          <Button size="sm" className="rounded-xl">
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
          <Button variant="outline" size="sm" className="rounded-xl">
            <Lock className="mr-1.5 h-4 w-4" />
            Update
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
