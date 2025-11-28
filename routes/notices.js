// routes/notices.js
// ================================================
// Notices API (CRUD)
// ================================================

const express = require('express');
const router = express.Router();
const db = require('../config/db_conn'); // <-- your existing PG pool/Client

// (Optional) Simple admin middleware – use if you want to restrict writes
// For now, it's not enforced on all routes; you can add it where you want.
const requireAdmin = (req, res, next) => {
  const userRole = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];

  if (!userRole || !userRole.includes('SMS_SUPERADM')) {
    return res.status(403).json({ error: 'Administrative access required' });
  }

  req.adminUser = userId;
  next();
};

// ================================================
// GET /api/notices
// List notices with pagination + optional search
// ================================================
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const values = [];
    let idx = 0;

    if (search && search.trim() !== '') {
      idx++;
      conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
      values.push(`%${search.trim()}%`);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Count total for pagination
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM public.notices
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, values);
    const totalRecords = parseInt(countResult.rows[0].total, 10) || 0;

    // Fetch records
    idx++;
    const dataQuery = `
      SELECT
        id,
        title,
        description,
        created_at,
        pdf_base64,
        image_base64
      FROM public.notices
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    values.push(limitNum, offset);

    const dataResult = await db.query(dataQuery, values);

    const totalPages = Math.ceil(totalRecords / limitNum);

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total_records: totalRecords,
        total_pages: totalPages,
        has_next: pageNum < totalPages,
        has_previous: pageNum > 1
      },
      filters_applied: {
        search: search || null
      }
    });
  } catch (err) {
    console.error('Error fetching notices:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notices',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// ================================================
// GET /api/notices/:id
// Get single notice by ID
// ================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        id,
        title,
        description,
        created_at,
        pdf_base64,
        image_base64
      FROM public.notices
      WHERE id = $1
    `;
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notice not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error fetching notice by id:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notice',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// ================================================
// POST /api/notices
// Create a new notice
// ================================================
router.post('/', /* requireAdmin, */ async (req, res) => {
  try {
    const { title, description, pdf_base64, image_base64 } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required'
      });
    }

    const insertQuery = `
      INSERT INTO public.notices (
        title,
        description,
        pdf_base64,
        image_base64
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, description, created_at, pdf_base64, image_base64
    `;

    const result = await db.query(insertQuery, [
      title,
      description,
      pdf_base64 || null,
      image_base64 || null
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating notice:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to create notice',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// ================================================
// PUT /api/notices/:id
// Update an existing notice (full update)
// ================================================
router.put('/:id', /* requireAdmin, */ async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, pdf_base64, image_base64 } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Title and description are required'
      });
    }

    const updateQuery = `
      UPDATE public.notices
      SET
        title = $1,
        description = $2,
        pdf_base64 = $3,
        image_base64 = $4
      WHERE id = $5
      RETURNING id, title, description, created_at, pdf_base64, image_base64
    `;

    const result = await db.query(updateQuery, [
      title,
      description,
      pdf_base64 || null,
      image_base64 || null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notice not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating notice:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update notice',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// ================================================
// DELETE /api/notices/:id
// Delete a notice
// ================================================
router.delete('/:id', /* requireAdmin, */ async (req, res) => {
  try {
    const { id } = req.params;

    const deleteQuery = `
      DELETE FROM public.notices
      WHERE id = $1
      RETURNING id
    `;

    const result = await db.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notice not found'
      });
    }

    res.json({
      success: true,
      message: 'Notice deleted successfully',
      deleted_id: result.rows[0].id
    });
  } catch (err) {
    console.error('Error deleting notice:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to delete notice',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

module.exports = router;
