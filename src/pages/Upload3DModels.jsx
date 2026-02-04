import React, { useState, useEffect } from "react";
import { Exercise } from "@/entities/Exercise";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Upload, Check, Loader2, Box, Search } from "lucide-react";
import { toast } from "sonner";
import Exercise3DViewer from "@/components/Exercise3DViewer";

export default function Upload3DModels() {
  const [exercises, setExercises] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadingFor, setUploadingFor] = useState(null);
  const [previewExercise, setPreviewExercise] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    setIsLoading(true);
    const data = await Exercise.list();
    setExercises(data.sort((a, b) => a.name.localeCompare(b.name)));
    setIsLoading(false);
  };

  const handleFileUpload = async (exerciseId, file) => {
    if (!file.name.endsWith('.glb') && !file.name.endsWith('.gltf')) {
      toast.error('Please upload a GLB or GLTF file');
      return;
    }

    setUploadingFor(exerciseId);
    
    try {
      // Upload file to server
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Update exercise with model URL
      await Exercise.update(exerciseId, { model_url: file_url });
      
      // Reload exercises
      await loadExercises();
      
      toast.success('3D model uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload model');
    } finally {
      setUploadingFor(null);
    }
  };

  const filteredExercises = exercises.filter(ex => 
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }}>
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Upload 3D Exercise Models</h1>
          <p className="text-white/80">Upload GLB files with animations for each exercise</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>

        {/* Instructions */}
        <Card className="bg-purple-500/10 border-purple-500/30 mb-6">
          <CardContent className="p-4">
            <h3 className="font-bold text-purple-300 mb-2">📦 How to Upload 3D Models</h3>
            <ol className="text-sm text-gray-300 space-y-1">
              <li>1. Get GLB files from Mixamo.com, Sketchfab.com, or Blender</li>
              <li>2. Click "Upload GLB" button for any exercise below</li>
              <li>3. Select your .glb file (must include animations)</li>
              <li>4. Model will appear in 3D viewer during workouts</li>
            </ol>
          </CardContent>
        </Card>

        {/* Exercise List */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-brand-blue mx-auto mb-4" />
            <p className="text-gray-400">Loading exercises...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredExercises.map((exercise) => (
              <Card key={exercise.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">{exercise.name}</h3>
                      <div className="flex gap-2 mb-3">
                        <Badge className="bg-blue-500/20 text-blue-300">
                          {exercise.category?.replace('_', ' ')}
                        </Badge>
                        {exercise.model_url && (
                          <Badge className="bg-green-500/20 text-green-300">
                            <Check className="w-3 h-3 mr-1" />
                            3D Model Added
                          </Badge>
                        )}
                      </div>
                      
                      {exercise.model_url && (
                        <Button
                          onClick={() => setPreviewExercise(exercise)}
                          size="sm"
                          variant="outline"
                          className="border-purple-500 text-purple-300 hover:bg-purple-500/20"
                        >
                          <Box className="w-4 h-4 mr-2" />
                          Preview 3D
                        </Button>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      <input
                        type="file"
                        accept=".glb,.gltf"
                        id={`upload-${exercise.id}`}
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files[0]) {
                            handleFileUpload(exercise.id, e.target.files[0]);
                          }
                        }}
                      />
                      <Button
                        onClick={() => document.getElementById(`upload-${exercise.id}`).click()}
                        disabled={uploadingFor === exercise.id}
                        className="bg-brand-blue hover:bg-brand-blue/80"
                      >
                        {uploadingFor === exercise.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload GLB
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewExercise && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewExercise(null)}
        >
          <Card className="bg-gray-900 w-full max-w-2xl border-gray-800" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-white">{previewExercise.name} - 3D Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full aspect-square bg-black rounded-lg mb-4 overflow-hidden">
                <Exercise3DViewer 
                  modelUrl={previewExercise.model_url} 
                  exerciseName={previewExercise.name}
                />
              </div>
              <Button onClick={() => setPreviewExercise(null)} className="w-full gradient-bg text-white">
                Close Preview
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}