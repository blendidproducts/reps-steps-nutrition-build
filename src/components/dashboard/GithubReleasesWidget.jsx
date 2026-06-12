import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Github, Loader2, Search, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function GithubReleasesWidget() {
  const [repoStr, setRepoStr] = useState('facebook/react'); // Default repo example
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReleases = async (targetRepo) => {
    if (!targetRepo || !targetRepo.includes('/')) {
      setError('Please enter a valid owner/repo format (e.g. facebook/react)');
      return;
    }
    
    setLoading(true);
    setError(null);
    const [owner, repo] = targetRepo.split('/');
    
    try {
      const response = await base44.functions.invoke('getGithubReleases', { owner: owner.trim(), repo: repo.trim() });
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      setReleases(response.data.releases || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch releases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases(repoStr);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchReleases(repoStr);
  };

  return (
    <div className="bg-[#0a0e1a] border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Github className="w-5 h-5 text-gray-300" />
          <h2 className="text-lg font-bold text-white">Project Releases</h2>
        </div>
      </div>
      
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <Input 
          value={repoStr}
          onChange={(e) => setRepoStr(e.target.value)}
          placeholder="owner/repo (e.g. facebook/react)"
          className="bg-black/50 border-gray-800 text-sm text-white"
        />
        <Button type="submit" variant="secondary" size="icon" disabled={loading} className="bg-gray-800 hover:bg-gray-700 text-white">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </form>

      {error && <div className="text-red-400 text-xs mb-4">{error}</div>}

      <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] pr-2">
        {!loading && releases.length === 0 && !error && (
          <div className="text-center text-gray-500 text-sm py-4">No releases found</div>
        )}
        
        {releases.map((release) => (
          <a 
            key={release.id} 
            href={release.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-black/40 border border-gray-800 rounded-lg p-3 hover:border-gray-700 transition-colors group"
          >
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-blue-400">{release.tag_name}</span>
                {release.prerelease && <Badge variant="outline" className="text-[9px] py-0 border-orange-900 text-orange-400 bg-orange-900/20">Pre-release</Badge>}
              </div>
              <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-blue-400 transition-colors" />
            </div>
            <div className="text-xs text-gray-300 font-medium truncate mb-2">
              {release.name || release.tag_name}
            </div>
            <div className="text-[10px] text-gray-500">
              {format(new Date(release.published_at || release.created_at), 'MMM d, yyyy')}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}