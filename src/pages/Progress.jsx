import React, { useState, useEffect } from "react";
import { ProgressPhoto } from "@/entities/ProgressPhoto";
import { base44 } from "@/api/base44Client";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, Trash2, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Progress() {
  const [photos, setPhotos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    photo_date: new Date().toISOString().split('T')[0],
    weight_lbs: '',
    notes: '',
    tags: []
  });

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    const data = await ProgressPhoto.list('-photo_date');
    setPhotos(data);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await ProgressPhoto.create({
        photo_url: file_url,
        photo_date: uploadForm.photo_date,
        weight_lbs: uploadForm.weight_lbs ? parseFloat(uploadForm.weight_lbs) : null,
        notes: uploadForm.notes,
        tags: uploadForm.tags
      });

      toast.success('Progress photo uploaded!');
      setUploadForm({
        photo_date: new Date().toISOString().split('T')[0],
        weight_lbs: '',
        notes: '',
        tags: []
      });
      loadPhotos();
    } catch (error) {
      toast.error('Failed to upload photo');
    }
    setIsUploading(false);
  };

  const deletePhoto = async (id) => {
    if (confirm('Delete this progress photo?')) {
      await ProgressPhoto.delete(id);
      toast.success('Photo deleted!');
      loadPhotos();
    }
  };

  const toggleTag = (tag) => {
    setUploadForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const availableTags = ['front', 'side', 'back', 'flexing', 'progress'];

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb' }}>
      <div className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Progress Photos</h1>
          <p className="text-lg text-white/90">
            Track your transformation with visual progress
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Upload Section */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-brand-blue" />
              Upload New Photo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>Photo Date</Label>
                  <Input
                    type="date"
                    value={uploadForm.photo_date}
                    onChange={(e) => setUploadForm({...uploadForm, photo_date: e.target.value})}
                    className="bg-background border-border text-foreground"
                  />
                </div>

                <div>
                  <Label>Weight (lbs) - Optional</Label>
                  <Input
                    type="number"
                    value={uploadForm.weight_lbs}
                    onChange={(e) => setUploadForm({...uploadForm, weight_lbs: e.target.value})}
                    placeholder="Enter your weight"
                    className="bg-background border-border text-foreground"
                  />
                </div>

                <div>
                  <Label>Tags</Label>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {availableTags.map(tag => (
                      <Badge
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`cursor-pointer capitalize ${
                          uploadForm.tags.includes(tag)
                            ? 'bg-brand-blue text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={uploadForm.notes}
                    onChange={(e) => setUploadForm({...uploadForm, notes: e.target.value})}
                    placeholder="How are you feeling? Any milestones?"
                    className="bg-background border-border text-foreground h-24"
                  />
                </div>

                <div>
                  <Label htmlFor="photo-upload" className="block mb-2">Select Photo</Label>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                  <label htmlFor="photo-upload">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-brand-blue transition-colors bg-background">
                      {isUploading ? (
                        <div className="text-brand-blue">Uploading...</div>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 mx-auto mb-2 text-gray-500" />
                          <p className="text-gray-400">Click to upload photo</p>
                          <p className="text-xs text-gray-600 mt-1">JPG, PNG up to 10MB</p>
                        </>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos Grid */}
        {photos.length > 0 ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-brand-blue" />
              <h2 className="text-2xl font-bold">Your Journey ({photos.length} photos)</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {photos.map((photo) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Card className="bg-card border-border overflow-hidden">
                    <div className="relative h-64 bg-gray-800">
                      <img
                        src={photo.photo_url}
                        alt={`Progress ${format(new Date(photo.photo_date), 'MMM d, yyyy')}`}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePhoto(photo.id)}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(photo.photo_date), 'MMMM d, yyyy')}
                      </div>
                      
                      {photo.weight_lbs && (
                        <div className="text-lg font-bold mb-2">{photo.weight_lbs} lbs</div>
                      )}
                      
                      {photo.tags && photo.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap mb-2">
                          {photo.tags.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs bg-gray-700 text-gray-300 capitalize">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {photo.notes && (
                        <p className="text-sm text-gray-400 line-clamp-2">{photo.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <Camera className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold mb-2">No Progress Photos Yet</h3>
              <p className="text-gray-400">
                Start documenting your fitness journey with progress photos
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}