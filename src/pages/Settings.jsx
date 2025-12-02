
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { 
  Volume2, 
  Camera, 
  Share2, 
  Timer, 
  Smartphone,
  Bell,
  Lock
} from "lucide-react";
import { toast } from "sonner";

const requestPermission = async (permissionName, friendlyName) => {
  try {
    if (permissionName === 'notifications') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success(`${friendlyName} enabled!`);
        return true;
      } else {
        toast.error(`${friendlyName} permission denied.`);
        return false;
      }
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({ [permissionName]: true });
      stream.getTracks().forEach(track => track.stop());
      toast.success(`${friendlyName} permission granted!`);
      return true;
    }
  } catch (error) {
    console.error(`Error requesting ${permissionName} permission:`, error);
    toast.error(`Could not get ${friendlyName} permission.`);
    return false;
  }
};

export default function Settings() {
  const [settings, setSettings] = useState(() => {
    const defaultSettings = {
      voiceGuidance: true, soundEffects: true, musicVolume: [70], voiceVolume: [80],
      darkMode: true, largeText: false, showTimer: true, showRepCounter: true,
      autoStart: false, restTimerEnabled: true, defaultRestTime: [30], vibrationFeedback: true,
      recordWorkouts: false, formAnalysis: false,
      autoShare: false, shareToSocial: true, includeStats: true,
      workoutReminders: false, progressUpdates: false, achievements: false
    };
    try {
      const storedSettings = localStorage.getItem('appSettings');
      return storedSettings ? { ...defaultSettings, ...JSON.parse(storedSettings) } : defaultSettings;
    } catch (e) {
      console.error("Failed to parse settings from localStorage:", e);
      return defaultSettings;
    }
  });

  const [permissions, setPermissions] = useState({
    notifications: 'default',
    camera: 'prompt'
  });

  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'camera' }).then(status => {
        setPermissions(prev => ({ ...prev, camera: status.state }));
        status.onchange = () => setPermissions(prev => ({ ...prev, camera: status.state }));
      });
    }
    if ('Notification' in window) {
      setPermissions(prev => ({ ...prev, notifications: Notification.permission }));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  const handlePermissionSwitch = async (key, permissionName, friendlyName) => {
    const isChecked = settings[key];
    if (!isChecked) {
      let hasPermission = false;
      if (permissionName === 'notifications' && Notification.permission === 'granted') hasPermission = true;
      if (permissionName === 'video' && permissions.camera === 'granted') hasPermission = true;

      if (hasPermission) {
        setSettings(prev => ({ ...prev, [key]: true }));
        toast.info(`${friendlyName} permission already granted.`);
      } else {
        const granted = await requestPermission(permissionName, friendlyName);
        if (granted) {
          setSettings(prev => ({ ...prev, [key]: true }));
          if (permissionName === 'notifications') setPermissions(prev => ({...prev, notifications: 'granted'}));
          if (permissionName === 'video') setPermissions(prev => ({...prev, camera: 'granted'}));
        }
      }
    } else {
      setSettings(prev => ({ ...prev, [key]: false }));
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>
        {`
          /* Switch styling to make it clearly visible */
          button[role="switch"] {
            width: 44px !important;
            height: 24px !important;
            background-color: #4b5563 !important;
            border: 2px solid #6b7280 !important;
            position: relative !important;
            display: inline-flex !important;
            align-items: center !important;
            border-radius: 9999px !important;
            transition: background-color 0.2s !important;
          }
          
          button[role="switch"][data-state="checked"] {
            background-color: #00a9ff !important;
            border-color: #00a9ff !important;
          }
          
          button[role="switch"] span {
            width: 18px !important;
            height: 18px !important;
            background-color: white !important;
            border-radius: 50% !important;
            transition: transform 0.2s !important;
            display: block !important;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
          }
          
          button[role="switch"][data-state="checked"] span {
            transform: translateX(20px) !important;
          }
          
          button[role="switch"][data-state="unchecked"] span {
            transform: translateX(2px) !important;
          }
          
          /* Slider styling for visibility */
          [role="slider"] {
            background-color: #00a9ff !important;
            border: 2px solid #ffffff !important;
            box-shadow: 0 2px 8px rgba(0, 169, 255, 0.5) !important;
            width: 20px !important;
            height: 20px !important;
          }
          
          [data-orientation="horizontal"] {
            height: 8px !important;
          }
          
          /* Track background */
          span[data-orientation="horizontal"] > span:first-child {
            background-color: #374151 !important;
            border-radius: 9999px !important;
          }
          
          /* Filled range (the blue progress bar) */
          span[data-orientation="horizontal"] > span:last-child {
            background-color: #00a9ff !important;
            border-radius: 9999px !important;
            height: 8px !important;
          }
        `}
      </style>
      
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-lg text-white/90">
            Customize your workout experience
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="grid gap-6">
          {/* Permissions */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-brand-blue" />
                App Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                    <div>
                      <Label className="font-medium text-foreground">Notifications</Label>
                      <p className="text-sm text-gray-400">For workout reminders and achievements. Status: <span className="font-semibold capitalize">{permissions.notifications}</span></p>
                    </div>
                    <Switch 
                      checked={settings.workoutReminders}
                      onCheckedChange={() => handlePermissionSwitch('workoutReminders', 'notifications', 'Notifications')}
                    />
                </div>
                <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                    <div>
                      <Label className="font-medium text-foreground">Camera Access</Label>
                      <p className="text-sm text-gray-400">For video recording and form analysis. Status: <span className="font-semibold capitalize">{permissions.camera}</span></p>
                    </div>
                     <Switch 
                      checked={settings.recordWorkouts}
                      onCheckedChange={() => handlePermissionSwitch('recordWorkouts', 'video', 'Camera')}
                    />
                </div>
            </CardContent>
          </Card>
        
          {/* Audio Settings */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-brand-blue" />
                Audio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                <div>
                  <Label className="font-medium text-foreground">Voice Guidance</Label>
                  <p className="text-sm text-gray-400">Hear workout instructions</p>
                </div>
                <Switch 
                  checked={settings.voiceGuidance} 
                  onCheckedChange={(c) => updateSetting('voiceGuidance', c)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                 <div>
                  <Label className="font-medium text-foreground">Sound Effects</Label>
                  <p className="text-sm text-gray-400">For timers and counters</p>
                </div>
                <Switch 
                  checked={settings.soundEffects} 
                  onCheckedChange={(c) => updateSetting('soundEffects', c)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-brand-blue" />
                Display
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                <div>
                  <Label className="font-medium text-foreground">Dark Mode</Label>
                  <p className="text-sm text-gray-400">Toggle the application's visual theme</p>
                </div>
                <Switch 
                  checked={settings.darkMode} 
                  onCheckedChange={(c) => updateSetting('darkMode', c)}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                <div>
                  <Label className="font-medium text-foreground">Large Text</Label>
                  <p className="text-sm text-gray-400">Increase text size for readability</p>
                </div>
                <Switch 
                  checked={settings.largeText} 
                  onCheckedChange={(c) => updateSetting('largeText', c)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Workout Settings */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Timer className="w-5 h-5 text-brand-blue" />
                Workout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                <div>
                  <Label className="font-medium text-foreground">Auto-start Next Set</Label>
                  <p className="text-sm text-gray-400">Start automatically after rest periods</p>
                </div>
                <Switch 
                  checked={settings.autoStart} 
                  onCheckedChange={(c) => updateSetting('autoStart', c)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Default Rest Time (seconds)</Label>
                <Slider value={settings.defaultRestTime} onValueChange={(v) => updateSetting('defaultRestTime', v)} min={10} max={120} step={5} />
                <div className="text-sm text-gray-400 text-right">{settings.defaultRestTime[0]}s</div>
              </div>
            </CardContent>
          </Card>

          {/* Save Settings */}
          <div className="flex justify-end pt-4">
            <Button 
              className="bg-brand-blue text-white hover:bg-brand-blue-dark border-2 border-brand-blue px-8 py-3 font-bold" 
              onClick={() => toast.success("Settings saved!")}
            >
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
