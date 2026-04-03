import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MissingAssets() {
  const [exercises, setExercises] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchExercises() {
      try {
        const data = await base44.entities.Exercise.list();
        // Remove duplicates by name
        const uniqueExercises = data.filter((exercise, index, self) => 
          !exercise.is_deleted && index === self.findIndex(e => e.name?.toLowerCase() === exercise.name?.toLowerCase())
        );
        setExercises(uniqueExercises);
      } catch (err) {
        console.error(err);
      }
      setIsLoading(false);
    }
    fetchExercises();
  }, []);

  const missingImage = exercises.filter(e => !e.image_url || e.image_url.trim() === '').map(e => e.name).sort();
  const missingYoutube = exercises.filter(e => !e.youtube_url || e.youtube_url.trim() === '').map(e => e.name).sort();

  return (
    <div className="p-6 bg-background text-foreground min-h-screen pb-24">
      <h1 className="text-2xl font-bold mb-6">Missing Assets Report</h1>
      {isLoading ? (
        <p>Loading exercises...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Missing Images ({missingImage.length})</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto">
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {missingImage.map((name, i) => <li key={i}>{name}</li>)}
              </ul>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Missing YouTube Videos ({missingYoutube.length})</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto">
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {missingYoutube.map((name, i) => <li key={i}>{name}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}