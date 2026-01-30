import mongoose, { Schema, Document } from 'mongoose';

export interface IStop {
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  arrivalTime?: string;
  order: number;
}

export interface IBusRoute extends Document {
  routeNumber: string;
  origin: string;
  destination: string;
  color: string;
  stops: IStop[];
  path: Array<{ lat: number; lng: number }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StopSchema = new Schema({
  name: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  arrivalTime: { type: String },
  order: { type: Number, required: true }
}, { _id: false });

const BusRouteSchema: Schema = new Schema({
  routeNumber: { type: String, required: true, unique: true },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  color: { type: String, default: '#2563eb' },
  stops: [StopSchema],
  path: [{
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model<IBusRoute>('BusRoute', BusRouteSchema);
