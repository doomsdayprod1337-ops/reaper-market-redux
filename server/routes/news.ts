import { RequestHandler } from 'express';
import { supabase } from '../middleware/auth';
import { NewsArticle, ApiResponse, PaginatedResponse } from '@shared/api';

// Get news articles (public)
export const handleGetNews: RequestHandler = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string || 'published';
    const offset = (page - 1) * limit;

    // Get news articles
    const { data: articles, error } = await supabase
      .from('news')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load news articles'
      });
    }

    // Get total count
    const { count } = await supabase
      .from('news')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);

    res.json({
      success: true,
      data: articles || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    } as PaginatedResponse<NewsArticle>);

  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load news'
    });
  }
};

// Get single news article
export const handleGetNewsArticle: RequestHandler = async (req, res) => {
  try {
    const { articleId } = req.params;

    if (!articleId) {
      return res.status(400).json({
        success: false,
        error: 'Article ID is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const { data: article, error } = await supabase
      .from('news')
      .select('*')
      .eq('id', articleId)
      .eq('status', 'published')
      .single();

    if (error || !article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    res.json({
      success: true,
      data: article
    } as ApiResponse<NewsArticle>);

  } catch (error) {
    console.error('Get news article error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load article'
    });
  }
};

// Create news article (admin only)
export const handleCreateNews: RequestHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { title, content, status = 'draft' } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const { data: article, error } = await supabase
      .from('news')
      .insert({
        title,
        content,
        author_id: req.user.id,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error || !article) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create article'
      });
    }

    res.json({
      success: true,
      data: article,
      message: 'Article created successfully'
    } as ApiResponse<NewsArticle>);

  } catch (error) {
    console.error('Create news error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create article'
    });
  }
};

// Update news article (admin only)
export const handleUpdateNews: RequestHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { articleId } = req.params;
    const { title, content, status } = req.body;

    if (!articleId) {
      return res.status(400).json({
        success: false,
        error: 'Article ID is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (status) updateData.status = status;

    const { data: article, error } = await supabase
      .from('news')
      .update(updateData)
      .eq('id', articleId)
      .select()
      .single();

    if (error || !article) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update article'
      });
    }

    res.json({
      success: true,
      data: article,
      message: 'Article updated successfully'
    } as ApiResponse<NewsArticle>);

  } catch (error) {
    console.error('Update news error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update article'
    });
  }
};

// Delete news article (admin only)
export const handleDeleteNews: RequestHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { articleId } = req.params;

    if (!articleId) {
      return res.status(400).json({
        success: false,
        error: 'Article ID is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const { error } = await supabase
      .from('news')
      .delete()
      .eq('id', articleId);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete article'
      });
    }

    res.json({
      success: true,
      message: 'Article deleted successfully'
    });

  } catch (error) {
    console.error('Delete news error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete article'
    });
  }
};

// Get all news articles for admin (including drafts)
export const handleGetAllNews: RequestHandler = async (req, res) => {
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

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { data: articles, error } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load articles'
      });
    }

    // Get total count
    const { count } = await supabase
      .from('news')
      .select('*', { count: 'exact', head: true });

    res.json({
      success: true,
      data: articles || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    } as PaginatedResponse<NewsArticle>);

  } catch (error) {
    console.error('Get all news error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load articles'
    });
  }
};
