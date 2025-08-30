import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Downloads = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [downloads, setDownloads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    
    loadDownloads();
    loadCategories();
  }, [user, navigate]);

  const loadDownloads = async () => {
    setIsLoading(true);
    try {
      // Simulated data - in real app, fetch from API
      const mockDownloads = [
        {
          id: 1,
          name: 'Reaper Market Bot v2.1',
          description: 'Advanced automation bot for Reaper Market with enhanced features',
          category: 'Automation',
          version: '2.1.0',
          size: '15.2 MB',
          downloads: 1247,
          rating: 4.8,
          lastUpdated: '2024-01-15',
          downloadUrl: '#',
          isPremium: true,
          tags: ['automation', 'reaper', 'bot', 'premium']
        },
        {
          id: 2,
          name: 'BIN Checker Pro',
          description: 'Professional BIN validation tool with extensive database',
          category: 'tools',
          version: '1.5.2',
          size: '8.7 MB',
          downloads: 8920,
          rating: 4.9,
          lastUpdated: '2024-01-12',
          downloadUrl: '#',
          isPremium: false,
          tags: ['bin', 'validation', 'credit-cards', 'free']
        },
        {
          id: 3,
          name: 'Card Generator Suite',
          description: 'Complete suite for generating and validating credit card data',
          category: 'tools',
          version: '3.0.1',
          size: '22.1 MB',
          downloads: 12350,
          rating: 4.7,
          lastUpdated: '2024-01-10',
          downloadUrl: '#',
          isPremium: true,
          tags: ['generator', 'cards', 'validation', 'premium']
        },
        {
          id: 4,
          name: 'Reaper Market API Client',
          description: 'Official API client for integrating with Reaper Market services',
          category: 'development',
          version: '1.2.0',
          size: '5.3 MB',
          downloads: 4560,
          rating: 4.6,
          lastUpdated: '2024-01-08',
          downloadUrl: '#',
          isPremium: false,
          tags: ['api', 'client', 'development', 'free']
        },
        {
          id: 5,
          name: 'Market Analysis Toolkit',
          description: 'Advanced analytics and reporting tools for market research',
          category: 'analytics',
          version: '2.3.4',
          size: '18.9 MB',
          downloads: 6780,
          rating: 4.8,
          lastUpdated: '2024-01-05',
          downloadUrl: '#',
          isPremium: true,
          tags: ['analytics', 'research', 'reports', 'premium']
        },
        {
          id: 6,
          name: 'Security Scanner Pro',
          description: 'Comprehensive security scanning and vulnerability assessment tool',
          category: 'security',
          version: '1.8.7',
          size: '12.4 MB',
          downloads: 9870,
          rating: 4.9,
          lastUpdated: '2024-01-03',
          downloadUrl: '#',
          isPremium: true,
          tags: ['security', 'scanner', 'vulnerability', 'premium']
        }
      ];
      
      setDownloads(mockDownloads);
    } catch (error) {
      console.error('Failed to load downloads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      // Simulated categories
      const mockCategories = [
        { id: 'all', name: 'All Downloads', count: 6 },
        { id: 'bots', name: 'Bots & Automation', count: 1 },
        { id: 'tools', name: 'Tools & Utilities', count: 2 },
        { id: 'development', name: 'Development', count: 1 },
        { id: 'analytics', name: 'Analytics', count: 1 },
        { id: 'security', name: 'Security', count: 1 }
      ];
      
      setCategories(mockCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleDownload = async (download) => {
    try {
      // In a real app, this would trigger the actual download
      console.log(`Downloading: ${download.name}`);
      
      // Simulate download process
      alert(`Starting download of ${download.name}...`);
      
      // Track download in analytics
      // await fetch('/api/downloads/track', { method: 'POST', body: JSON.stringify({ downloadId: download.id }) });
      
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to start download');
    }
  };

  const filteredDownloads = downloads.filter(download => {
    const matchesCategory = selectedCategory === 'all' || download.category === selectedCategory;
    const matchesSearch = download.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         download.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         download.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (category) => {
    const icons = {
      bots: '����',
      tools: '🔧',
      development: '💻',
      analytics: '📊',
      security: '🔒'
    };
    return icons[category] || '📁';
  };

  const getRatingStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div className="flex items-center space-x-1">
        {[...Array(fullStars)].map((_, i) => (
          <span key={i} className="text-reaper-red">★</span>
        ))}
        {hasHalfStar && <span className="text-reaper-red">☆</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={i} className="text-gray-400">☆</span>
        ))}
        <span className="ml-2 text-sm text-gray-400">({rating})</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-reaper-black flex items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-pattern opacity-5"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-reaper-black via-reaper-dark-gray to-reaper-black opacity-90"></div>
        
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-reaper-red mx-auto mb-4"></div>
          <p className="text-gray-400">Loading downloads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-reaper-black relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-pattern opacity-5"></div>
      
      {/* Dark overlay with red gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-reaper-black via-reaper-dark-gray to-reaper-black opacity-90"></div>

      {/* Floating red particles effect */}
      <div className="absolute inset-0">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-reaper-red rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 animate-in slide-in-from-top duration-500">
            <h1 className="text-3xl font-bold text-reaper-red mb-2 font-reaper text-glow-red animate-glow">Downloads</h1>
            <p className="text-gray-400">Access tools, bots, and utilities for Reaper Market</p>
          </div>

          {/* Search and Filters */}
          <div className="bg-reaper-dark-gray/80 rounded-lg p-6 mb-6 border border-reaper-red/30 backdrop-blur-sm animate-in slide-in-from-left duration-700 delay-200">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search downloads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-reaper-medium-gray border border-reaper-red/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-reaper-red focus:border-reaper-red transition-all duration-300"
                />
              </div>
              
              {/* Category Filter */}
              <div className="md:w-64">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-reaper-medium-gray border border-reaper-red/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-reaper-red"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Downloads Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom duration-700 delay-400">
            {filteredDownloads.map(download => (
              <div key={download.id} className="bg-reaper-dark-gray/80 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 border border-reaper-red/30 backdrop-blur-sm hover:border-reaper-red/50 hover:scale-[1.02]">
                {/* Header */}
                <div className="p-6 border-b border-reaper-red/20">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getCategoryIcon(download.category)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-white font-reaper">{download.name}</h3>
                        <p className="text-sm text-gray-400">v{download.version}</p>
                      </div>
                    </div>
                    {download.isPremium && (
                      <span className="bg-reaper-red text-white text-xs px-2 py-1 rounded-full animate-pulse">
                        PREMIUM
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-4">{download.description}</p>
                  
                  {/* Rating and Downloads */}
                  <div className="flex items-center justify-between">
                    {getRatingStars(download.rating)}
                    <span className="text-sm text-gray-400">
                      {download.downloads.toLocaleString()} downloads
                    </span>
                  </div>
                </div>
                
                {/* Details */}
                <div className="p-6 bg-reaper-medium-gray/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>📦 {download.size}</span>
                      <span>📅 {download.lastUpdated}</span>
                    </div>
                  </div>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {download.tags.map(tag => (
                      <span
                        key={tag}
                        className="bg-reaper-medium-gray text-gray-300 text-xs px-2 py-1 rounded border border-reaper-red/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  {/* Download Button */}
                  <button
                    onClick={() => handleDownload(download)}
                    className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 hover:scale-[1.02] ${
                      download.isPremium
                        ? 'bg-reaper-red hover:bg-reaper-red-light text-white border-glow-red'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {download.isPremium ? '🔓 Download Premium' : '⬇️ Download Free'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* No Results */}
          {filteredDownloads.length === 0 && (
            <div className="text-center py-12 animate-in fade-in duration-500">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-white mb-2 font-reaper">No downloads found</h3>
              <p className="text-gray-400">Try adjusting your search or category filters</p>
            </div>
          )}

          {/* Stats */}
          <div className="mt-12 bg-reaper-dark-gray/80 rounded-lg p-6 border border-reaper-red/30 backdrop-blur-sm animate-in slide-in-from-bottom duration-700 delay-600">
            <h3 className="text-xl font-semibold text-white mb-4 font-reaper text-reaper-red">Download Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-reaper-red mb-2 animate-pulse">
                  {downloads.length}
                </div>
                <div className="text-gray-300">Total Downloads</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {downloads.filter(d => !d.isPremium).length}
                </div>
                <div className="text-gray-300">Free Tools</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2">
                  {downloads.filter(d => d.isPremium).length}
                </div>
                <div className="text-gray-300">Premium Tools</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {downloads.reduce((sum, d) => sum + d.downloads, 0).toLocaleString()}
                </div>
                <div className="text-gray-300">Total Downloads</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Downloads;
