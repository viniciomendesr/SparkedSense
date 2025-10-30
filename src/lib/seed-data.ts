import { sensorAPI, readingAPI } from './api';
import { Sensor } from './types';

export async function seedDemoData(accessToken: string) {
  try {
    console.log('Seeding demo data...');

    // Create demo sensors (mix of mock and real)
    const demoSensors: Omit<Sensor, 'id' | 'owner' | 'createdAt' | 'status'>[] = [
      {
        name: 'Greenhouse Alpha',
        type: 'temperature',
        description: 'Primary greenhouse monitoring unit with live mock data',
        visibility: 'public',
        mode: 'mock',
        claimToken: undefined,
      },
      {
        name: 'Soil Monitor B2',
        type: 'humidity',
        description: 'Agricultural field soil moisture sensor with simulated readings',
        visibility: 'public',
        mode: 'mock',
        claimToken: undefined,
      },
      {
        name: 'Water Quality Station',
        type: 'ph',
        description: 'Aquaculture pH monitoring system (demo mode)',
        visibility: 'public',
        mode: 'mock',
        claimToken: undefined,
      },
    ];

    for (const sensorData of demoSensors) {
      const sensor = await sensorAPI.create(sensorData, accessToken);
      console.log(`Created sensor: ${sensor.name}`);

      // Create some initial readings
      for (let i = 0; i < 5; i++) {
        const baseValue = sensor.type === 'temperature' ? 22 :
                         sensor.type === 'humidity' ? 65 :
                         sensor.type === 'ph' ? 7.0 : 20;
        
        const value = baseValue + (Math.random() - 0.5) * 2;
        const unit = sensor.type === 'temperature' ? '°C' :
                    sensor.type === 'humidity' ? '%' :
                    sensor.type === 'ph' ? 'pH' : 'unit';

        await readingAPI.create({
          sensorId: sensor.id,
          variable: sensor.type,
          value: parseFloat(value.toFixed(2)),
          unit,
          verified: Math.random() > 0.3,
        }, accessToken);
      }
    }

    console.log('Demo data seeded successfully!');
    return true;
  } catch (error) {
    console.error('Failed to seed demo data:', error);
    return false;
  }
}
