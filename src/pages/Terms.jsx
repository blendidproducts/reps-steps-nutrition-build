import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-white/90">Last Updated: February 16, 2026</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Agreement to Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none space-y-6 text-gray-300">
            <section>
              <h3 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h3>
              <p>
                By accessing and using RepsAndSteps ("the App"), you accept and agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use the App.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">2. Use of Service</h3>
              <p className="mb-2">You agree to use the App only for lawful purposes. You agree not to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use the App in any way that violates applicable laws or regulations</li>
                <li>Attempt to gain unauthorized access to the App or its systems</li>
                <li>Interfere with or disrupt the App's functionality</li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>Impersonate another person or misrepresent your affiliation</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">3. User Accounts</h3>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities 
                that occur under your account. You must notify us immediately of any unauthorized access or security breach.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">4. Subscription & Payments</h3>
              <p className="mb-2">
                RepsAndSteps offers both free and paid subscription plans ("Pro"). By purchasing a Pro subscription:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>You authorize us to charge your payment method for the subscription fee</li>
                <li>Monthly subscriptions automatically renew unless cancelled</li>
                <li>Lifetime subscriptions are one-time purchases with no recurring charges</li>
                <li>7-day trial subscriptions convert to paid plans unless cancelled before the trial ends</li>
                <li>Refunds are handled on a case-by-case basis within 14 days of purchase</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">5. Content & Intellectual Property</h3>
              <p>
                All content, features, and functionality of the App are owned by RepsAndSteps and are protected by 
                copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or 
                create derivative works without express written permission.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">6. User-Generated Content</h3>
              <p>
                You retain ownership of any content you create or upload (workouts, progress photos, etc.). By using 
                the App, you grant us a license to use, display, and process your content to provide the service.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">7. Health & Medical Disclaimer</h3>
              <p className="font-semibold text-yellow-400 mb-2">IMPORTANT HEALTH NOTICE:</p>
              <p>
                The App provides fitness tracking and exercise information for educational purposes only. It is NOT 
                intended as medical advice, diagnosis, or treatment. Always consult with a qualified healthcare 
                provider before starting any exercise program. Use the App at your own risk.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">8. Limitation of Liability</h3>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, RepsAndSteps SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP, INCLUDING BUT NOT LIMITED 
                TO PERSONAL INJURY, LOST PROFITS, OR DATA LOSS.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">9. Termination</h3>
              <p>
                We reserve the right to suspend or terminate your account at any time for violation of these Terms or 
                for any other reason. You may terminate your account at any time through the Settings page.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">10. Changes to Terms</h3>
              <p>
                We may update these Terms from time to time. Continued use of the App after changes constitutes 
                acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">11. Contact Information</h3>
              <p>
                For questions about these Terms, contact us at: <br />
                <a href="mailto:info@repsandsteps.com" className="text-brand-blue hover:underline">
                  info@repsandsteps.com
                </a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}