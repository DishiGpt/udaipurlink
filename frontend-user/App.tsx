import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GoogleMap, Polyline, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Search, MapPin, Navigation, ArrowLeft, Wifi, WifiOff, Bus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { socketService } from '../services/socket';
import { BusRoute, BusLocation, Stop } from '../shared/types';
import RideTimeline from './components/RideTimeline';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const MAP_CENTER = { lat: 24.5854, lng: 73.7125 };
const PROXIMITY_THRESHOLD = 50; // meters

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places", "geometry"];

// Calculate distance between two points in meters using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const UserApp: React.FC = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries
  });

  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [search, setSearch] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>(MAP_CENTER);
  const [isConnected, setIsConnected] = useState(false);
  const [busOnline, setBusOnline] = useState(false);

  // Use ref for bus location to prevent re-renders
  const busLocationRef = useRef<BusLocation | null>(null);
  const busMarkerRef = useRef<google.maps.Marker | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Computed stops with status
  const [stopsWithStatus, setStopsWithStatus] = useState<Array<Stop & { status: 'passed' | 'current' | 'upcoming' }>>([]);

  // Fetch routes from API
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await fetch(`${API_URL}/api/routes`);
        const data = await response.json();
        setRoutes(data);
      } catch (error) {
        console.error('Failed to fetch routes:', error);
      }
    };
    fetchRoutes();
  }, []);

  // Get user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => console.log("Geolocation denied, using city center."),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Check connection status
  useEffect(() => {
    const checkConnection = setInterval(() => {
      setIsConnected(socketService.isSocketConnected());
    }, 1000);
    return () => clearInterval(checkConnection);
  }, []);

  // Update stops status based on bus location
  const updateStopsStatus = useCallback((busLat: number, busLng: number) => {
    if (!selectedRoute?.stops) return;

    let currentStopIndex = -1;
    let minDistance = Infinity;

    // Find nearest stop to bus
    selectedRoute.stops.forEach((stop, index) => {
      const distance = calculateDistance(
        busLat, busLng,
        stop.coordinates.lat, stop.coordinates.lng
      );
      if (distance < minDistance) {
        minDistance = distance;
        currentStopIndex = index;
      }
    });

    // Mark stops as passed, current, or upcoming
    const newStops = selectedRoute.stops.map((stop, index) => ({
      ...stop,
      status: index < currentStopIndex ? 'passed' as const :
        index === currentStopIndex && minDistance <= PROXIMITY_THRESHOLD ? 'current' as const :
          index === currentStopIndex ? 'current' as const :
            'upcoming' as const
    }));

    setStopsWithStatus(newStops);
  }, [selectedRoute]);

  // Handle bus location updates - update marker without re-render
  const handleBusLocationUpdate = useCallback((data: BusLocation) => {
    if (!selectedRoute || data.routeNumber !== selectedRoute.routeNumber) return;

    busLocationRef.current = data;
    setBusOnline(true);

    // If map is loaded, ensure marker exists and update it
    if (mapRef.current) {
      if (!busMarkerRef.current) {
        // Create marker if it doesn't exist yet
        busMarkerRef.current = new google.maps.Marker({
          map: mapRef.current,
          position: { lat: data.lat, lng: data.lng },
          icon: {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
            scale: 1.8,
            fillColor: selectedRoute?.color || '#2563eb',
            fillOpacity: 1,
            strokeWeight: 3,
            strokeColor: '#ffffff',
            anchor: new google.maps.Point(12, 22)
          },
          title: `Bus on Route ${selectedRoute?.routeNumber}`
        });
      } else {
        // Update existing marker position
        busMarkerRef.current.setPosition({ lat: data.lat, lng: data.lng });
      }
    }

    // Update stops status
    updateStopsStatus(data.lat, data.lng);
  }, [selectedRoute, updateStopsStatus]);

  // Socket subscription when tracking a route
  useEffect(() => {
    if (!isTracking || !selectedRoute) return;

    // Initialize stops with all upcoming
    if (selectedRoute.stops) {
      setStopsWithStatus(selectedRoute.stops.map(stop => ({
        ...stop,
        status: 'upcoming' as const
      })));
    }

    // Join the route room
    socketService.joinRoute(selectedRoute.routeNumber);

    // Listen for bus location updates
    socketService.onBusLocationChanged(handleBusLocationUpdate);

    // Listen for driver status
    socketService.onDriverOnline((data) => {
      if (data.routeNumber === selectedRoute.routeNumber) {
        setBusOnline(true);
      }
    });

    socketService.onDriverOffline((data) => {
      if (data.routeNumber === selectedRoute.routeNumber) {
        setBusOnline(false);
        busLocationRef.current = null;
      }
    });

    // Listen for initial active buses
    socketService.onActiveBusesOnRoute((buses) => {
      if (buses.length > 0) {
        setBusOnline(true);
        // If the bus data has location, update it immediately
        const firstBus = buses[0];
        if (firstBus.lat && firstBus.lng) {
          handleBusLocationUpdate({
            routeNumber: selectedRoute.routeNumber,
            lat: firstBus.lat,
            lng: firstBus.lng,
            timestamp: Date.now(),
            isFull: false
          });
        }
      }
    });

    return () => {
      // Leave the room when unmounting or changing route
      socketService.leaveRoute(selectedRoute.routeNumber);
      socketService.offBusLocationChanged(handleBusLocationUpdate);
      setBusOnline(false);
      busLocationRef.current = null;
    };
  }, [isTracking, selectedRoute, handleBusLocationUpdate]);

  const filteredResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return routes.filter(r =>
      r.stops.some(s => s.name.toLowerCase().includes(q)) ||
      r.routeNumber.toLowerCase().includes(q) ||
      r.destination.toLowerCase().includes(q) ||
      r.origin.toLowerCase().includes(q)
    );
  }, [search, routes]);

  const handleSelectRoute = (route: BusRoute) => {
    setSelectedRoute(route);
    setIsTracking(true);
    setSearch("");
  };

  const handleBackToSearch = () => {
    setIsTracking(false);
    setSelectedRoute(null);
  };

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Cleanup marker on unmount or route change
  useEffect(() => {
    return () => {
      if (busMarkerRef.current) {
        busMarkerRef.current.setMap(null);
        busMarkerRef.current = null;
      }
    };
  }, [selectedRoute]);

  const mapOptions = {
    disableDefaultUI: true,
    styles: [
      { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
      { "featureType": "transit", "stylers": [{ "visibility": "off" }] }
    ]
  };

  if (!isLoaded) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50 font-bold text-slate-400">
      Loading Maps...
    </div>
  );

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 overflow-hidden relative">
      {/* Connection Status Badge */}
      <div className={`absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
        {isConnected ? 'Connected' : 'Offline'}
      </div>

      <div className={`transition-all duration-500 ease-in-out relative ${isTracking ? 'h-[60%]' : 'h-full'}`}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={isTracking && selectedRoute?.path?.length ? selectedRoute.path[0] : userLocation}
          zoom={isTracking ? 15 : 14}
          options={mapOptions}
          onLoad={onMapLoad}
        >
          {/* Route Polyline */}
          {selectedRoute && selectedRoute.path && selectedRoute.path.length > 0 && (
            <Polyline
              path={selectedRoute.path}
              options={{ strokeColor: selectedRoute.color, strokeOpacity: 0.8, strokeWeight: 6 }}
            />
          )}

          {/* Stop Markers */}
          {isTracking && selectedRoute?.stops?.map((stop, index) => {
            const stopStatus = stopsWithStatus.find(s => s.name === stop.name);
            const isPassed = stopStatus?.status === 'passed';
            const isCurrent = stopStatus?.status === 'current';

            return (
              <Marker
                key={`stop-${index}`}
                position={stop.coordinates}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: isCurrent ? 12 : 8,
                  fillColor: isPassed ? '#94a3b8' : isCurrent ? '#22c55e' : selectedRoute.color,
                  fillOpacity: 1,
                  strokeWeight: 3,
                  strokeColor: '#ffffff'
                }}
                title={stop.name}
              />
            );
          })}

          {/* User Blue Dot Marker */}
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeWeight: 4,
              strokeColor: 'rgba(59, 130, 246, 0.3)'
            }}
            title="Your Location"
          />
        </GoogleMap>

        {/* Back Button */}
        {isTracking && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleBackToSearch}
            className="absolute top-6 left-6 z-30 bg-white p-3 rounded-full shadow-xl border border-slate-100 text-slate-700"
          >
            <ArrowLeft size={24} />
          </motion.button>
        )}

        {/* Bus Status Badge */}
        {isTracking && (
          <div className={`absolute bottom-6 left-6 z-30 flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-bold shadow-lg ${busOnline ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            <Bus size={18} />
            {busOnline ? 'Bus Live' : 'Waiting for Bus...'}
          </div>
        )}

        {/* Search UI */}
        {!isTracking && (
          <div className="absolute top-8 left-0 right-0 px-6 z-20">
            <div className="max-w-md mx-auto bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="flex items-center px-6 py-4 gap-4">
                <Search className="text-slate-400" size={24} />
                <input
                  className="flex-1 outline-none text-lg font-bold text-slate-800"
                  placeholder="Where to? (e.g. Amberi)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <AnimatePresence>
                {filteredResults.length > 0 && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-slate-50 bg-white">
                    {filteredResults.map(r => (
                      <button
                        key={r.routeNumber}
                        onClick={() => handleSelectRoute(r)}
                        className="w-full text-left px-8 py-5 flex items-center justify-between hover:bg-slate-50 border-b border-slate-50 last:border-0"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black" style={{ backgroundColor: r.color }}>{r.routeNumber}</div>
                          <div>
                            <div className="font-black text-slate-900 leading-tight">Towards {r.destination}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{r.stops.length} stops</div>
                          </div>
                        </div>
                        <Navigation className="text-blue-600" size={18} />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Timeline Panel */}
      <AnimatePresence>
        {isTracking && selectedRoute && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="h-[40%] w-full bg-white z-40 rounded-t-[40px] shadow-2xl border-t border-slate-50"
          >
            <div className="w-12 h-1 bg-slate-100 rounded-full mx-auto my-3" />
            <RideTimeline
              stops={stopsWithStatus.map(s => ({
                name: s.name,
                status: s.status,
                time: s.arrivalTime || ''
              }))}
              routeName={selectedRoute.routeNumber}
              destination={selectedRoute.destination}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserApp;
