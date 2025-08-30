import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Wallet from '../components/Wallet';
import CountryFlag from '../components/CountryFlag';
import DepositCreationModal from '../components/DepositCreationModal';
import { getCountryName, FLAG_SIZES } from '../utils/flags';
import { getAllBots } from '../data/botDatabase';
import api from '../config/axios';

const Dashboard = () => {
  console.log('Dashboard component loading...');
  const navigate = useNavigate();
  const { user } = useAuth();
  console.log('Dashboard - user from context:', user);
  
  const [botStats, setBotStats] = useState({
    overall: { country: 'Overall', last24h: 0, lastWeek: 0, lastMonth: 0, available: 0 },
    countries: []
  });

  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Deposit modal state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0);
  const [minimumDepositAmount, setMinimumDepositAmount] = useState(50.00);
  const [contentCounts, setContentCounts] = useState({ news: 0, wiki: 0 });

  // Load minimum deposit amount on component mount
  useEffect(() => {
    loadMinimumDepositAmount();
  }, []);

  // Load content counts on component mount
  useEffect(() => {
    loadContentCounts();
  }, []);

  const loadMinimumDepositAmount = async () => {
    try {
      const response = await api.get('/api/get-minimum-deposit');
      if (response.data.success) {
        setMinimumDepositAmount(response.data.minimumDepositAmount);
      }
    } catch (error) {
      console.error('Error loading minimum deposit amount:', error);
      setMinimumDepositAmount(50.00);
    }
  };

  const loadContentCounts = async () => {
    try {
      const response = await api.get('/api/content-stats?timePeriod=7d');
      if (response.data.success) {
        setContentCounts({
          news: response.data.stats.news.recent,
          wiki: response.data.stats.wiki.recent
        });
      }
    } catch (error) {
      console.error('Error loading content counts:', error);
    }
  };

  // Filter countries based on search
  const filteredCountries = botStats.countries.filter(country =>
    country.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getCountryName(country.code).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Paginate countries to reduce network requests
  const paginatedCountries = filteredCountries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredCountries.length / itemsPerPage);

  useEffect(() => {
    // Generate bot stats from real bot data
    const bots = getAllBots();
    
    // Group bots by country
    const countryStats = {};
    let overall24h = 0, overallWeek = 0, overallMonth = 0;
    
    bots.forEach(bot => {
      if (!countryStats[bot.country]) {
        countryStats[bot.country] = {
          code: bot.country,
          last24h: 0,
          lastWeek: 0,
          lastMonth: 0,
          available: 1
        };
      } else {
        countryStats[bot.country].available += 1;
      }
      
      // Add activity data
      countryStats[bot.country].last24h += bot.last24h || 0;
      countryStats[bot.country].lastWeek += bot.lastWeek || 0;
      countryStats[bot.country].lastMonth += bot.lastMonth || 0;
      
      overall24h += bot.last24h || 0;
      overallWeek += bot.lastWeek || 0;
      overallMonth += bot.lastMonth || 0;
    });
    
    // Convert to array and sort by available bots
    const countriesArray = Object.values(countryStats).sort((a, b) => b.available - a.available);
    
    setBotStats({
      overall: {
        country: 'Overall',
        last24h: overall24h,
        lastWeek: overallWeek,
        lastMonth: overallMonth,
        available: bots.length
      },
      countries: countriesArray
    });
  }, []);

  const fetchBotStats = async () => {
    setLoading(true);
    try {
      // This would be your actual API call
      // const response = await axios.get('/api/bots/stats');
      // setBotStats(response.data);
    } catch (error) {
      console.error('Error fetching bot stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  // Handle deposit button click
  const handleDepositFunds = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    setDepositAmount(minimumDepositAmount);
    setShowDepositModal(true);
  };

  // Handle deposit modal close
  const handleDepositModalClose = () => {
    setShowDepositModal(false);
    setDepositAmount(0);
  };

  return (
    <div className="min-h-screen bg-reaper-black relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-pattern opacity-5"></div>
      
      {/* Dark overlay with red gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-reaper-black via-reaper-dark-gray to-reaper-black opacity-90"></div>

      {/* Floating red particles effect */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
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

      <div className="relative z-10 space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-in slide-in-from-top duration-500">
          <h1 className="text-3xl font-bold font-reaper text-reaper-red text-glow-red animate-glow">Available Bots</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-400">Grouped by</span>
            <div className="bg-reaper-dark-gray p-2 rounded border border-reaper-red/30">
              <svg className="w-5 h-5 text-reaper-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Wallet Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-left duration-700 delay-200">
          <div className="md:col-span-2">
            <Wallet />
          </div>
          <div className="bg-reaper-dark-gray/80 rounded-lg p-4 border border-reaper-red/30 backdrop-blur-sm border-glow-red">
            <h3 className="text-lg font-semibold text-white mb-3 font-reaper">Quick Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={handleDepositFunds}
                className="w-full px-4 py-2 bg-reaper-red hover:bg-reaper-red-light text-white rounded-md transition-all duration-300 hover:scale-[1.02] border-glow-red"
              >
                Deposit Funds
              </button>
              
              <button 
                onClick={() => navigate('/profile')}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-all duration-300 hover:scale-[1.02]"
              >
                Profile
              </button>
              <button 
                onClick={() => navigate('/deposits')}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-all duration-300 hover:scale-[1.02]"
              >
                View Transactions
              </button>
            </div>
          </div>
        </div>

        {/* Stats Table */}
        <div className="bg-reaper-dark-gray/80 rounded-lg border border-reaper-red/30 overflow-hidden backdrop-blur-sm border-glow-red animate-in slide-in-from-right duration-700 delay-400">
          {/* Table Header with Summary */}
          <div className="bg-reaper-medium-gray/50 px-6 py-4 border-b border-reaper-red/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white font-reaper">Botnet Statistics by Country</h3>
                <p className="text-sm text-gray-400">
                  {botStats.countries.length} countries • {formatNumber(botStats.overall.available)} total bots available
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-reaper-red animate-pulse">+{botStats.overall.last24h}</div>
                  <div className="text-xs text-gray-400">Last 24h</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{formatNumber(botStats.overall.lastWeek)}</div>
                  <div className="text-xs text-gray-400">This Week</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{formatNumber(botStats.overall.lastMonth)}</div>
                  <div className="text-xs text-gray-400">This Month</div>
                </div>
              </div>
            </div>
            
            {/* Country Filter */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchQuery}
                  className="w-full px-3 py-2 bg-reaper-medium-gray border border-reaper-red/30 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-reaper-red focus:border-reaper-red transition-all duration-300"
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">Sort by:</span>
                <select className="px-3 py-2 bg-reaper-medium-gray border border-reaper-red/30 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-reaper-red">
                  <option value="available">Available Bots</option>
                  <option value="last24h">Last 24h</option>
                  <option value="lastWeek">Last Week</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="country">Country Name</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-reaper-medium-gray/30">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-reaper">
                    COUNTRY
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-reaper">
                    LAST 24H
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-reaper">
                    LAST WEEK
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-reaper">
                    LAST MONTH
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-reaper">
                    AVAILABLE
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-reaper-red/20">
                {/* Overall Row */}
                <tr className="bg-reaper-red/10 hover:bg-reaper-red/20 transition-colors border-glow-red">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-reaper-red rounded-full mr-3 flex items-center justify-center animate-pulse">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white font-medium font-reaper">Overall</span>
                        <span className="text-xs text-reaper-red">Global Botnet</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-reaper-red font-medium animate-pulse">+{botStats.overall.last24h}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-reaper-red font-medium">+{formatNumber(botStats.overall.lastWeek)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-reaper-red font-medium">+{formatNumber(botStats.overall.lastMonth)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-reaper-red hover:text-reaper-red-light font-medium transition-colors">
                      {formatNumber(botStats.overall.available)}
                    </button>
                  </td>
                </tr>

                {/* Country Rows */}
                {paginatedCountries.map((country, index) => (
                  <tr key={country.code} className="hover:bg-reaper-medium-gray/20 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="mr-3 transform hover:scale-110 transition-transform group-hover:ring-2 group-hover:ring-reaper-red group-hover:ring-opacity-50 rounded">
                          <CountryFlag 
                            countryCode={country.code} 
                            size={FLAG_SIZES.SMALL}
                            showTooltip={true}
                            className="rounded shadow-sm"
                          />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{country.code}</span>
                            {country.last24h > 20 && (
                              <span className="px-2 py-1 text-xs bg-reaper-red text-white rounded-full animate-pulse">Hot</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">{getCountryName(country.code)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium ${country.last24h > 20 ? 'text-reaper-red animate-pulse' : country.last24h > 10 ? 'text-yellow-400' : 'text-gray-400'}`}>
                        +{country.last24h}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-reaper-red font-medium">+{country.lastWeek}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-reaper-red font-medium">+{country.lastMonth}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="text-reaper-red hover:text-reaper-red-light font-medium transition-colors">
                        {formatNumber(country.available)}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-reaper-medium-gray/30 px-6 py-4 border-t border-reaper-red/20">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCountries.length)} of {filteredCountries.length} countries
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm bg-reaper-medium-gray text-white rounded hover:bg-reaper-red disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-2 text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm bg-reaper-medium-gray text-white rounded hover:bg-reaper-red disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Stats */}
        <div className="bg-reaper-dark-gray/80 rounded-lg border border-reaper-red/30 p-6 backdrop-blur-sm animate-in slide-in-from-bottom duration-700 delay-600">
          <h3 className="text-lg font-semibold text-white mb-4 font-reaper">📊 Content Overview (Last 7 Days)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-reaper-medium-gray/50 rounded-lg p-4 border border-reaper-red/20 hover:border-reaper-red/40 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium">📰 News Updates</h4>
                  <p className="text-gray-400 text-sm">New articles published</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-reaper-red animate-pulse">{contentCounts.news}</div>
                  <button 
                    onClick={() => navigate('/news')}
                    className="text-reaper-red hover:text-reaper-red-light text-sm font-medium transition-colors"
                  >
                    View All →
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-reaper-medium-gray/50 rounded-lg p-4 border border-reaper-red/20 hover:border-reaper-red/40 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium">ℹ️ Wiki Entries</h4>
                  <p className="text-gray-400 text-sm">New documentation added</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-purple-400">{contentCounts.wiki}</div>
                  <button 
                    onClick={() => navigate('/wiki')}
                    className="text-reaper-red hover:text-reaper-red-light text-sm font-medium transition-colors"
                  >
                    View All →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom duration-700 delay-800">
          <div className="bg-reaper-dark-gray/80 p-6 rounded-lg border border-reaper-red/30 backdrop-blur-sm hover:border-reaper-red/50 transition-all duration-300 hover:scale-[1.02]">
            <h3 className="text-lg font-semibold text-white mb-4 font-reaper">Quick Purchase</h3>
            <button 
              onClick={() => navigate('/bots')}
              className="w-full bg-reaper-red hover:bg-reaper-red-light text-white font-medium py-2 px-4 rounded transition-all duration-300 border-glow-red"
            >
              Buy Bot
            </button>
          </div>
          
          <div className="bg-reaper-dark-gray/80 p-6 rounded-lg border border-reaper-red/30 backdrop-blur-sm hover:border-reaper-red/50 transition-all duration-300 hover:scale-[1.02]">
            <h3 className="text-lg font-semibold text-white mb-4 font-reaper">Generate Fingerprint</h3>
            <button 
              onClick={() => navigate('/generate-fp')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-all duration-300"
            >
              Create FP
            </button>
          </div>
          
          <div className="bg-reaper-dark-gray/80 p-6 rounded-lg border border-reaper-red/30 backdrop-blur-sm hover:border-reaper-red/50 transition-all duration-300 hover:scale-[1.02]">
            <h3 className="text-lg font-semibold text-white mb-4 font-reaper">Support</h3>
            <button 
              onClick={() => navigate('/tickets')}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded transition-all duration-300"
            >
              Open Ticket
            </button>
          </div>
        </div>

        {/* Deposit Creation Modal */}
        <DepositCreationModal
          isOpen={showDepositModal}
          onClose={handleDepositModalClose}
          requiredAmount={depositAmount}
          currentBalance={user?.wallet_balance || 0}
          itemName="Dashboard Deposit"
        />
        
        {/* Debug Info - Remove this after testing */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
            Debug: Modal Open: {showDepositModal.toString()}, Amount: {depositAmount}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
