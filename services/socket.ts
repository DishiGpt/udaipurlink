import { io, Socket } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class SocketService {
    private socket: Socket;
    private isConnected: boolean = false;

    constructor() {
        this.socket = io(URL, {
            transports: ['websocket'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            this.isConnected = true;
            console.log('🔌 Socket connected');
        });

        this.socket.on('disconnect', () => {
            this.isConnected = false;
            console.log('🔌 Socket disconnected');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
    }

    // Get the raw socket for event handling
    getSocket(): Socket {
        return this.socket;
    }

    // Driver methods
    startDuty(driverId: string, routeNumber: string, vehicleNumber: string): void {
        this.socket.emit('driver-start-duty', { driverId, routeNumber, vehicleNumber });
    }

    endDuty(driverId: string, routeNumber: string): void {
        this.socket.emit('driver-end-duty', { driverId, routeNumber });
    }

    emitLocation(payload: {
        driverId: string;
        routeNumber: string;
        vehicleNumber?: string;
        lat: number;
        lng: number;
        heading?: number;
        isFull?: boolean;
        timestamp: number;
    }): void {
        this.socket.emit('driver-location-update', payload);
    }

    // Passenger methods
    joinRoute(routeNumber: string): void {
        this.socket.emit('passenger-join-route', { routeNumber });
    }

    leaveRoute(routeNumber: string): void {
        this.socket.emit('passenger-leave-route', { routeNumber });
    }

    // Event listeners
    onBusLocationChanged(callback: (data: any) => void): void {
        this.socket.on('bus-location-changed', callback);
    }

    offBusLocationChanged(callback?: (data: any) => void): void {
        this.socket.off('bus-location-changed', callback);
    }

    onDriverOnline(callback: (data: any) => void): void {
        this.socket.on('driver-online', callback);
    }

    onDriverOffline(callback: (data: any) => void): void {
        this.socket.on('driver-offline', callback);
    }

    onActiveBusesOnRoute(callback: (data: any[]) => void): void {
        this.socket.on('active-buses-on-route', callback);
    }

    // Connection status
    isSocketConnected(): boolean {
        return this.isConnected;
    }

    disconnect(): void {
        this.socket.disconnect();
    }
}

// Singleton instance
export const socketService = new SocketService();
export const socket = socketService.getSocket();
