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
    <div className="w-64 bg-primary-dark text-white flex flex-col">
      <div className="p-6 border-b border-primary-medium">
        <h1 className="text-xl font-bold">Smart Kisan Mitra</h1>
        <p className="text-sm text-primary-soft mt-1">
          AI powered IoT Solution for Sustainable Farming
        </p>
      </div>

      <nav className="flex-1 p-4">
        {menuItems.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ x: 5 }}
            onClick={() => setActiveTab(item.id)}
            className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors duration-200 flex items-center gap-3 ${
              activeTab === item.id
                ? "bg-primary-medium text-white"
                : "text-primary-soft hover:bg-primary-medium hover:text-white"
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.name}</span>
          </motion.button>
        ))}
      </nav>

      <div className="p-6 border-t border-primary-medium">
        <div className="text-xs text-primary-soft">
          <p>API Gateway Status</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
