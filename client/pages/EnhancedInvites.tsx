import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../config/axios';

// Type definitions
interface Invite {
  id: string;
  invite_code: string;
  invite_type: 'free' | 'premium';
  status: 'active' | 'used' | 'cancelled';
  created_at: string;
  used_by_user?: {
    username: string;
    email: string;
  };
}

interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  invite_count: number;
}

interface Tracking {
  id: string;
  invite_code: string;
  used_by_user?: {
    username: string;
    email: string;
  };
  used_at: string;
  user_ip?: string;
}

interface Purchase {
  id: string;
  package?: Package;
  invite_count: number;
  price_paid: number;
  purchase_date: string;
  status: 'pending' | 'completed' | 'failed';
}

interface Stats {
  freeInvitesRemaining: number;
  totalInvitesGenerated: number;
  totalInvitesUsed: number;
  activeInvites: number;
  usedInvites: number;
  totalSpentOnInvites: number;
}

const EnhancedInvites = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [stats, setStats] = useState<Stats>({
    freeInvitesRemaining: 0,
    totalInvitesGenerated: 0,
    totalInvitesUsed: 0,
    activeInvites: 0,
    usedInvites: 0,
    totalSpentOnInvites: 0
  });
  const [tracking, setTracking] = useState<Tracking[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [navigate, currentPage]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // Fetch all data in parallel
      const [invitesRes, packagesRes, statsRes, trackingRes, purchasesRes] = await Promise.all([
        api.get('/api/enhanced-invites', config).catch(() => ({ data: { data: [], pagination: { pages: 1 } } })),
        api.get('/api/enhanced-invites/packages', config).catch(() => ({ data: { data: [] } })),
        api.get('/api/enhanced-invites/stats', config).catch(() => ({ data: { data: {} } })),
        api.get('/api/enhanced-invites/tracking', config).catch(() => ({ data: { data: [], pagination: { pages: 1 } } })),
        api.get('/api/enhanced-invites/purchases', config).catch(() => ({ data: { data: [], pagination: { pages: 1 } } }))
      ]);

      setInvites(invitesRes.data?.data || []);
      setPackages(packagesRes.data?.data || []);
      setStats(statsRes.data?.data || {});
      setTracking(trackingRes.data?.data || []);
      setPurchases(purchasesRes.data?.data || []);
      
      if (invitesRes.data?.pagination) {
        setTotalPages(invitesRes.data.pagination.pages);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 401) {
        navigate('/login');
        return;
      }
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateInviteCode = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/api/enhanced-invites/generate', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        alert(`Invite code generated successfully: ${response.data.data.invite_code}`);
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Error generating invite code:', error);
      alert(error.response?.data?.error || 'Failed to generate invite code');
    }
  };

  const purchasePackage = async () => {
    if (!selectedPackage) return;

    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/api/enhanced-invites/purchase', {
        packageId: selectedPackage.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        alert('Package purchased successfully!');
        setShowPurchaseModal(false);
        setSelectedPackage(null);
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Error purchasing package:', error);
      alert(error.response?.data?.error || 'Failed to purchase package');
    }
  };

  const cancelInvite = async (inviteId) => {
    if (!confirm('Are you sure you want to cancel this invite?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await api.put('/api/enhanced-invites/cancel-invite', {
        inviteId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        alert('Invite cancelled successfully');
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Error cancelling invite:', error);
      alert(error.response?.data?.error || 'Failed to cancel invite');
    }
  };

  const copyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    alert('Invite code copied to clipboard!');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-reaper-red';
      case 'used': return 'text-blue-500';
      case 'expired': return 'text-red-500';
      case 'cancelled': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return '🟢';
      case 'used': return '🔵';
      case 'expired': return '🔴';
      case 'cancelled': return '⚪';
      default: return '❓';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-reaper-black flex items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-pattern opacity-5"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-reaper-black via-reaper-dark-gray to-reaper-black opacity-90"></div>
        
        <div className="relative z-10 text-white text-xl">Loading invitation system...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-reaper-black flex items-center justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-pattern opacity-5"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-reaper-black via-reaper-dark-gray to-reaper-black opacity-90"></div>
        
        <div className="relative z-10 text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h3 className="text-lg font-medium text-white mb-2 font-reaper">Error Loading Invitation System</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="bg-reaper-red hover:bg-reaper-red-light text-white px-6 py-2 rounded-lg transition-all duration-300 border-glow-red"
          >
            Retry
          </button>
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
        {[...Array(8)].map((_, i) => (
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

      <div className="relative z-10 text-white p-6">
        {/* Header */}
        <div className="mb-8 animate-in slide-in-from-top duration-500">
          <h1 className="text-3xl font-bold text-reaper-red font-reaper text-glow-red animate-glow">🎯 Enhanced Invitation System</h1>
          <p className="text-gray-400 mt-2">Manage your invites with free codes and paid packages</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-in slide-in-from-left duration-700 delay-200">
          <div className="bg-reaper-dark-gray/80 p-6 rounded-lg border border-reaper-red/30 backdrop-blur-sm hover:border-reaper-red/50 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 bg-reaper-red rounded-lg animate-pulse">
                <span className="text-2xl">🆓</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Free Invites Left</p>
                <p className="text-2xl font-bold text-reaper-red animate-pulse">{stats.freeInvitesRemaining || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-reaper-dark-gray/80 p-6 rounded-lg border border-reaper-red/30 backdrop-blur-sm hover:border-reaper-red/50 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500 rounded-lg">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Total Generated</p>
                <p className="text-2xl font-bold">{stats.totalInvitesGenerated || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-reaper-dark-gray/80 p-6 rounded-lg border border-reaper-red/30 backdrop-blur-sm hover:border-reaper-red/50 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 bg-purple-500 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Total Used</p>
                <p className="text-2xl font-bold">{stats.totalInvitesUsed || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-reaper-dark-gray/80 p-6 rounded-lg border border-reaper-red/30 backdrop-blur-sm hover:border-reaper-red/50 transition-all duration-300">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-500 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-400">Total Spent</p>
                <p className="text-2xl font-bold">${(stats.totalSpentOnInvites || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8 animate-in slide-in-from-right duration-700 delay-400">
          <button
            onClick={generateInviteCode}
            disabled={stats.freeInvitesRemaining <= 0}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-[1.02] ${
              stats.freeInvitesRemaining > 0
                ? 'bg-reaper-red hover:bg-reaper-red-light text-white border-glow-red'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            🆓 Generate Free Invite
          </button>
          
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-all duration-300 hover:scale-[1.02]"
          >
            💰 Buy More Invites
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-reaper-dark-gray/80 rounded-lg p-6 mb-6 border border-reaper-red/30 backdrop-blur-sm animate-in slide-in-from-bottom duration-700 delay-600">
          <div className="flex space-x-1 mb-6">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'invites', label: 'My Invites', icon: '🎫' },
              { id: 'tracking', label: 'Usage Tracking', icon: '📈' },
              { id: 'purchases', label: 'Purchase History', icon: '🛒' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-[1.02] ${
                  activeTab === tab.id
                    ? 'bg-reaper-red text-white border-glow-red'
                    : 'bg-reaper-medium-gray text-gray-300 hover:bg-reaper-medium-gray/80'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-reaper-medium-gray/50 p-4 rounded-lg border border-reaper-red/20">
                  <h3 className="text-lg font-medium mb-3 text-reaper-red font-reaper">Available Packages</h3>
                  <div className="space-y-3">
                    {packages.map(pkg => (
                      <div key={pkg.id} className="flex justify-between items-center p-3 bg-reaper-dark-gray/50 rounded border border-reaper-red/10">
                        <div>
                          <p className="font-medium">{pkg.name}</p>
                          <p className="text-sm text-gray-400">{pkg.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-reaper-red">${pkg.price}</p>
                          <p className="text-sm text-gray-400">{pkg.invite_count} invites</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-reaper-medium-gray/50 p-4 rounded-lg border border-reaper-red/20">
                  <h3 className="text-lg font-medium mb-3 text-reaper-red font-reaper">Recent Activity</h3>
                  <div className="space-y-2">
                    {invites.slice(0, 5).map(invite => (
                      <div key={invite.id} className="flex justify-between items-center text-sm">
                        <span className="font-mono">{invite.invite_code}</span>
                        <span className={`${getStatusColor(invite.status)}`}>
                          {getStatusIcon(invite.status)} {invite.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'invites' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-reaper-red font-reaper">My Invite Codes</h3>
                <div className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-reaper-medium-gray/30">
                    <tr>
                      <th className="px-4 py-2 text-left font-reaper text-gray-300">Code</th>
                      <th className="px-4 py-2 text-left font-reaper text-gray-300">Type</th>
                      <th className="px-4 py-2 text-left font-reaper text-gray-300">Status</th>
                      <th className="px-4 py-2 text-left font-reaper text-gray-300">Created</th>
                      <th className="px-4 py-2 text-left font-reaper text-gray-300">Used By</th>
                      <th className="px-4 py-2 text-left font-reaper text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-reaper-red/20">
                    {invites.map(invite => (
                      <tr key={invite.id} className="hover:bg-reaper-medium-gray/20 transition-colors">
                        <td className="px-4 py-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono">{invite.invite_code}</span>
                            <button
                              onClick={() => copyInviteCode(invite.invite_code)}
                              className="text-reaper-red hover:text-reaper-red-light transition-colors"
                            >
                              📋
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            invite.invite_type === 'free' 
                              ? 'bg-reaper-red text-white' 
                              : 'bg-blue-600 text-white'
                          }`}>
                            {invite.invite_type}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`${getStatusColor(invite.status)}`}>
                            {getStatusIcon(invite.status)} {invite.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-400">
                          {formatDate(invite.created_at)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-400">
                          {invite.used_by_user ? (
                            <div>
                              <p>{invite.used_by_user.username}</p>
                              <p className="text-xs">{invite.used_by_user.email}</p>
                            </div>
                          ) : (
                            'Not used'
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {invite.status === 'active' && (
                            <button
                              onClick={() => cancelInvite(invite.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center space-x-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 bg-reaper-medium-gray hover:bg-reaper-red rounded disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-2 text-gray-400">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 bg-reaper-medium-gray hover:bg-reaper-red rounded disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tracking' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-reaper-red font-reaper">Invite Usage Tracking</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-reaper-medium-gray/30">
                    <tr>
                      <th className="px-4 py-2 text-left font-reaper text-gray-300">Invite Code</th>
                      <th className="px-4 py-2 text-left font-reaper text-gray-300">Used By</th>
                      <th className="px-4 py-2 text-left font-reaper text-gray-300">Used At</th>
                      <th className="px-4 py-2 text-left font-reaper text-gray-300">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-reaper-red/20">
                    {tracking.map(item => (
                      <tr key={item.id} className="hover:bg-reaper-medium-gray/20 transition-colors">
                        <td className="px-4 py-2 font-mono">{item.invite_code}</td>
                        <td className="px-4 py-2">
                          {item.used_by_user ? (
                            <div>
                              <p>{item.used_by_user.username}</p>
                              <p className="text-xs text-gray-400">{item.used_by_user.email}</p>
                            </div>
                          ) : (
                            'Unknown'
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-400">
                          {formatDate(item.used_at)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-400 font-mono">
                          {item.user_ip || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'purchases' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-reaper-red font-reaper">Purchase History</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-reaper-medium-gray/30">
                    <tr>
                      <th className="px-4 py-2 text-left font-reaper text-gray-300">Package</th>
                      <th className="px-4 py-2 text-left font-reaper text-gray-300">Invites</th>
                      <th className="px-4 py-2 text-left font-reaper text-gray-300">Price</th>
                      <th className="px-4 py-2 text-left font-reaper text-gray-300">Date</th>
                      <th className="px-4 py-2 text-left font-reaper text-gray-300">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-reaper-red/20">
                    {purchases.map(purchase => (
                      <tr key={purchase.id} className="hover:bg-reaper-medium-gray/20 transition-colors">
                        <td className="px-4 py-2">
                          <div>
                            <p className="font-medium">{purchase.package?.name}</p>
                            <p className="text-sm text-gray-400">{purchase.package?.description}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2">{purchase.invite_count}</td>
                        <td className="px-4 py-2 text-reaper-red font-bold">${purchase.price_paid}</td>
                        <td className="px-4 py-2 text-sm text-gray-400">
                          {formatDate(purchase.purchase_date)}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            purchase.status === 'completed' 
                              ? 'bg-reaper-red text-white' 
                              : 'bg-yellow-600 text-white'
                          }`}>
                            {purchase.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Purchase Modal */}
        {showPurchaseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-reaper-dark-gray p-6 rounded-lg max-w-md w-full mx-4 border border-reaper-red/30 backdrop-blur-sm">
              <h3 className="text-lg font-medium mb-4 text-reaper-red font-reaper">Purchase Invite Package</h3>
              <div className="space-y-4">
                {packages.map(pkg => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-300 ${
                      selectedPackage?.id === pkg.id
                        ? 'border-reaper-red bg-reaper-red/10 border-glow-red'
                        : 'border-reaper-red/30 hover:border-reaper-red/50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{pkg.name}</p>
                        <p className="text-sm text-gray-400">{pkg.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-reaper-red">${pkg.price}</p>
                        <p className="text-sm text-gray-400">{pkg.invite_count} invites</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowPurchaseModal(false)}
                  className="flex-1 px-4 py-2 bg-reaper-medium-gray hover:bg-reaper-dark-gray rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={purchasePackage}
                  disabled={!selectedPackage}
                  className={`flex-1 px-4 py-2 rounded-lg transition-all duration-300 ${
                    selectedPackage
                      ? 'bg-reaper-red hover:bg-reaper-red-light border-glow-red'
                      : 'bg-gray-600 cursor-not-allowed'
                  }`}
                >
                  Purchase
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedInvites;
