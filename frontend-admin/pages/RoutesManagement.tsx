import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Save, MapPin, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BusRoute, Stop } from '../../shared/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const RoutesManagement: React.FC = () => {
    const [routes, setRoutes] = useState<BusRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingRoute, setEditingRoute] = useState<BusRoute | null>(null);
    const [expandedRoute, setExpandedRoute] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        routeNumber: '',
        origin: '',
        destination: '',
        color: '#2563eb',
        stops: [] as Stop[]
    });

    const [newStop, setNewStop] = useState({
        name: '',
        lat: '',
        lng: '',
        arrivalTime: ''
    });

    useEffect(() => {
        fetchRoutes();
    }, []);

    const fetchRoutes = async () => {
        try {
            const response = await fetch(`${API_URL}/api/routes`);
            const data = await response.json();
            setRoutes(data);
        } catch (error) {
            console.error('Failed to fetch routes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const routeData = {
            ...formData,
            path: formData.stops.map(s => s.coordinates)
        };

        try {
            const url = editingRoute
                ? `${API_URL}/api/routes/${editingRoute._id}`
                : `${API_URL}/api/routes`;

            const response = await fetch(url, {
                method: editingRoute ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(routeData)
            });

            if (response.ok) {
                fetchRoutes();
                resetForm();
            }
        } catch (error) {
            console.error('Failed to save route:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this route?')) return;

        try {
            const response = await fetch(`${API_URL}/api/routes/${id}`, { method: 'DELETE' });
            if (response.ok) {
                fetchRoutes();
            }
        } catch (error) {
            console.error('Failed to delete route:', error);
        }
    };

    const handleEdit = (route: BusRoute) => {
        setEditingRoute(route);
        setFormData({
            routeNumber: route.routeNumber,
            origin: route.origin,
            destination: route.destination,
            color: route.color,
            stops: route.stops
        });
        setShowForm(true);
    };

    const addStop = () => {
        if (!newStop.name || !newStop.lat || !newStop.lng) return;

        const stop: Stop = {
            name: newStop.name,
            coordinates: { lat: parseFloat(newStop.lat), lng: parseFloat(newStop.lng) },
            arrivalTime: newStop.arrivalTime,
            order: formData.stops.length
        };

        setFormData(prev => ({ ...prev, stops: [...prev.stops, stop] }));
        setNewStop({ name: '', lat: '', lng: '', arrivalTime: '' });
    };

    const removeStop = (index: number) => {
        setFormData(prev => ({
            ...prev,
            stops: prev.stops.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }))
        }));
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingRoute(null);
        setFormData({ routeNumber: '', origin: '', destination: '', color: '#2563eb', stops: [] });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase">Routes Registry</h2>
                    <p className="text-slate-400 text-sm">{routes.length} routes configured</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all"
                >
                    <Plus size={18} /> Add Route
                </button>
            </div>

            {/* Routes List */}
            <div className="space-y-4">
                {routes.map(route => (
                    <motion.div
                        key={route._id}
                        layout
                        className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm"
                    >
                        <div
                            className="p-6 flex items-center justify-between cursor-pointer"
                            onClick={() => setExpandedRoute(expandedRoute === route._id ? null : route._id || null)}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl"
                                    style={{ backgroundColor: route.color }}
                                >
                                    {route.routeNumber}
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-lg">{route.origin} → {route.destination}</h3>
                                    <p className="text-slate-400 text-sm">{route.stops.length} stops</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(route); }}
                                    className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 transition-all"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(route._id!); }}
                                    className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                                {expandedRoute === route._id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </div>

                        <AnimatePresence>
                            {expandedRoute === route._id && (
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden border-t border-slate-100"
                                >
                                    <div className="p-6 bg-slate-50 grid grid-cols-3 gap-4">
                                        {route.stops.map((stop, idx) => (
                                            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <MapPin size={14} className="text-indigo-600" />
                                                    <span className="font-bold text-slate-900">{stop.name}</span>
                                                </div>
                                                <div className="text-xs text-slate-400 space-y-1">
                                                    <div>Lat: {stop.coordinates.lat.toFixed(4)}, Lng: {stop.coordinates.lng.toFixed(4)}</div>
                                                    {stop.arrivalTime && (
                                                        <div className="flex items-center gap-1">
                                                            <Clock size={12} /> {stop.arrivalTime}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>

            {/* Add/Edit Form Modal */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                                <h3 className="text-xl font-black text-slate-900">
                                    {editingRoute ? 'Edit Route' : 'Add New Route'}
                                </h3>
                                <button onClick={resetForm} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase block mb-2">Route Number</label>
                                        <input
                                            type="text"
                                            value={formData.routeNumber}
                                            onChange={e => setFormData(prev => ({ ...prev, routeNumber: e.target.value }))}
                                            className="w-full p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-indigo-500"
                                            placeholder="e.g., 11"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase block mb-2">Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={formData.color}
                                                onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                                className="w-14 h-14 rounded-xl cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={formData.color}
                                                onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                                                className="flex-1 p-4 rounded-xl border border-slate-200 font-mono outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase block mb-2">Origin</label>
                                        <input
                                            type="text"
                                            value={formData.origin}
                                            onChange={e => setFormData(prev => ({ ...prev, origin: e.target.value }))}
                                            className="w-full p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-indigo-500"
                                            placeholder="Starting point"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase block mb-2">Destination</label>
                                        <input
                                            type="text"
                                            value={formData.destination}
                                            onChange={e => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                                            className="w-full p-4 rounded-xl border border-slate-200 font-bold outline-none focus:border-indigo-500"
                                            placeholder="End point"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Stops Section */}
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase block mb-4">
                                        Stops ({formData.stops.length})
                                    </label>

                                    {/* Existing Stops */}
                                    <div className="space-y-2 mb-4">
                                        {formData.stops.map((stop, idx) => (
                                            <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
                                                <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                    {idx + 1}
                                                </span>
                                                <span className="flex-1 font-bold text-slate-900">{stop.name}</span>
                                                <span className="text-xs text-slate-400">
                                                    {stop.coordinates.lat.toFixed(4)}, {stop.coordinates.lng.toFixed(4)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeStop(idx)}
                                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add New Stop */}
                                    <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <input
                                                type="text"
                                                value={newStop.name}
                                                onChange={e => setNewStop(prev => ({ ...prev, name: e.target.value }))}
                                                className="p-3 rounded-xl border border-slate-200 font-bold outline-none focus:border-indigo-500"
                                                placeholder="Stop name"
                                            />
                                            <input
                                                type="text"
                                                value={newStop.arrivalTime}
                                                onChange={e => setNewStop(prev => ({ ...prev, arrivalTime: e.target.value }))}
                                                className="p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                                                placeholder="Arrival time (e.g., 6:30 AM)"
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <input
                                                type="number"
                                                step="any"
                                                value={newStop.lat}
                                                onChange={e => setNewStop(prev => ({ ...prev, lat: e.target.value }))}
                                                className="p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                                                placeholder="Latitude"
                                            />
                                            <input
                                                type="number"
                                                step="any"
                                                value={newStop.lng}
                                                onChange={e => setNewStop(prev => ({ ...prev, lng: e.target.value }))}
                                                className="p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                                                placeholder="Longitude"
                                            />
                                            <button
                                                type="button"
                                                onClick={addStop}
                                                className="bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700"
                                            >
                                                <Plus size={18} /> Add Stop
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                                >
                                    <Save size={18} /> {editingRoute ? 'Update Route' : 'Create Route'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RoutesManagement;
