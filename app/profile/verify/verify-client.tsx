'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Copy, ExternalLink, ScanLine, ShieldAlert, XCircle } from 'lucide-react';
import { useProfileData } from '../use-profile-data';

type ScanTicket = {
  id: string;
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

export default function VerifyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = (searchParams.get('event') || '').trim();
  const { loading: loadingProfile, myEvents } = useProfileData();
  const [selectedEventId, setSelectedEventId] = useState('');
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  const [manualPayload, setManualPayload] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMarkingUsed, setIsMarkingUsed] = useState(false);

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
  const wakeLockRef = useRef<any>(null);

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
        // Fallback decoder is optional.
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
    if (wakeLockRef.current) {
      void wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
    setCameraActive(false);
    scannerStartingRef.current = false;
  };

  useEffect(() => {
    return () => stopScanner();
  }, []);

  const playScanTone = (isValid: boolean) => {
    if (typeof window === 'undefined') return;
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;

    const ensureContext = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextCtor();
      }
      return audioContextRef.current;
    };

    const context = ensureContext();
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

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(isValid ? [22] : [40, 35, 40]);
    }
  };

  const requestWakeLock = async () => {
    if (typeof navigator === 'undefined') return;
    const wakeLockApi = (navigator as any).wakeLock;
    if (!wakeLockApi?.request) return;
    try {
      wakeLockRef.current = await wakeLockApi.request('screen');
    } catch {
      // Wake lock support is optional.
    }
  };

  const verifyPayload = async (payload: string) => {
    if (!eventId) {
      setScanError('Invalid verification link.');
      return;
    }

    setIsVerifying(true);
    isVerifyingRef.current = true;
    setScanError(null);
    setScanResult(null);

    try {
      const response = await fetch('/api/profile/verify/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, qrData: payload }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Failed to verify ticket');
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
    if (trimmed === lastScannedValueRef.current && now - lastScannedAtRef.current < 2200) return;

    lastScannedValueRef.current = trimmed;
    lastScannedAtRef.current = now;
    setManualPayload(trimmed);
    stopScanner();
    await verifyPayload(trimmed);
  };

  const startScanner = async () => {
    if (scannerStartingRef.current || cameraActive) return;
    if (!eventId) {
      setCameraError('Invalid verification link.');
      return;
    }
    if (!scannerSupported) {
      setCameraError('QR scanner is not supported in this browser. Use manual input below.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is unavailable in this browser. Use manual input below.');
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
      await requestWakeLock();

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

          if (firstValue) await processScanValue(firstValue);
        } catch {
          // Ignore frame-level failures and keep scanning.
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

  useEffect(() => {
    if (!eventId) return;
    if (!scannerSupported) return;
    if (scanResult) return;
    if (cameraActive) return;
    void startScanner();
  }, [eventId, scannerSupported, scanResult, cameraActive]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (!cameraActive) return;
      void requestWakeLock();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [cameraActive]);

  useEffect(() => {
    if (eventId) return;
    if (myEvents.length === 0) return;
    if (selectedEventId) return;
    setSelectedEventId(myEvents[0].id);
  }, [eventId, myEvents, selectedEventId]);

  const onManualSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await processScanValue(manualPayload);
  };

  const markAsUsed = async () => {
    if (!eventId || !scanResult?.ticket?.id) return;
    setIsMarkingUsed(true);
    setScanError(null);

    try {
      const response = await fetch('/api/profile/verify/mark-used', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, ticketId: scanResult.ticket.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Failed to mark ticket as used');

      setScanResult(null);
      lastScannedValueRef.current = '';
      lastScannedAtRef.current = 0;
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
  };

  const getVerifyLink = (id: string) => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/profile/verify?event=${id}`;
  };

  const copyVerifyLink = async (id: string) => {
    const link = getVerifyLink(id);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedEventId(id);
      window.setTimeout(() => {
        setCopiedEventId((previous) => (previous === id ? null : previous));
      }, 1500);
    } catch {
      setCopiedEventId(null);
    }
  };

  if (!eventId) {
    const openVerifier = () => {
      if (!selectedEventId) return;
      router.push(`/profile/verify?event=${selectedEventId}`);
    };

    return (
      <Card className="w-full border-border/70">
        <CardContent className="space-y-4 py-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Ticket verifier</h1>
            <p className="mt-1 text-sm text-muted-foreground">Select an event to start ticket scanning.</p>
          </div>

          {loadingProfile ? (
            <p className="text-sm text-muted-foreground">Loading your events...</p>
          ) : myEvents.length === 0 ? (
            <div className="rounded-lg border border-border/70 p-4 text-sm">
              <p className="text-muted-foreground">You do not have any events yet.</p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/organizer/dashboard/create">Create event</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose event to verify" />
                </SelectTrigger>
                <SelectContent>
                  {myEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={openVerifier} disabled={!selectedEventId}>
                  Open verifier
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyVerifyLink(selectedEventId)}
                  disabled={!selectedEventId}
                >
                  <Copy className="mr-1.5 h-4 w-4" />
                  {copiedEventId === selectedEventId ? 'Copied' : 'Copy link'}
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border border-border/70 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">All event verifier links</p>
                {myEvents.map((event) => (
                  <div key={event.id} className="rounded-md border border-border/70 p-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{event.name}</p>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/profile/verify?event=${event.id}`}>
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          Open
                        </Link>
                      </Button>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input readOnly value={getVerifyLink(event.id)} />
                      <Button type="button" variant="outline" onClick={() => void copyVerifyLink(event.id)}>
                        <Copy className="mr-1.5 h-4 w-4" />
                        {copiedEventId === event.id ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ScanLine className="h-5 w-5 text-primary" />
          Ticket verifier
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Scan event tickets and confirm entry status quickly.</p>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Scanner</h2>
          <Badge variant="outline">Event verifier</Badge>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/80 bg-black/90">
          <video
            ref={videoRef}
            className="aspect-[3/4] w-full object-cover sm:aspect-video"
            muted
            playsInline
            autoPlay
            disablePictureInPicture
          />
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <div className="grid grid-cols-2 gap-2">
          <Button className="h-11" onClick={() => void startScanner()} disabled={cameraActive}>
            {cameraActive ? 'Scanner active' : 'Start camera'}
          </Button>
          <Button className="h-11" variant="outline" onClick={stopScanner} disabled={!cameraActive}>
            Stop camera
          </Button>
        </div>

        {cameraError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {cameraError}
          </div>
        ) : null}

        <details className="rounded-lg border border-border/70 p-3">
          <summary className="cursor-pointer text-sm font-medium">Manual QR entry</summary>
          <form className="mt-3 space-y-2" onSubmit={onManualSubmit}>
            <Input
              value={manualPayload}
              onChange={(event) => setManualPayload(event.target.value)}
              placeholder='Manual QR payload (example: {"ticketId":"..."})'
            />
            <Button className="h-11" type="submit" variant="outline" disabled={!manualPayload.trim() || isVerifying}>
              {isVerifying ? 'Verifying...' : 'Verify manually'}
            </Button>
          </form>
        </details>

        {scanError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {scanError}
          </div>
        ) : null}

      </div>

      {scanResult ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-xl sm:pb-5 ${
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
