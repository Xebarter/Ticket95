'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getEventImages } from '@/lib/event-display';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Keyboard,
  MapPin,
  ScanLine,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useProfileData } from '../use-profile-data';
import {
  ProfileEmptyState,
  ProfileLoadingState,
  ProfilePageHeader,
  ProfileSection,
} from '@/components/profile/profile-ui';
import { VerifierSharePanel } from '@/components/verify/verifier-share-panel';

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

const formatEventWhen = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

function EventThumb({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted',
        className
      )}
    >
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" sizes="96px" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ScanLine className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}

export default function VerifyClient() {
  const searchParams = useSearchParams();
  const eventId = (searchParams.get('event') || '').trim();
  const { loading: loadingProfile, myEvents } = useProfileData();
  const [manualOpen, setManualOpen] = useState(false);

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

  const activeEvent = useMemo(
    () => myEvents.find((event) => event.id === eventId) ?? null,
    [myEvents, eventId]
  );
  const activeEventImage = activeEvent ? getEventImages(activeEvent)[0] : undefined;

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
        credentials: 'include',
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
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
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
        credentials: 'include',
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

  if (!eventId) {
    return (
      <div className="space-y-5">
        <ProfilePageHeader
          title="Verify"
          description="Share an installable door verifier with your team, or scan tickets yourself."
        />

        {loadingProfile ? (
          <ProfileLoadingState />
        ) : myEvents.length === 0 ? (
          <ProfileEmptyState
            icon={ScanLine}
            title="No events to verify"
            description="Create an event first, then use this page to scan tickets at entry."
            action={
              <Button asChild className="rounded-xl">
                <Link href="/organizer/dashboard/create">Create event</Link>
              </Button>
            }
          />
        ) : (
          <ProfileSection
            title="Your events"
            description="Share the installable verifier with door staff, or scan yourself."
          >
            <div className="space-y-4">
              {myEvents.map((event) => {
                const image = getEventImages(event)[0];
                return (
                  <article
                    key={event.id}
                    className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
                  >
                    <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                      <EventThumb
                        src={image}
                        alt=""
                        className="h-[4.5rem] w-[4.5rem] sm:h-24 sm:w-24"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight sm:text-base">
                          {event.name}
                        </h3>
                        <div className="mt-1.5 space-y-1 text-xs text-muted-foreground sm:text-[13px]">
                          {event.date ? (
                            <p className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{formatEventWhen(event.date)}</span>
                            </p>
                          ) : null}
                          {event.venue ? (
                            <p className="inline-flex min-w-0 items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{event.venue}</span>
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border/60 bg-muted/10 p-3 sm:px-4">
                      <VerifierSharePanel eventId={event.id} eventName={event.name} />
                    </div>

                    <div className="border-t border-border/60 bg-muted/20 p-3 sm:flex sm:justify-end sm:px-4">
                      <Button asChild className="h-11 w-full rounded-xl sm:h-9 sm:w-auto">
                        <Link href={`/profile/verify?event=${event.id}`}>
                          <ScanLine className="mr-1.5 h-4 w-4" />
                          Scan as organizer
                        </Link>
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </ProfileSection>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0a0e1a] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0e1a]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0a0e1a]/85">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/profile/verify" aria-label="Back to event list">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>

          <EventThumb
            src={activeEventImage}
            alt=""
            className="h-12 w-12 rounded-lg border-white/15 sm:h-14 sm:w-14"
          />

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4b46a]">
              Door verify
            </p>
            <h1 className="truncate text-base font-semibold leading-tight sm:text-lg">
              {activeEvent?.name || (loadingProfile ? 'Loading event…' : 'Event scanner')}
            </h1>
            {activeEvent?.venue ? (
              <p className="truncate text-xs text-slate-400">{activeEvent.venue}</p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pt-4">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-lg">
          <video
            ref={videoRef}
            className="aspect-[3/4] w-full bg-black object-cover sm:aspect-[4/3]"
            muted
            playsInline
            autoPlay
            disablePictureInPicture
          />

          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_32%,rgba(0,0,0,0.45)_100%)]" />
            <div className="absolute left-1/2 top-1/2 h-[42%] w-[58%] max-w-[16rem] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.28)]" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-10">
              <p className="text-center text-sm font-medium text-white/90">
                {isVerifying
                  ? 'Checking ticket…'
                  : cameraActive
                    ? 'Align the QR code in the frame'
                    : 'Camera ready when you start scanning'}
              </p>
            </div>
          </div>

          {cameraActive ? (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Live
            </span>
          ) : null}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <div className="grid grid-cols-2 gap-2">
          <Button
            className="h-12 rounded-xl bg-white text-slate-900 hover:bg-white/90"
            onClick={() => void startScanner()}
            disabled={cameraActive || isVerifying}
          >
            <ScanLine className="mr-1.5 h-4 w-4" />
            {cameraActive ? 'Scanning' : 'Start camera'}
          </Button>
          <Button
            className="h-12 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/15"
            variant="outline"
            onClick={stopScanner}
            disabled={!cameraActive}
          >
            Stop
          </Button>
        </div>

        {cameraError ? (
          <div className="rounded-xl border border-red-400/30 bg-red-500/15 px-3 py-3 text-sm text-red-100">
            {cameraError}
          </div>
        ) : null}

        {scanError ? (
          <div className="rounded-xl border border-red-400/30 bg-red-500/15 px-3 py-3 text-sm text-red-100">
            {scanError}
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-white/5">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
            onClick={() => setManualOpen((open) => !open)}
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <Keyboard className="h-4 w-4 text-slate-300" />
              Manual QR entry
            </span>
            <span className="text-xs text-slate-400">{manualOpen ? 'Hide' : 'Show'}</span>
          </button>
          {manualOpen ? (
            <form className="space-y-2 border-t border-white/10 px-4 pb-4 pt-3" onSubmit={onManualSubmit}>
              <Input
                value={manualPayload}
                onChange={(event) => setManualPayload(event.target.value)}
                placeholder="Paste ticket QR payload"
                className="h-11 rounded-xl border-white/15 bg-black/40 text-white placeholder:text-slate-500"
              />
              <Button
                className="h-11 w-full rounded-xl"
                type="submit"
                variant="secondary"
                disabled={!manualPayload.trim() || isVerifying}
              >
                {isVerifying ? 'Verifying…' : 'Verify manually'}
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      {scanResult ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 sm:items-center sm:p-4">
          <div
            className={cn(
              'w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl sm:rounded-2xl',
              scanResult.valid
                ? 'border-emerald-400/30 bg-[#0f2a1f] text-emerald-50'
                : 'border-red-400/30 bg-[#2a1216] text-red-50'
            )}
          >
            {activeEventImage ? (
              <div className="relative h-28 w-full sm:h-32">
                <Image
                  src={activeEventImage}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 448px) 100vw, 448px"
                />
                <div
                  className={cn(
                    'absolute inset-0',
                    scanResult.valid
                      ? 'bg-gradient-to-t from-[#0f2a1f] via-[#0f2a1f]/70 to-black/20'
                      : 'bg-gradient-to-t from-[#2a1216] via-[#2a1216]/70 to-black/20'
                  )}
                />
              </div>
            ) : null}

            <div className="space-y-4 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 sm:pb-5">
              <div className="flex items-start gap-3">
                {scanResult.valid ? (
                  <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-emerald-300" />
                ) : scanResult.reason === 'wrong_event' ? (
                  <ShieldAlert className="mt-0.5 h-7 w-7 shrink-0 text-amber-300" />
                ) : (
                  <XCircle className="mt-0.5 h-7 w-7 shrink-0 text-red-300" />
                )}
                <div className="min-w-0 space-y-1">
                  <p className="text-lg font-semibold leading-snug">{scanResult.message}</p>
                  {activeEvent?.name ? (
                    <p className="truncate text-sm opacity-80">{activeEvent.name}</p>
                  ) : null}
                  {scanResult.ticket?.ticketTypeName ? (
                    <p className="text-sm opacity-90">
                      Type: {scanResult.ticket.ticketTypeName}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {scanResult.valid && scanResult.canMarkUsed ? (
                  <Button
                    className="h-14 w-full rounded-xl text-base font-semibold tracking-wide shadow-md"
                    onClick={() => void markAsUsed()}
                    disabled={isMarkingUsed}
                  >
                    {isMarkingUsed ? 'Marking…' : 'Mark as used'}
                  </Button>
                ) : (
                  <Button
                    className="h-14 w-full rounded-xl text-base font-semibold tracking-wide opacity-70"
                    disabled
                  >
                    Mark as used
                  </Button>
                )}
                <Button
                  className="h-14 w-full rounded-xl border-2 border-red-300/60 bg-red-600 text-base font-semibold tracking-wide text-white shadow-md hover:bg-red-700"
                  variant="outline"
                  onClick={() => void cancelScanDecision()}
                  disabled={isMarkingUsed}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
