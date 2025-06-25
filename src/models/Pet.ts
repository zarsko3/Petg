import mongoose, { Schema, Document } from 'mongoose';

export interface IPet extends Document {
  name: string;
  owner: string;
  deviceId: string;
  lastLocation?: {
    x: number;
    y: number;
    timestamp: Date;
  };
  batteryLevel: number;
  alertActive: boolean;
  alertMode: 'none' | 'buzzer' | 'vibration' | 'both';
  createdAt: Date;
  updatedAt: Date;
}

const PetSchema = new Schema<IPet>(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: String, required: true, trim: true },
    deviceId: { type: String, required: true, unique: true, trim: true },
    lastLocation: {
      x: { type: Number },
      y: { type: Number },
      timestamp: { type: Date, default: Date.now }
    },
    batteryLevel: { type: Number, default: 100, min: 0, max: 100 },
    alertActive: { type: Boolean, default: false },
    alertMode: { 
      type: String, 
      enum: ['none', 'buzzer', 'vibration', 'both'], 
      default: 'none' 
    }
  },
  { timestamps: true }
);

// Check if the model already exists to prevent overwrite during hot-reloading
export default mongoose.models.Pet || mongoose.model<IPet>('Pet', PetSchema); 