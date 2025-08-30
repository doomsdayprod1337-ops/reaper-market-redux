import { RequestHandler } from 'express';
import { supabase } from '../middleware/auth';
import { Service, Bot, ApiResponse, PaginatedResponse } from '@shared/api';

// Get all products (services and bots)
export const handleGetProducts: RequestHandler = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const type = req.query.type as string; // 'service' or 'bot'
    const offset = (page - 1) * limit;

    // Determine which table to query
    const tableName = type === 'bot' ? 'bots' : 'services';
    
    let query = supabase
      .from(tableName)
      .select('*')
      .eq('is_active', true);

    if (category) {
      query = query.eq('category', category);
    }

    const { data: products, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load products'
      });
    }

    // Get total count
    let countQuery = supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (category) {
      countQuery = countQuery.eq('category', category);
    }

    const { count } = await countQuery;

    res.json({
      success: true,
      data: products || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    } as PaginatedResponse<Service | Bot>);

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load products'
    });
  }
};

// Get services
export const handleGetServices: RequestHandler = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('services')
      .select('*')
      .eq('is_active', true);

    if (category) {
      query = query.eq('category', category);
    }

    const { data: services, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load services'
      });
    }

    // Get total count
    let countQuery = supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (category) {
      countQuery = countQuery.eq('category', category);
    }

    const { count } = await countQuery;

    res.json({
      success: true,
      data: services || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    } as PaginatedResponse<Service>);

  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load services'
    });
  }
};

// Get bots
export const handleGetBots: RequestHandler = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const category = req.query.category as string;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('bots')
      .select('*')
      .eq('is_active', true);

    if (category) {
      query = query.eq('category', category);
    }

    const { data: bots, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load bots'
      });
    }

    // Get total count
    let countQuery = supabase
      .from('bots')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (category) {
      countQuery = countQuery.eq('category', category);
    }

    const { count } = await countQuery;

    res.json({
      success: true,
      data: bots || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    } as PaginatedResponse<Bot>);

  } catch (error) {
    console.error('Get bots error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load bots'
    });
  }
};

// Get product categories
export const handleGetCategories: RequestHandler = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const type = req.query.type as string; // 'service' or 'bot'
    const tableName = type === 'bot' ? 'bots' : 'services';

    const { data: items, error } = await supabase
      .from(tableName)
      .select('category')
      .eq('is_active', true)
      .not('category', 'is', null);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load categories'
      });
    }

    // Extract unique categories
    const uniqueCategories = [...new Set(items?.map(item => item.category))].filter(Boolean);

    res.json({
      success: true,
      data: uniqueCategories,
      message: `Found ${uniqueCategories.length} categories`
    } as ApiResponse<string[]>);

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load categories'
    });
  }
};

// Get single product
export const handleGetProduct: RequestHandler = async (req, res) => {
  try {
    const { productId } = req.params;
    const type = req.query.type as string; // 'service' or 'bot'

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const tableName = type === 'bot' ? 'bots' : 'services';

    const { data: product, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (error || !product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    } as ApiResponse<Service | Bot>);

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load product'
    });
  }
};

// Create product (admin only)
export const handleCreateProduct: RequestHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { name, description, price, currency, category, type = 'service', is_active = true } = req.body;

    if (!name || !description || !price || !currency || !category) {
      return res.status(400).json({
        success: false,
        error: 'Name, description, price, currency, and category are required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const tableName = type === 'bot' ? 'bots' : 'services';

    const { data: product, error } = await supabase
      .from(tableName)
      .insert({
        name,
        description,
        price: parseFloat(price.toString()),
        currency,
        category,
        is_active,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error || !product) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create product'
      });
    }

    res.json({
      success: true,
      data: product,
      message: 'Product created successfully'
    } as ApiResponse<Service | Bot>);

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create product'
    });
  }
};

// Update product (admin only)
export const handleUpdateProduct: RequestHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { productId } = req.params;
    const { name, description, price, currency, category, is_active, type = 'service' } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const tableName = type === 'bot' ? 'bots' : 'services';
    const updateData: any = {};

    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (price) updateData.price = parseFloat(price.toString());
    if (currency) updateData.currency = currency;
    if (category) updateData.category = category;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: product, error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();

    if (error || !product) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update product'
      });
    }

    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully'
    } as ApiResponse<Service | Bot>);

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update product'
    });
  }
};

// Delete product (admin only)
export const handleDeleteProduct: RequestHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { productId } = req.params;
    const type = req.query.type as string; // 'service' or 'bot'

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const tableName = type === 'bot' ? 'bots' : 'services';

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', productId);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete product'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete product'
    });
  }
};
