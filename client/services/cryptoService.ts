// CryptoService for handling cryptocurrency data and conversions
// This service can be extended to integrate with real APIs like CoinGecko

export const cryptoService = {
  /**
   * Get current cryptocurrency prices
   * @param currencies Array of cryptocurrency IDs
   * @param vsCurrencies Array of fiat currencies to convert to
   * @returns Promise with price data
   */
  async getPrices(currencies: string[], vsCurrencies: string[]) {
    try {
      // Mock implementation - in production, integrate with CoinGecko API
      // Example: https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd
      
      const mockPrices = {
        bitcoin: { usd: 45000 + Math.random() * 1000 },
        ethereum: { usd: 2800 + Math.random() * 100 },
        tether: { usd: 1.00 },
        binancecoin: { usd: 320 + Math.random() * 20 },
        cardano: { usd: 0.45 + Math.random() * 0.05 },
        solana: { usd: 100 + Math.random() * 10 },
        polkadot: { usd: 7.50 + Math.random() * 0.5 },
        chainlink: { usd: 14.20 + Math.random() * 1 },
        litecoin: { usd: 120 + Math.random() * 10 },
        monero: { usd: 180 + Math.random() * 20 }
      };

      // Filter to only return requested currencies
      const filteredPrices = {};
      currencies.forEach(currency => {
        if (mockPrices[currency]) {
          filteredPrices[currency] = mockPrices[currency];
        }
      });

      return filteredPrices;
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      throw new Error('Failed to fetch cryptocurrency prices');
    }
  },

  /**
   * Get market data for cryptocurrencies
   * @param currencies Array of cryptocurrency IDs
   * @param vsCurrency Fiat currency to convert to
   * @returns Promise with market data
   */
  async getMarketData(currencies: string[], vsCurrency: string) {
    try {
      const prices = await this.getPrices(currencies, [vsCurrency]);
      
      return currencies.map(id => ({
        id,
        current_price: prices[id]?.[vsCurrency] || 0,
        market_cap: Math.random() * 100000000000, // Mock market cap
        price_change_24h: (Math.random() - 0.5) * 1000, // Mock 24h change
        price_change_percentage_24h: (Math.random() - 0.5) * 20, // Mock percentage change
        volume_24h: Math.random() * 1000000000 // Mock volume
      }));
    } catch (error) {
      console.error('Error fetching market data:', error);
      throw new Error('Failed to fetch market data');
    }
  },

  /**
   * Convert USD amount to cryptocurrency
   * @param usdAmount Amount in USD
   * @param cryptoId Cryptocurrency ID
   * @returns Promise with converted amount
   */
  async convertPrice(usdAmount: number, cryptoId: string) {
    try {
      const prices = await this.getPrices([cryptoId], ['usd']);
      const rate = prices[cryptoId]?.usd || 1;
      return usdAmount / rate;
    } catch (error) {
      console.error('Error converting price:', error);
      throw new Error('Failed to convert price');
    }
  },

  /**
   * Get exchange rate for a cryptocurrency
   * @param cryptoId Cryptocurrency ID
   * @param vsCurrency Fiat currency
   * @returns Promise with exchange rate
   */
  async getExchangeRate(cryptoId: string, vsCurrency: string = 'usd') {
    try {
      const prices = await this.getPrices([cryptoId], [vsCurrency]);
      return prices[cryptoId]?.[vsCurrency] || 0;
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      throw new Error('Failed to fetch exchange rate');
    }
  },

  /**
   * Get supported cryptocurrencies
   * @returns Array of supported cryptocurrencies
   */
  getSupportedCryptocurrencies() {
    return [
      { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', icon: '₿' },
      { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', icon: 'Ξ' },
      { id: 'tether', symbol: 'USDT', name: 'Tether', icon: '₮' },
      { id: 'binancecoin', symbol: 'BNB', name: 'Binance Coin', icon: '🟡' },
      { id: 'cardano', symbol: 'ADA', name: 'Cardano', icon: '🔷' },
      { id: 'solana', symbol: 'SOL', name: 'Solana', icon: '🟣' },
      { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', icon: '🟢' },
      { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', icon: '🔗' },
      { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', icon: 'Ł' },
      { id: 'monero', symbol: 'XMR', name: 'Monero', icon: 'ɱ' }
    ];
  },

  /**
   * Format cryptocurrency amount
   * @param amount Amount to format
   * @param currency Currency symbol
   * @returns Formatted string
   */
  formatAmount(amount: number, currency: string): string {
    const highPrecisionCurrencies = ['BTC', 'ETH', 'LTC', 'XMR', 'SOL'];
    if (highPrecisionCurrencies.includes(currency.toUpperCase())) {
      return parseFloat(amount.toString()).toFixed(8);
    }
    return parseFloat(amount.toString()).toFixed(2);
  },

  /**
   * Get cryptocurrency icon
   * @param currency Currency symbol
   * @returns Icon string
   */
  getCryptoIcon(currency: string): string {
    const icons = {
      BTC: '₿',
      ETH: 'Ξ',
      LTC: 'Ł',
      USDT: '₮',
      USDT_TRC20: '💎',
      USDT_ERC20: '🔷',
      XMR: 'ɱ',
      SOL: '◎',
      BNB: '🟡',
      ADA: '🔷',
      DOT: '🟢',
      LINK: '🔗'
    };
    return icons[currency.toUpperCase()] || '🪙';
  }
};

export default cryptoService;
