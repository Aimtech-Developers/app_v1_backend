// routes/announcements_api.js
const express = require('express');
const router = express.Router();
const db = require('../config/db_conn'); // ✅ same pool as other APIs

// ========================= Helpers =========================

// Simple validator for required fields
function validateRequiredFields(body, fields) {
  const missing = fields.filter((f) => !body[f] || String(body[f]).trim() === '');
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(', ')}`;
  }
  return null; 
}

// ========================= CREATE =========================
// POST /announcements/add-announcement
// body: { title, description, file_base64?, photo_base64? }
router.post('/add-announcement', async (req, res) => {
  const { title, description, file_base64, photo_base64 } = req.body;

  const errorMsg = validateRequiredFields(req.body, ['title', 'description']);
  if (errorMsg) {
    return res.status(400).json({ error: errorMsg });
  }

  try {
    const result = await db.query(
      `INSERT INTO public.announcements (
         title,
         description,
         file_base64,
         photo_base64
       )
       VALUES ($1, $2, $3, $4)
       RETURNING
         id,
         title,
         description,
         created_at,
         file_base64,
         photo_base64`,
      [
        title.trim(),
        description.trim(),
        file_base64 || null,
        photo_base64 || null,
      ]
    );

    return res.status(201).json({
      message: 'Announcement added successfully',
      announcement: result.rows[0],
    });
  } catch (err) {
    console.error('Error inserting announcement:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================= READ (LIST) =========================
// GET /announcements/view-announcements
// Optional query params: ?search=...&page=1&limit=10
router.get('/view-announcements', async (req, res) => {
  const {
    search = '',
    page = 1,
    limit = 10,
  } = req.query;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
  const offset = (pageNum - 1) * limitNum;

  const filters = [];
  const values = [];

  if (search && String(search).trim() !== '') {
    values.push(`%${search.trim()}%`);
    filters.push(`(title ILIKE $${values.length} OR description ILIKE $${values.length})`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  try {
    // Count total
    const countSql = `SELECT COUNT(*) AS total FROM public.announcements ${whereClause}`;
    const countResult = await db.query(countSql, values);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    // Fetch paged results
    const dataSql = `
      SELECT
        id,
        title,
        description,
        created_at,
        file_base64,
        photo_base64
      FROM public.announcements
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;
    const dataResult = await db.query(dataSql, [...values, limitNum, offset]);

    return res.status(200).json({
      data: dataResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.max(Math.ceil(total / limitNum), 1),
      },
    });
  } catch (err) {
    console.error('Error fetching announcements:', err);
    return res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// ========================= READ (SINGLE) =========================
// GET /announcements/view-announcement/:id
router.get('/view-announcement/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT
         id,
         title,
         description,
         created_at,
         file_base64,
         photo_base64
       FROM public.announcements
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    return res.status(200).json({ announcement: result.rows[0] });
  } catch (err) {
    console.error('Error fetching announcement:', err);
    return res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

// ========================= UPDATE =========================
// PUT /announcements/edit-announcement/:id
// body: { title, description, file_base64?, photo_base64? }
router.put('/edit-announcement/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, file_base64, photo_base64 } = req.body;

  const errorMsg = validateRequiredFields(req.body, ['title', 'description']);
  if (errorMsg) {
    return res.status(400).json({ error: errorMsg });
  }

  try {
    const result = await db.query(
      `UPDATE public.announcements SET
         title        = $1,
         description  = $2,
         file_base64  = $3,
         photo_base64 = $4
       WHERE id = $5
       RETURNING
         id,
         title,
         description,
         created_at,
         file_base64,
         photo_base64`,
      [
        title.trim(),
        description.trim(),
        file_base64 || null,
        photo_base64 || null,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    return res.status(200).json({
      message: 'Announcement updated successfully',
      announcement: result.rows[0],
    });
  } catch (err) {
    console.error('Error updating announcement:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================= DELETE =========================
// DELETE /announcements/delete-announcement/:id
router.delete('/delete-announcement/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `DELETE FROM public.announcements
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    return res.status(200).json({
      message: 'Announcement deleted successfully',
      id: result.rows[0].id,
    });
  } catch (err) {
    console.error('Error deleting announcement:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
