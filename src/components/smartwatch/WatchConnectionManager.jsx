import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Bluetooth, ArrowLeft, CheckCircle, AlertCircle,
  RefreshCw, Info, Smartphone, Watch
} from "lucide-react";

// Standard BLE UUIDs
const HEART_RATE_SERVICE = "heart_rate";
const HEART_RATE_MEASUREMENT = "heart_rate_measurement";
const BATTERY_SERVICE = "battery_service";
const BATTERY_LEVEL = "battery_level";
const DEVICE_INFO_SERVICE = "device_information";

export default function WatchConnectionManager({
  platform,
  onConnected,
  onBack,
  onStatusChange,
  bluetoothSupported
}) {
  const [status, setStatus] = useState("idle"); // idle | requesting | connecting | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [device, setDevice] = useState(null);
  const [heartRate, setHeartRate] = useState(null);
  const [battery, setBattery] = useState(null);
  // Manual entry fallback
  const [showManual, setShowManual] = useState(false);
  const [manualHR, setManualHR] = useState("");
  const [manualSteps, setManualSteps] = useState("");
  const [manualCal, setManualCal] = useState("");
  const [manualSleep, setManualSleep] = useState("");

  const connectBluetooth = async () => {
    if (!navigator.bluetooth) {
      setErrorMsg("Web Bluetooth not available in this browser. Use Chrome on Android or Desktop.");
      setStatus("error");
      return;
    }

    setStatus("requesting");
    onStatusChange?.("connecting");
    setErrorMsg("");

    try {
      const btDevice = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [HEART_RATE_SERVICE] },
          { namePrefix: platform.id === "garmin" ? "Garmin" :
                        platform.id === "apple" ? "Apple Watch" :
                        platform.id === "samsung" ? "Galaxy" :
                        platform.id === "fitbit" ? "Charge" : "" }
        ],
        optionalServices: [HEART_RATE_SERVICE, BATTERY_SERVICE, DEVICE_INFO_SERVICE]
      });

      setStatus("connecting");
      setDevice(btDevice);

      const server = await btDevice.gatt.connect();

      // Get heart rate service
      let hrValue = null;
      try {
        const hrService = await server.getPrimaryService(HEART_RATE_SERVICE);
        const hrChar = await hrService.getCharacteristic(HEART_RATE_MEASUREMENT);

        // Start notifications for live HR
        await hrChar.startNotifications();
        hrChar.addEventListener("characteristicvaluechanged", (event) => {
          const value = event.target.value;
          const flags = value.getUint8(0);
          const hr = flags & 0x1 ? value.getUint16(1, true) : value.getUint8(1);
          setHeartRate(hr);
          hrValue = hr;
        });
      } catch (_) {
        // HR service not found — not all devices expose this
      }

      // Get battery level
      try {
        const batService = await server.getPrimaryService(BATTERY_SERVICE);
        const batChar = await batService.getCharacteristic(BATTERY_LEVEL);
        const batValue = await batChar.readValue();
        setBattery(batValue.getUint8(0));
      } catch (_) {}

      btDevice.addEventListener("gattserverdisconnected", () => {
        setStatus("idle");
        onStatusChange?.("disconnected");
        setDevice(null);
      });

      setStatus("success");
      onStatusChange?.("connected");

      const deviceInfo = {
        name: btDevice.name || platform.name,
        id: btDevice.id,
        platform: platform.id,
        connectedAt: new Date().toISOString()
      };

      onConnected(deviceInfo, {
        heartRate: hrValue,
        battery: battery,
        source: "bluetooth"
      });
    } catch (err) {
      if (err.name === "NotFoundError") {
        setErrorMsg("No device selected. Please try again and select your watch.");
      } else if (err.name === "SecurityError") {
        setErrorMsg("Bluetooth permission denied. Allow Bluetooth access in your browser settings.");
      } else {
        setErrorMsg(`Connection failed: ${err.message}`);
      }
      setStatus("error");
      onStatusChange?.("error");
    }
  };

  const connectManual = () => {
    const deviceInfo = {
      name: `${platform.name} (Manual)`,
      id: `manual_${Date.now()}`,
      platform: platform.id,
      connectedAt: new Date().toISOString(),
      isManual: true
    };

    onConnected(deviceInfo, {
      heartRate: manualHR ? parseInt(manualHR) : null,
      steps: manualSteps ? parseInt(manualSteps) : null,
      calories: manualCal ? parseInt(manualCal) : null,
      sleep: manualSleep ? parseFloat(manualSleep) : null,
      source: "manual"
    });
  };

  return (
    <div className="space-y-4">
      {/* Platform header */}
      <div className={`bg-gradient-to-r ${platform.color} border ${platform.border} rounded-xl p-4`}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="text-gray-300 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-2xl">{platform.icon}</span>
          <div>
            <div className="text-white font-bold">{platform.name}</div>
            <div className="text-gray-300 text-xs">{platform.description}</div>
          </div>
        </div>

        {/* Setup note */}
        <div className="bg-black/30 rounded-lg p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-300">{platform.setupNote}</p>
        </div>
      </div>

      {/* Supported data */}
      <div>
        <p className="text-gray-400 text-xs font-medium mb-2">Data this platform provides:</p>
        <div className="flex flex-wrap gap-2">
          {platform.supportedData.map(d => (
            <span key={d} className="bg-white/10 text-gray-300 text-xs px-2 py-1 rounded-full">{d}</span>
          ))}
        </div>
      </div>

      {/* Connection status */}
      {status === "success" && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
          <div>
            <p className="text-green-300 font-bold text-sm">Connected!</p>
            <p className="text-gray-400 text-xs">{device?.name || platform.name}</p>
          </div>
          {heartRate && (
            <div className="ml-auto text-center">
              <div className="text-red-400 font-bold text-xl">❤️ {heartRate}</div>
              <div className="text-gray-500 text-xs">BPM live</div>
            </div>
          )}
        </motion.div>
      )}

      {status === "error" && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-semibold text-sm">Connection Failed</p>
            <p className="text-gray-400 text-xs mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Connect buttons */}
      {status !== "success" && (
        <div className="space-y-3">
          {bluetoothSupported && (
            <Button
              onClick={connectBluetooth}
              disabled={status === "connecting" || status === "requesting"}
              className="w-full bg-[#00a9ff] hover:bg-[#007fbf] text-white font-bold py-4 h-auto rounded-xl gap-2 text-base"
            >
              {status === "requesting" || status === "connecting" ? (
                <><RefreshCw className="w-5 h-5 animate-spin" /> Connecting...</>
              ) : (
                <><Bluetooth className="w-5 h-5" /> Connect via Bluetooth</>
              )}
            </Button>
          )}

          <Button
            onClick={() => setShowManual(!showManual)}
            variant="outline"
            className="w-full border-white/20 text-gray-300 hover:bg-white/10 py-3 h-auto rounded-xl gap-2"
          >
            <Smartphone className="w-4 h-4" />
            Manual Data Entry (no Bluetooth needed)
          </Button>

          {!bluetoothSupported && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
              💡 <strong>iOS users:</strong> Web Bluetooth isn't supported in Safari yet.
              Use Manual Entry to log your watch data, or open in Chrome on Android/Desktop for Bluetooth.
            </div>
          )}
        </div>
      )}

      {/* Manual entry form */}
      {showManual && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <h4 className="text-white font-semibold text-sm flex items-center gap-2">
            <Watch className="w-4 h-4" /> Enter Watch Data Manually
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Heart Rate (BPM)", key: "hr", state: manualHR, setter: setManualHR, placeholder: "72", type: "number" },
              { label: "Steps Today", key: "steps", state: manualSteps, setter: setManualSteps, placeholder: "8000", type: "number" },
              { label: "Calories Burned", key: "cal", state: manualCal, setter: setManualCal, placeholder: "450", type: "number" },
              { label: "Sleep Hours", key: "sleep", state: manualSleep, setter: setManualSleep, placeholder: "7.5", type: "number" },
            ].map(field => (
              <div key={field.key}>
                <label className="text-gray-400 text-xs block mb-1">{field.label}</label>
                <input
                  type={field.type}
                  value={field.state}
                  onChange={e => field.setter(e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00a9ff]"
                />
              </div>
            ))}
          </div>
          <Button
            onClick={connectManual}
            disabled={!manualHR && !manualSteps && !manualCal && !manualSleep}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <CheckCircle className="w-4 h-4 mr-2" /> Save & Sync Data
          </Button>
        </motion.div>
      )}
    </div>
  );
}