import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Users, Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";

export default function Referrals() {
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState([]);
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserAndReferrals();
  }, []);

  const loadUserAndReferrals = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Generate or get referral code
      let code = currentUser.referral_code;
      if (!code) {
        // Generate unique code from email
        code = currentUser.email.split('@')[0].toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
        await base44.auth.updateMe({ referral_code: code });
      }
      setReferralCode(code);
      
      // Load referrals
      const referralData = await base44.entities.Referral.filter({ referral_code: code });
      setReferrals(referralData);
    } catch (error) {
      console.error('Failed to load referrals:', error);
    }
    setIsLoading(false);
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    const text = `Join me on RepsAndSteps - the best fitness tracking app! Use my code: ${referralCode} and we both get 1 month of Pro FREE! 💪 ${link}`;
    
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Referral message copied!');
    }
  };

  const completedReferrals = referrals.filter(r => r.status === 'completed' || r.status === 'rewarded').length;
  const pendingReferrals = referrals.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Referral Program</h1>
          <p className="text-white/90">Share the fitness journey and get rewarded!</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* How It Works */}
        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/50 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Gift className="w-6 h-6 text-purple-400" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0">1</div>
              <div>
                <div className="font-semibold text-white">Share Your Link</div>
                <div className="text-sm text-gray-300">Send your unique referral link to friends and family</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0">2</div>
              <div>
                <div className="font-semibold text-white">They Sign Up</div>
                <div className="text-sm text-gray-300">Your friend creates an account and completes their first workout</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0">3</div>
              <div>
                <div className="font-semibold text-white">You Both Win!</div>
                <div className="text-sm text-gray-300">You both get 1 month of Pro FREE! 🎉</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-green-400">{completedReferrals}</div>
              <div className="text-sm text-gray-400">Successful Referrals</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <Gift className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-purple-400">{completedReferrals}</div>
              <div className="text-sm text-gray-400">Months Earned</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-yellow-400">{pendingReferrals}</div>
              <div className="text-sm text-gray-400">Pending</div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Link */}
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle>Your Referral Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Your Unique Code</label>
              <div className="flex gap-2">
                <Input
                  value={referralCode}
                  readOnly
                  className="font-mono text-lg font-bold text-brand-blue"
                />
                <Button
                  onClick={copyReferralLink}
                  className={`${copied ? 'bg-green-500' : 'gradient-bg'}`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Full Link</label>
              <div className="bg-background p-3 rounded-lg border border-border text-sm font-mono break-all">
                {`${window.location.origin}?ref=${referralCode}`}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={copyReferralLink} variant="outline" className="flex-1">
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button onClick={shareReferral} className="gradient-bg flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Referral History */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-4">No referrals yet. Start sharing your link!</p>
                <Button onClick={shareReferral} className="gradient-bg">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Now
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-4 bg-background rounded-lg border border-border">
                    <div>
                      <div className="font-medium">{referral.referred_user_email || 'User'}</div>
                      <div className="text-sm text-gray-400">
                        {referral.status === 'completed' || referral.status === 'rewarded' 
                          ? '✅ Completed - Reward granted!' 
                          : '⏳ Pending - Waiting for first workout'}
                      </div>
                    </div>
                    {referral.status === 'completed' || referral.status === 'rewarded' ? (
                      <div className="text-green-400 font-bold">+1 Month</div>
                    ) : (
                      <div className="text-yellow-400 font-bold">Pending</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}