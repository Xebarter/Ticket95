import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function EventGridSkeleton() {
    return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
                <Card key={index} className="overflow-hidden">
                    <CardContent className="p-0">
                        {/* Image skeleton */}
                        <Skeleton className="aspect-video w-full rounded-none" />

                        {/* Content skeleton */}
                        <div className="p-4 space-y-4">
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-6 w-1/2" />

                                <div className="flex items-center gap-2 pt-2">
                                    <Skeleton className="h-4 w-4 rounded-full" />
                                    <Skeleton className="h-4 w-24" />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-4 rounded-full" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                            </div>

                            {/* Ticket info skeleton */}
                            <div className="rounded-xl border p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-3 w-12" />
                                </div>
                                <Skeleton className="h-4 w-3/4 mb-3" />
                                <Skeleton className="h-11 w-full rounded-md" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}