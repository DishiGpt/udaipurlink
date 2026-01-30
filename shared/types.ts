export interface LatLng {
  lat: number;
  lng: number;
}

export interface Stop {
  name: string;
  coordinates: LatLng;
  arrivalTime?: string;
  order: number;
}

export interface BusRoute {
  _id?: string;
  routeNumber: string;
  origin: string;
  destination: string;
  color: string;
  stops: Stop[];
  path: LatLng[];
  isActive?: boolean;
}

export interface BusLocation {
  routeNumber: string;
  driverId?: string;
  lat: number;
  lng: number;
  timestamp: number;
  heading?: number;
  isFull: boolean;
}

export interface Driver {
  _id?: string;
  employeeId: string;
  name: string;
  phone?: string;
  status: 'Offline' | 'Assigned' | 'OnDuty';
  assignedRoute?: BusRoute | string;
}

export interface Bus {
  _id?: string;
  vehicleNumber: string;
  driver?: Driver | string;
  currentLocation: LatLng;
  route?: BusRoute | string;
  isLive: boolean;
  heading: number;
  isFull: boolean;
  lastUpdate?: Date;
}
