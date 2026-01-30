import React, { useState, useEffect, useRef } from 'react';
import { Power, Navigation, Activity, LogIn, Truck, CheckCircle, BusFront, MapPin, Wifi, WifiOff } from 'lucide-react';
import { socketService } from '../services/socket';
import { backgroundLocationService, LocationPayload } from './services/backgroundService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface DriverDuty {
  routeNumber: string;
  origin?: string;
  destination?: string;
}

const DriverApp: React.FC = () => {
  const [driverId, setDriverId] = useState(localStorage.getItem('driverId') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [assignedDuty, setAssignedDuty] = useState<DriverDuty | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationCount, setLocationCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const vehicleNumber = "RJ-27-PA-1234";

  // Check socket connection status
  useEffect(() => {
    const checkConnection = setInterval(() => {
      setIsConnected(socketService.isSocketConnected());
    }, 1000);
    return () => clearInterval(checkConnection);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // First check if driver exists and has duty
      const response = await fetch(`${API_URL}/api/drivers/${driverId.trim()}`);

      if (!response.ok) {
        // Driver not in DB, try legacy endpoint
        const legacyResponse = await fetch(`${API_URL}/api/driver-check/${driverId.trim()}`);
        if (!legacyResponse.ok) {
          throw new Error('Employee ID not recognized');
        }
        const data = await legacyResponse.json();
        if (data.routeNumber) {
          setAssignedDuty({ routeNumber: data.routeNumber });
        } else {
          throw new Error('No duty assigned to this employee');
        }
      } else {
        const driver = await response.json();
        if (driver.assignedRoute) {
          setAssignedDuty({
            routeNumber: driver.assignedRoute.routeNumber,
            origin: driver.assignedRoute.origin,
            destination: driver.assignedRoute.destination
          });
        } else {
          throw new Error('No duty assigned. Contact Depot Manager.');
        }
      }

      setIsLoggedIn(true);
      localStorage.setItem('driverId', driverId.trim());
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationUpdate = (payload: LocationPayload) => {
    socketService.emitLocation(payload);
    setLocationCount(prev => prev + 1);
    console.log(`📍 Location emitted: ${payload.lat.toFixed(6)}, ${payload.lng.toFixed(6)}`);
  };

  const startDuty = async () => {
    if (!assignedDuty) return;

    // Notify server that driver is starting duty
    socketService.startDuty(driverId, assignedDuty.routeNumber, vehicleNumber);

    // Start background location tracking
    const success = await backgroundLocationService.startTracking(
      driverId,
      assignedDuty.routeNumber,
      vehicleNumber,
      handleLocationUpdate
    );

    if (success) {
      setIsLive(true);
      setLocationCount(0);
    }
  };

  const stopDuty = () => {
    if (!assignedDuty) return;

    // Stop background tracking
    backgroundLocationService.stopTracking();

    // Notify server
    socketService.endDuty(driverId, assignedDuty.routeNumber);

    setIsLive(false);
  };

  const handleLogout = () => {
    if (isLive) stopDuty();
    setIsLoggedIn(false);
    setAssignedDuty(null);
    localStorage.removeItem('driverId');
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="h-full w-full bg-slate-50 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm text-center">
          <header className="mb-10">
            <div className="bg-orange-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-xl shadow-orange-200">
              <BusFront size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Track My Bus</h1>
            <p className="text-orange-600 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Captain Console</p>
          </header>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Employee ID</label>
              <input
                className="w-full bg-white border border-slate-200 h-14 px-6 rounded-2xl text-xl font-bold outline-none focus:border-orange-500 transition-all text-center"
                placeholder="EMP101"
                value={driverId}
                onChange={e => setDriverId(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !driverId.trim()}
              className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-lg uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? <Activity className="animate-spin" /> : <LogIn size={20} />}
              Authenticate
            </button>
          </form>

          {/* Connection Status */}
          <div className={`mt-6 flex items-center justify-center gap-2 text-xs font-bold ${isConnected ? 'text-green-600' : 'text-red-500'}`}>
            {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isConnected ? 'Server Connected' : 'Server Disconnected'}
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="h-full w-full bg-slate-50 flex flex-col p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-black text-slate-900">Captain Console</h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Employee: {driverId}</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase ${isLive ? 'border-green-500 text-green-600 bg-green-50' : 'border-slate-200 text-slate-400 bg-white'}`}>
          <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
          {isLive ? 'Transmitting' : 'Idle'}
        </div>
      </div>

      {/* Vehicle Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-6 flex items-center gap-4">
        <div className="bg-slate-100 p-3 rounded-2xl text-slate-600">
          <Truck size={24} />
        </div>
        <div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Vehicle</div>
          <div className="text-xl font-black text-slate-900 leading-none mt-1">{vehicleNumber}</div>
        </div>
      </div>

      {!isLive ? (
        /* Pre-Duty State */
        <div className="flex-1 flex flex-col justify-center space-y-6">
          <div className="bg-orange-600 rounded-[32px] p-8 text-white shadow-2xl shadow-orange-100 text-center">
            <p className="text-white/60 font-bold text-[10px] uppercase tracking-widest mb-2">Today's Mission</p>
            <h2 className="text-5xl font-black mb-2">Route {assignedDuty?.routeNumber}</h2>
            <p className="text-lg font-bold opacity-90 uppercase italic">
              {assignedDuty?.origin} → {assignedDuty?.destination || 'Destination'}
            </p>
          </div>

          <button
            onClick={startDuty}
            className="w-full h-14 rounded-2xl bg-slate-900 text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 text-xl font-black uppercase tracking-widest"
          >
            <Navigation size={24} /> Start Duty
          </button>

          <button onClick={handleLogout} className="text-slate-400 font-bold text-[10px] uppercase tracking-widest py-4">
            Logout Session
          </button>
        </div>
      ) : (
        /* On-Duty State */
        <div className="flex-1 flex flex-col justify-center space-y-8">
          <div className="text-center">
            <div className="w-24 h-24 bg-green-100 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-green-600">
              <Activity className="animate-pulse" size={48} />
            </div>
            <h2 className="text-4xl font-black text-slate-900">Broadcasting...</h2>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">Route {assignedDuty?.routeNumber} is now Live</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-100">
              <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Emissions</div>
              <div className="text-3xl font-black text-slate-900">{locationCount}</div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100">
              <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Interval</div>
              <div className="text-3xl font-black text-slate-900">5s</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3">
              <CheckCircle className="text-blue-600" size={20} />
              <span className="text-xs font-bold text-blue-900">GPS lock confirmed. Tracking active.</span>
            </div>

            <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center gap-3">
              <MapPin className="text-green-600" size={20} />
              <span className="text-xs font-bold text-green-900">Passengers can now see your location</span>
            </div>

            <button
              onClick={stopDuty}
              className="w-full h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-red-200 text-xl font-black uppercase tracking-widest"
            >
              <Power size={24} /> End Duty
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverApp;
