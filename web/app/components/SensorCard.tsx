"use client";

import { motion } from "framer-motion";

interface SensorCardProps {
  title: string;
  value: number;
  unit: string;
  icon: string;
  color: string;
  target: number;
}

export default function SensorCard({
  title,
  value,
  unit,
  icon,
  color,
  target,
}: SensorCardProps) {
  const percentage = (value / target) * 100;
  const isOptimal = percentage <= 100;

  const getColorClass = () => {
    switch (color) {
      case "primary":
        return "text-primary-dark";
      case "accent-blue":
        return "text-accent-blue";
      case "accent-orange":
        return "text-accent-orange";
      default:
        return "text-primary-dark";
    }
  };

  return (
    <motion.div whileHover={{ scale: 1.02 }} className="card">
      <div className="flex justify-between items-start mb-3">
        <span className="text-2xl">{icon}</span>
        <span
          className={`status-badge ${isOptimal ? "status-success" : "status-warning"}`}
        >
          {isOptimal ? "Optimal" : "High"}
        </span>
      </div>

      <h3 className="text-text-medium text-sm mb-1">{title}</h3>
      <div className="flex items-baseline gap-1 mb-3">
        <span className={`text-2xl font-bold ${getColorClass()}`}>{value}</span>
        <span className="text-text-medium text-sm">{unit}</span>
      </div>

      <div className="mt-2">
        <div className="flex justify-between text-xs text-text-medium mb-1">
          <span>Current</span>
          <span>
            Target: {target}
            {unit}
          </span>
        </div>
        <div className="bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentage, 100)}%` }}
            transition={{ duration: 1 }}
            className={`rounded-full h-2 ${
              color === "primary"
                ? "bg-primary-light"
                : color === "accent-blue"
                  ? "bg-accent-blue"
                  : "bg-accent-orange"
            }`}
          />
        </div>
      </div>
    </motion.div>
  );
}
