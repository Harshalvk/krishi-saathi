"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/components/Sidebar";
import Header from "@/app/components/Header";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  RadarChart,
  Radar,
} from "recharts";
import PredictionCard from "./components/PredictionCard";

const API_GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY || "http://localhost:8000";

export default function Dashboard() {
  const [selectedDevice, setSelectedDevice] = useState("farm_007");
  const [activeTab, setActiveTab] = useState("overview");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch latest sensor data
  const { data: latestData, refetch: refetchLatest } = useQuery({
    queryKey: ["latest", selectedDevice],
    queryFn: async () => {
      const response = await axios.get(
        `${API_GATEWAY_URL}/history/${selectedDevice}?limit=1`,
      );
      const readings = response.data.readings;
      const sensorData =
        readings && readings.length > 0
          ? readings[0].sensor_data
          : {
              soil_moisture: 65,
              temperature: 28.4,
              ph: 6.8,
              ec: 1.2,
              N: 45,
              P: 30,
              K: 20,
            };
      return sensorData;
    },
    refetchInterval: 10000,
  });

  // Real-time chart data
  const [chartData, setChartData] = useState([
    { time: "04:53:30 PM", moisture: 65, temperature: 28.4, ph: 6.8, ec: 1.2 },
    { time: "04:53:40 PM", moisture: 66, temperature: 28.5, ph: 6.8, ec: 1.2 },
    { time: "04:53:50 PM", moisture: 65, temperature: 28.4, ph: 6.9, ec: 1.3 },
    { time: "04:53:59 PM", moisture: 65, temperature: 28.4, ph: 6.8, ec: 1.2 },
  ]);

  useEffect(() => {
    if (latestData) {
      setChartData((prev) => {
        const newData = [
          ...prev,
          {
            time: currentTime.toLocaleTimeString(),
            moisture: latestData.soil_moisture || latestData.moisture || 65,
            temperature: latestData.temperature || 28.4,
            ph: latestData.ph || 6.8,
            ec: latestData.ec || 1.2,
          },
        ];
        return newData.slice(-20);
      });
    }
  }, [latestData, currentTime]);

  // Soil health radar data
  const soilHealthData = [
    { subject: "Nutrient Level", value: 72, fullMark: 100 },
    { subject: "Moisture Level", value: 80, fullMark: 100 },
    { subject: "pH Balance", value: 68, fullMark: 100 },
  ];

  return (
    <div className="flex h-screen bg-white">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Smart Kisan Mitra
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                AI powered IoT Solution for Sustainable Farming
              </p>
            </div>

            <div className="flex items-center gap-4">
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-gray-700"
              >
                <option value="device_001">Device 001 - Field A</option>
                <option value="device_002">Device 002 - Field B</option>
                <option value="device_003">Device 003 - Greenhouse</option>
              </select>

              <div className="text-right">
                <div className="text-gray-900 font-medium">
                  {currentTime.toLocaleTimeString()}
                </div>
                <div className="text-gray-400 text-xs">
                  {currentTime.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          {activeTab === "overview" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Real-Time Sensor Monitor */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Real-Time Sensor Monitor
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-500 text-sm">Live Updates</span>
                  </div>
                </div>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
                      <YAxis yAxisId="left" stroke="#6b7280" fontSize={12} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#6b7280"
                        fontSize={12}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="moisture"
                        stroke="#22c55e"
                        name="Soil Moisture (%)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="temperature"
                        stroke="#3b82f6"
                        name="Temperature (°C)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="ph"
                        stroke="#f59e0b"
                        name="pH Level"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="ec"
                        stroke="#8b5cf6"
                        name="EC Value (mS/cm)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                  <div className="text-center flex-1">
                    <div className="text-gray-400 text-xs">Last Update</div>
                    <div className="text-gray-700 font-medium">
                      {currentTime.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-gray-400 text-xs">Data Points</div>
                    <div className="text-gray-700 font-medium">
                      {chartData.length}/20
                    </div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-gray-400 text-xs">Update Rate</div>
                    <div className="text-gray-700 font-medium">10 sec</div>
                  </div>
                </div>
              </div>

              {/* Sensor Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Soil Moisture Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-2xl">💧</span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      Optimal
                    </span>
                  </div>
                  <h3 className="text-gray-500 text-sm mb-1">Soil Moisture</h3>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-2xl font-bold text-gray-900">
                      {latestData?.soil_moisture || latestData?.moisture || 65}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Current</span>
                      <span>Target: 80%</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 rounded-full h-2"
                        style={{
                          width: `${((latestData?.soil_moisture || 65) / 80) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Temperature Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-2xl">🌡️</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      Optimal
                    </span>
                  </div>
                  <h3 className="text-gray-500 text-sm mb-1">Temperature</h3>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-2xl font-bold text-gray-900">
                      {latestData?.temperature || 28.4}°C
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Current</span>
                      <span>Target: 30°C</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 rounded-full h-2"
                        style={{
                          width: `${((latestData?.temperature || 28.4) / 30) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* pH Level Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-2xl">⚗️</span>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                      Good
                    </span>
                  </div>
                  <h3 className="text-gray-500 text-sm mb-1">pH Level</h3>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-2xl font-bold text-gray-900">
                      {latestData?.ph || 6.8} pH
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Current</span>
                      <span>Target: 7 pH</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-500 rounded-full h-2"
                        style={{
                          width: `${((latestData?.ph || 6.8) / 7) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* EC Value Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-2xl">⚡</span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                      Good
                    </span>
                  </div>
                  <h3 className="text-gray-500 text-sm mb-1">EC Value</h3>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-2xl font-bold text-gray-900">
                      {latestData?.ec || 1.2} mS/cm
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Current</span>
                      <span>Target: 1.5 mS/cm</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 rounded-full h-2"
                        style={{
                          width: `${((latestData?.ec || 1.2) / 1.5) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* NPK Values */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nitrogen (N)
                  </h3>
                  <div className="text-3xl font-bold text-green-600">
                    {latestData?.N || 45} ppm
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 rounded-full h-2"
                      style={{
                        width: `${((latestData?.N || 45) / 100) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Phosphorus (P)
                  </h3>
                  <div className="text-3xl font-bold text-blue-600">
                    {latestData?.P || 30} ppm
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 rounded-full h-2"
                      style={{
                        width: `${((latestData?.P || 30) / 100) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Potassium (K)
                  </h3>
                  <div className="text-3xl font-bold text-yellow-600">
                    {latestData?.K || 20} ppm
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 rounded-full h-2"
                      style={{
                        width: `${((latestData?.K || 20) / 100) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Fertilizer & Soil Health Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Fertilizer Recommendation */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Fertilizer Recommendation
                  </h3>
                  <div className="bg-green-50 rounded-lg p-6 text-center">
                    <div className="text-2xl font-bold text-green-700">
                      Apply Urea
                    </div>
                    <p className="text-gray-600 mt-2">
                      Based on Nitrogen deficiency (45 ppm)
                    </p>
                    <button className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      Get Detailed Recommendation
                    </button>
                  </div>
                </div>

                {/* Soil Health Analysis */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Soil Health Analysis
                  </h3>
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full">
                      <span className="text-sm font-semibold">
                        Overall Soil Health
                      </span>
                      <span className="text-lg font-bold">Good</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mt-2">
                      72 / 100
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="60%"
                        data={soilHealthData}
                      >
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 100]}
                          tick={{ fill: "#6b7280", fontSize: 10 }}
                        />
                        <Radar
                          name="Soil Health"
                          dataKey="value"
                          stroke="#22c55e"
                          fill="#22c55e"
                          fillOpacity={0.3}
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                    <div className="text-center">
                      <div className="text-xs text-gray-400">
                        Nutrient Level
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        Good
                      </div>
                      <div className="text-sm text-green-600">72%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400">
                        Moisture Level
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        Good
                      </div>
                      <div className="text-sm text-green-600">80%</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-400">pH Balance</div>
                      <div className="text-lg font-semibold text-gray-900">
                        Good
                      </div>
                      <div className="text-sm text-green-600">68%</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "predictions" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Fertilizer Prediction Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    🌱 Fertilizer Recommendation
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Crop Type
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option>Rice</option>
                        <option>Wheat</option>
                        <option>Maize</option>
                        <option>Cotton</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Growth Stage
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option>Vegetative</option>
                        <option>Flowering</option>
                        <option>Fruiting</option>
                        <option>Maturity</option>
                      </select>
                    </div>
                    <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">
                      Get Fertilizer Recommendation
                    </button>
                  </div>
                </div>

                {/* Crop Prediction Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    🌾 Crop Recommendation
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Latitude
                      </label>
                      <input
                        type="text"
                        placeholder="20.5937"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Longitude
                      </label>
                      <input
                        type="text"
                        placeholder="78.9629"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">
                      Get Crop Recommendation
                    </button>
                  </div>
                </div>

                {/* Soil Health Prediction Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    🧪 Soil Health Analysis
                  </h3>
                  <div className="space-y-4">
                    <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">
                      Analyze Soil Health
                    </button>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-sm text-gray-600">
                        Last Analysis: 72/100 - Good
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plant Disease Detection Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    🪴 Plant Disease Detection
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Upload Plant Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors">
                      Detect Disease
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Sensor History
                  </h2>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Search by device or date..."
                      className="px-3 py-2 border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                      Export Data
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-600 font-semibold">
                          Timestamp
                        </th>
                        <th className="px-4 py-3 text-left text-gray-600 font-semibold">
                          Device ID
                        </th>
                        <th className="px-4 py-3 text-left text-gray-600 font-semibold">
                          Soil Moisture
                        </th>
                        <th className="px-4 py-3 text-left text-gray-600 font-semibold">
                          Temperature
                        </th>
                        <th className="px-4 py-3 text-left text-gray-600 font-semibold">
                          pH
                        </th>
                        <th className="px-4 py-3 text-left text-gray-600 font-semibold">
                          EC
                        </th>
                        <th className="px-4 py-3 text-left text-gray-600 font-semibold">
                          N
                        </th>
                        <th className="px-4 py-3 text-left text-gray-600 font-semibold">
                          P
                        </th>
                        <th className="px-4 py-3 text-left text-gray-600 font-semibold">
                          K
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestData?.readings?.map(
                        (reading: any, index: number) => (
                          <tr
                            key={index}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 text-gray-700 text-sm">
                              {new Date(reading.timestamp).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-gray-700 text-sm font-mono">
                              {reading.device_id}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                {reading.sensor_data?.soil_moisture ||
                                  reading.sensor_data?.moisture ||
                                  "-"}
                                %
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {reading.sensor_data?.temperature || "-"}°C
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {reading.sensor_data?.ph || "-"}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {reading.sensor_data?.ec || "-"}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {reading.sensor_data?.N || "-"} ppm
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {reading.sensor_data?.P || "-"} ppm
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {reading.sensor_data?.K || "-"} ppm
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>

                {(!latestData?.readings ||
                  latestData.readings.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No sensor data available
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "alerts" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  System Alerts & Notifications
                </h2>

                {/* Active Alerts */}
                <div className="space-y-3 mb-6">
                  <h3 className="text-lg font-medium text-gray-800">
                    🔴 Active Alerts
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                      <div>
                        <div className="font-semibold text-red-800">
                          Low Nitrogen Level
                        </div>
                        <div className="text-sm text-red-600 mt-1">
                          Nitrogen level is at 45 ppm (optimal range: 80-120
                          ppm). Consider applying nitrogen-rich fertilizer.
                        </div>
                        <div className="text-xs text-red-500 mt-2">
                          Detected: 2 hours ago
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                      <div>
                        <div className="font-semibold text-yellow-800">
                          Low Potassium Level
                        </div>
                        <div className="text-sm text-yellow-600 mt-1">
                          Potassium level is at 20 ppm (optimal range: 50-80
                          ppm). Potassium deficiency detected.
                        </div>
                        <div className="text-xs text-yellow-500 mt-2">
                          Detected: 4 hours ago
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Threshold Configuration */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    ⚙️ Alert Threshold Configuration
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Soil Moisture Warning (%)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        Temperature Warning (°C)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        pH Warning Range
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Min"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Max"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm mb-1">
                        EC Warning (mS/cm)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Min"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Max"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                  <button className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    Save Alert Settings
                  </button>
                </div>

                {/* Notification Preferences */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">
                    🔔 Notification Preferences
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-gray-700">
                        Email notifications for critical alerts
                      </span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-gray-700">
                        Push notifications on dashboard
                      </span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-gray-700">
                        SMS alerts for urgent issues
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
