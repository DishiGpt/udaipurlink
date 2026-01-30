
import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, Polyline, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Search, MapPin, X, Navigation, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../services/mockSocket';
import { UDAIPUR_ROUTES, MAP_CENTER } from '../shared/constants';
import { BusRoute, BusLocation } from '../shared/types';
import RideTimeline, { Stop } from './components/RideTimeline';

const STOPS_MOCK: Stop[] = [
  { name: "Surajpole", status: "passed", time: "10:00 AM" },
  { name: "Delhi Gate", status: "passed", time: "10:15 AM" },
  { name: "Chetak Circle", status: "current", time: "10:30 AM" },
  { name: "Sukhadia Circle", status: "upcoming", time: "10:45 AM" },
  { name: "Celebration Mall", status: "upcoming", time: "11:00 AM" }
];

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places", "geometry"];

const UserApp: React.FC = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries
  });

  const [activeBuses, setActiveBuses] = useState<Record<string, BusLocation>>({});
  const [search, setSearch] = useState("");
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>(MAP_CENTER);

  useEffect(() => {
    // Real Geolocation Implementation
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

    const handleLocationChange = (data: BusLocation) => {
      setActiveBuses(prev => ({ ...prev, [data.routeNumber]: data }));
    };
    socket.on('bus-location-changed', handleLocationChange);
    return () => socket.off('bus-location-changed', handleLocationChange);
  }, []);

  const filteredResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return UDAIPUR_ROUTES.filter(r =>
      r.stops.some(s => s.toLowerCase().includes(q)) ||
      r.routeNumber.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelectRoute = (route: BusRoute) => {
    setSelectedRoute(route);
    setIsTracking(true);
    setSearch("");
  };

  const mapOptions = {
    disableDefaultUI: true,
    styles: [
      { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
      { "featureType": "transit", "stylers": [{ "visibility": "off" }] }
    ]
  };

  if (!isLoaded) return <div className="h-screen w-full flex items-center justify-center bg-slate-50 font-bold text-slate-400">Loading Maps...</div>;

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 overflow-hidden relative">
      <div className={`transition-all duration-500 ease-in-out relative ${isTracking ? 'h-[60%]' : 'h-full'}`}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={isTracking && selectedRoute?.path.length ? selectedRoute.path[0] : userLocation}
          zoom={isTracking ? 15 : 14}
          options={mapOptions}
        >
          {selectedRoute && selectedRoute.path.length > 0 && (
            <Polyline
              path={selectedRoute.path}
              options={{ strokeColor: selectedRoute.color, strokeOpacity: 0.8, strokeWeight: 6 }}
            />
          )}

          {Object.values(activeBuses).map((bus: BusLocation) => (
            <Marker
              key={bus.routeNumber}
              position={{ lat: bus.lat, lng: bus.lng }}
              icon={{
                path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                scale: 1.5,
                fillColor: UDAIPUR_ROUTES.find(r => r.routeNumber === bus.routeNumber)?.color || '#2563eb',
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#ffffff',
                rotation: bus.heading || 0
              }}
            />
          ))}

          {/* User Blue Dot Marker */}
          <Marker
            position={userLocation}
            icon={{
              path: (window as any).google?.maps?.SymbolPath?.CIRCLE || 0,
              scale: 8,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeWeight: 4,
              strokeColor: 'rgba(59, 130, 246, 0.3)'
            }}
          />
        </GoogleMap>

        {isTracking && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setIsTracking(false)}
            className="absolute top-6 left-6 z-30 bg-white p-3 rounded-full shadow-xl border border-slate-100 text-slate-700"
          >
            <ArrowLeft size={24} />
          </motion.button>
        )}

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
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Udaipur City Bus Service</div>
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
            <RideTimeline stops={STOPS_MOCK} routeName={selectedRoute.routeNumber} destination={selectedRoute.destination} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserApp;
