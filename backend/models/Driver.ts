import mongoose, { Schema, Document } from 'mongoose';

export interface IDriver extends Document {
  employeeId: string;
  name: string;
  phone?: string;
  status: 'Offline' | 'Assigned' | 'OnDuty';
  assignedRoute?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DriverSchema: Schema = new Schema({
  employeeId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String },
  status: { 
    type: String, 
    enum: ['Offline', 'Assigned', 'OnDuty'], 
    default: 'Offline' 
  },
  assignedRoute: { type: Schema.Types.ObjectId, ref: 'BusRoute' }
}, { timestamps: true });

export default mongoose.model<IDriver>('Driver', DriverSchema);
