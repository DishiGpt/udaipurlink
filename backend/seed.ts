import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Driver from './models/Driver';
import BusRoute from './models/BusRoute';
import Bus from './models/Bus';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/udaipurlink';

// Udaipur coordinates for stops
const UDAIPUR_STOPS: Record<string, { lat: number; lng: number }> = {
  "Badgaon": { lat: 24.6321, lng: 73.6789 },
  "Syphon": { lat: 24.6100, lng: 73.6900 },
  "Fatehpura": { lat: 24.5980, lng: 73.7020 },
  "Chetak Circle": { lat: 24.5779, lng: 73.6851 },
  "Delhi Gate": { lat: 24.5774, lng: 73.6976 },
  "Surajpole": { lat: 24.5820, lng: 73.7100 },
  "Sector 4": { lat: 24.5650, lng: 73.7250 },
  "Sector 6": { lat: 24.5580, lng: 73.7300 },
  "Titardi": { lat: 24.5500, lng: 73.7350 },
  "Rampura Circle": { lat: 24.5950, lng: 73.6700 },
  "Malla Talai": { lat: 24.5850, lng: 73.6750 },
  "Radaji Circle": { lat: 24.5800, lng: 73.6800 },
  "Thokar Chouraha": { lat: 24.5700, lng: 73.7400 },
  "Debari": { lat: 24.5550, lng: 73.7600 },
  "Dabok Airport": { lat: 24.6180, lng: 73.8960 },
  "City Railway Station": { lat: 24.5780, lng: 73.7320 },
  "Udaipole": { lat: 24.5830, lng: 73.7050 },
  "Sukhadia Circle": { lat: 24.5890, lng: 73.6620 },
  "Celebration Mall": { lat: 24.5850, lng: 73.6450 },
  "Bhuwana": { lat: 24.5750, lng: 73.6300 },
  "Amberi": { lat: 24.5600, lng: 73.6100 },
  "Balicha": { lat: 24.5400, lng: 73.7200 },
  "Goverdhan Vilas": { lat: 24.5550, lng: 73.7100 },
  "Paras Circle": { lat: 24.5700, lng: 73.7000 },
  "Panchwati": { lat: 24.6000, lng: 73.6550 },
  "Bedla": { lat: 24.6200, lng: 73.6400 },
  "Savina Krishi Mandi": { lat: 24.5300, lng: 73.7100 },
  "Sector 9": { lat: 24.5450, lng: 73.7150 },
  "Hiran Magri": { lat: 24.5600, lng: 73.7080 },
  "Sevashram": { lat: 24.5750, lng: 73.7150 },
  "Mohta Park": { lat: 24.5869, lng: 73.6785 },
  "Fatehsagar": { lat: 24.6060, lng: 73.6620 },
  "Sector 3": { lat: 24.5520, lng: 73.7200 },
  "Bansal Cinema": { lat: 24.5800, lng: 73.7080 },
  "Hathipole": { lat: 24.5765, lng: 73.6920 },
  "City Palace": { lat: 24.5764, lng: 73.6913 },
  "Jagdish Temple": { lat: 24.5780, lng: 73.6907 },
  "Miraj Mall": { lat: 24.5920, lng: 73.6580 },
  "Ayad Puliya": { lat: 24.5700, lng: 73.7280 },
  "Pratap Nagar": { lat: 24.5620, lng: 73.7380 },
  "Reti Stand": { lat: 24.5680, lng: 73.7050 },
  "Shilpgram": { lat: 24.6100, lng: 73.6650 },
  "Sector 5": { lat: 24.5550, lng: 73.7270 },
  "Satellite Hospital": { lat: 24.5580, lng: 73.7180 }
};

const ROUTES_DATA = [
  {
    routeNumber: "1",
    origin: "Badgaon",
    destination: "Titardi",
    color: "#22c55e",
    stopNames: ["Badgaon", "Syphon", "Fatehpura", "Chetak Circle", "Delhi Gate", "Surajpole", "Sector 4", "Sector 6", "Titardi"]
  },
  {
    routeNumber: "2",
    origin: "Rampura Circle",
    destination: "Dabok Airport",
    color: "#3b82f6",
    stopNames: ["Rampura Circle", "Malla Talai", "Radaji Circle", "Chetak Circle", "Delhi Gate", "Surajpole", "Thokar Chouraha", "Debari", "Dabok Airport"]
  },
  {
    routeNumber: "3",
    origin: "City Railway Station",
    destination: "Amberi",
    color: "#f97316",
    stopNames: ["City Railway Station", "Udaipole", "Surajpole", "Delhi Gate", "Chetak Circle", "Sukhadia Circle", "Celebration Mall", "Bhuwana", "Amberi"]
  },
  {
    routeNumber: "4",
    origin: "Balicha",
    destination: "Bedla",
    color: "#ef4444",
    stopNames: ["Balicha", "Goverdhan Vilas", "Paras Circle", "Udaipole", "Delhi Gate", "Chetak Circle", "Panchwati", "Bedla"]
  },
  {
    routeNumber: "5",
    origin: "Savina Krishi Mandi",
    destination: "Fatehsagar",
    color: "#a855f7",
    stopNames: ["Savina Krishi Mandi", "Sector 9", "Hiran Magri", "Sevashram", "Surajpole", "Delhi Gate", "Chetak Circle", "Mohta Park", "Fatehsagar"]
  },
  {
    routeNumber: "6",
    origin: "Titardi",
    destination: "Chetak Circle",
    color: "#ec4899",
    stopNames: ["Titardi", "Sector 3", "Sevashram", "Bansal Cinema", "Delhi Gate", "Chetak Circle"]
  },
  {
    routeNumber: "7",
    origin: "Bhuwana",
    destination: "Jagdish Temple",
    color: "#eab308",
    stopNames: ["Bhuwana", "Celebration Mall", "Sukhadia Circle", "Hathipole", "Delhi Gate", "City Palace", "Jagdish Temple"]
  },
  {
    routeNumber: "8",
    origin: "Miraj Mall",
    destination: "Pratap Nagar",
    color: "#14b8a6",
    stopNames: ["Miraj Mall", "Sukhadia Circle", "Chetak Circle", "Delhi Gate", "Surajpole", "Ayad Puliya", "Pratap Nagar"]
  },
  {
    routeNumber: "9",
    origin: "Reti Stand",
    destination: "Shilpgram",
    color: "#6366f1",
    stopNames: ["Reti Stand", "Paras Circle", "Udaipole", "Delhi Gate", "Chetak Circle", "Malla Talai", "Shilpgram"]
  },
  {
    routeNumber: "10",
    origin: "Sector 3",
    destination: "Sector 3 (Loop)",
    color: "#84cc16",
    stopNames: ["Sector 3", "Sector 4", "Sector 5", "Sector 6", "Satellite Hospital", "Sevashram", "Sector 3"]
  }
];

const DRIVERS_DATA = [
  { employeeId: 'EMP101', name: 'Ramesh Kumar', phone: '9876543101', status: 'Offline' as const },
  { employeeId: 'EMP102', name: 'Suresh Singh', phone: '9876543102', status: 'Offline' as const },
  { employeeId: 'EMP103', name: 'Mukesh Sharma', phone: '9876543103', status: 'Offline' as const },
  { employeeId: 'EMP104', name: 'Dinesh Patel', phone: '9876543104', status: 'Offline' as const },
  { employeeId: 'EMP105', name: 'Vikram Singh', phone: '9876543105', status: 'Offline' as const },
  { employeeId: 'EMP106', name: 'Rajesh Meena', phone: '9876543106', status: 'Offline' as const },
  { employeeId: 'EMP107', name: 'Mahesh Jain', phone: '9876543107', status: 'Offline' as const },
  { employeeId: 'EMP108', name: 'Ganesh Verma', phone: '9876543108', status: 'Offline' as const },
];

const BUSES_DATA = [
  { vehicleNumber: 'RJ-27-PA-1234' },
  { vehicleNumber: 'RJ-27-PA-1235' },
  { vehicleNumber: 'RJ-27-PA-1236' },
  { vehicleNumber: 'RJ-27-PA-1237' },
  { vehicleNumber: 'RJ-27-PA-1238' },
  { vehicleNumber: 'RJ-27-PA-1239' },
  { vehicleNumber: 'RJ-27-PA-1240' },
  { vehicleNumber: 'RJ-27-PA-1241' },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      BusRoute.deleteMany({}),
      Driver.deleteMany({}),
      Bus.deleteMany({})
    ]);
    console.log('🗑️  Cleared existing data');

    // Seed Routes with coordinates
    const routes = ROUTES_DATA.map(route => ({
      ...route,
      stops: route.stopNames.map((name, index) => ({
        name,
        coordinates: UDAIPUR_STOPS[name] || { lat: 24.5854, lng: 73.7125 },
        arrivalTime: `${6 + Math.floor(index * 0.5)}:${(index * 5) % 60 < 10 ? '0' : ''}${(index * 5) % 60} AM`,
        order: index
      })),
      path: route.stopNames.map(name => UDAIPUR_STOPS[name] || { lat: 24.5854, lng: 73.7125 }),
      isActive: true
    }));

    await BusRoute.insertMany(routes);
    console.log(`✅ Seeded ${routes.length} routes`);

    // Seed Drivers
    await Driver.insertMany(DRIVERS_DATA);
    console.log(`✅ Seeded ${DRIVERS_DATA.length} drivers`);

    // Seed Buses
    await Bus.insertMany(BUSES_DATA);
    console.log(`✅ Seeded ${BUSES_DATA.length} buses`);

    console.log('🎉 Database seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
