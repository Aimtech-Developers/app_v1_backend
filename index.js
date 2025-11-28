// index.js
const express = require('express');
const cors = require('cors');
const db = require('./config/db_conn');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 9090;

/* ==================== CORS (ALLOW ALL – DEV) ==================== */
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-id'],
  })
);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.text({ type: ['text/csv', 'text/plain'], limit: '20mb' }));

/* ==================== Static ==================== */
app.use('/uploads_bg', express.static(path.join(__dirname, 'uploads_bg')));
app.use(
  '/uploads_bg',
  express.static(path.join(__dirname, 'SMS-ui', 'src', 'uploads_bg'))
);

/* ==================== ROUTES (ONLY THE ONES YOU LISTED) ==================== */
// Auth / users
const loginRouter = require('./routes/user');
const masterUserApi = require('./routes/master_user');
const userRoleApi = require('./routes/user_role_api');
const MasterRole = require('./routes/master_role_api');
const userDtlsRouter = require('./routes/user_dtls');

// Master data
const collegeRoutes = require('./routes/master_college_api');
const masterDeptsRoutes = require('./routes/master_depts');
const collegeAcadYearRoutes = require('./routes/master_acadyear_api');
const collegeGroupRoutes = require('./routes/collegeGroup');

const courseRoutes = require('./routes/master_course_api');
const subjectRoutes = require('./routes/master_subject_api');
const subjectCourseRoutes = require('./routes/subject_course_api');
const subjectelecRoutes = require('./routes/subjectelec');

const classroomAPI = require('./routes/classroomapi');

const teacherRoutes = require('./routes/master_teacher_api');
const teacherDtlsApi = require('./routes/teacher_dtls_api');
const teacherAvailabilityRoutes = require('./routes/teacher_availbility_api');

// Students
const studentMasterRoutes = require('./routes/student_master'); // compat
const bulkStudentsRoutes = require('./routes/bulk_students');
const masterStudentApi = require('./routes/master_student_api'); // /api/student/*

/* ==================== Mount (ONLY THESE) ==================== */
app.use('/login', loginRouter);
app.use('/api', masterUserApi);
app.use('/api/user-role', userRoleApi);
app.use('/api/master-role', MasterRole);
app.use('/api/user-dtls', userDtlsRouter);

app.use('/master-college', collegeRoutes);
app.use('/api/master-depts', masterDeptsRoutes);
app.use('/api/master-acadyear', collegeAcadYearRoutes);

app.use('/api/college-group', collegeGroupRoutes);

app.use('/api/course', courseRoutes);
app.use('/api/subject', subjectRoutes);
app.use('/api/subject-course', subjectCourseRoutes);
app.use('/api/subject-elective', subjectelecRoutes);

app.use('/api/class-room', classroomAPI);
app.use('/api/teacher', teacherRoutes);
app.use('/api/teacher-dtls', teacherDtlsApi);
app.use('/api/teacher-availability-manager', teacherAvailabilityRoutes);

// Existing student routes (compat)
app.use('/api/students', studentMasterRoutes);
app.use('/api/students-up', studentMasterRoutes);

// Bulk endpoints
app.use('/api/bulk-students', bulkStudentsRoutes);

// New canonical student API
app.use('/api/student', masterStudentApi);

/* ==================== Health ==================== */
app.get('/', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

/* ==================== Start ==================== */
db.query('SELECT NOW()')
  .then(({ rows }) => {
    console.log('✅ Connected to Postgres at', rows?.[0]?.now || rows?.[0]);
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 Server listening on:');
      console.log(`   → http://localhost:${PORT}`);
      console.log(`   → http://192.168.31.114:${PORT} (LAN)`);
    });
  })
  .catch((err) => {
    console.error('❌ Could not connect to Postgres:', err);
    process.exit(1);
  });
