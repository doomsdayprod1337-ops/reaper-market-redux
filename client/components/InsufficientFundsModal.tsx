import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axios';

const InsufficientFundsModal = ({ isOpen, onClose, requiredAmount, currentBalance, itemName, onShowCryptoOptions }) => {
  const navigate = useNavigate();
  const [minimumDepositAmount, setMinimumDepositAmount] = useState(50.00);

  useEffect(() => {
    if (isOpen) {
      loadMinimumDepositAmount();
    }
  }, [isOpen]);

  const loadMinimumDepositAmount = async () => {
    try {
      const response = await api.get('/api/get-minimum-deposit');
      if (response.data.success) {
        setMinimumDepositAmount(response.data.minimumDepositAmount);
      }
    } catch (error) {
      console.error('Error loading minimum deposit amount:', error);
      // Use default value if API fails
      setMinimumDepositAmount(50.00);
    }
  };

  if (!isOpen) return null;

  const handleMakeDeposit = () => {
    onClose();
    // Show crypto selection window instead of navigating
    if (onShowCryptoOptions) {
      onShowCryptoOptions();
    }
  };

  const handleViewBalance = () => {
    onClose();
    navigate('/profile');
  };

  // Calculate the actual amount needed (max of required amount or minimum deposit)
  const actualAmountNeeded = Math.max(requiredAmount || 0, minimumDepositAmount);
  const shortfall = Math.max(0, actualAmountNeeded - (currentBalance || 0));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-reaper-dark-gray rounded-lg p-6 max-w-md w-full mx-4 border border-reaper-red/30">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border-glow-red">
            <span className="text-white text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2 font-reaper">Insufficient Funds</h2>
          <p className="text-gray-400 text-sm">
            Your wallet doesn't have enough balance to complete this purchase
          </p>
        </div>

        {/* Purchase Details */}
        <div className="bg-reaper-medium-gray/50 rounded-lg p-4 mb-6 border border-reaper-red/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300">Item:</span>
            <span className="text-white font-medium">{itemName || 'Purchase'}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300">Required Amount:</span>
            <span className="text-white font-medium">${requiredAmount?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300">Current Balance:</span>
            <span className="text-white font-medium">${currentBalance?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300">Minimum Deposit:</span>
            <span className="text-white font-medium">${minimumDepositAmount?.toFixed(2) || '50.00'}</span>
          </div>
          
          {/* Shortfall */}
          <div className="mt-3 pt-3 border-t border-reaper-red/20">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Amount to Deposit:</span>
              <span className="text-reaper-red font-medium">
                ${actualAmountNeeded.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleMakeDeposit}
            className="w-full px-4 py-3 bg-reaper-red hover:bg-reaper-red-light text-white rounded-lg font-medium transition-all duration-300 hover:scale-[1.02] border-glow-red"
          >
            💰 Make a Deposit
          </button>
          
          <button
            onClick={handleViewBalance}
            className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            👛 View Wallet Balance
          </button>
          
          {onShowCryptoOptions && (
            <button
              onClick={onShowCryptoOptions}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              🪙 Choose Crypto Payment
            </button>
          )}
          
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-transparent hover:bg-reaper-medium-gray/50 text-gray-400 rounded-lg border border-reaper-red/30 transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-4 text-center">
          <p className="text-gray-400 text-xs">
            Need help? Contact support or check our deposit guide
          </p>
        </div>
      </div>
    </div>
  );
};

export default InsufficientFundsModal;
