'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Bell, Globe, Lock, Mail, Save, ChevronRight, Smartphone, Clock3 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Admin settings
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Configure profile details, moderation alerts, and security preferences for the admin workspace.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-full border-primary/30 bg-primary/5 text-primary">
            Enterprise-style controls
          </Badge>
          <Badge variant="secondary" className="rounded-full">
            Mobile ready
          </Badge>
        </div>
      </header>

      <Separator />

      <div className="grid gap-6">
        <Card className="border-border/70 bg-card/90">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle>Administrator Profile</CardTitle>
            </div>
            <CardDescription>
              Manage your administrator profile information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" placeholder="Enter your name" defaultValue="Admin User" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="Enter email" defaultValue="admin@ticket95.com" />
            </div>
            <Button className="gap-2 rounded-full">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

          <Card className="border-border/70 bg-card/90">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <CardDescription>
                Configure how you receive notifications about events.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Email Notifications</div>
                    <div className="text-sm text-muted-foreground">
                      Receive emails when new events need review
                    </div>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Browser Notifications</div>
                    <div className="text-sm text-muted-foreground">
                      Get notified in your browser
                    </div>
                  </div>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Mobile push alerts</div>
                    <div className="text-sm text-muted-foreground">
                      Priority moderation notifications on mobile.
                    </div>
                  </div>
                </div>
                <Badge variant="outline">Planned</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/90">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Security</CardTitle>
              </div>
              <CardDescription>
                Manage your account security settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" />
              </div>
              <Button variant="outline" className="gap-2 rounded-full">
                <Lock className="h-4 w-4" />
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/90">
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                Current system status and version information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-muted-foreground">Platform Version</span>
                <Badge variant="secondary">v1.0.0</Badge>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-muted-foreground">Last Backup</span>
                <span className="inline-flex items-center gap-1 text-sm"><Clock3 className="h-3.5 w-3.5" />Today at 2:00 AM</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-muted-foreground">Total Events</span>
                <span className="text-sm font-medium">Loading...</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <span className="text-sm text-muted-foreground">Pending Reviews</span>
                <span className="text-sm font-medium">Loading...</span>
              </div>
              <Button variant="ghost" size="sm" className="mt-2 h-8 w-full justify-between rounded-full">
                View audit activity
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
