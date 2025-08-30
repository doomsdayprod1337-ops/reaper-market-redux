import { RequestHandler } from 'express';
import crypto from 'crypto';
import { supabase } from '../middleware/auth';
import { CreditCard, ApiResponse, PaginatedResponse } from '@shared/api';

// Helper function to determine card type based on card number
function getCardType(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\s+/g, '');
  
  if (/^4/.test(cleanNumber)) {
    return 'Visa';
  } else if (/^5[1-5]/.test(cleanNumber)) {
    return 'Mastercard';
  } else if (/^3[47]/.test(cleanNumber)) {
    return 'American Express';
  } else if (/^6/.test(cleanNumber)) {
    return 'Discover';
  } else if (/^2/.test(cleanNumber)) {
    return 'Mastercard (2-series)';
  } else {
    return 'Unknown';
  }
}

// Helper function to generate card number hash
function generateCardHash(cardNumber: string): string {
  return crypto.createHash('sha256').update(cardNumber).digest('hex');
}

// Helper function to mask card number
function maskCardNumber(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\s+/g, '');
  if (cleanNumber.length < 4) return cleanNumber;
  return '**** **** **** ' + cleanNumber.slice(-4);
}

// Get user's credit cards
export const handleGetCreditCards: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { data: cards, error } = await supabase
      .from('credit_cards')
      .select('id, card_number, expiry_month, expiry_year, card_type, bank_name, country, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load credit cards'
      });
    }

    // Mask card numbers for security
    const maskedCards = cards?.map(card => ({
      ...card,
      card_number: maskCardNumber(card.card_number)
    }));

    // Get total count
    const { count } = await supabase
      .from('credit_cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    res.json({
      success: true,
      data: maskedCards || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    } as PaginatedResponse<Partial<CreditCard>>);

  } catch (error) {
    console.error('Get credit cards error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load credit cards'
    });
  }
};

// Add new credit card
export const handleAddCreditCard: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { card_number, expiry_month, expiry_year, cvv, bank_name, country } = req.body;

    if (!card_number || !expiry_month || !expiry_year || !cvv) {
      return res.status(400).json({
        success: false,
        error: 'Card number, expiry month, expiry year, and CVV are required'
      });
    }

    // Validate card number (basic validation)
    const cleanCardNumber = card_number.replace(/\s+/g, '');
    if (!/^\d{13,19}$/.test(cleanCardNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid card number format'
      });
    }

    // Validate expiry
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    if (parseInt(expiry_year) < currentYear || 
        (parseInt(expiry_year) === currentYear && parseInt(expiry_month) < currentMonth)) {
      return res.status(400).json({
        success: false,
        error: 'Card has expired'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    // Check for duplicate cards (by hash)
    const cardHash = generateCardHash(cleanCardNumber);
    const { data: existingCard } = await supabase
      .from('credit_cards')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('card_hash', cardHash)
      .single();

    if (existingCard) {
      return res.status(400).json({
        success: false,
        error: 'This card is already added to your account'
      });
    }

    // Determine card type
    const cardType = getCardType(cleanCardNumber);

    // Store card (in production, encrypt sensitive data)
    const { data: card, error } = await supabase
      .from('credit_cards')
      .insert({
        user_id: req.user.id,
        card_number: cleanCardNumber, // In production, this should be encrypted
        expiry_month: expiry_month.toString().padStart(2, '0'),
        expiry_year: expiry_year.toString(),
        cvv: cvv.toString(), // In production, this should be encrypted
        card_type: cardType,
        bank_name: bank_name || null,
        country: country || null,
        card_hash: cardHash,
        created_at: new Date().toISOString()
      })
      .select('id, card_number, expiry_month, expiry_year, card_type, bank_name, country, created_at')
      .single();

    if (error || !card) {
      return res.status(500).json({
        success: false,
        error: 'Failed to add credit card'
      });
    }

    // Return card with masked number
    const maskedCard = {
      ...card,
      card_number: maskCardNumber(card.card_number)
    };

    res.json({
      success: true,
      data: maskedCard,
      message: 'Credit card added successfully'
    } as ApiResponse<Partial<CreditCard>>);

  } catch (error) {
    console.error('Add credit card error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add credit card'
    });
  }
};

// Update credit card
export const handleUpdateCreditCard: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { cardId } = req.params;
    const { bank_name, country } = req.body;

    if (!cardId) {
      return res.status(400).json({
        success: false,
        error: 'Card ID is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const updateData: any = {};
    if (bank_name !== undefined) updateData.bank_name = bank_name;
    if (country !== undefined) updateData.country = country;

    const { data: card, error } = await supabase
      .from('credit_cards')
      .update(updateData)
      .eq('id', cardId)
      .eq('user_id', req.user.id) // Ensure user owns the card
      .select('id, card_number, expiry_month, expiry_year, card_type, bank_name, country, created_at')
      .single();

    if (error || !card) {
      return res.status(404).json({
        success: false,
        error: 'Credit card not found or failed to update'
      });
    }

    // Return card with masked number
    const maskedCard = {
      ...card,
      card_number: maskCardNumber(card.card_number)
    };

    res.json({
      success: true,
      data: maskedCard,
      message: 'Credit card updated successfully'
    } as ApiResponse<Partial<CreditCard>>);

  } catch (error) {
    console.error('Update credit card error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update credit card'
    });
  }
};

// Delete credit card
export const handleDeleteCreditCard: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { cardId } = req.params;

    if (!cardId) {
      return res.status(400).json({
        success: false,
        error: 'Card ID is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const { error } = await supabase
      .from('credit_cards')
      .delete()
      .eq('id', cardId)
      .eq('user_id', req.user.id); // Ensure user owns the card

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete credit card'
      });
    }

    res.json({
      success: true,
      message: 'Credit card deleted successfully'
    });

  } catch (error) {
    console.error('Delete credit card error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete credit card'
    });
  }
};

// Get credit card statistics (admin only)
export const handleGetCreditCardStats: RequestHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    // Get total cards count
    const { count: totalCards } = await supabase
      .from('credit_cards')
      .select('*', { count: 'exact', head: true });

    // Get cards by type
    const { data: cardsByType } = await supabase
      .from('credit_cards')
      .select('card_type')
      .not('card_type', 'is', null);

    // Get cards by country
    const { data: cardsByCountry } = await supabase
      .from('credit_cards')
      .select('country')
      .not('country', 'is', null);

    // Process statistics
    const typeStats = cardsByType?.reduce((acc: any, card) => {
      acc[card.card_type] = (acc[card.card_type] || 0) + 1;
      return acc;
    }, {}) || {};

    const countryStats = cardsByCountry?.reduce((acc: any, card) => {
      acc[card.country] = (acc[card.country] || 0) + 1;
      return acc;
    }, {}) || {};

    const stats = {
      total_cards: totalCards || 0,
      cards_by_type: typeStats,
      cards_by_country: countryStats,
      generated_at: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    } as ApiResponse);

  } catch (error) {
    console.error('Get credit card stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get credit card statistics'
    });
  }
};
