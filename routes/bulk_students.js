// routes/bulk_students.js
const express = require('express');
const router = express.Router();
const cors = require('cors');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const db = require('../config/db_conn');

// ===== CORS at router level (safe defaults) =====
router.use(cors({ origin: true, credentials: true }));

// ===== Multer (in-memory) =====
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// ===== Columns we accept on student_master =====
// NOTE: stuid is optional on insert; DB will auto-generate if DEFAULT used.
const COLS_ALL = [
  'stuid',
  'stu_enrollmentnumber',
  'stu_rollnumber',
  'stu_regn_number',
  'stuname',
  'stumob1',
  'stucaste',
  'stugender',
  'studob',
  'stuadmissiondt',
  'stu_course_id',
  'stuparentname',
  'stuprentmob1',
  'stu_inst_id',
  'programdescription',
  'stu_mother_name',
  'admission_officer_name',
  'academic_year',
  'quta',
];

const ACCEPT_COLS = new Set(COLS_ALL);

// ===== Helpers =====
const norm = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
};
const toKeyLoose = (h) =>
  String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-:/().]+/g, ''); // remove most punctuation/spaces

// ===== NEW: Institute hard-coded map (accept names in stu_inst_id) =====
const INSTITUTE_ID_TO_NAME = {
  CID_001: 'SVIST',
  CID_002: 'SRST',
  CID_003: 'SVIMS',
};
const INSTITUTE_NAME_TO_ID = Object.fromEntries(
  Object.entries(INSTITUTE_ID_TO_NAME).map(([id, nm]) => [String(nm).trim().toLowerCase(), id])
);

// Normalize "cid001", "CID-001", "cid_001" → "CID_001"
function normalizeCidLike(v) {
  const s = String(v || '').trim();
  const m = s.match(/^cid[\s\-_]?(\d{1,})$/i);
  if (!m) return null;
  const num = String(m[1]).padStart(3, '0');
  return `CID_${num}`;
}
function looksLikeCid(v) {
  return !!normalizeCidLike(v);
}

// ===== Human-friendly header aliases (server will accept these) =====
const HEADER_ALIASES = (() => {
  const map = new Map();
  const add = (k, v) => map.set(toKeyLoose(k), v);

  // Map DB columns to themselves
  COLS_ALL.forEach((c) => add(c, c));

  // Friendly / loose
  add('studentid', 'stuid');
  add('id', 'stuid');

  add('enrollment', 'stu_enrollmentnumber');
  add('enrolment', 'stu_enrollmentnumber');
  add('enrollmentno', 'stu_enrollmentnumber');
  add('enrollmentnumber', 'stu_enrollmentnumber');
  add('enrolmentno', 'stu_enrollmentnumber');
  add('enrolmentnumber', 'stu_enrollmentnumber');
  add('enrollment no', 'stu_enrollmentnumber');
  add('enrolment no', 'stu_enrollmentnumber');

  add('roll', 'stu_rollnumber');
  add('rollno', 'stu_rollnumber');
  add('rollnumber', 'stu_rollnumber');
  add('roll no', 'stu_rollnumber');

  add('registrationno', 'stu_regn_number');
  add('regno', 'stu_regn_number');
  add('regnno', 'stu_regn_number');
  add('registration no', 'stu_regn_number');

  add('name', 'stuname');
  add('studentname', 'stuname');
  add('student name', 'stuname');

  add('phone', 'stumob1');
  add('phone number', 'stumob1');
  add('mobileno', 'stumob1');
  add('mobile', 'stumob1');
  add('contact', 'stumob1');

  add('caste', 'stucaste');
  add('category', 'stucaste');
  add('caste/category', 'stucaste');

  add('gender', 'stugender');

  add('dob', 'studob');
  add('dateofbirth', 'studob');
  add('date of birth', 'studob');

  add('admissiondate', 'stuadmissiondt');
  add('admission date', 'stuadmissiondt');
  add('dateofadmission', 'stuadmissiondt');

  add('course', 'stu_course_id');
  add('courseid', 'stu_course_id');
  add('course id', 'stu_course_id');

  add('fathername', 'stuparentname');
  add('parentname', 'stuparentname');
  add('guardianname', 'stuparentname');
  add("father's name", 'stuparentname');

  add('mothername', 'stu_mother_name');
  add("mother's name", 'stu_mother_name');

  add('parentphone', 'stuprentmob1');
  add('guardianphone', 'stuprentmob1');
  add('parentmobile', 'stuprentmob1');
  add('parent phone', 'stuprentmob1');

  add('instituteid', 'stu_inst_id');
  add('institute id', 'stu_inst_id');
  add('instid', 'stu_inst_id');
  add('collegeid', 'stu_inst_id');

  add('admissionofficer', 'admission_officer_name');
  add('admission officer', 'admission_officer_name');
  add('officername', 'admission_officer_name');

  add('academicyear', 'academic_year');
  add('academic year', 'academic_year');
  add('year', 'academic_year');

  add('quota', 'quta');

  add('program', 'programdescription');
  add('programdesc', 'programdescription');
  add('program description', 'programdescription');
  add('course description', 'programdescription');

  // Highly human-friendly “title-cased” labels
  add('Student ID', 'stuid');
  add('Enrollment No', 'stu_enrollmentnumber');
  add('Roll No', 'stu_rollnumber');
  add('Registration No', 'stu_regn_number');
  add('Student Name', 'stuname');
  add('Phone Number', 'stumob1');
  add('Caste/Category', 'stucaste');
  add('Gender', 'stugender');
  add('Date of Birth', 'studob');
  add('Admission Date', 'stuadmissiondt');
  add('Course ID', 'stu_course_id');
  add("Father's Name", 'stuparentname');
  add("Mother's Name", 'stu_mother_name');
  add('Parent Phone', 'stuprentmob1');
  add('Institute ID', 'stu_inst_id');
  add('Course Description', 'programdescription');
  add('Admission Officer', 'admission_officer_name');
  add('Academic Year', 'academic_year');
  add('Quota', 'quta');

  return map;
})();

const canonicalizeHeader = (h) => HEADER_ALIASES.get(toKeyLoose(h)) || h;

// ===== Optional: auto-resolve course id using institute + description =====
async function resolveCourseId(instId, programDesc) {
  if (!programDesc) return null;
  const candidates = [
    {
      table: 'public.master_course',
      where: `
        (${instId ? 'inst_id = $1 AND ' : ''} (LOWER(program_description) = LOWER($2) OR LOWER(course_name) = LOWER($2)))
      `,
      cols: ['course_id'],
      params: instId ? [instId, programDesc] : [programDesc],
    },
    {
      table: 'public.subject_course',
      where: `
        (${instId ? 'inst_id = $1 AND ' : ''} (LOWER(program_description) = LOWER($2) OR LOWER(course_title) = LOWER($2)))
      `,
      cols: ['course_id'],
      params: instId ? [instId, programDesc] : [programDesc],
    },
  ];

  for (const c of candidates) {
    try {
      const ex = await db.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = split_part($1, '.', 1)
           AND table_name   = split_part($1, '.', 2)
         LIMIT 1`,
        [c.table]
      );
      if (ex.rowCount === 0) continue;

      const r = await db.query(
        `SELECT ${c.cols.join(', ')} FROM ${c.table}
         WHERE ${c.where} ORDER BY 1 LIMIT 1`,
        c.params
      );
      if (r.rowCount > 0) return r.rows[0].course_id ?? null;
    } catch {
      // ignore and try next
    }
  }
  return null;
}

/**
 * NEW: Robust resolver for institute IDs.
 * - Maps "SVIST" -> "CID_001", "SRST" -> "CID_002", "SVIMS" -> "CID_003"
 * - Normalizes "cid001", "CID-001" etc. -> "CID_001"
 * - Tries DB lookup on master_college by LOWER(inst_name) if not matched above
 */
async function resolveInstituteId(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return null;

  // Normalize immediate CID-like patterns
  const normalizedCid = normalizeCidLike(v);
  if (normalizedCid) return normalizedCid;

  // Hard-coded known names
  const byMap = INSTITUTE_NAME_TO_ID[v.toLowerCase()];
  if (byMap) return byMap;

  // Try DB lookup by name in master_college (case-insensitive)
  try {
    const r = await db.query(
      `SELECT inst_id
         FROM public.master_college
        WHERE LOWER(inst_name) = LOWER($1)
        LIMIT 1`,
      [v]
    );
    if (r.rowCount > 0 && r.rows[0]?.inst_id) {
      // In case DB returns "cid001" normalize to "CID_001"
      return normalizeCidLike(r.rows[0].inst_id) || r.rows[0].inst_id;
    }
  } catch {
    // ignore lookup errors; fall through
  }

  // As a final fallback: if it looks like "cidXX" without underscore, normalize; else return original string
  return normalizedCid || v;
}

async function normalizeIncomingRow(row) {
  const obj = {};
  for (const k of Object.keys(row || {})) {
    if (ACCEPT_COLS.has(k)) obj[k] = row[k];
  }

  // ===== NEW: Accept institute NAME in stu_inst_id and map to CID_XXX =====
  if (Object.prototype.hasOwnProperty.call(obj, 'stu_inst_id')) {
    const mapped = await resolveInstituteId(obj.stu_inst_id);
    obj.stu_inst_id = mapped;
  }

  if (!norm(obj.stu_course_id)) {
    const cid = await resolveCourseId(norm(obj.stu_inst_id), norm(obj.programdescription));
    if (cid) obj.stu_course_id = cid;
  }
  return obj;
}

// ===== CSV parsing (header canonicalization) =====
function parseCsv(buffer) {
  return parse(buffer, {
    columns: (headers) => headers.map(canonicalizeHeader),
    skip_empty_lines: true,
    trim: true,
  });
}

function mapCsvRows(records) {
  if (!records.length) return { rows: [], warnings: [] };
  const headers = Object.keys(records[0]);

  const missing = [];
  for (const c of ACCEPT_COLS) {
    if (!headers.includes(c)) missing.push(c);
  }

  const warnings = [];
  if (missing.length) {
    warnings.push({
      type: 'missing_columns',
      note: 'Some DB columns absent in CSV; they will be inserted as NULL.',
      columns: missing,
    });
  }

  const mapped = records.map((r) => {
    const o = {};
    for (const col of ACCEPT_COLS) o[col] = Object.prototype.hasOwnProperty.call(r, col) ? r[col] : null;
    return o;
  });

  return { rows: mapped, warnings };
}

// ===== Build row placeholders with DEFAULT for stuid if empty =====
function rowPlaceholdersAndValues(row, baseIndex = 1) {
  let i = baseIndex;
  const placeholders = [];
  const values = [];

  if (row.stuid == null || String(row.stuid).trim() === '') {
    placeholders.push('DEFAULT'); // let sequence assign id
  } else {
    placeholders.push(`$${i++}`);
    values.push(norm(row.stuid));
  }

  for (const col of COLS_ALL.filter((c) => c !== 'stuid')) {
    placeholders.push(`$${i++}`);
    values.push(norm(row[col]));
  }

  return { placeholders: `(${placeholders.join(',')})`, values, nextIndex: i };
}

// ===== Health =====
router.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ===== Last ID and Next ID =====
// IMPORTANT: Adjust the sequence & table name if different in your DB.
const SEQ_NAME = 'public.student_id_seq';     // ← change if your sequence differs
const TABLE    = 'public.student_master';     // ← change if your table differs

router.get('/last-id', async (_req, res) => {
  try {
    // Prefer MAX(stuid) (works even if some rows inserted manually)
    const r = await db.query(`SELECT COALESCE(MAX(stuid),0)::bigint AS last_id FROM ${TABLE}`);
    const last = Number(r.rows?.[0]?.last_id ?? 0);
    res.json({ last });
  } catch (e) {
    console.error('last-id error:', e);
    res.status(500).json({ error: 'Failed to fetch last ID' });
  }
});

router.get('/next-id', async (_req, res) => {
  try {
    // Try reading sequence; fall back to MAX(stuid)+1
    try {
      const s = await db.query(`SELECT last_value, increment_by FROM ${SEQ_NAME}`);
      const last = Number(s.rows?.[0]?.last_value ?? 0);
      const inc  = Number(s.rows?.[0]?.increment_by ?? 1);
      return res.json({ next: last + inc });
    } catch {
      const r = await db.query(`SELECT COALESCE(MAX(stuid),0)::bigint + 1 AS next FROM ${TABLE}`);
      return res.json({ next: Number(r.rows?.[0]?.next ?? 1) });
    }
  } catch (e) {
    console.error('next-id error:', e);
    res.status(500).json({ error: 'Failed to fetch next ID' });
  }
});

// ===== NEW: String-style STU ID helpers =====
function nextIncrementId(last = '', fallbackPrefix = 'STU_ID_', fallbackPad = 3) {
  if (!last) return `${fallbackPrefix}${String(1).padStart(fallbackPad, '0')}`;
  const m = String(last).match(/^(.*?)(\d+)$/);
  if (!m) return `${fallbackPrefix}${String(1).padStart(fallbackPad, '0')}`;
  const prefix = m[1];
  const nStr = m[2];
  const next = Number(nStr) + 1;
  return `${prefix}${String(next).padStart(nStr.length, '0')}`;
}

/**
 * Returns the last STU-style id by numeric tail (e.g., "STU_ID_023").
 * GET /last-stuid-string
 */
router.get('/last-stuid-string', async (_req, res) => {
  try {
    const sql = `
      SELECT stuid,
             COALESCE(NULLIF(regexp_replace(stuid, '^.*?(\\d+)$', '\\1'), ''), '0')::bigint AS num
      FROM ${TABLE}
      WHERE stuid ~ '\\d'
      ORDER BY num DESC, stuid DESC
      LIMIT 1
    `;
    const r = await db.query(sql);
    const last = r.rowCount ? r.rows[0].stuid : null;
    return res.json({ last: last || null });
  } catch (e) {
    console.error('last-stuid-string error:', e);
    return res.status(500).json({ error: 'Failed to fetch last STU string ID' });
  }
});

/**
 * Computes the next STU-style id preserving prefix/padding if possible.
 * GET /next-stuid-string?prefix=STU_ID_&pad=3
 */
router.get('/next-stuid-string', async (req, res) => {
  try {
    const prefix = typeof req.query.prefix === 'string' ? req.query.prefix : 'STU_ID_';
    const pad = Number.isFinite(Number(req.query.pad)) ? Math.max(1, Number(req.query.pad)) : 3;

    const sql = `
      SELECT stuid,
             COALESCE(NULLIF(regexp_replace(stuid, '^.*?(\\d+)$', '\\1'), ''), '0')::bigint AS num
      FROM ${TABLE}
      WHERE stuid ~ '\\d'
      ORDER BY num DESC, stuid DESC
      LIMIT 1
    `;
    const r = await db.query(sql);
    const last = r.rowCount ? r.rows[0].stuid : null;

    let next;
    if (last) {
      const m = String(last).match(/^(.*?)(\d+)$/);
      if (m) {
        const pfx = m[1];
        const nStr = m[2];
        const nNext = Number(nStr) + 1;
        next = `${pfx}${String(nNext).padStart(nStr.length, '0')}`;
      } else {
        next = nextIncrementId(null, prefix, pad);
      }
    } else {
      next = nextIncrementId(null, prefix, pad);
    }

    return res.json({ next });
  } catch (e) {
    console.error('next-stuid-string error:', e);
    return res.status(500).json({ error: 'Failed to compute next STU string ID' });
  }
});

// ===== BULK INSERT =====
router.post('/bulk', upload.single('file'), async (req, res) => {
  try {
    let csvBuffer;
    if (req.file?.buffer) csvBuffer = req.file.buffer;
    else if ((req.is('text/csv') || req.is('text/plain')) && req.body) csvBuffer = Buffer.from(String(req.body));
    else if (typeof req.body?.csv === 'string') csvBuffer = Buffer.from(req.body.csv, 'utf8');
    else return res.status(400).json({ error: 'CSV not provided. Send multipart "file" or raw text/csv or JSON { csv }' });

    let records;
    try { records = parseCsv(csvBuffer); } catch (e) { return res.status(400).json({ error: `CSV parse error: ${e.message || e}` }); }
    if (!records.length) return res.status(400).json({ error: 'CSV contains no data rows.' });

    const { rows, warnings } = mapCsvRows(records);
    const normRows = [];
    for (const r of rows) normRows.push(await normalizeIncomingRow(r));

    const CHUNK = 500;
    let inserted = 0;

    await db.query('BEGIN');
    for (let start = 0; start < normRows.length; start += CHUNK) {
      const slice = normRows.slice(start, start + CHUNK);

      let idx = 1;
      const rowPieces = [];
      const values = []

      for (const r of slice) {
        const { placeholders, values: v, nextIndex } = rowPlaceholdersAndValues(r, idx);
        rowPieces.push(placeholders);
        values.push(...v);
        idx = nextIndex;
      }

      const text = `
        INSERT INTO ${TABLE} (${COLS_ALL.join(',')})
        VALUES ${rowPieces.join(',')}
        ON CONFLICT (stuid) DO NOTHING
      `;
      const ex = await db.query(text, values);
      inserted += ex.rowCount || 0;
    }
    await db.query('COMMIT');

    res.json({
      message: 'Bulk insert completed',
      total_rows: normRows.length,
      inserted_rows: inserted,
      skipped_or_conflicted: normRows.length - inserted,
      warnings,
    });
  } catch (e) {
    try { await db.query('ROLLBACK'); } catch {}
    console.error('bulk error:', e);
    res.status(500).json({ error: 'Internal server error during bulk insert.' });
  }
});

// ===== BULK UPSERT =====
router.post('/bulk-upsert', upload.single('file'), async (req, res) => {
  try {
    let csvBuffer;
    if (req.file?.buffer) csvBuffer = req.file.buffer;
    else if ((req.is('text/csv') || req.is('text/plain')) && req.body) csvBuffer = Buffer.from(String(req.body));
    else if (typeof req.body?.csv === 'string') csvBuffer = Buffer.from(req.body.csv, 'utf8');
    else return res.status(400).json({ error: 'CSV not provided. Send multipart "file" or raw text/csv or JSON { csv }' });

    let records;
    try { records = parseCsv(csvBuffer); } catch (e) { return res.status(400).json({ error: `CSV parse error: ${e.message || e}` }); }
    if (!records.length) return res.status(400).json({ error: 'CSV contains no data rows.' });

    const { rows, warnings } = mapCsvRows(records);
    const normRows = [];
    for (const r of rows) normRows.push(await normalizeIncomingRow(r));

    const CHUNK = 250;
    let affected = 0;

    await db.query('BEGIN');
    for (let start = 0; start < normRows.length; start += CHUNK) {
      const slice = normRows.slice(start, start + CHUNK);

      let idx = 1;
      const rowPieces = [];
      const values = [];

      for (const r of slice) {
        const { placeholders, values: v, nextIndex } = rowPlaceholdersAndValues(r, idx);
        rowPieces.push(placeholders);
        values.push(...v);
        idx = nextIndex;
      }

      const setCols = COLS_ALL.filter((c) => c !== 'stuid').map((c) => `${c} = EXCLUDED.${c}`);
      const text = `
        INSERT INTO ${TABLE} (${COLS_ALL.join(',')})
        VALUES ${rowPieces.join(',')}
        ON CONFLICT (stuid) DO UPDATE SET
          ${setCols.join(', ')}
      `;
      const r = await db.query(text, values);
      affected += r.rowCount || 0;
    }
    await db.query('COMMIT');

    res.json({ message: 'Bulk upsert completed', affected_rows: affected, warnings });
  } catch (e) {
    try { await db.query('ROLLBACK'); } catch {}
    console.error('bulk-upsert error:', e);
    res.status(500).json({ error: 'Internal server error during bulk upsert.' });
  }
});

// ===== BASIC CRUD (optional, kept minimal) =====
router.get('/', async (req, res) => {
  try {
    const { q, limit = 50, offset = 0 } = req.query;
    const params = [];
    let i = 1;

    const where = [];
    if (q) {
      where.push(`(stuid::text ILIKE $${i} OR stuname ILIKE $${i} OR stu_rollnumber ILIKE $${i})`);
      params.push(`%${q}%`);
      i++;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const listSql = `
      SELECT * FROM ${TABLE}
      ${whereSql}
      ORDER BY createdat DESC NULLS LAST
      LIMIT $${i++} OFFSET $${i++}
    `;
    params.push(Number(limit), Number(offset));

    const countSql = `SELECT COUNT(*)::int AS total FROM ${TABLE} ${whereSql}`;
    const [list, count] = await Promise.all([
      db.query(listSql, params),
      db.query(countSql, where.length ? [params[0]] : []),
    ]);

    res.json({ total: count.rows?.[0]?.total || 0, rows: list.rows });
  } catch (e) {
    console.error('list error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:stuid', async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM ${TABLE} WHERE stuid = $1 LIMIT 1`, [req.params.stuid]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Student not found' });
    res.json(r.rows[0]);
  } catch (e) {
    console.error('get error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:stuid', async (req, res) => {
  try {
    const body = await normalizeIncomingRow(req.body || {});
    const set = [];
    const values = [];
    let i = 1;

    for (const col of COLS_ALL) {
      if (col === 'stuid') continue;
      if (Object.prototype.hasOwnProperty.call(body, col)) {
        set.push(`${col} = $${i++}`);
        values.push(norm(body[col]));
      }
    }
    if (!set.length) return res.status(400).json({ error: 'No updatable fields provided.' });

    const r = await db.query(
      `UPDATE ${TABLE} SET ${set.join(', ')} WHERE stuid = $${i} RETURNING *`,
      [...values, req.params.stuid]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Student not found' });
    res.json(r.rows[0]);
  } catch (e) {
    console.error('update error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:stuid', async (req, res) => {
  try {
    const r = await db.query(`DELETE FROM ${TABLE} WHERE stuid = $1`, [req.params.stuid]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error('delete error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
