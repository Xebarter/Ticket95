'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface Sponsor {
  name: string;
  logoUrl: string;
}

interface EventFormProps {
  onSuccess?: () => void;
}

export function EventForm({ onSuccess }: EventFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    venue: '',
    totalTickets: '',
    price: '',
    organizerName: '',
    organizerLogoUrl: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSponsor = () => {
    setSponsors([...sponsors, { name: '', logoUrl: '' }]);
  };

  const handleRemoveSponsor = (index: number) => {
    setSponsors(sponsors.filter((_, i) => i !== index));
  };

  const handleSponsorChange = (index: number, field: keyof Sponsor, value: string) => {
    const newSponsors = [...sponsors];
    newSponsors[index][field] = value;
    setSponsors(newSponsors);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          totalTickets: parseInt(formData.totalTickets),
          price: parseFloat(formData.price),
          sponsors,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create event');
        return;
      }

      setFormData({
        name: '',
        description: '',
        date: '',
        venue: '',
        totalTickets: '',
        price: '',
        organizerName: '',
        organizerLogoUrl: '',
      });
      setSponsors([]);
      onSuccess?.();
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Event</CardTitle>
        <CardDescription>Fill in the event details below</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Event Name *
              </label>
              <Input
                id="name"
                name="name"
                placeholder="Concert 2024"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium">
                Event Date *
              </label>
              <Input
                id="date"
                name="date"
                type="datetime-local"
                value={formData.date}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              name="description"
              placeholder="Event description..."
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="venue" className="text-sm font-medium">
              Venue *
            </label>
            <Input
              id="venue"
              name="venue"
              placeholder="Concert Hall, Downtown"
              value={formData.venue}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="totalTickets" className="text-sm font-medium">
                Total Tickets *
              </label>
              <Input
                id="totalTickets"
                name="totalTickets"
                type="number"
                placeholder="1000"
                value={formData.totalTickets}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="price" className="text-sm font-medium">
                Price per Ticket ($) *
              </label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                placeholder="50.00"
                value={formData.price}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="organizerName" className="text-sm font-medium">
                Organizer Name
              </label>
              <Input
                id="organizerName"
                name="organizerName"
                placeholder="Your organization"
                value={formData.organizerName}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="organizerLogoUrl" className="text-sm font-medium">
                Organizer Logo URL
              </label>
              <Input
                id="organizerLogoUrl"
                name="organizerLogoUrl"
                type="url"
                placeholder="https://example.com/logo.png"
                value={formData.organizerLogoUrl}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Sponsors</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSponsor}
                disabled={loading}
              >
                Add Sponsor
              </Button>
            </div>

            {sponsors.map((sponsor, index) => (
              <div key={index} className="grid grid-cols-2 gap-4 p-3 border rounded-md">
                <Input
                  placeholder="Sponsor name"
                  value={sponsor.name}
                  onChange={(e) => handleSponsorChange(index, 'name', e.target.value)}
                  disabled={loading}
                />
                <Input
                  placeholder="Sponsor logo URL"
                  type="url"
                  value={sponsor.logoUrl}
                  onChange={(e) => handleSponsorChange(index, 'logoUrl', e.target.value)}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveSponsor(index)}
                  disabled={loading}
                  className="col-span-2"
                >
                  Remove Sponsor
                </Button>
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating event...' : 'Create Event'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
