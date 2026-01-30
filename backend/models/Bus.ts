import mongoose, { Schema, Document } from 'mongoose';

export interface IBus extends Document {
    vehicleNumber: string;
    driver?: mongoose.Types.ObjectId;
    currentLocation: {
        type: string;
        coordinates: [number, number]; // [lng, lat]
    };
    route?: mongoose.Types.ObjectId;
    isLive: boolean;
    heading: number;
    isFull: boolean;
    lastUpdate: Date;
    createdAt: Date;
    updatedAt: Date;
}

const BusSchema: Schema = new Schema({
    vehicleNumber: { type: String, required: true, unique: true },
    driver: { type: Schema.Types.ObjectId, ref: 'Driver' },
    currentLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
    },
    route: { type: Schema.Types.ObjectId, ref: 'BusRoute' },
    isLive: { type: Boolean, default: false },
    heading: { type: Number, default: 0 },
    isFull: { type: Boolean, default: false },
    lastUpdate: { type: Date, default: Date.now }
}, { timestamps: true });

// Geospatial index for location queries
BusSchema.index({ currentLocation: '2dsphere' });

export default mongoose.model<IBus>('Bus', BusSchema);
