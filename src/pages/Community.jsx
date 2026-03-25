import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Share2, Camera, TrendingUp, Users, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Community() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadPosts();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to load user');
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const allPosts = await base44.entities.CommunityPost.list('-created_date', 50);
      setPosts(allPosts);
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
    setLoading(false);
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedPhoto(file);
    }
  };

  const createPost = async () => {
    if (!caption.trim() && !selectedPhoto) {
      toast.error('Add a caption or photo');
      return;
    }

    setUploading(true);
    try {
      let photoUrl = null;
      
      if (selectedPhoto) {
        const uploadResult = await base44.integrations.Core.UploadFile({ file: selectedPhoto });
        photoUrl = uploadResult.file_url;
      }

      // Get latest workout stats to optionally share
      const sessions = await base44.entities.WorkoutSession.list('-created_date', 1);
      const latestSession = sessions[0];

      await base44.entities.CommunityPost.create({
        caption: caption.trim(),
        photo_url: photoUrl,
        workout_session_id: latestSession?.id,
        workout_stats: latestSession ? {
          total_reps: latestSession.total_reps,
          duration: latestSession.duration,
          calories: latestSession.calories_burned
        } : null,
        user_name: currentUser?.full_name || 'Anonymous',
        is_public: true
      });

      toast.success('Posted to community!');
      setCaption('');
      setSelectedPhoto(null);
      setShowCreatePost(false);
      loadPosts();
    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error('Failed to post');
    }
    setUploading(false);
  };

  const toggleLike = async (post) => {
    try {
      const userEmail = currentUser?.email;
      if (!userEmail) return;

      const likedBy = post.liked_by || [];
      const hasLiked = likedBy.includes(userEmail);

      await base44.entities.CommunityPost.update(post.id, {
        liked_by: hasLiked 
          ? likedBy.filter(email => email !== userEmail)
          : [...likedBy, userEmail],
        likes_count: hasLiked ? (post.likes_count || 0) - 1 : (post.likes_count || 0) + 1
      });

      loadPosts();
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#f9fafb', paddingBottom: '100px' }}>
      {/* Header */}
      <div className="gradient-bg text-white py-6 backdrop-blur-lg">
        <div className="container mx-auto px-4 max-w-2xl">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Community Feed
          </h1>
          <p className="text-sm text-white/90">Share your progress, inspire others</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Create Post Button */}
        <Button 
          onClick={() => setShowCreatePost(!showCreatePost)}
          className="w-full mb-6 gradient-bg text-white"
        >
          <Camera className="w-4 h-4 mr-2" />
          Share Your Progress
        </Button>

        {/* Create Post Form */}
        <AnimatePresence>
          {showCreatePost && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <Card className="bg-card/90 backdrop-blur-sm border-border">
                <CardContent className="p-4 space-y-3">
                  <Textarea
                    placeholder="Share your fitness journey... (e.g., 'Crushed leg day today! 💪')"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="min-h-[100px]"
                  />
                  
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="cursor-pointer"
                  />
                  
                  {selectedPhoto && (
                    <p className="text-sm text-green-400">Photo selected: {selectedPhoto.name}</p>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={createPost}
                      disabled={uploading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {uploading ? 'Posting...' : 'Post'}
                    </Button>
                    <Button 
                      onClick={() => setShowCreatePost(false)}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Posts Feed */}
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <Card key={i} className="bg-card/90 backdrop-blur-sm animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-700 rounded w-1/3 mb-3"></div>
                  <div className="h-40 bg-gray-700 rounded mb-3"></div>
                  <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card className="bg-card/90 backdrop-blur-sm border-border">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <h3 className="text-lg font-bold mb-2">No Posts Yet</h3>
              <p className="text-gray-400 mb-4">Be the first to share your progress!</p>
              <Button onClick={() => setShowCreatePost(true)} className="gradient-bg">
                Create First Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="bg-card/90 backdrop-blur-sm border-border overflow-hidden">
                  <CardContent className="p-0">
                    {/* Post Header */}
                    <div className="p-4 flex items-center gap-3 border-b border-border">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {post.user_name?.[0]?.toUpperCase() || 'A'}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{post.user_name || 'Anonymous'}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(post.created_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Post Photo */}
                    {post.photo_url && (
                      <div className="relative aspect-square bg-gray-900">
                        <img 
                          src={post.photo_url} 
                          alt="Progress" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Post Content */}
                    <div className="p-4">
                      <p className="mb-3">{post.caption}</p>

                      {/* Workout Stats */}
                      {post.workout_stats && (
                        <div className="flex gap-3 mb-3 text-xs">
                          {post.workout_stats.total_reps > 0 && (
                            <div className="bg-blue-500/20 px-2 py-1 rounded">
                              <Trophy className="w-3 h-3 inline mr-1" />
                              {post.workout_stats.total_reps} reps
                            </div>
                          )}
                          {post.workout_stats.duration > 0 && (
                            <div className="bg-green-500/20 px-2 py-1 rounded">
                              {formatTime(post.workout_stats.duration)}
                            </div>
                          )}
                          {post.workout_stats.calories > 0 && (
                            <div className="bg-orange-500/20 px-2 py-1 rounded">
                              {post.workout_stats.calories} cal
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-4 pt-2 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLike(post)}
                          className={`gap-2 ${
                            post.liked_by?.includes(currentUser?.email) 
                              ? 'text-red-400' 
                              : 'text-gray-400'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${
                            post.liked_by?.includes(currentUser?.email) ? 'fill-red-400' : ''
                          }`} />
                          {post.likes_count || 0}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}