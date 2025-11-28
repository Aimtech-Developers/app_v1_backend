// routes/cdn_bootstrap.js
// ================================================
// CDN bootstrap API - aggregate multiple GET APIs
// into one payload and add academic-year metadata.
// ================================================

const express = require('express');
const router = express.Router();
const db = require('../config/db_conn'); // same pool/client as other routes

/**
 * Derive academic-year info from a JS Date / date-string.
 * If year = 2025 → academic_year = "2025-2026"
 * and academic_year_code = 2025 + 9999 = 12024 (tweak if you want).
 */
function deriveAcademicInfoFromDate(dateLike) {
  if (!dateLike) return null;

  const dt = new Date(dateLike);
  if (Number.isNaN(dt.getTime())) return null;

  const year = dt.getFullYear();
  const nextYear = year + 1;

  return {
    academic_year: `${year}-${nextYear}`,
    academic_year_code: year + 9999,
  };
}

/**
 * Safely map a row and append academic-year info
 * based on created_at / createdat or fallback to "now".
 */
function attachAcademicYear(row) {
  const created =
    row.created_at ||
    row.createdat ||
    row.created_on ||
    row.createddate ||
    null;

  const info = deriveAcademicInfoFromDate(created || new Date());

  return info ? { ...row, ...info } : row;
}

// ================================================
// GET /api/cdn/bootstrap
// - Aggregates core GET APIs into one JSON payload
// - Designed to be CDN-cached and used by dashboard
// ================================================
router.get('/bootstrap', async (req, res) => {
  try {
    // You can adjust LIMITs as you like for CDN payload size.
    const [
      acadYearResult,
      collegesResult,
      deptsResult,
      classroomsResult,
      coursesResult,
      usersResult,
      menuResult,
      noticesResult,
      announcementsResult,
      eventsResult,
    ] = await Promise.all([
      // college_acad_year (existing GET: SELECT * FROM college_acad_year)
      db.query(
        `SELECT * FROM public.college_acad_year ORDER BY id DESC`
      ),

      // master_college (existing "view-colleges" GET)
      db.query(
        `SELECT * FROM public.master_college ORDER BY createdat DESC`
      ),

      // college_depts (existing GET all departments)
      db.query(
        `SELECT * FROM public.college_depts ORDER BY createdat DESC`
      ),

      // college_classroom (existing GET all classrooms)
      db.query(
        `SELECT * FROM public.college_classroom ORDER BY createdat DESC`
      ),

      // master_course (existing GET /master-course/list or /all)
      db.query(
        `SELECT
           courseid, coursedesc, collegedept, courseprgcod,
           course_level, course_totsemester, course_tot_credits,
           course_duration,
           coursestartdate,
           courseenddate,
           createdat, updatedat
         FROM public.master_course
         ORDER BY createdat DESC`
      ),

      // master_user (existing GET all users)
      db.query(
        `SELECT * FROM public.master_user ORDER BY createdat DESC`
      ),

      // menu_master (existing GET all menu items)
      db.query(
        `SELECT * FROM public.menu_master ORDER BY createdat DESC`
      ),

      // notices (existing GET /api/notices)
      db.query(
        `SELECT
           id,
           title,
           description,
           created_at,
           pdf_base64,
           image_base64
         FROM public.notices
         ORDER BY created_at DESC
         LIMIT 100`
      ),

      // announcements (existing GET /announcements/view-announcements)
      db.query(
        `SELECT
           id,
           title,
           description,
           created_at,
           file_base64,
           photo_base64
         FROM public.announcements
         ORDER BY created_at DESC
         LIMIT 100`
      ),

      // events (existing GET /events/view-events)
      db.query(
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
         ORDER BY created_at DESC
         LIMIT 100`
      ),
    ]);

    // Global academic-year info based on "now"
    const globalAcademic = deriveAcademicInfoFromDate(new Date());

    // Attach academic-year info row-wise wherever it makes sense
    const acadYears = acadYearResult.rows.map(attachAcademicYear);
    const notices = noticesResult.rows.map(attachAcademicYear);
    const announcements = announcementsResult.rows.map(attachAcademicYear);
    const events = eventsResult.rows.map(attachAcademicYear);

    // Other master data (no academic-year needed, but you can add if you want)
    const colleges = collegesResult.rows;
    const departments = deptsResult.rows;
    const classrooms = classroomsResult.rows;
    const courses = coursesResult.rows;
    const users = usersResult.rows;
    const menu = menuResult.rows;

    return res.status(200).json({
      ok: true,
      ts: new Date().toISOString(),
      academic_meta: globalAcademic,
      // For CDN: one big blob, you can "stale-while-revalidate" etc.
      data: {
        college_acad_year: acadYears,
        master_college: colleges,
        college_depts: departments,
        college_classroom: classrooms,
        master_course: courses,
        master_user: users,
        menu_master: menu,
        notices,
        announcements,
        events,
      },
    });
  } catch (err) {
    console.error('cdn/bootstrap error:', err);
    return res.status(500).json({
      ok: false,
      error: 'Failed to build CDN bootstrap payload',
    });
  }
});

module.exports = router;
