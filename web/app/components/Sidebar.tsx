"use client";

import { motion } from "framer-motion";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: "overview", name: "Dashboard Overview", icon: "📊" },
    { id: "predictions", name: "AI Predictions", icon: "🤖" },
    { id: "history", name: "Sensor History", icon: "📈" },
    { id: "alerts", name: "Alerts", icon: "🔔" },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-5 border-b border-gray-200">
        <h1 className="text-xl font-bold text-green-700">🌾 Smart Kisan</h1>
        <p className="text-xs text-gray-500 mt-1">AI Powered IoT Solution</p>
      </div>

      <nav className="flex-1 p-4">
        {menuItems.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ x: 5 }}
            onClick={() => setActiveTab(item.id)}
            className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors duration-200 flex items-center gap-3 ${
              activeTab === item.id
                ? "bg-green-50 text-green-700 border-r-4 border-green-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.name}</span>
          </motion.button>
        ))}
      </nav>

      <div className="p-6 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p>API Gateway Status</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
