import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, Image as ImageIcon, Video, Box, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";

export default function IncompleteExercises() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await base44.entities.Exercise.list();
        setExercises(data);
      } catch(e) {
        console.error("Failed to load exercises", e);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const getYouTubeVideoId = (name) => { 
    if (!name) return null;
    const map = {
      'push':'IODxDxX7oi4',
      'squat':'9cYEuFbBLSY',
      'plank':'pSHjTRCQxIw',
      'lunge':'QOVaHwm-Q6U',
      'burpee':'dZgVxmf6jkA',
      'pull':'eGo4IYlbE5g',
      'dip':'yN6Q1UI_xkE',
      'mountain climber':'nmwgirgXLYM',
      'jumping jack':'c4DAnQ6DtF8',
      'crunch':'5ER5Of4EISE'
    }; 
    const n = name.toLowerCase(); 
    for (const [k,v] of Object.entries(map)) {
      if (n.includes(k)) return v; 
    }
    return null; 
  };

  const getIncompleteIssues = (ex) => {
    const issues = [];
    if (!ex.image_url) issues.push('image');
    if (!getYouTubeVideoId(ex.name)) issues.push('youtube');
    if (!ex.model_url) issues.push('3d');
    if (!ex.instructions || ex.instructions.length === 0) issues.push('instructions');
    return issues;
  };

  const incompleteExercises = exercises
    .filter(ex => !ex.is_deleted)
    .map(ex => ({ ...ex, issues: getIncompleteIssues(ex) }))
    .filter(ex => ex.issues.length > 0 && ex.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.issues.length - a.issues.length);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Incomplete Exercises</h1>
              <p className="text-white/80">Exercises missing images, videos, 3D models, or instructions</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input 
            placeholder="Search exercises..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-10 bg-card border-border text-foreground"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {incompleteExercises.map(ex => (
              <Card key={ex.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-2">{ex.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {ex.issues.includes('image') && (
                      <Badge variant="destructive" className="flex items-center gap-1 bg-red-900/50 text-red-300 border-red-800"><ImageIcon className="w-3 h-3" /> Image</Badge>
                    )}
                    {ex.issues.includes('youtube') && (
                      <Badge variant="destructive" className="flex items-center gap-1 bg-orange-900/50 text-orange-300 border-orange-800"><Video className="w-3 h-3" /> YouTube</Badge>
                    )}
                    {ex.issues.includes('3d') && (
                      <Badge variant="destructive" className="flex items-center gap-1 bg-purple-900/50 text-purple-300 border-purple-800"><Box className="w-3 h-3" /> 3D Model</Badge>
                    )}
                    {ex.issues.includes('instructions') && (
                      <Badge variant="destructive" className="flex items-center gap-1 bg-blue-900/50 text-blue-300 border-blue-800"><FileText className="w-3 h-3" /> Instructions</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {incompleteExercises.length === 0 && (
              <div className="col-span-full text-center py-12 text-green-500 font-bold">
                All matched exercises have complete assets! 🎉
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}