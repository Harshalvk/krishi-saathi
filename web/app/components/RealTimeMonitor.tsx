"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RealTimeMonitorProps {
  latestData: any;
}

export default function RealTimeMonitor({ latestData }: RealTimeMonitorProps) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (latestData) {
      setHistory((prev) => {
        const newHistory = [...prev, { ...latestData, timestamp: new Date() }];
        return newHistory.slice(-20); // Keep last 20 readings
      });
    }
  }, [latestData]);

  const chartData = history.map((h) => ({
    time: new Date(h.timestamp).toLocaleTimeString(),
    moisture: h.soil_moisture,
    temperature: h.temperature,
    ph: h.ph,
  }));

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-primary-dark">
          Real-Time Sensor Monitor
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-text-medium text-sm">Live Updates</span>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="moisture"
              stroke="#4CAF50"
              name="Soil Moisture (%)"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="temperature"
              stroke="#2196F3"
              name="Temperature (°C)"
              strokeWidth={2}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="ph"
              stroke="#FF9800"
              name="pH Level"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border-light">
        <div className="text-center">
          <div className="text-text-medium text-sm">Last Update</div>
          <div className="text-text-dark font-medium">
            {history.length > 0
              ? new Date(
                  history[history.length - 1]?.timestamp,
                ).toLocaleTimeString()
              : "No data"}
          </div>
        </div>
        <div className="text-center">
          <div className="text-text-medium text-sm">Data Points</div>
          <div className="text-text-dark font-medium">{history.length}/20</div>
        </div>
        <div className="text-center">
          <div className="text-text-medium text-sm">Update Rate</div>
          <div className="text-text-dark font-medium">10 sec</div>
        </div>
      </div>
    </div>
  );
}
