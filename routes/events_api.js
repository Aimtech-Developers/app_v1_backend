// routes/events_api.js
const express = require('express');
const router = express.Router();
const db = require('../config/db_conn'); // ✅ Same pool as other APIs

// ========================= Helpers =========================

// (Optional) small validator to make sure required fields are present
function validateRequiredFields(body, fields) {
  const missing = fields.filter((f) => !body[f]);
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(', ')}`;
  }
  return null;
}

// ========================= CREATE =========================
// ✅ Add Event
// POST /events/add-event
router.post('/add-event', async (req, res) => {
  const {
    title,
    description,
    photo_base64,
    image_base64,
    pdf_base64,
    event_from,
    event_to,
  } = req.body;

  // Required fields: title, description, event_from, event_to
  const errorMsg = validateRequiredFields(req.body, [
    'title',
    'description',
    'event_from',
    'event_to',
  ]);
  if (errorMsg) {
    return res.status(400).json({ error: errorMsg });
  }

  try {
    const result = await db.query(
      `INSERT INTO public.events (
        title,
        description,
        photo_base64,
        image_base64,
        pdf_base64,
        event_from,
        event_to
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
      RETURNING id, title, description, created_at, photo_base64, image_base64, pdf_base64, event_from, event_to`,
      [
        title,
        description,
        photo_base64 || null,
        image_base64 || null,
        pdf_base64 || null,
        event_from,
        event_to,
      ]
    );

    return res.status(201).json({
      message: 'Event added successfully',
      event: result.rows[0],
    });
  } catch (err) {
    console.error('Error during event insertion:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================= READ =========================
// ✅ View All Events
// GET /events/view-events
router.get('/view-events', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         id,
         title,
         description,
         created_at,
         photo_base64,
         image_base64,
         pdf_base64,
         event_from,
         event_to
       FROM public.events
       ORDER BY created_at DESC`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No events found' });
    }

    return res.status(200).json({ events: result.rows });
  } catch (err) {
    console.error('Error fetching events:', err);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ✅ View Single Event by id
// GET /events/view-event/:id
router.get('/view-event/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT
         id,
         title,
         description,
         created_at,
         photo_base64,
         image_base64,
         pdf_base64,
         event_from,
         event_to
       FROM public.events
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.status(200).json({ event: result.rows[0] });
  } catch (err) {
    console.error('Error fetching event:', err);
    return res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// ========================= UPDATE =========================
// ✅ Edit Event by id
// PUT /events/edit-event/:id
router.put('/edit-event/:id', async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    photo_base64,
    image_base64,
    pdf_base64,
    event_from,
    event_to,
  } = req.body;

  // Keep same pattern as master_college_api: require main fields
  const errorMsg = validateRequiredFields(req.body, [
    'title',
    'description',
    'event_from',
    'event_to',
  ]);
  if (errorMsg) {
    return res.status(400).json({ error: errorMsg });
  }

  try {
    const result = await db.query(
      `UPDATE public.events SET
         title        = $1,
         description  = $2,
         photo_base64 = $3,
         image_base64 = $4,
         pdf_base64   = $5,
         event_from   = $6,
         event_to     = $7
       WHERE id = $8
       RETURNING
         id,
         title,
         description,
         created_at,
         photo_base64,
         image_base64,
         pdf_base64,
         event_from,
         event_to`,
      [
        title,
        description,
        photo_base64 || null,
        image_base64 || null,
        pdf_base64 || null,
        event_from,
        event_to,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.status(200).json({
      message: 'Event updated successfully',
      event: result.rows[0],
    });
  } catch (err) {
    console.error('Error updating event:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================= DELETE =========================
// ✅ Delete Event by id
// DELETE /events/delete-event/:id
router.delete('/delete-event/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `DELETE FROM public.events
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.status(200).json({
      message: 'Event deleted successfully',
      id: result.rows[0].id,
    });
  } catch (err) {
    console.error('Error deleting event:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
