import React, { useState, useEffect } from 'react';
import {
  Users, Map as MapIcon, LogOut,
  CheckCircle, LayoutDashboard, Settings as SettingsIcon,
  Activity, Bus, Navigation, AlertCircle, User, Route
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import RosterPage from './pages/Roster';
import LoginPage from './pages/Login';
import LiveMapPage from './pages/LiveMap';
import RoutesManagement from './pages/RoutesManagement';
import { BusRoute as BusRouteType } from '../shared/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface Driver {
  _id?: string;
  employeeId: string;
  name: string;
  status: string;
  assignedRoute?: any;
}

const AdminApp: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'live-map' | 'roster' | 'routes' | 'settings'>('dashboard');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<BusRouteType[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ buses: 0, routes: 0, drivers: 0, liveDrivers: 0 });

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]);

  const fetchData = async () => {
    try {
      const [driversRes, routesRes] = await Promise.all([
        fetch(`${API_URL}/api/drivers`),
        fetch(`${API_URL}/api/routes`)
      ]);

      const driversData = await driversRes.json();
      const routesData = await routesRes.json();

      setDrivers(driversData);
      setRoutes(routesData);

      setStats({
        buses: 50,
        routes: routesData.length,
        drivers: driversData.length,
        liveDrivers: driversData.filter((d: Driver) => d.status === 'OnDuty').length
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleLogin = async (creds: any) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds)
      });

      if (response.ok) {
        setIsLoggedIn(true);
      } else {
        alert('Credentials validation failed.');
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('Connection failed. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const assignDuty = async () => {
    if (!selectedDriver || !selectedRoute) return;

    try {
      const response = await fetch(`${API_URL}/api/drivers/${selectedDriver}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeNumber: selectedRoute })
      });

      if (response.ok) {
        setToast(`Operator ${selectedDriver} deployed to Route ${selectedRoute}`);
        fetchData();
        setTimeout(() => setToast(null), 4000);
      }
    } catch (error) {
      console.error('Failed to assign duty:', error);
    }

    setSelectedDriver(null);
    setSelectedRoute(null);
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} loading={loading} />;
  }

  return (
    <div className="h-full w-full bg-slate-100 flex font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-80 bg-slate-900 flex flex-col shrink-0 p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-16">
          <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-xl shadow-indigo-500/20">
            <Activity size={24} />
          </div>
          <h1 className="text-xl font-black text-white uppercase italic tracking-tighter">Track My Bus</h1>
        </div>

        <nav className="flex-1 space-y-3">
          <SidebarLink icon={<LayoutDashboard size={20} />} label="Dashboard" active={currentPage === 'dashboard'} onClick={() => setCurrentPage('dashboard')} />
          <SidebarLink icon={<Navigation size={20} />} label="Fleet Radar" active={currentPage === 'live-map'} onClick={() => setCurrentPage('live-map')} />
          <SidebarLink icon={<Route size={20} />} label="Routes Management" active={currentPage === 'routes'} onClick={() => setCurrentPage('routes')} />
          <SidebarLink icon={<Users size={20} />} label="Roster Registry" active={currentPage === 'roster'} onClick={() => setCurrentPage('roster')} />
          <SidebarLink icon={<SettingsIcon size={20} />} label="System Config" active={currentPage === 'settings'} onClick={() => setCurrentPage('settings')} />
        </nav>

        <button onClick={() => setIsLoggedIn(false)} className="mt-auto flex items-center gap-3 text-slate-500 hover:text-red-400 font-black text-[10px] uppercase tracking-widest transition-colors">
          <LogOut size={18} /> Terminate Session
        </button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white px-12 py-8 flex justify-between items-center shrink-0 border-b border-slate-100">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
              {currentPage === 'dashboard' ? 'Command Center' :
                currentPage === 'routes' ? 'Routes Management' :
                  currentPage.replace('-', ' ')}
            </h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Status: System Operational</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm font-black text-slate-900">Admin_Manager_01</div>
              <div className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Global Access</div>
            </div>
            <div className="w-14 h-14 bg-slate-100 rounded-[20px] border-2 border-white shadow-sm flex items-center justify-center text-slate-400">
              <User size={28} />
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-12 space-y-12 custom-scrollbar">
          {currentPage === 'dashboard' && (
            <>
              <section className="grid grid-cols-4 gap-8">
                <StatCard icon={<Bus className="text-blue-600" />} label="Total Assets" value="50" trend="+2 Active" />
                <StatCard icon={<Navigation className="text-indigo-600" />} label="Grid Sectors" value={stats.routes.toString()} trend="All Green" />
                <StatCard icon={<Users className="text-green-600" />} label="Operators" value={stats.drivers.toString()} trend={`${stats.liveDrivers} Live`} />
                <StatCard icon={<AlertCircle className="text-slate-400" />} label="Inhibitors" value="0" trend="No Threats" />
              </section>

              <div className="grid grid-cols-12 gap-10">
                <section className="col-span-8">
                  <RosterPage
                    drivers={drivers.map(d => ({
                      ...d,
                      id: d.employeeId,
                      routeNumber: d.assignedRoute?.routeNumber || null
                    })) as any}
                    minimal
                    onAssign={(id) => setSelectedDriver(id)}
                  />
                </section>

                <section className="col-span-4 bg-indigo-600 rounded-[48px] p-10 text-white shadow-[0_30px_60px_rgba(79,70,229,0.2)]">
                  <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter">Strategic Deployment</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 block">Operator</label>
                      <select
                        value={selectedDriver || ''}
                        onChange={e => setSelectedDriver(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 p-4 rounded-2xl outline-none font-bold text-white focus:bg-white/20 transition-all"
                      >
                        <option value="" disabled className="text-slate-900">Choose Personnel...</option>
                        {drivers.map(d => (
                          <option key={d.employeeId} value={d.employeeId} className="text-slate-900">{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 block">Duty Path</label>
                      <select
                        value={selectedRoute || ''}
                        onChange={e => setSelectedRoute(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 p-4 rounded-2xl outline-none font-bold text-white focus:bg-white/20 transition-all"
                      >
                        <option value="" disabled className="text-slate-900">Select Sector...</option>
                        {routes.map(r => (
                          <option key={r.routeNumber} value={r.routeNumber} className="text-slate-900">Route {r.routeNumber}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      disabled={!selectedDriver || !selectedRoute}
                      onClick={assignDuty}
                      className="w-full py-5 bg-white text-indigo-600 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-30 hover:shadow-xl active:scale-95 transition-all"
                    >
                      <Navigation size={20} /> Authorize Deployment
                    </button>
                  </div>
                </section>
              </div>
            </>
          )}

          {currentPage === 'live-map' && <LiveMapPage />}
          {currentPage === 'roster' && <RosterPage />}
          {currentPage === 'routes' && <RoutesManagement />}
          {currentPage === 'settings' && (
            <div className="p-16 bg-white rounded-[48px] border border-slate-100 shadow-sm text-center">
              <SettingsIcon size={64} className="mx-auto text-slate-200 mb-6" />
              <h2 className="text-2xl font-black text-slate-900 mb-8 uppercase">System Configurations</h2>
              <div className="max-w-xs mx-auto space-y-4">
                <button onClick={() => setIsLoggedIn(false)} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-100 active:scale-95 transition-all">Terminate Auth Token</button>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">v4.2.0 Stable Build</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-10 py-5 rounded-3xl flex items-center gap-4 shadow-2xl z-[100] border border-white/10">
            <div className="bg-green-500 p-2 rounded-xl"><CheckCircle size={20} /></div>
            <span className="font-bold text-sm tracking-tight">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SidebarLink = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'}`}>
    {icon} <span className="font-black text-sm uppercase tracking-tighter">{label}</span>
  </button>
);

const StatCard = ({ icon, label, value, trend }: any) => (
  <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex items-center gap-6">
    <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center text-3xl">{icon}</div>
    <div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-4xl font-black text-slate-900 tracking-tighter">{value}</div>
      <div className="text-[10px] font-bold text-indigo-500 uppercase mt-1">{trend}</div>
    </div>
  </div>
);

export default AdminApp;
