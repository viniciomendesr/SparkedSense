import { Reading } from './types';
import { generateLiveReading } from './mock-data';

export class SensorWebSocket {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private listeners: Map<string, ((reading: Reading) => void)[]> = new Map();

  subscribe(sensorId: string, sensorType: string, callback: (reading: Reading) => void, lastValue?: number) {
    // Add listener
    if (!this.listeners.has(sensorId)) {
      this.listeners.set(sensorId, []);
    }
    this.listeners.get(sensorId)!.push(callback);

    // Start interval if not already started
    if (!this.intervals.has(sensorId)) {
      let currentValue = lastValue;
      const interval = setInterval(() => {
        const reading = generateLiveReading(
          sensorId,
          sensorType as 'temperature' | 'humidity' | 'ph' | 'pressure' | 'light' | 'co2',
          currentValue
        );
        currentValue = reading.value;

        // Notify all listeners
        const callbacks = this.listeners.get(sensorId) || [];
        callbacks.forEach(cb => cb(reading));
      }, 2000);

      this.intervals.set(sensorId, interval);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(sensorId) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }

      // Clean up if no more listeners
      if (callbacks.length === 0) {
        const interval = this.intervals.get(sensorId);
        if (interval) {
          clearInterval(interval);
          this.intervals.delete(sensorId);
        }
        this.listeners.delete(sensorId);
      }
    };
  }

  unsubscribeAll() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    this.listeners.clear();
  }
}

export const sensorWebSocket = new SensorWebSocket();
