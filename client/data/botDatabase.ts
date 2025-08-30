interface Bot {
  id: string;
  country: string;
  last24h: number;
  lastWeek: number;
  lastMonth: number;
  status: 'active' | 'inactive' | 'maintenance';
  type: 'premium' | 'standard';
}

const generateRandomActivity = () => ({
  last24h: Math.floor(Math.random() * 50),
  lastWeek: Math.floor(Math.random() * 300),
  lastMonth: Math.floor(Math.random() * 1200),
});

// Mock bot data for demonstration
const botData: Bot[] = [
  // US Bots
  ...Array.from({ length: 25 }, (_, i) => ({
    id: `us-bot-${i + 1}`,
    country: 'US',
    status: 'active' as const,
    type: i % 3 === 0 ? 'premium' as const : 'standard' as const,
    ...generateRandomActivity(),
  })),
  
  // UK Bots
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `uk-bot-${i + 1}`,
    country: 'UK',
    status: 'active' as const,
    type: i % 4 === 0 ? 'premium' as const : 'standard' as const,
    ...generateRandomActivity(),
  })),
  
  // Germany Bots
  ...Array.from({ length: 22 }, (_, i) => ({
    id: `de-bot-${i + 1}`,
    country: 'DE',
    status: 'active' as const,
    type: i % 3 === 0 ? 'premium' as const : 'standard' as const,
    ...generateRandomActivity(),
  })),
  
  // France Bots
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `fr-bot-${i + 1}`,
    country: 'FR',
    status: 'active' as const,
    type: i % 5 === 0 ? 'premium' as const : 'standard' as const,
    ...generateRandomActivity(),
  })),
  
  // Canada Bots
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `ca-bot-${i + 1}`,
    country: 'CA',
    status: 'active' as const,
    type: i % 4 === 0 ? 'premium' as const : 'standard' as const,
    ...generateRandomActivity(),
  })),
  
  // Australia Bots
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `au-bot-${i + 1}`,
    country: 'AU',
    status: 'active' as const,
    type: i % 3 === 0 ? 'premium' as const : 'standard' as const,
    ...generateRandomActivity(),
  })),
  
  // Japan Bots
  ...Array.from({ length: 14 }, (_, i) => ({
    id: `jp-bot-${i + 1}`,
    country: 'JP',
    status: 'active' as const,
    type: i % 4 === 0 ? 'premium' as const : 'standard' as const,
    ...generateRandomActivity(),
  })),
  
  // Brazil Bots
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `br-bot-${i + 1}`,
    country: 'BR',
    status: 'active' as const,
    type: i % 5 === 0 ? 'premium' as const : 'standard' as const,
    ...generateRandomActivity(),
  })),
  
  // Russia Bots
  ...Array.from({ length: 11 }, (_, i) => ({
    id: `ru-bot-${i + 1}`,
    country: 'RU',
    status: 'active' as const,
    type: i % 3 === 0 ? 'premium' as const : 'standard' as const,
    ...generateRandomActivity(),
  })),
  
  // India Bots
  ...Array.from({ length: 9 }, (_, i) => ({
    id: `in-bot-${i + 1}`,
    country: 'IN',
    status: 'active' as const,
    type: i % 4 === 0 ? 'premium' as const : 'standard' as const,
    ...generateRandomActivity(),
  })),
  
  // Netherlands Bots
  ...Array.from({ length: 7 }, (_, i) => ({
    id: `nl-bot-${i + 1}`,
    country: 'NL',
    status: 'active' as const,
    type: i % 3 === 0 ? 'premium' as const : 'standard' as const,
    ...generateRandomActivity(),
  })),
  
  // Sweden Bots
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `se-bot-${i + 1}`,
    country: 'SE',
    status: 'active' as const,
    type: i % 4 === 0 ? 'premium' as const : 'standard' as const,
    ...generateRandomActivity(),
  })),
];

export const getAllBots = (): Bot[] => {
  return botData;
};

export const getBotsByCountry = (countryCode: string): Bot[] => {
  return botData.filter(bot => bot.country === countryCode.toUpperCase());
};

export const getActiveBots = (): Bot[] => {
  return botData.filter(bot => bot.status === 'active');
};

export const getPremiumBots = (): Bot[] => {
  return botData.filter(bot => bot.type === 'premium');
};

export const getBotStats = () => {
  const totalBots = botData.length;
  const activeBots = getActiveBots().length;
  const premiumBots = getPremiumBots().length;
  
  const total24h = botData.reduce((sum, bot) => sum + bot.last24h, 0);
  const totalWeek = botData.reduce((sum, bot) => sum + bot.lastWeek, 0);
  const totalMonth = botData.reduce((sum, bot) => sum + bot.lastMonth, 0);

  return {
    totalBots,
    activeBots,
    premiumBots,
    total24h,
    totalWeek,
    totalMonth,
  };
};

export type { Bot };
