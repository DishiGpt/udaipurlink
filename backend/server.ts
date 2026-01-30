import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';
import Driver from './models/Driver';
import Bus from './models/Bus';
import BusRoute from './models/BusRoute';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Middleware
app.use(cors() as any);
app.use(express.json() as any);

// Root route for deployment health check
app.get('/', (req, res) => {
  res.send('UdaipurLink Backend is running!');
});

// API Routes
app.use('/api', apiRoutes);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/udaipurlink';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Track active drivers and their sockets
interface ActiveDriver {
  socketId: string;
  driverId: string;
  routeNumber: string;
  vehicleNumber: string;
  lat?: number;
  lng?: number;
}
const activeDrivers = new Map<string, ActiveDriver>();

// ============ SOCKET.IO REAL-TIME ENGINE ============

io.on('connection', (socket: Socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // --- DRIVER EVENTS ---

  // Driver joins a route room when starting duty
  socket.on('driver-start-duty', async (payload: {
    driverId: string;
    routeNumber: string;
    vehicleNumber: string;
  }) => {
    const { driverId, routeNumber, vehicleNumber } = payload;
    const roomName = `route_${routeNumber}`;

    socket.join(roomName);
    activeDrivers.set(socket.id, { socketId: socket.id, driverId, routeNumber, vehicleNumber });

    // Update driver status in DB
    try {
      await Driver.findOneAndUpdate(
        { employeeId: driverId },
        { status: 'OnDuty' }
      );

      // Update or create bus record
      await Bus.findOneAndUpdate(
        { vehicleNumber },
        { isLive: true, lastUpdate: new Date() },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error updating driver/bus status:', error);
    }

    console.log(`🚌 Driver ${driverId} started duty on Route ${routeNumber}, joined room: ${roomName}`);

    // Notify other clients in the room
    socket.to(roomName).emit('driver-online', { driverId, routeNumber, vehicleNumber });
  });

  // Driver sends location updates
  socket.on('driver-location-update', async (payload: {
    driverId: string;
    routeNumber: string;
    vehicleNumber?: string;
    lat: number;
    lng: number;
    heading?: number;
    isFull?: boolean;
    timestamp: number;
  }) => {
    const roomName = `route_${payload.routeNumber}`;

    // Update in-memory storage for immediate fleet overview for new passengers
    const driverInfo = activeDrivers.get(socket.id);
    if (driverInfo) {
      driverInfo.lat = payload.lat;
      driverInfo.lng = payload.lng;
    }

    // Broadcast to all passengers watching this route
    io.to(roomName).emit('bus-location-changed', {
      routeNumber: payload.routeNumber,
      driverId: payload.driverId,
      lat: payload.lat,
      lng: payload.lng,
      heading: payload.heading || 0,
      isFull: payload.isFull || false,
      timestamp: payload.timestamp
    });

    // Update bus location in DB (non-blocking)
    if (payload.vehicleNumber) {
      Bus.findOneAndUpdate(
        { vehicleNumber: payload.vehicleNumber },
        {
          currentLocation: { type: 'Point', coordinates: [payload.lng, payload.lat] },
          heading: payload.heading || 0,
          isFull: payload.isFull || false,
          isLive: true,
          lastUpdate: new Date()
        }
      ).catch(err => console.error('Error updating bus location:', err));
    }
  });

  // Driver ends duty
  socket.on('driver-end-duty', async (payload: { driverId: string; routeNumber: string }) => {
    const roomName = `route_${payload.routeNumber}`;
    const driverInfo = activeDrivers.get(socket.id);

    socket.leave(roomName);
    activeDrivers.delete(socket.id);

    // Update statuses in DB
    try {
      await Driver.findOneAndUpdate(
        { employeeId: payload.driverId },
        { status: 'Offline' }
      );

      if (driverInfo?.vehicleNumber) {
        await Bus.findOneAndUpdate(
          { vehicleNumber: driverInfo.vehicleNumber },
          { isLive: false }
        );
      }
    } catch (error) {
      console.error('Error updating driver/bus status:', error);
    }

    console.log(`🛑 Driver ${payload.driverId} ended duty on Route ${payload.routeNumber}`);

    // Notify passengers that this bus went offline
    io.to(roomName).emit('driver-offline', { driverId: payload.driverId, routeNumber: payload.routeNumber });
  });

  // --- PASSENGER EVENTS ---

  // Passenger subscribes to a route
  socket.on('passenger-join-route', (payload: { routeNumber: string }) => {
    const roomName = `route_${payload.routeNumber}`;
    socket.join(roomName);
    console.log(`👤 Passenger joined room: ${roomName}`);

    // Send current active drivers on this route (including their last known positions)
    const activeOnRoute = Array.from(activeDrivers.values())
      .filter(d => d.routeNumber === payload.routeNumber)
      .map(d => ({
        driverId: d.driverId,
        routeNumber: d.routeNumber,
        vehicleNumber: d.vehicleNumber,
        lat: d.lat,
        lng: d.lng
      }));
    socket.emit('active-buses-on-route', activeOnRoute);
  });

  // Passenger leaves a route
  socket.on('passenger-leave-route', (payload: { routeNumber: string }) => {
    const roomName = `route_${payload.routeNumber}`;
    socket.leave(roomName);
    console.log(`👤 Passenger left room: ${roomName}`);
  });

  // --- DISCONNECT HANDLING ---

  socket.on('disconnect', async () => {
    const driverInfo = activeDrivers.get(socket.id);

    if (driverInfo) {
      // Driver disconnected - update status
      try {
        await Driver.findOneAndUpdate(
          { employeeId: driverInfo.driverId },
          { status: 'Offline' }
        );
        await Bus.findOneAndUpdate(
          { vehicleNumber: driverInfo.vehicleNumber },
          { isLive: false }
        );
      } catch (error) {
        console.error('Error updating status on disconnect:', error);
      }

      // Notify passengers
      io.to(`route_${driverInfo.routeNumber}`).emit('driver-offline', {
        driverId: driverInfo.driverId,
        routeNumber: driverInfo.routeNumber
      });

      activeDrivers.delete(socket.id);
      console.log(`⚠️ Driver ${driverInfo.driverId} disconnected unexpectedly`);
    }

    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// ============ LEGACY ENDPOINTS (for backward compatibility) ============

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'udaipur2026') {
    return res.json({ token: 'mock-admin-token-2026', user: 'Admin' });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.get('/api/driver-check/:id', async (req, res) => {
  try {
    const driver = await Driver.findOne({ employeeId: req.params.id }).populate('assignedRoute');
    if (!driver) {
      return res.status(404).json({ error: 'Employee ID not recognized' });
    }
    res.json({
      name: driver.name,
      status: driver.status,
      routeNumber: (driver.assignedRoute as any)?.routeNumber || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check driver' });
  }
});

app.get('/api/my-duty', async (req, res) => {
  const { driverId } = req.query;
  try {
    const driver = await Driver.findOne({ employeeId: driverId as string }).populate('assignedRoute');
    if (!driver || !driver.assignedRoute) {
      return res.status(404).json({ error: 'No duty assigned' });
    }
    res.json({ routeNumber: (driver.assignedRoute as any).routeNumber });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch duty' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    activeDrivers: activeDrivers.size
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 UdaipurLink Mission Control Server running on port ${PORT}`);
});