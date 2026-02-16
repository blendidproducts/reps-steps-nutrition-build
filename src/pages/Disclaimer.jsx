import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Health & Fitness Disclaimer</h1>
          <p className="text-white/90">Important Information Before You Start</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border-red-500/50 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-12 h-12 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-red-400 mb-3">PLEASE READ CAREFULLY</h2>
                <p className="text-white text-lg leading-relaxed">
                  RepsAndSteps provides fitness tracking and exercise information for educational and motivational 
                  purposes only. It is NOT a substitute for professional medical advice, diagnosis, or treatment.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              Medical Disclaimer
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none space-y-6 text-gray-300">
            <section>
              <h3 className="text-xl font-bold text-white mb-3">Consult Your Doctor First</h3>
              <p className="mb-2">
                <strong className="text-yellow-400">ALWAYS consult with a qualified healthcare provider before:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-2 text-white">
                <li>Starting any new exercise program</li>
                <li>Making significant changes to your fitness routine</li>
                <li>Beginning any nutrition or diet plan</li>
                <li>If you have any pre-existing medical conditions</li>
                <li>If you are pregnant, nursing, or planning to become pregnant</li>
                <li>If you are taking medications that may be affected by exercise</li>
                <li>If you experience any unusual symptoms during or after exercise</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">Exercise at Your Own Risk</h3>
              <p>
                Physical exercise carries inherent risks, including but not limited to muscle strain, joint injury, 
                cardiovascular complications, and other potential injuries. By using RepsAndSteps, you acknowledge 
                these risks and agree that you exercise at your own risk.
              </p>
              <p className="mt-4">
                <strong className="text-white">Stop exercising immediately and seek medical attention if you experience:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Chest pain or tightness</li>
                <li>Severe shortness of breath</li>
                <li>Dizziness or lightheadedness</li>
                <li>Unusual or irregular heartbeat</li>
                <li>Nausea or vomiting</li>
                <li>Severe joint or muscle pain</li>
                <li>Any other concerning symptoms</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">Not Professional Guidance</h3>
              <p>
                The App, including its AI-generated workouts and nutrition suggestions, does NOT provide professional 
                fitness training, personal training, or nutritional counseling. The information provided is generic 
                and not tailored to your specific health conditions, limitations, or needs.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">Proper Form & Technique</h3>
              <p>
                While we provide exercise descriptions and guidance, it is YOUR responsibility to:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Learn proper exercise form and technique</li>
                <li>Start with appropriate difficulty levels for your fitness level</li>
                <li>Use proper equipment and safety precautions</li>
                <li>Exercise in a safe environment</li>
                <li>Listen to your body and rest when needed</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">Nutrition Information</h3>
              <p>
                Calorie estimates, nutritional data, and meal suggestions are approximate and for informational 
                purposes only. Actual nutritional needs vary based on individual factors including age, weight, 
                height, metabolism, activity level, and health conditions.
              </p>
              <p className="mt-2">
                For personalized nutrition advice, consult a registered dietitian or nutritionist.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">Equipment & Environment Safety</h3>
              <p className="mb-2">You are responsible for:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Ensuring you have adequate space for exercises</li>
                <li>Using appropriate footwear and clothing</li>
                <li>Maintaining proper hydration before, during, and after workouts</li>
                <li>Exercising in a safe, well-lit, and properly ventilated area</li>
                <li>Having proper supervision when needed (especially for advanced exercises)</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">Results May Vary</h3>
              <p>
                Individual results from using the App will vary based on numerous factors including genetics, 
                starting fitness level, consistency, effort, nutrition, sleep, stress, and other lifestyle factors. 
                We make no guarantees about specific outcomes or results.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">Voice Control System (VCFS™)</h3>
              <p>
                The Voice Control Fitness System is a convenience feature and should not replace visual monitoring 
                of your form and surroundings. Always maintain awareness of your environment during workouts, 
                especially when using voice commands.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">Limitation of Liability</h3>
              <p>
                TO THE FULLEST EXTENT PERMITTED BY LAW, RepsAndSteps, its developers, and affiliates SHALL NOT BE 
                LIABLE FOR ANY INJURIES, DAMAGES, OR LOSSES resulting from your use of the App or participation in 
                exercises suggested by the App. You expressly agree to release and hold harmless RepsAndSteps from 
                any and all claims, actions, or losses.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-white mb-3">Acknowledgment</h3>
              <p className="text-white text-lg">
                By using RepsAndSteps, you acknowledge that you have read, understood, and agree to this disclaimer. 
                You confirm that you are physically capable of exercising and assume full responsibility for your 
                health and safety while using the App.
              </p>
            </section>

            <section className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-white font-semibold text-center text-lg">
                ⚠️ When in doubt, consult a healthcare professional. Your health and safety are your responsibility.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}