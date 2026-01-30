import { Router, Request, Response } from 'express';
import BusRoute, { IBusRoute } from '../models/BusRoute';
import Driver, { IDriver } from '../models/Driver';
import Bus from '../models/Bus';

const router = Router();

// ============ ROUTES CRUD ============

// Get all routes
router.get('/routes', async (req: Request, res: Response) => {
    try {
        const routes = await BusRoute.find({ isActive: true }).sort({ routeNumber: 1 });
        res.json(routes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch routes' });
    }
});

// Get single route
router.get('/routes/:id', async (req: Request, res: Response) => {
    try {
        const route = await BusRoute.findById(req.params.id);
        if (!route) return res.status(404).json({ error: 'Route not found' });
        res.json(route);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch route' });
    }
});

// Create route
router.post('/routes', async (req: Request, res: Response) => {
    try {
        const route = new BusRoute(req.body);
        await route.save();
        res.status(201).json(route);
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Route number already exists' });
        }
        res.status(500).json({ error: 'Failed to create route' });
    }
});

// Update route
router.put('/routes/:id', async (req: Request, res: Response) => {
    try {
        const route = await BusRoute.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!route) return res.status(404).json({ error: 'Route not found' });
        res.json(route);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update route' });
    }
});

// Delete route (soft delete)
router.delete('/routes/:id', async (req: Request, res: Response) => {
    try {
        const route = await BusRoute.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );
        if (!route) return res.status(404).json({ error: 'Route not found' });
        res.json({ success: true, message: 'Route deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete route' });
    }
});

// ============ DRIVERS CRUD ============

// Get all drivers
router.get('/drivers', async (req: Request, res: Response) => {
    try {
        const drivers = await Driver.find().populate('assignedRoute').sort({ employeeId: 1 });
        res.json(drivers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch drivers' });
    }
});

// Get single driver by employeeId
router.get('/drivers/:employeeId', async (req: Request, res: Response) => {
    try {
        const driver = await Driver.findOne({ employeeId: req.params.employeeId }).populate('assignedRoute');
        if (!driver) return res.status(404).json({ error: 'Driver not found' });
        res.json(driver);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch driver' });
    }
});

// Create driver
router.post('/drivers', async (req: Request, res: Response) => {
    try {
        const driver = new Driver(req.body);
        await driver.save();
        res.status(201).json(driver);
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Employee ID already exists' });
        }
        res.status(500).json({ error: 'Failed to create driver' });
    }
});

// Update driver
router.put('/drivers/:employeeId', async (req: Request, res: Response) => {
    try {
        const driver = await Driver.findOneAndUpdate(
            { employeeId: req.params.employeeId },
            req.body,
            { new: true, runValidators: true }
        ).populate('assignedRoute');
        if (!driver) return res.status(404).json({ error: 'Driver not found' });
        res.json(driver);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update driver' });
    }
});

// Assign duty to driver
router.post('/drivers/:employeeId/assign', async (req: Request, res: Response) => {
    try {
        const { routeNumber } = req.body;
        const route = await BusRoute.findOne({ routeNumber });
        if (!route) return res.status(404).json({ error: 'Route not found' });

        const driver = await Driver.findOneAndUpdate(
            { employeeId: req.params.employeeId },
            { assignedRoute: route._id, status: 'Assigned' },
            { new: true }
        ).populate('assignedRoute');

        if (!driver) return res.status(404).json({ error: 'Driver not found' });
        res.json(driver);
    } catch (error) {
        res.status(500).json({ error: 'Failed to assign duty' });
    }
});

// ============ BUSES CRUD ============

// Get all buses
router.get('/buses', async (req: Request, res: Response) => {
    try {
        const buses = await Bus.find().populate('driver route');
        res.json(buses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch buses' });
    }
});

// Get live buses
router.get('/buses/live', async (req: Request, res: Response) => {
    try {
        const buses = await Bus.find({ isLive: true }).populate('driver route');
        res.json(buses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch live buses' });
    }
});

// Create bus
router.post('/buses', async (req: Request, res: Response) => {
    try {
        const bus = new Bus(req.body);
        await bus.save();
        res.status(201).json(bus);
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Vehicle number already exists' });
        }
        res.status(500).json({ error: 'Failed to create bus' });
    }
});

// Update bus location (used internally by socket handler)
router.put('/buses/:vehicleNumber/location', async (req: Request, res: Response) => {
    try {
        const { lat, lng, heading } = req.body;
        const bus = await Bus.findOneAndUpdate(
            { vehicleNumber: req.params.vehicleNumber },
            {
                currentLocation: { type: 'Point', coordinates: [lng, lat] },
                heading,
                lastUpdate: new Date(),
                isLive: true
            },
            { new: true }
        );
        if (!bus) return res.status(404).json({ error: 'Bus not found' });
        res.json(bus);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update bus location' });
    }
});

export default router;
