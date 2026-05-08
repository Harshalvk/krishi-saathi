"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/Header";
import SensorCard from "@/app/components/SensorCard";
import PredictionCard from "@/app/components/PredictionCard";
import RealTimeMonitor from "@/app/components/RealTimeMonitor";
import HistoryTable from "@/app/components/HistoryTable";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000";

export default function Dashboard() {
  const [selectedDevice, setSelectedDevice] = useState("farm_007");
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch sensor history
  const { data: historyData, refetch: refetchHistory } = useQuery({
    queryKey: ["history", selectedDevice],
    queryFn: async () => {
      const response = await axios.get(
        `${API_GATEWAY_URL}/history/${"farm_007"}?limit=20`,
      );
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch latest sensor data
  const { data: latestData, refetch: refetchLatest } = useQuery({
    queryKey: ["latest", selectedDevice],
    queryFn: async () => {
      const response = await axios.get(
        `${API_GATEWAY_URL}/history/${selectedDevice}?limit=1`,
      );
      const readings = response.data.readings;
      return readings && readings.length > 0 ? readings[0].sensor_data : null;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Test API connectivity
  useEffect(() => {
    const checkHealth = async () => {
      try {
        await axios.get(`${API_GATEWAY_URL}/health`);
        toast.success("API Gateway connected");
      } catch (error) {
        toast.error("API Gateway connection failed");
      }
    };
    checkHealth();
  }, []);

  return (
    <div className="flex h-screen bg-bg-offwhite">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 overflow-auto">
        <Header
          selectedDevice={selectedDevice}
          setSelectedDevice={setSelectedDevice}
        />

        <main className="p-6">
          {activeTab === "overview" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              {/* Real-time Monitor */}
              <RealTimeMonitor latestData={latestData} />

              {/* Sensor Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SensorCard
                  title="Soil Moisture"
                  value={latestData?.soil_moisture || 65}
                  unit="%"
                  icon="💧"
                  color="primary"
                  target={80}
                />
                <SensorCard
                  title="Temperature"
                  value={latestData?.temperature || 24.5}
                  unit="°C"
                  icon="🌡️"
                  color="accent-blue"
                  target={30}
                />
                <SensorCard
                  title="pH Level"
                  value={latestData?.ph || 6.8}
                  unit="pH"
                  icon="⚗️"
                  color="soil-gradient-start"
                  target={7.0}
                />
                <SensorCard
                  title="EC Value"
                  value={latestData?.ec || 1.2}
                  unit="mS/cm"
                  icon="⚡"
                  color="accent-orange"
                  target={1.5}
                />
              </div>

              {/* Nutrient Values */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card">
                  <h3 className="text-lg font-semibold text-primary-dark mb-4">
                    Nitrogen (N)
                  </h3>
                  <div className="text-3xl font-bold text-primary-medium">
                    {latestData?.N || 45} ppm
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-light rounded-full h-2"
                      style={{
                        width: `${((latestData?.N || 45) / 100) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="card">
                  <h3 className="text-lg font-semibold text-primary-dark mb-4">
                    Phosphorus (P)
                  </h3>
                  <div className="text-3xl font-bold text-primary-medium">
                    {latestData?.P || 32} ppm
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-light rounded-full h-2"
                      style={{
                        width: `${((latestData?.P || 32) / 100) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="card">
                  <h3 className="text-lg font-semibold text-primary-dark mb-4">
                    Potassium (K)
                  </h3>
                  <div className="text-3xl font-bold text-primary-medium">
                    {latestData?.K || 28} ppm
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-light rounded-full h-2"
                      style={{
                        width: `${((latestData?.K || 28) / 100) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Prediction Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PredictionCard
                  title="Fertilizer Recommendation"
                  deviceId={selectedDevice}
                  type="fertilizer"
                  apiGatewayUrl={API_GATEWAY_URL}
                />
                <PredictionCard
                  title="Soil Health Analysis"
                  deviceId={selectedDevice}
                  type="soil"
                  apiGatewayUrl={API_GATEWAY_URL}
                />
              </div>

              {/* History Table */}
              <HistoryTable historyData={historyData?.readings || []} />
            </motion.div>
          )}

          {activeTab === "predictions" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PredictionCard
                  title="Crop Recommendation"
                  deviceId={selectedDevice}
                  type="crop"
                  apiGatewayUrl={API_GATEWAY_URL}
                  latitude={20.5937}
                  longitude={78.9629}
                />
                <PredictionCard
                  title="Plant Disease Detection"
                  deviceId={selectedDevice}
                  type="plant"
                  apiGatewayUrl={API_GATEWAY_URL}
                />
              </div>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <HistoryTable
                historyData={historyData?.readings || []}
                fullPage={true}
              />
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
