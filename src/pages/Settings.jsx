import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Volume2, 
  Camera, 
  Timer, 
  Smartphone,
  Bell,
  Lock,
  LogOut,
  User as UserIcon,
  Trash2,
  AlertTriangle,
  X
} from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

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
    toast.error(`Could not get ${friendlyName} permission.`);
    return false;
  }
};

// ── Secure deletion modal ────────────────────────────────────────────────────
function DeleteAccountModal({ onConfirm, onCancel, isDeleting }) {
  const [step, setStep] = useState(1); // 1 = warning, 2 = type confirm
  const [confirmText, setConfirmText] = useState("");
  const REQUIRED = "DELETE";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a1628] border border-red-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="text-white font-bold text-lg">Delete Account</h2>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors no-min-height p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 1 ? (
          <>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5">
              <p className="text-red-300 text-sm font-semibold mb-2">⚠️ This action is permanent and irreversible.</p>
              <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
                <li>All workouts and session history will be deleted</li>
                <li>Your progress photos and measurements will be lost</li>
                <li>Achievements, streaks, and referrals will be removed</li>
                <li>Your subscription will not be refunded</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel} className="flex-1 border-gray-600 text-gray-300">
                Keep My Account
              </Button>
              <Button
                onClick={() => setStep(2)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Continue
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-300 text-sm mb-3">
              To confirm deletion, type <span className="font-mono font-bold text-red-400">{REQUIRED}</span> below:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Type ${REQUIRED} to confirm`}
              className="bg-gray-900 border-gray-700 text-white mb-5 font-mono"
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel} className="flex-1 border-gray-600 text-gray-300" disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                onClick={() => onConfirm()}
                disabled={confirmText !== REQUIRED || isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-40"
              >
                {isDeleting ? "Deleting..." : "Delete My Account"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Settings page ───────────────────────────────────────────────────────
export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [settings, setSettings] = useState(() => {
    const defaultSettings = {
      voiceGuidance: true, soundEffects: true, musicVolume: [70], voiceVolume: [80],
      darkMode: true, largeText: false, showTimer: true, showRepCounter: true,
      autoStart: false, restTimerEnabled: true, defaultRestTime: [30], vibrationFeedback: true,
      recordWorkouts: false, formAnalysis: false,
      autoShare: false, shareToSocial: true, includeStats: true,
      workoutReminders: false, progressUpdates: false, achievements: false,
      enableTimerBeeps: true,
      audioLevels: { voiceCommands: [50], timerBeeps: [50], completionSounds: [50] }
    };
    try {
      const stored = localStorage.getItem('appSettings');
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const [permissions, setPermissions] = useState({ notifications: 'default', camera: 'prompt' });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch {
        // not logged in
      }
      setIsLoadingUser(false);
    };
    loadUser();
  }, []);

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

  const updateSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleLogout = async () => {
    try {
      await base44.auth.logout();
      toast.success("Logged out successfully!");
      navigate(createPageUrl("Home"));
    } catch {
      toast.error("Failed to logout. Please try again.");
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await base44.auth.updateMe({
        account_deletion_requested: true,
        account_deletion_requested_date: new Date().toISOString()
      });
      toast.success('Account deletion requested. Logging you out...');
      setShowDeleteModal(false);
      setTimeout(async () => {
        await base44.auth.logout();
        navigate(createPageUrl("Home"));
      }, 1500);
    } catch {
      toast.error('Failed to process account deletion. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`
        button[role="switch"] {
          width: 44px !important; height: 24px !important;
          background-color: #4b5563 !important; border: 2px solid #6b7280 !important;
          position: relative !important; display: inline-flex !important;
          align-items: center !important; border-radius: 9999px !important;
          transition: background-color 0.2s !important;
        }
        button[role="switch"][data-state="checked"] { background-color: #00a9ff !important; border-color: #00a9ff !important; }
        button[role="switch"] span {
          width: 18px !important; height: 18px !important; background-color: white !important;
          border-radius: 50% !important; transition: transform 0.2s !important;
          display: block !important; box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
        }
        button[role="switch"][data-state="checked"] span { transform: translateX(20px) !important; }
        button[role="switch"][data-state="unchecked"] span { transform: translateX(2px) !important; }
        [role="slider"] {
          background-color: #00a9ff !important; border: 2px solid #ffffff !important;
          box-shadow: 0 2px 8px rgba(0, 169, 255, 0.5) !important;
          width: 20px !important; height: 20px !important;
        }
        [data-orientation="horizontal"] { height: 8px !important; }
        span[data-orientation="horizontal"] > span:first-child {
          background-color: #374151 !important; border-radius: 9999px !important;
        }
        span[data-orientation="horizontal"] > span:last-child {
          background-color: #00a9ff !important; border-radius: 9999px !important; height: 8px !important;
        }
      `}</style>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={isDeleting}
        />
      )}

      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-lg text-white/90">Customize your workout experience</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="grid gap-6">

          {/* Account */}
          {!isLoadingUser && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <UserIcon className="w-5 h-5 text-brand-blue" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user ? (
                  <div className="p-4 bg-background rounded-lg border border-border">
                    <div className="mb-2">
                      <Label className="font-medium text-foreground">Email</Label>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                    <div className="mb-4">
                      <Label className="font-medium text-foreground">Subscription Status</Label>
                      <p className="text-sm">
                        <span className={`font-semibold ${user.subscription_status === 'pro' ? 'text-brand-blue' : 'text-gray-400'}`}>
                          {user.subscription_status === 'pro' ? '⭐ Pro Member' : 'Free'}
                        </span>
                      </p>
                    </div>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      className="w-full bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 bg-background rounded-lg border border-border text-center">
                    <p className="text-gray-400 mb-4">You are not logged in</p>
                    <Button
                      onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
                      className="gradient-bg text-white hover:opacity-90"
                    >
                      Login
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
                  <p className="text-sm text-gray-400">Workout reminders & achievements. Status: <span className="font-semibold capitalize">{permissions.notifications}</span></p>
                </div>
                <Switch
                  checked={settings.workoutReminders}
                  onCheckedChange={() => handlePermissionSwitch('workoutReminders', 'notifications', 'Notifications')}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                <div>
                  <Label className="font-medium text-foreground">Camera Access</Label>
                  <p className="text-sm text-gray-400">Video recording & form analysis. Status: <span className="font-semibold capitalize">{permissions.camera}</span></p>
                </div>
                <Switch
                  checked={settings.recordWorkouts}
                  onCheckedChange={() => handlePermissionSwitch('recordWorkouts', 'video', 'Camera')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Audio */}
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
                <Switch checked={settings.voiceGuidance} onCheckedChange={(c) => updateSetting('voiceGuidance', c)} />
              </div>
              <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                <div>
                  <Label className="font-medium text-foreground">Sound Effects</Label>
                  <p className="text-sm text-gray-400">For timers and counters</p>
                </div>
                <Switch checked={settings.soundEffects} onCheckedChange={(c) => updateSetting('soundEffects', c)} />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                  <div>
                    <Label className="font-medium text-foreground">Timer Countdown Beeps</Label>
                    <p className="text-sm text-gray-400">Beeps during last 3 seconds of timers</p>
                  </div>
                  <Switch checked={settings.enableTimerBeeps} onCheckedChange={(c) => updateSetting('enableTimerBeeps', c)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Timer Beeps Volume</Label>
                  <Slider
                    value={settings.audioLevels?.timerBeeps || [50]}
                    onValueChange={(value) => updateSetting('audioLevels', { ...settings.audioLevels, timerBeeps: value })}
                    max={100} step={5} className="w-full" disabled={!settings.enableTimerBeeps}
                  />
                  <div className="text-right text-sm text-gray-400">{settings.audioLevels?.timerBeeps?.[0] || 50}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display */}
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
                <Switch checked={settings.darkMode} onCheckedChange={(c) => updateSetting('darkMode', c)} />
              </div>
              <div className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                <div>
                  <Label className="font-medium text-foreground">Large Text</Label>
                  <p className="text-sm text-gray-400">Increase text size for readability</p>
                </div>
                <Switch checked={settings.largeText} onCheckedChange={(c) => updateSetting('largeText', c)} />
              </div>
            </CardContent>
          </Card>

          {/* Workout */}
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
                <Switch checked={settings.autoStart} onCheckedChange={(c) => updateSetting('autoStart', c)} />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Default Rest Time (seconds)</Label>
                <Slider value={settings.defaultRestTime} onValueChange={(v) => updateSetting('defaultRestTime', v)} min={10} max={120} step={5} />
                <div className="text-sm text-gray-400 text-right">{settings.defaultRestTime[0]}s</div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          {!isLoadingUser && user && (
            <Card className="bg-card border-red-500/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-red-500">
                  <AlertTriangle className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                  <h3 className="font-semibold text-red-400 mb-2">Delete Account</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Permanently deletes your account and all associated data. This cannot be undone.
                  </p>
                  <Button
                    onClick={() => setShowDeleteModal(true)}
                    variant="outline"
                    className="w-full bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20 select-none"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete My Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Legal */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4 text-sm justify-center">
                <Link to={createPageUrl("Terms")} className="text-brand-blue hover:underline">Terms of Service</Link>
                <span className="text-gray-600">•</span>
                <Link to={createPageUrl("Privacy")} className="text-brand-blue hover:underline">Privacy Policy</Link>
                <span className="text-gray-600">•</span>
                <Link to={createPageUrl("Disclaimer")} className="text-brand-blue hover:underline">Health Disclaimer</Link>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4 pb-24 md:pb-4">
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