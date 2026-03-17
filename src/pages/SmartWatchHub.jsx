import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import WatchConnectionManager from "@/components/smartwatch/WatchConnectionManager";
import WatchDataSync from "@/components/smartwatch/WatchDataSync";
import WatchWorkoutController from "@/components/smartwatch/WatchWorkoutController";
import {
  Watch, Bluetooth, BluetoothOff, Activity, Heart,
  Footprints, Flame, Moon, Zap, ArrowLeft, RefreshCw,
  CheckCircle, AlertCircle, Wifi, WifiOff
} from "lucide-react";

const WATCH_PLATFORMS = [
  {
    id: "apple",
    name: "Apple Watch",
    description: "Via Web Bluetooth + Health data bridging",
    icon: "🍎",
    color: "from-gray-700 to-gray-900",
    border: "border-gray-500",
    supportedData: ["Heart Rate", "Steps", "Calories", "Sleep", "Workouts"],
    connectMethod: "bluetooth",
    setupNote: "Open this page in Safari on iPhone for best results"
  },
  {
    id: "garmin",
    name: "Garmin",
    description: "Connect Vivosmart, Fenix, Forerunner & more",
    icon: "🟦",
    color: "from-blue-800 to-blue-950",
    border: "border-blue-500",
    supportedData: ["Heart Rate", "Steps", "Calories", "Sleep", "GPS"],
    connectMethod: "bluetooth",
    setupNote: "Enable Bluetooth on your Garmin device"
  },
  {
    id: "samsung",
    name: "Samsung Galaxy Watch",
    description: "Galaxy Watch 4, 5, 6, Ultra & Active series",
    icon: "🔵",
    color: "from-indigo-800 to-indigo-950",
    border: "border-indigo-500",
    supportedData: ["Heart Rate", "Steps", "Calories", "Sleep", "ECG"],
    connectMethod: "bluetooth",
    setupNote: "Enable developer mode or use Galaxy Wearable app"
  },
  {
    id: "fitbit",
    name: "Fitbit / Google Fit",
    description: "Charge, Versa, Sense & Pixel Watch series",
    icon: "🟢",
    color: "from-teal-800 to-teal-950",
    border: "border-teal-500",
    supportedData: ["Heart Rate", "Steps", "Calories", "Sleep", "SpO2"],
    connectMethod: "bluetooth",
    setupNote: "Pair Fitbit in your device Bluetooth settings first"
  },
  {
    id: "polar",
    name: "Polar / Suunto",
    description: "H10, Vantage, Grit X and other sport watches",
    icon: "🔴",
    color: "from-red-800 to-red-950",
    border: "border-red-500",
    supportedData: ["Heart Rate", "Steps", "Calories", "Training Load"],
    connectMethod: "bluetooth",
    setupNote: "Polar H10 HR strap pairs directly via Web Bluetooth"
  },
  {
    id: "other",
    name: "Other / Generic BLE",
    description: "Any Bluetooth Low Energy heart rate device",
    icon: "📡",
    color: "from-purple-800 to-purple-950",
    border: "border-purple-500",
    supportedData: ["Heart Rate", "Steps"],
    connectMethod: "bluetooth",
    setupNote: "Must support standard BLE Heart Rate profile"
  }
];

export default function SmartWatchHub() {
  const navigate = useNavigate();
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected"); // disconnected | connecting | connected | error
  const [liveData, setLiveData] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [activeTab, setActiveTab] = useState("connect"); // connect | live | workout | history
  const [bluetoothSupported, setBluetoothSupported] = useState(false);
  const [syncHistory, setSyncHistory] = useState([]);
  const [activeWorkoutData, setActiveWorkoutData] = useState(null);

  useEffect(() => {
    // Check Web Bluetooth API support
    setBluetoothSupported(!!navigator.bluetooth);

    // Load persisted connection + history
    const saved = localStorage.getItem("smartwatch_connection");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConnectedDevice(parsed);
        setConnectionStatus("connected");
      } catch (_) {}
    }

    const hist = localStorage.getItem("smartwatch_sync_history");
    if (hist) {
      try { setSyncHistory(JSON.parse(hist)); } catch (_) {}
    }

    // Check active workout
    const workoutState = localStorage.getItem("activeWorkoutState");
    if (workoutState) {
      try {
        const ws = JSON.parse(workoutState);
        if (ws.workout) setActiveWorkoutData(ws);
      } catch (_) {}
    }
  }, []);

  const handleConnected = (device, data) => {
    setConnectedDevice(device);
    setConnectionStatus("connected");
    setLiveData(data);
    localStorage.setItem("smartwatch_connection", JSON.stringify(device));
    setActiveTab("live");
  };

  const handleDisconnect = () => {
    setConnectedDevice(null);
    setConnectionStatus("disconnected");
    setLiveData(null);
    setSelectedPlatform(null);
    localStorage.removeItem("smartwatch_connection");
  };

  const handleLiveDataUpdate = (data) => {
    setLiveData(data);
  };

  const handleSyncComplete = (record) => {
    const updated = [record, ...syncHistory].slice(0, 20);
    setSyncHistory(updated);
    localStorage.setItem("smartwatch_sync_history", JSON.stringify(updated));
  };

  const TABS = [
    { id: "connect", label: "Connect", icon: Bluetooth },
    { id: "live", label: "Live Data", icon: Activity },
    { id: "workout", label: "Workout", icon: Zap },
    { id: "history", label: "History", icon: RefreshCw },
  ];

  return (
    <div className="min-h-screen pb-28" style={{ color: "#f9fafb", backgroundColor: "transparent" }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#00a9ff] to-blue-700 text-white py-5 px-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(createPageUrl("Settings"))} className="text-white/80 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Watch className="w-6 h-6" /> Smart Watch Hub
            </h1>
            <p className="text-white/80 text-xs mt-0.5">Connect & sync all major smartwatch platforms</p>
          </div>
          {/* Status pill */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            connectionStatus === "connected" ? "bg-green-500" :
            connectionStatus === "connecting" ? "bg-yellow-500 animate-pulse" :
            connectionStatus === "error" ? "bg-red-500" : "bg-white/20"
          }`}>
            {connectionStatus === "connected" ? <CheckCircle className="w-3 h-3" /> :
             connectionStatus === "connecting" ? <RefreshCw className="w-3 h-3 animate-spin" /> :
             connectionStatus === "error" ? <AlertCircle className="w-3 h-3" /> :
             <BluetoothOff className="w-3 h-3" />}
            {connectionStatus === "connected" ? "Connected" :
             connectionStatus === "connecting" ? "Connecting..." :
             connectionStatus === "error" ? "Error" : "Disconnected"}
          </div>
        </div>
      </div>

      {/* Bluetooth not supported warning */}
      {!bluetoothSupported && (
        <div className="max-w-2xl mx-auto px-4 mt-4">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-semibold text-sm">Web Bluetooth Not Available</p>
              <p className="text-yellow-200/70 text-xs mt-1">
                Web Bluetooth requires Chrome, Edge, or Opera on Android/Desktop.
                On iOS, use Safari with manual data entry, or install the app as a PWA.
                All manual sync features still work without Bluetooth.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connected Device Banner */}
      {connectedDevice && (
        <div className="max-w-2xl mx-auto px-4 mt-4">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <Bluetooth className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{connectedDevice.name || "Connected Device"}</p>
                <p className="text-green-400 text-xs">● Live sync active</p>
              </div>
            </div>
            <Button onClick={handleDisconnect} size="sm" variant="outline"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs">
              Disconnect
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
        <div className="flex bg-white/5 rounded-xl p-1 gap-1">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === t.id ? "bg-[#00a9ff] text-white shadow" : "text-gray-400 hover:text-gray-200"
                }`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-2xl mx-auto px-4 mt-5">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

            {/* CONNECT TAB */}
            {activeTab === "connect" && (
              <div className="space-y-4">
                {!selectedPlatform ? (
                  <>
                    <p className="text-gray-400 text-sm text-center mb-4">
                      Select your smartwatch platform to get started
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {WATCH_PLATFORMS.map(platform => (
                        <motion.button key={platform.id} whileHover={{ scale: 1.01 }}
                          onClick={() => setSelectedPlatform(platform)}
                          className={`bg-gradient-to-r ${platform.color} border ${platform.border} rounded-xl p-4 text-left hover:opacity-90 transition-all`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{platform.icon}</span>
                              <div>
                                <div className="text-white font-bold text-sm">{platform.name}</div>
                                <div className="text-gray-300 text-xs mt-0.5">{platform.description}</div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {platform.supportedData.slice(0, 3).map(d => (
                                <span key={d} className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300">{d}</span>
                              ))}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </>
                ) : (
                  <WatchConnectionManager
                    platform={selectedPlatform}
                    onConnected={handleConnected}
                    onBack={() => setSelectedPlatform(null)}
                    onStatusChange={setConnectionStatus}
                    bluetoothSupported={bluetoothSupported}
                  />
                )}
              </div>
            )}

            {/* LIVE DATA TAB */}
            {activeTab === "live" && (
              <WatchDataSync
                connectedDevice={connectedDevice}
                onDataUpdate={handleLiveDataUpdate}
                onSyncComplete={handleSyncComplete}
                liveData={liveData}
              />
            )}

            {/* WORKOUT TAB */}
            {activeTab === "workout" && (
              <WatchWorkoutController
                connectedDevice={connectedDevice}
                liveData={liveData}
                activeWorkoutData={activeWorkoutData}
              />
            )}

            {/* HISTORY TAB */}
            {activeTab === "history" && (
              <div className="space-y-3">
                <h3 className="text-white font-bold text-sm">Sync History</h3>
                {syncHistory.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No sync history yet</p>
                    <p className="text-xs mt-1">Connect a watch and sync data to see history here</p>
                  </div>
                ) : (
                  syncHistory.map((record, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium text-sm">{record.device || "Watch"}</span>
                        <span className="text-gray-400 text-xs">{record.time}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {record.heartRate && (
                          <div className="bg-red-500/10 rounded-lg p-2 text-center">
                            <Heart className="w-3 h-3 text-red-400 mx-auto mb-0.5" />
                            <div className="text-white font-bold">{record.heartRate}</div>
                            <div className="text-gray-500">BPM</div>
                          </div>
                        )}
                        {record.steps && (
                          <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                            <Footprints className="w-3 h-3 text-blue-400 mx-auto mb-0.5" />
                            <div className="text-white font-bold">{record.steps?.toLocaleString()}</div>
                            <div className="text-gray-500">Steps</div>
                          </div>
                        )}
                        {record.calories && (
                          <div className="bg-orange-500/10 rounded-lg p-2 text-center">
                            <Flame className="w-3 h-3 text-orange-400 mx-auto mb-0.5" />
                            <div className="text-white font-bold">{record.calories}</div>
                            <div className="text-gray-500">Cal</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}