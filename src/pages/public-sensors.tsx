import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Mail } from 'lucide-react';
import { Card } from '../components/ui/card';
import { publicAPI } from '../lib/api';
import { Sensor } from '../lib/types';
import { SensorCard } from '../components/sensor-card';
import { supabase } from '../utils/supabase/client';

export default function PublicSensorsPage() {
  const navigate = useNavigate();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    loadPublicSensors();
  }, []);

  // Real-time subscription for sensor changes
  useEffect(() => {
    const channel = supabase
      .channel('public-sensor-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kv_store_4a89e1c9',
          filter: 'key=like.sensor:%',
        },
        () => {
          // Reload public sensors when any sensor changes
          console.log('Sensor change detected, reloading public sensors');
          loadPublicSensors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPublicSensors = async () => {
    try {
      setLoading(true);
      setVisibleCount(0); // Reset progressive rendering
      const data = await publicAPI.listPublicSensors();
      console.log('Public sensors loaded:', data?.length || 0);
      
      // Parse dates
      const parsedSensors = (data || []).map(sensor => ({
        ...sensor,
        createdAt: new Date(sensor.createdAt),
        updatedAt: sensor.updatedAt ? new Date(sensor.updatedAt) : undefined,
        lastReading: sensor.lastReading ? {
          ...sensor.lastReading,
          timestamp: new Date(sensor.lastReading.timestamp),
        } : undefined,
      }));
      
      setSensors(parsedSensors);
      setLoading(false);
      
      // Progressive rendering: reveal sensors one by one
      if (parsedSensors.length > 0) {
        parsedSensors.forEach((_, index) => {
          setTimeout(() => {
            setVisibleCount(index + 1);
          }, index * 100); // 100ms delay between each card
        });
      }
    } catch (error) {
      console.error('Failed to load public sensors:', error);
      setSensors([]);
      setLoading(false);
    }
  };

  const handleViewSensor = (sensor: Sensor) => {
    navigate(`/audit?sensor=${sensor.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--card) 0%, var(--surface-alt) 100%)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="w-6 h-6" style={{ color: 'var(--primary)' }} />
            </div>
            <h1 style={{ color: 'var(--text-primary)' }}>
              Public Sensors Collection
            </h1>
          </div>
          <p style={{ 
            color: 'var(--text-secondary)',
            maxWidth: '700px',
            lineHeight: '1.6',
          }}>
            Explore real-time IoT sensor data verified on the Solana blockchain. 
            All sensors listed here have public datasets available for audit and potential acquisition.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-48 bg-muted rounded mb-4"></div>
                <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </Card>
            ))}
          </div>
        ) : sensors.length === 0 ? (
          <Card className="p-12 text-center">
            <Database className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>
              No Public Sensors Available
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Public sensors will appear here once sensor owners mark their datasets as public.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Check back later or register your own sensor to contribute to the public collection.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sensors.map((sensor, index) => (
              <div
                key={sensor.id}
                className={`transition-all duration-500 ${
                  index < visibleCount 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-4'
                }`}
              >
                <SensorCard
                  sensor={sensor}
                  onViewDetails={handleViewSensor}
                  showMiniSparkline={false}
                />
              </div>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="mt-8 p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>
                Dataset Acquisition
              </h4>
              <p style={{ 
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
              }}>
                All datasets in this collection are available for acquisition through data negotiation. 
                Click any sensor card to view its real-time data feed and public datasets. 
                Contact the sensor owner for pricing, terms, and access details.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
