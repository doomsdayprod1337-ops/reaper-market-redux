import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Wallet = () => {
  const { user, syncWallet } = useAuth();
  const [syncing, setSyncing] = useState(false);

  const handleSyncWallet = async () => {
    if (!user) return;
    
    setSyncing(true);
    try {
      const result = await syncWallet();
      if (result.success) {
        console.log('Wallet synced successfully:', result.wallet_balance);
      } else {
        console.error('Wallet sync failed:', result.error);
      }
    } catch (error) {
      console.error('Error syncing wallet:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-reaper-dark-gray/80 rounded-lg p-6 border border-reaper-red/30 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white font-reaper text-reaper-red">Wallet Balance</h3>
        <button
          onClick={handleSyncWallet}
          disabled={syncing}
          className="px-3 py-1 bg-reaper-red hover:bg-reaper-red-light disabled:bg-gray-600 text-white text-sm rounded-md transition-colors flex items-center space-x-2"
        >
          {syncing ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Syncing...</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Sync</span>
            </>
          )}
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Current Balance:</span>
          <span className="text-2xl font-bold text-reaper-red animate-pulse">
            ${(user?.wallet_balance || 0).toFixed(2)}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-reaper-medium-gray/50 p-4 rounded-lg border border-reaper-red/20">
            <h4 className="text-sm text-gray-400 mb-1">Available</h4>
            <p className="text-lg font-bold text-green-400">${(user?.wallet_balance || 0).toFixed(2)}</p>
          </div>
          <div className="bg-reaper-medium-gray/50 p-4 rounded-lg border border-reaper-red/20">
            <h4 className="text-sm text-gray-400 mb-1">Pending</h4>
            <p className="text-lg font-bold text-yellow-400">$0.00</p>
          </div>
        </div>
        
        <div className="pt-4 border-t border-reaper-red/20">
          <div className="text-sm text-gray-400">
            Last synced: {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            Automatic sync temporarily disabled. Use manual sync button above.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
