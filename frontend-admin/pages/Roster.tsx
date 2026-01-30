import React, { useState, useEffect } from 'react';
import { Users, MoreHorizontal, UserCheck, ShieldAlert, RefreshCw, Plus, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface Driver {
  _id?: string;
  employeeId: string;
  name: string;
  phone?: string;
  status: 'Offline' | 'Assigned' | 'OnDuty';
  assignedRoute?: {
    _id: string;
    routeNumber: string;
    destination: string;
  };
}

interface RosterProps {
  drivers?: Driver[];
  minimal?: boolean;
  onAssign?: (id: string) => void;
}

const RosterPage: React.FC<RosterProps> = ({ drivers: propDrivers, minimal = false, onAssign }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDriver, setNewDriver] = useState({ employeeId: '', name: '', phone: '' });

  useEffect(() => {
    if (propDrivers) {
      // Map old format to new format if needed
      const mappedDrivers = propDrivers.map(d => ({
        ...d,
        employeeId: (d as any).id || d.employeeId,
        status: d.status as 'Offline' | 'Assigned' | 'OnDuty'
      }));
      setDrivers(mappedDrivers);
      setLoading(false);
    } else {
      fetchDrivers();
    }
  }, [propDrivers]);

  const fetchDrivers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/drivers`);
      const data = await response.json();
      setDrivers(data);
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDriver)
      });
      if (response.ok) {
        fetchDrivers();
        setShowAddModal(false);
        setNewDriver({ employeeId: '', name: '', phone: '' });
      }
    } catch (error) {
      console.error('Failed to add driver:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OnDuty': return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
      case 'Assigned': return 'bg-amber-400';
      default: return 'bg-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className={`${minimal ? '' : 'bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm'}`}>
      {!minimal && (
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <Users className="text-indigo-600" size={32} /> Roster Registry
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 ml-1">
              {drivers.length} Personnel Registered
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchDrivers}
              className="bg-slate-50 p-3 rounded-2xl text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700"
            >
              <Plus size={18} /> Add Driver
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
              <th className="py-5 px-4">Operator Name</th>
              <th className="py-5 px-4">Employee ID</th>
              <th className="py-5 px-4">Phone</th>
              <th className="py-5 px-4">Duty Sector</th>
              <th className="py-5 px-4">Relay Status</th>
              {onAssign && <th className="py-5 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {drivers.map(driver => (
              <tr key={driver.employeeId} className="group hover:bg-slate-50/50 transition-colors">
                <td className="py-6 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                      <UserCheck size={18} />
                    </div>
                    <span className="font-black text-slate-800">{driver.name}</span>
                  </div>
                </td>
                <td className="py-6 px-4 text-slate-400 font-mono text-xs">{driver.employeeId}</td>
                <td className="py-6 px-4 text-slate-500 text-sm">{driver.phone || '-'}</td>
                <td className="py-6 px-4">
                  {driver.assignedRoute ? (
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                        Route {driver.assignedRoute.routeNumber}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-300 italic text-[10px] font-bold uppercase flex items-center gap-1">
                      <ShieldAlert size={12} /> Unassigned
                    </span>
                  )}
                </td>
                <td className="py-6 px-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(driver.status)}`} />
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-tight">{driver.status}</span>
                  </div>
                </td>
                {onAssign && (
                  <td className="py-6 px-4 text-right">
                    <button
                      onClick={() => onAssign(driver.employeeId)}
                      className="bg-slate-900 text-white text-[10px] px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all opacity-0 group-hover:opacity-100"
                    >
                      Deploy
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Driver Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <motion.form
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onSubmit={handleAddDriver}
              className="bg-white rounded-3xl p-8 w-full max-w-md space-y-6"
            >
              <h3 className="text-xl font-black text-slate-900">Add New Driver</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase block mb-2">Employee ID</label>
                  <input
                    type="text"
                    value={newDriver.employeeId}
                    onChange={e => setNewDriver(prev => ({ ...prev, employeeId: e.target.value.toUpperCase() }))}
                    className="w-full p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-indigo-500"
                    placeholder="EMP106"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase block mb-2">Full Name</label>
                  <input
                    type="text"
                    value={newDriver.name}
                    onChange={e => setNewDriver(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-indigo-500"
                    placeholder="Driver Name"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase block mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={newDriver.phone}
                    onChange={e => setNewDriver(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full p-4 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold"
                >
                  Add Driver
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RosterPage;
