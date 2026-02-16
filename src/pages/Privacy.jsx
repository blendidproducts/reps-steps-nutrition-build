import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-white/90">Last Updated: February 16, 2026</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-green-400" />
              Your Privacy Matters
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none space-y-6 text-gray-300">
            <p>
              RepsAndSteps ("we", "us", "our") respects your privacy and is committed to protecting your personal data. 
              This Privacy Policy explains how we collect, use, and safeguard your information.
            </p>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">1. Information We Collect</h3>
              
              <h4 className="text-lg font-semibold text-white mt-4 mb-2">Personal Information:</h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>Email address and name (for account creation)</li>
                <li>Profile information (age, fitness level, goals)</li>
                <li>Payment information (processed securely by Stripe)</li>
              </ul>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">Usage Data:</h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>Workout sessions, exercises completed, reps, and duration</li>
                <li>Progress photos and body measurements (if you choose to upload)</li>
                <li>Nutrition logs and meal tracking data</li>
                <li>App usage statistics and preferences</li>
              </ul>

              <h4 className="text-lg font-semibold text-white mt-4 mb-2">Device Information:</h4>
              <ul className="list-disc pl-6 space-y-1">
                <li>Browser type and version</li>
                <li>Device type and operating system</li>
                <li>IP address and general location (city/country level)</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">2. How We Use Your Information</h3>
              <p className="mb-2">We use your data to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide and maintain the App's functionality</li>
                <li>Track your fitness progress and workouts</li>
                <li>Generate personalized workout and nutrition recommendations</li>
                <li>Process payments and manage subscriptions</li>
                <li>Send important updates and notifications (you can opt out)</li>
                <li>Improve the App based on usage patterns</li>
                <li>Provide customer support</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">3. Voice Control Fitness System (VCFS™)</h3>
              <p>
                When you use VCFS voice commands, audio is processed in real-time to recognize workout commands. 
                Voice data is NOT recorded, stored, or transmitted to our servers. All voice processing happens 
                locally in your browser using Web Speech API.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">4. Data Sharing & Third Parties</h3>
              <p className="mb-2">We DO NOT sell your personal data. We may share data with:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Stripe:</strong> For secure payment processing (subject to Stripe's Privacy Policy)</li>
                <li><strong>Service Providers:</strong> For app hosting and infrastructure (Base44 platform)</li>
                <li><strong>Analytics:</strong> Aggregated, anonymized usage data for app improvements</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              </ul>
              <p className="mt-2">
                We never share your workout data, progress photos, or personal fitness information with third parties 
                for marketing purposes.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">5. Data Security</h3>
              <p>
                We implement industry-standard security measures to protect your data, including encryption, 
                secure servers, and access controls. However, no method of transmission over the internet is 
                100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">6. Your Privacy Rights</h3>
              <p className="mb-2">You have the right to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data (via Settings)</li>
                <li><strong>Export:</strong> Download your workout history and progress data</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails at any time</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">7. Data Retention</h3>
              <p>
                We retain your data for as long as your account is active. If you delete your account, we will 
                delete or anonymize your personal data within 30 days, except where we're required to retain it 
                for legal or security purposes.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">8. Children's Privacy</h3>
              <p>
                RepsAndSteps is not intended for users under 13 years of age. We do not knowingly collect personal 
                data from children. If you believe we have collected data from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">9. International Users</h3>
              <p>
                Your data may be processed and stored in the United States or other countries where we or our 
                service providers operate. By using the App, you consent to the transfer of your data to these locations.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">10. Changes to Privacy Policy</h3>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of significant changes 
                via email or an in-app notification. Continued use after changes indicates acceptance.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">11. Contact Us</h3>
              <p>
                For privacy concerns or data requests, contact us at: <br />
                <a href="mailto:privacy@repsandsteps.com" className="text-brand-blue hover:underline">
                  privacy@repsandsteps.com
                </a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}