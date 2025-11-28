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
    origin: '*', // 🔓 allow all origins (good for dev, not for production)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-user-role', // for admin checks (if needed)
      'x-user-id', // for admin checks (if needed)
    ],
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

/* ==================== Routes ==================== */
// Auth / users
const loginRouter = require('./routes/user'); // ⚠️ if your file is routes/login.js, change this to './routes/login'
const masterUserApi = require('./routes/master_user');
const userRoleApi = require('./routes/user_role_api');
const MasterRole = require('./routes/master_role_api');
const userDtlsRouter = require('./routes/user_dtls');

// Master data
const collegeRoutes = require('./routes/master_college_api');
const masterDeptsRoutes = require('./routes/master_depts');
const collegeAcadYearRoutes = require('./routes/master_acadyear_api');
const courseRoutes = require('./routes/master_course_api');
const subjectRoutes = require('./routes/master_subject_api');
const subjectCourseRoutes = require('./routes/subject_course_api');
const classroomAPI = require('./routes/classroomapi');
const collegeGroupRoutes = require('./routes/collegeGroup');
const masterSubjectTeacherRoutes = require('./routes/subject_teacher_api'); // kept, even if unused
const teacherRoutes = require('./routes/master_teacher_api');
const teacherDtlsApi = require('./routes/teacher_dtls_api');
const teacherAvailabilityRoutes = require('./routes/teacher_availbility_api');

// Student master (existing bulk/compat)
const studentMasterRoutes = require('./routes/student_master');
const teacherMasterRoutes = require('./routes/teacher_master_bulk_up');
const bulkStudentsRoutes = require('./routes/bulk_students');

// 🆕 NEW: Student list/read/update/delete API at /api/student/*
const masterStudentApi = require('./routes/master_student_api');

// Daily routine / exam / attendance
const DailyRoutine = require('./routes/college_daily_routine_api');
const collegedailyroutineRoutes = require('./routes/college_daily_routine_api');
const examroutineRoutes = require('./routes/college_exam_routine_api');
const CollegeAttendenceManager = require('./routes/college_attendance_api');
const EmployeeAttendanceManager = require('./routes/employee_attendance_api');

// Course offering / registration / results
const courseofferingRoutes = require('./routes/course_offering_api');
const courseregistrationRoutes = require('./routes/course_registration_api');
const ExamResult = require('./routes/college_exam_result_api');
const examResultApi = require('./routes/exam_result_api');

// Electives
const subjectelecRoutes = require('./routes/subjectelec');

// CMS / finance
const cmsFeeStructure = require('./routes/cmsFeeStructure');
const cmsPayment = require('./routes/cmsPayment');
const cmsStudentFeeInvoice = require('./routes/cmsStudentFeeInvoice');
const cmsStuScholarship = require('./routes/cmsStuScholarship');
const finMasterStudnet = require('./routes/fin_master_studnet');

// Other utilities
const chartDataApi = require('./routes/chart_data');
const calendarattendance = require('./routes/calendar-attendance');
const smsDeviceRoutes = require('./routes/smsDeviceRoutes');
const whiteboardCmsApi = require('./routes/whiteboard_cms_api');
const auditLogRoutes = require('./routes/audit_log_api');
const demandLettersRouter = require('./routes/demandLetters');
const teacherInfoApi = require('./routes/teacher_inform_api');
const studentInformationRouter = require('./routes/student_information');
const leaveApplicationRouter = require('./routes/leave_application');
const studentAyRoutes = require('./routes/student_ay');

// Events & Announcements
const eventsRouter = require('./routes/events_api');
const announcementsRouter = require('./routes/announcements_api');

// 🆕 NEW: Notices CRUD API
const noticesRoutes = require('./routes/notices');

// 🆕 NEW: CDN bootstrap router
const cdnBootstrapRouter = require('./routes/cdn_bootstrap');

/* ==================== Mount ==================== */
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

// 🆕 New canonical student API used by UI: /api/student/list
app.use('/api/student', masterStudentApi);

// Teacher bulk master upload
app.use('/api/teacher-master-bulk-up', teacherMasterRoutes);

// Routine / exams / attendance
app.use('/api/daily-routine', DailyRoutine);
app.use('/api/college-daily-routine', collegedailyroutineRoutes);
app.use('/api/exam-routine-manager', examroutineRoutes);
app.use('/api/CollegeAttendenceManager', CollegeAttendenceManager);
app.use('/api/employee-attendance', EmployeeAttendanceManager);

// Course offering / registration / results
app.use('/api/course-offering', courseofferingRoutes);
app.use('/api/course-registration', courseregistrationRoutes);
app.use('/api/exam-result', ExamResult);
app.use('/api/exam-result-raw', examResultApi);

// CMS / finance
app.use('/api/cms-fee-structure', cmsFeeStructure);
app.use('/api/cms-payments', cmsPayment);
app.use('/api/cms-student-fee-invoice', cmsStudentFeeInvoice);
app.use('/api/cms-stu-scholarship', cmsStuScholarship);
app.use('/api/fin-master-student', finMasterStudnet);

// Misc
app.use('/api/chart-data', chartDataApi);
app.use('/api/calendar-attendance', calendarattendance);
app.use('/api/sms-device', smsDeviceRoutes);
app.use('/api/whiteboard-cms', whiteboardCmsApi);
// auditLogRoutes not mounted originally – keeping same behavior
app.use('/api/demand-letters', demandLettersRouter);
app.use('/api/teacher-info', teacherInfoApi);
app.use('/api/student-information', studentInformationRouter);
app.use('/api/leave-application', leaveApplicationRouter);
app.use('/api/student-ay', studentAyRoutes);

// Events / announcements / notices
app.use('/api/events', eventsRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/notices', noticesRoutes);

// CDN bootstrap
app.use('/api/cdn', cdnBootstrapRouter);

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
    console.log('✅ Connected to Postgres at', rows[0].now);
    // Important: bind to 0.0.0.0 so 192.168.31.114 also works
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
