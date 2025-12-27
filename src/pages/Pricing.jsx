import React, { useState } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Check, Star, Zap, ExternalLink, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

export default function Pricing() {
  const navigate = useNavigate();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isPro, setIsPro] = useState(false);

  React.useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const user = await User.me();
        setIsPro(user.subscription_status === 'pro');
      } catch (error) {
        // User not logged in
      }
    };
    checkUserStatus();
  }, []);

  const handleStripeCheckout = (plan) => {
    // Monthly: $9.99/month
    // Lifetime: $199.99 one-time
    const links = {
      monthly: 'https://buy.stripe.com/7sY8wP4lMg188m0bkVbQY01',
      lifetime: 'https://buy.stripe.com/9B68wPbOecOW8m0dt3bQY0h'
    };
    window.open(links[plan], '_blank');
  };

  const freeFeatures = [
    "Access to 20+ exercises",
    "Rep-based & Time-based workouts", 
    "Workout history tracking",
    "Manual workout creation"
  ];

  const proFeatures = [
    "Everything in Free, plus:",
    "AI Randomizer for unique workouts",
    "Advanced workout statistics",
    "Priority customer support",
    "Early access to new features"
  ];

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }}>
      <div className="gradient-bg text-white py-12">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Upgrade to Pro</h1>
          <p className="text-xl md:text-2xl text-white/90">
            Unlock advanced features and take your training to the next level
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {/* Payment Instructions */}
        {!isPro && (
          <div className="max-w-2xl mx-auto mb-8">
            <Card className="bg-card border-blue-500/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="w-6 h-6 text-brand-blue" />
                  <h3 className="text-lg font-semibold text-foreground">How to Upgrade</h3>
                </div>
                <ol className="space-y-2 text-gray-300 mb-4">
                  <li>1. Click "Purchase Pro Access" below to pay via Stripe</li>
                  <li>2. After successful payment, return here and click "Activate Pro"</li>
                  <li>3. Your Pro features will be instantly unlocked!</li>
                </ol>
                <p className="text-sm text-gray-400">
                  <strong>Note:</strong> Keep this page open while making your payment for easy activation.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Free Tier */}
          <motion.div whileHover={{ y: -5 }}>
            <Card className="h-full bg-card border-border">
              <CardHeader>
                <CardTitle className="text-2xl">Free</CardTitle>
                <p className="text-gray-400">Perfect for getting started</p>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-6">$0<span className="text-lg font-normal text-gray-400">/month</span></div>
                <ul className="space-y-3 text-gray-300">
                  {freeFeatures.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" disabled={!isPro}>
                  {isPro ? "You have Pro!" : "Current Plan"}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Pro Monthly */}
          <motion.div whileHover={{ y: -5 }}>
            <Card className="h-full border-brand-blue border-2 shadow-xl bg-card relative overflow-hidden">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Star className="w-6 h-6 text-yellow-400" />
                  Pro Monthly
                </CardTitle>
                <p className="text-gray-400">Flexible subscription</p>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">$9.99<span className="text-lg font-normal text-gray-400">/month</span></div>
                <p className="text-sm text-green-400 mb-6">Cancel anytime</p>
                <ul className="space-y-3 text-gray-300">
                  {proFeatures.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 font-medium">
                      <Zap className="w-5 h-5 text-brand-blue" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="space-y-3 flex-col">
                {isPro ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Check className="w-5 h-5 mr-2" />
                    You are a Pro Member!
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => handleStripeCheckout('monthly')}
                      className="w-full gradient-bg hover:opacity-90 font-bold"
                    >
                      <ExternalLink className="w-5 h-5 mr-2" />
                      Get Pro Monthly
                    </Button>

                    <p className="text-xs text-gray-500 text-center pt-2">
                      After payment, webhook auto-activates Pro status
                    </p>
                  </>
                )}
              </CardFooter>
            </Card>
          </motion.div>

          {/* Pro Lifetime */}
          <motion.div whileHover={{ y: -5 }}>
            <Card className="h-full border-yellow-400 border-2 shadow-2xl bg-card relative overflow-hidden">
              <div className="absolute top-0 right-0 px-4 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-sm rounded-bl-lg">
                BEST VALUE
              </div>
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Zap className="w-6 h-6 text-yellow-400" />
                  Pro Lifetime
                </CardTitle>
                <p className="text-gray-400">One payment, forever</p>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">$199.99<span className="text-lg font-normal text-gray-400"> once</span></div>
                <p className="text-sm text-green-400 mb-6">Save $120/year vs monthly!</p>
                <ul className="space-y-3 text-gray-300">
                  {proFeatures.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 font-medium">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-3 font-bold text-yellow-400">
                    <Star className="w-5 h-5" />
                    <span>Lifetime access - pay once!</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="space-y-3 flex-col">
                {isPro ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Check className="w-5 h-5 mr-2" />
                    You are a Pro Member!
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => handleStripeCheckout('lifetime')}
                      className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:opacity-90 text-black font-bold"
                    >
                      <ExternalLink className="w-5 h-5 mr-2" />
                      Get Lifetime Pro - $199.99
                    </Button>

                    <p className="text-xs text-gray-500 text-center pt-2">
                      After payment, webhook auto-activates Pro status
                    </p>
                  </>
                )}
              </CardFooter>
            </Card>
          </motion.div>
        </div>

        <div className="text-center mt-8">
          <Button variant="link" onClick={() => navigate(createPageUrl("Home"))} className="text-brand-blue hover:text-brand-blue/80">
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}