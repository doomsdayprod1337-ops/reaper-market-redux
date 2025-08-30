import { RequestHandler } from 'express';
import { supabase } from '../middleware/auth';
import { Ticket, TicketReply, ApiResponse, PaginatedResponse } from '@shared/api';

// Get user's tickets
export const handleGetTickets: RequestHandler = async (req, res) => {
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
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('tickets')
      .select('*')
      .eq('user_id', req.user.id);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: tickets, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load tickets'
      });
    }

    // Get total count
    let countQuery = supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count } = await countQuery;

    res.json({
      success: true,
      data: tickets || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    } as PaginatedResponse<Ticket>);

  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load tickets'
    });
  }
};

// Create new ticket
export const handleCreateTicket: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { title, description, priority = 'medium' } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        title,
        description,
        priority,
        status: 'open',
        user_id: req.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error || !ticket) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create ticket'
      });
    }

    res.json({
      success: true,
      data: ticket,
      message: 'Ticket created successfully'
    } as ApiResponse<Ticket>);

  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create ticket'
    });
  }
};

// Get specific ticket with replies
export const handleGetTicket: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { ticketId } = req.params;

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        error: 'Ticket ID is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    // Get ticket (ensure user owns it or is admin)
    let ticketQuery = supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId);

    if (!req.user.is_admin) {
      ticketQuery = ticketQuery.eq('user_id', req.user.id);
    }

    const { data: ticket, error: ticketError } = await ticketQuery.single();

    if (ticketError || !ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    // Get ticket replies
    const { data: replies, error: repliesError } = await supabase
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (repliesError) {
      console.error('Failed to load replies:', repliesError);
    }

    res.json({
      success: true,
      data: {
        ...ticket,
        replies: replies || []
      }
    });

  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load ticket'
    });
  }
};

// Update ticket status (admin only)
export const handleUpdateTicket: RequestHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { ticketId } = req.params;
    const { status, priority } = req.body;

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        error: 'Ticket ID is required'
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

    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;

    const { data: ticket, error } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single();

    if (error || !ticket) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update ticket'
      });
    }

    res.json({
      success: true,
      data: ticket,
      message: 'Ticket updated successfully'
    } as ApiResponse<Ticket>);

  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update ticket'
    });
  }
};

// Add reply to ticket
export const handleAddTicketReply: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { ticketId } = req.params;
    const { content } = req.body;

    if (!ticketId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Ticket ID and content are required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    // Verify ticket exists and user has access
    let ticketQuery = supabase
      .from('tickets')
      .select('id, user_id')
      .eq('id', ticketId);

    if (!req.user.is_admin) {
      ticketQuery = ticketQuery.eq('user_id', req.user.id);
    }

    const { data: ticket, error: ticketError } = await ticketQuery.single();

    if (ticketError || !ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket not found'
      });
    }

    // Add reply
    const { data: reply, error } = await supabase
      .from('ticket_replies')
      .insert({
        ticket_id: ticketId,
        user_id: req.user.id,
        content,
        is_admin: req.user.is_admin,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error || !reply) {
      return res.status(500).json({
        success: false,
        error: 'Failed to add reply'
      });
    }

    // Update ticket's updated_at timestamp
    await supabase
      .from('tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    res.json({
      success: true,
      data: reply,
      message: 'Reply added successfully'
    } as ApiResponse<TicketReply>);

  } catch (error) {
    console.error('Add ticket reply error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add reply'
    });
  }
};

// Get all tickets (admin only)
export const handleGetAllTickets: RequestHandler = async (req, res) => {
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
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('tickets')
      .select(`
        *,
        users:user_id (
          id,
          username,
          email
        )
      `);

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data: tickets, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to load tickets'
      });
    }

    // Get total count
    let countQuery = supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true });

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    if (priority) {
      countQuery = countQuery.eq('priority', priority);
    }

    const { count } = await countQuery;

    res.json({
      success: true,
      data: tickets || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    } as PaginatedResponse<any>);

  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load tickets'
    });
  }
};
