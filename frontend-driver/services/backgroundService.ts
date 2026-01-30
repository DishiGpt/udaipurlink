// Background Location Service for Driver App
// Uses Visibility API and periodic wake-ups to maintain tracking

export interface LocationPayload {
    driverId: string;
    routeNumber: string;
    vehicleNumber: string;
    lat: number;
    lng: number;
    heading: number;
    isFull: boolean;
    timestamp: number;
}

type LocationCallback = (payload: LocationPayload) => void;

class BackgroundLocationService {
    private watchId: number | null = null;
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private isActive: boolean = false;
    private driverId: string = '';
    private routeNumber: string = '';
    private vehicleNumber: string = '';
    private lastLocation: { lat: number; lng: number; heading: number } | null = null;
    private onLocationUpdate: LocationCallback | null = null;
    private wakeLock: any = null;

    // Start background location tracking
    async startTracking(
        driverId: string,
        routeNumber: string,
        vehicleNumber: string,
        onUpdate: LocationCallback
    ): Promise<boolean> {
        if (this.isActive) {
            console.warn('Background tracking already active');
            return true;
        }

        this.driverId = driverId;
        this.routeNumber = routeNumber;
        this.vehicleNumber = vehicleNumber;
        this.onLocationUpdate = onUpdate;
        this.isActive = true;

        // Request wake lock to prevent screen sleep (if supported)
        await this.requestWakeLock();

        // Start geolocation watcher
        if ('geolocation' in navigator) {
            this.watchId = navigator.geolocation.watchPosition(
                (position) => {
                    this.lastLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        heading: position.coords.heading || 0
                    };
                },
                (error) => {
                    console.error('Geolocation error:', error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        }

        // Emit location every 5 seconds
        this.intervalId = setInterval(() => {
            this.emitCurrentLocation();
        }, 5000);

        // Initial emit
        this.emitCurrentLocation();

        // Handle visibility changes (when app goes to background)
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        console.log('🟢 Background location tracking started');
        return true;
    }

    // Stop background location tracking
    stopTracking(): void {
        this.isActive = false;

        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.releaseWakeLock();

        document.removeEventListener('visibilitychange', this.handleVisibilityChange);

        this.lastLocation = null;
        this.onLocationUpdate = null;

        console.log('🔴 Background location tracking stopped');
    }

    // Emit current location
    private emitCurrentLocation(): void {
        if (!this.isActive || !this.onLocationUpdate) return;

        if (this.lastLocation) {
            const payload: LocationPayload = {
                driverId: this.driverId,
                routeNumber: this.routeNumber,
                vehicleNumber: this.vehicleNumber,
                lat: this.lastLocation.lat,
                lng: this.lastLocation.lng,
                heading: this.lastLocation.heading,
                isFull: false,
                timestamp: Date.now()
            };
            this.onLocationUpdate(payload);
        } else {
            // If no real location, try to get one
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (this.onLocationUpdate) {
                        const payload: LocationPayload = {
                            driverId: this.driverId,
                            routeNumber: this.routeNumber,
                            vehicleNumber: this.vehicleNumber,
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            heading: position.coords.heading || 0,
                            isFull: false,
                            timestamp: Date.now()
                        };
                        this.onLocationUpdate(payload);
                    }
                },
                (error) => console.error('Failed to get location:', error),
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }
    }

    // Handle visibility changes (background/foreground)
    private handleVisibilityChange = (): void => {
        if (document.visibilityState === 'visible' && this.isActive) {
            console.log('App returned to foreground, resuming tracking');
            // Refresh wake lock
            this.requestWakeLock();
        } else if (document.visibilityState === 'hidden' && this.isActive) {
            console.log('App went to background, maintaining tracking...');
            // Force an immediate location update before going to background
            this.emitCurrentLocation();
        }
    };

    // Request screen wake lock (to prevent sleep during tracking)
    private async requestWakeLock(): Promise<void> {
        try {
            if ('wakeLock' in navigator && (navigator as any).wakeLock) {
                this.wakeLock = await (navigator as any).wakeLock.request('screen');
                console.log('🔒 Wake lock acquired');

                this.wakeLock.addEventListener('release', () => {
                    console.log('🔓 Wake lock released');
                });
            }
        } catch (error) {
            console.log('Wake lock not available:', error);
        }
    }

    // Release wake lock
    private releaseWakeLock(): void {
        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
        }
    }

    // Check if tracking is active
    isTrackingActive(): boolean {
        return this.isActive;
    }
}

// Singleton export
export const backgroundLocationService = new BackgroundLocationService();
