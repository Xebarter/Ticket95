'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { supabase } from '@/lib/supabase-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Camera, CheckCircle2, Copy, RefreshCcw, ScanLine, ShieldAlert, Ticket, XCircle } from 'lucide-react';

type VerifiableEvent = {
  id: string;
  name: string;
  date: string;
  venue: string;
  status: string;
};

type ScanTicket = {
  id: string;
  eventName?: string;
  ticketTypeName?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

type ScanResult = {
  valid: boolean;
  reason: string;
  message: string;
  ticket?: ScanTicket;
  canMarkUsed?: boolean;
};

type BarcodeCandidate = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<BarcodeCandidate[]>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;
type JsQrResult = { data?: string } | null;
type JsQrDecoder = (data: Uint8ClampedArray, width: number, height: number) => JsQrResult;

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: await getAuthHeaders(),
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload?.error || 'Failed to fetch verification events') as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }
  return payload;
};

function formatDate(value?: string) {
  if (!value) return 'Date unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable';
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminVerifyClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const eventFromQuery = (searchParams.get('event') || '').trim();

  const { data, error, isLoading } = useSWR('/api/admin/verify/events', fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false,
  });
  const events: VerifiableEvent[] = data?.events ?? [];

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === eventFromQuery) ?? null,
    [events, eventFromQuery]
  );

  const [manualPayload, setManualPayload] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMarkingUsed, setIsMarkingUsed] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const [scannerSupported, setScannerSupported] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const jsQrDecoderRef = useRef<JsQrDecoder | null>(null);
  const lastScannedValueRef = useRef<string>('');
  const lastScannedAtRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scannerStartingRef = useRef(false);
  const scannerBusyRef = useRef(false);
  const isVerifyingRef = useRef(false);

  const verifyLink = useMemo(() => {
    if (!selectedEvent || typeof window === 'undefined') return '';
    return `${window.location.origin}${pathname}?event=${selectedEvent.id}`;
  }, [pathname, selectedEvent]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let mounted = true;

    const setupScannerSupport = async () => {
      const detector = (window as any).BarcodeDetector as BarcodeDetectorConstructor | undefined;
      if (detector) {
        barcodeDetectorRef.current = new detector({ formats: ['qr_code'] });
      }

      try {
        const jsQrModule = await import('jsqr');
        const decoder = (jsQrModule.default ?? jsQrModule) as JsQrDecoder;
        if (typeof decoder === 'function') {
          jsQrDecoderRef.current = decoder;
        }
      } catch {
        // jsQR fallback is optional; BarcodeDetector may still be available.
      }

      if (!mounted) return;
      const hasCameraApi = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
      setScannerSupported(hasCameraApi && Boolean(barcodeDetectorRef.current || jsQrDecoderRef.current));
    };

    void setupScannerSupport();
    return () => {
      mounted = false;
      barcodeDetectorRef.current = null;
      jsQrDecoderRef.current = null;
    };
  }, []);

  const stopScanner = () => {
    if (scanTimerRef.current) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    setCameraActive(false);
    scannerStartingRef.current = false;
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const playScanTone = (isValid: boolean) => {
    if (typeof window === 'undefined') return;
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }
    const context = audioContextRef.current;
    if (!context) return;
    if (context.state === 'suspended') {
      void context.resume();
    }

    const startAt = context.currentTime + 0.01;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(isValid ? 1240 : 420, startAt);
    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(0.22, startAt + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18);
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.2);
  };

  const verifyPayload = async (payload: string) => {
    if (!selectedEvent) {
      setScanError('Select an event first.');
      return;
    }

    setIsVerifying(true);
    isVerifyingRef.current = true;
    setScanError(null);
    setScanResult(null);

    try {
      const response = await fetch('/api/admin/verify/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          qrData: payload,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to verify ticket');
      }

      setScanResult(result);
      playScanTone(Boolean(result?.valid));
    } catch (err: any) {
      setScanError(err?.message || 'Failed to verify ticket');
    } finally {
      isVerifyingRef.current = false;
      setIsVerifying(false);
    }
  };

  const processScanValue = async (payload: string) => {
    const trimmed = payload.trim();
    if (!trimmed || isVerifyingRef.current) return;

    const now = Date.now();
    if (trimmed === lastScannedValueRef.current && now - lastScannedAtRef.current < 2200) {
      return;
    }

    lastScannedValueRef.current = trimmed;
    lastScannedAtRef.current = now;
    setManualPayload(trimmed);
    stopScanner();
    await verifyPayload(trimmed);
  };

  const startScanner = async () => {
    if (scannerStartingRef.current || cameraActive) return;
    if (!scannerSupported) {
      setCameraError('QR scanner is not supported in this browser. Use manual input below.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is unavailable in this browser. Use manual input below.');
      return;
    }
    if (!selectedEvent) {
      setCameraError('Select an event before starting the camera scanner.');
      return;
    }

    setCameraError(null);
    scannerStartingRef.current = true;

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        setCameraError('Scanner video element is unavailable.');
        return;
      }

      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      setCameraActive(true);

      scanTimerRef.current = window.setInterval(async () => {
        const detector = barcodeDetectorRef.current;
        const jsQrDecoder = jsQrDecoderRef.current;
        const canvas = canvasRef.current;
        if ((!detector && !jsQrDecoder) || !canvas || !videoRef.current || scannerBusyRef.current || isVerifyingRef.current)
          return;

        const currentVideo = videoRef.current;
        if (currentVideo.readyState < 2) return;

        const width = currentVideo.videoWidth;
        const height = currentVideo.videoHeight;
        if (!width || !height) return;

        scannerBusyRef.current = true;
        try {
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d');
          if (!context) return;

          context.drawImage(currentVideo, 0, 0, width, height);
          let firstValue: string | undefined;

          if (detector) {
            const detections = await detector.detect(canvas);
            firstValue = detections.find((item) => item.rawValue)?.rawValue;
          }

          if (!firstValue && jsQrDecoder) {
            const imageData = context.getImageData(0, 0, width, height);
            const decoded = jsQrDecoder(imageData.data, width, height);
            firstValue = decoded?.data?.trim();
          }

          if (firstValue) {
            await processScanValue(firstValue);
          }
        } catch {
          // Ignore frame-level detector failures and keep scanning.
        } finally {
          scannerBusyRef.current = false;
        }
      }, 300);
    } catch (err: any) {
      const isPlayInterrupted = err?.name === 'AbortError';
      if (!isPlayInterrupted) {
        setCameraError(err?.message || 'Unable to start camera scanner.');
      }
      stopScanner();
    } finally {
      scannerStartingRef.current = false;
    }
  };

  const onManualSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await processScanValue(manualPayload);
  };

  const onSelectEvent = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('event', value);
    router.push(`${pathname}?${next.toString()}`);
    setScanResult(null);
    setScanError(null);
    setCopyState('idle');
    lastScannedValueRef.current = '';
    lastScannedAtRef.current = 0;
    if (cameraActive) {
      stopScanner();
    }
  };

  const copyVerifyLink = async () => {
    if (!verifyLink) return;
    try {
      await navigator.clipboard.writeText(verifyLink);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('failed');
      window.setTimeout(() => setCopyState('idle'), 1800);
    }
  };

  const markAsUsed = async () => {
    if (!selectedEvent || !scanResult?.ticket?.id) return;
    setIsMarkingUsed(true);
    setScanError(null);

    try {
      const response = await fetch('/api/admin/verify/mark-used', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          ticketId: scanResult.ticket.id,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to mark ticket as used');
      }

      setScanResult(null);
      lastScannedValueRef.current = '';
      lastScannedAtRef.current = 0;
      await startScanner();
    } catch (err: any) {
      setScanError(err?.message || 'Failed to mark ticket as used');
    } finally {
      setIsMarkingUsed(false);
    }
  };

  const cancelScanDecision = async () => {
    setScanResult(null);
    setScanError(null);
    lastScannedValueRef.current = '';
    lastScannedAtRef.current = 0;
    await startScanner();
  };

  const resultToneClass = scanResult?.valid
    ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-700'
    : 'border-red-500/25 bg-red-500/5 text-red-700';

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ticket verifier</h1>
        <p className="text-sm text-muted-foreground">
          Generate event-specific verification links, scan ticket QR codes, and mark valid entries as used.
        </p>
      </header>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Verification event</CardTitle>
          <CardDescription>
            Choose an event first. Each event has a unique verification link and only accepts its own tickets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verify-event">Event</Label>
            <Select value={selectedEvent?.id} onValueChange={onSelectEvent}>
              <SelectTrigger id="verify-event" className="w-full">
                <SelectValue placeholder={isLoading ? 'Loading events...' : 'Select event'} />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {(error as any)?.status === 401
                ? 'Unauthorized. Sign in with an admin or organizer account to verify tickets.'
                : 'Failed to load events.'}
            </div>
          ) : null}

          {selectedEvent ? (
            <div className="space-y-3 rounded-xl border border-border/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{selectedEvent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(selectedEvent.date)} • {selectedEvent.venue}
                  </p>
                </div>
                <Badge variant="outline">{selectedEvent.status}</Badge>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input readOnly value={verifyLink} />
                <Button variant="outline" onClick={copyVerifyLink} className="sm:w-auto">
                  <Copy className="mr-1.5 h-4 w-4" />
                  {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy link'}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            QR scanning
          </CardTitle>
          <CardDescription>
            Use camera scanning when supported, or paste the ticket QR payload manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void startScanner()} disabled={!selectedEvent || cameraActive}>
              <Camera className="mr-1.5 h-4 w-4" />
              {cameraActive ? 'Scanner active' : 'Start camera'}
            </Button>
            <Button variant="outline" onClick={stopScanner} disabled={!cameraActive}>
              Stop camera
            </Button>
          </div>

          {cameraError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {cameraError}
            </div>
          ) : null}
          {!scannerSupported ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
              QR camera scanning is not available in this browser. Manual verification still works below.
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-border/80 bg-black/90">
            <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
          </div>
          <canvas ref={canvasRef} className="hidden" />

          <form className="space-y-2" onSubmit={onManualSubmit}>
            <Label htmlFor="manual-qr">Manual QR payload</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="manual-qr"
                value={manualPayload}
                onChange={(event) => setManualPayload(event.target.value)}
                placeholder='Paste scanned QR content (for example: {"orderId":"...","ticketIndex":0})'
              />
              <Button type="submit" disabled={!selectedEvent || !manualPayload.trim() || isVerifying}>
                {isVerifying ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Verification result</CardTitle>
          <CardDescription>Latest scanned ticket status for the selected event.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {scanError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {scanError}
            </div>
          ) : null}

          {!scanResult ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Scan a QR code to see validation status.
            </div>
          ) : (
            <div className={`space-y-3 rounded-xl border p-4 ${resultToneClass}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  {scanResult.valid ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5" />
                  ) : scanResult.reason === 'wrong_event' ? (
                    <ShieldAlert className="mt-0.5 h-5 w-5" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5" />
                  )}
                  <div>
                    <p className="font-medium">{scanResult.message}</p>
                    <p className="text-xs opacity-80">Reason: {scanResult.reason}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScanResult(null)}
                  className="bg-white/70"
                >
                  <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                  Clear
                </Button>
              </div>

              {scanResult.ticket ? (
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="inline-flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    <span>ID: {scanResult.ticket.id}</span>
                  </div>
                  <div>Event: {scanResult.ticket.eventName || '-'}</div>
                  <div>Type: {scanResult.ticket.ticketTypeName || 'General'}</div>
                  <div>Status: {scanResult.ticket.status}</div>
                  <div>Created: {formatDate(scanResult.ticket.createdAt)}</div>
                  <div>Updated: {formatDate(scanResult.ticket.updatedAt)}</div>
                </div>
              ) : null}

              {scanResult.valid && scanResult.canMarkUsed ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Ready: Mark as Used</p>
                  <Button onClick={() => void markAsUsed()} disabled={isMarkingUsed}>
                    {isMarkingUsed ? 'Marking...' : 'Mark as Used'}
                  </Button>
                </div>
              ) : scanResult.reason === 'wrong_event' ? (
                <div className="inline-flex items-center gap-2 rounded-md border border-red-400/30 bg-red-50/70 px-3 py-2 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Invalid for this event link.
                </div>
              ) : (
                <p className="text-sm font-medium">Result captured. Scan another ticket when ready.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {scanResult ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            className={`w-full max-w-md rounded-xl border p-5 shadow-2xl ${
              scanResult.valid
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100'
                : 'border-red-500/25 bg-red-500/10 text-red-100'
            }`}
          >
            <div className="flex items-start gap-2">
              {scanResult.valid ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5" />
              ) : scanResult.reason === 'wrong_event' ? (
                <ShieldAlert className="mt-0.5 h-5 w-5" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5" />
              )}
              <div className="space-y-1">
                <p className="font-medium">{scanResult.message}</p>
                <p className="text-xs opacity-80">Reason: {scanResult.reason}</p>
                {scanResult.ticket?.ticketTypeName ? (
                  <p className="text-sm opacity-90">Type: {scanResult.ticket.ticketTypeName}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {scanResult.valid && scanResult.canMarkUsed ? (
                <Button
                  className="h-14 w-full text-base font-semibold tracking-wide shadow-md"
                  onClick={() => void markAsUsed()}
                  disabled={isMarkingUsed}
                >
                  {isMarkingUsed ? 'Marking...' : 'Mark as Used'}
                </Button>
              ) : (
                <Button className="h-14 w-full text-base font-semibold tracking-wide opacity-80" disabled>
                  Mark as Used
                </Button>
              )}
              <Button
                className="h-14 w-full border-2 border-red-400 bg-red-600 text-base font-semibold tracking-wide text-white shadow-md hover:bg-red-700"
                variant="outline"
                onClick={() => void cancelScanDecision()}
                disabled={isMarkingUsed}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
