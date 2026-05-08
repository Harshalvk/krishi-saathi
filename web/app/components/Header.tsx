"use client";

import { useState } from "react";
import { format } from "date-fns";

interface HeaderProps {
  selectedDevice: string;
  setSelectedDevice: (device: string) => void;
}

export default function Header({
  selectedDevice,
  setSelectedDevice,
}: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  if (typeof window !== "undefined") {
    setInterval(() => setCurrentTime(new Date()), 1000);
  }

  return (
    <header className="bg-white border-b border-border-light px-6 py-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-text-dark">Dashboard</h2>
          <p className="text-text-medium text-sm mt-1">
            Real-time monitoring and AI predictions
          </p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="input-field w-48"
          >
            <option value="farm_004">Farm 004 - Field A</option>
            <option value="device_002">Device 002 - Field B</option>
            <option value="device_003">Device 003 - Greenhouse</option>
          </select>

          <div className="text-right">
            <div className="text-text-dark font-medium">
              {format(currentTime, "hh:mm:ss a")}
            </div>
            <div className="text-text-medium text-xs">
              {format(currentTime, "MMM dd, yyyy")}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
