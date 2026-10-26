const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const XLSX = require('xlsx');
const authMiddleware = require('../middleware/auth.middleware');
const Group = require('../models/group.model');
const Student = require('../models/student.model');
const Attendance = require('../models/attendance.model');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

const validateStudentPayload = (data) => {
  const namePattern = /^[A-Za-z ]+$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!data.name || !data.name.trim() || !namePattern.test(data.name)) {
    return 'Student name should contain only alphabets and spaces';
  }

  if (!data.email || !emailPattern.test(data.email.trim())) {
    return 'Please enter a valid email';
  }

  if (!data.rollNo || !/^\d+$/.test(String(data.rollNo).trim())) {
    return 'Roll no. must contain digits only';
  }

  return null;
};

const normalizeRollNo = (rollNo) => String(rollNo).trim();
const normalizeHeaderKey = (header) =>
  String(header || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const pickField = (row, keyList) => {
  for (const key of keyList) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  return '';
};

const normalizeImportedRow = (rawRow) => {
  const normalized = {};

  Object.entries(rawRow).forEach(([key, value]) => {
    normalized[normalizeHeaderKey(key)] = value;
  });

  return {
    name: pickField(normalized, ['name', 'studentname', 'student']),
    email: pickField(normalized, ['email', 'emailid', 'studentemail']).toLowerCase(),
    rollNo: pickField(normalized, ['rollno', 'rollnumber', 'roll'])
  };
};

const getOwnedGroup = async (userId, groupId) => {
  return Group.findOne({ _id: groupId, user: userId });
};

const getDayStartUTC = (dateInput) => {
  const baseDate = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  return new Date(
    Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate())
  );
};

const buildAttendanceInsights = async ({ userId, groupId, date, entries }) => {
  const totalStudents = entries.length;
  const absentEntries = entries.filter((entry) => entry.status === 'absent');
  const absentCount = absentEntries.length;
  const presentCount = totalStudents - absentCount;
  const absentPercent = totalStudents > 0 ? Math.round((absentCount / totalStudents) * 100) : 0;

  const insights = [];
  const todayDateKey = date.toISOString().split('T')[0];

  const allRecords = await Attendance.find({
    user: userId,
    group: groupId
  })
    .select('student studentName status date')
    .sort({ date: 1, createdAt: 1 });

  const byDateMap = new Map();
  const byStudentMap = new Map();

  allRecords.forEach((record) => {
    const dateKey = record.date.toISOString().split('T')[0];
    const studentId = String(record.student);

    if (!byDateMap.has(dateKey)) {
      byDateMap.set(dateKey, { total: 0, absent: 0 });
    }
    const dateStats = byDateMap.get(dateKey);
    dateStats.total += 1;
    if (record.status === 'absent') {
      dateStats.absent += 1;
    }

    if (!byStudentMap.has(studentId)) {
      byStudentMap.set(studentId, {
        studentName: record.studentName || 'Unknown Student',
        records: []
      });
    }
    byStudentMap.get(studentId).records.push({ dateKey, status: record.status });
  });

  const historicalDateStats = Array.from(byDateMap.entries())
    .filter(([dateKey]) => dateKey !== todayDateKey)
    .map(([, stats]) => (stats.total > 0 ? (stats.absent / stats.total) * 100 : 0));

  if (absentCount === 0) {
    insights.push('Great attendance today: all students are present.');
  } else if (historicalDateStats.length > 0) {
    const avgAbsentPercent =
      historicalDateStats.reduce((sum, value) => sum + value, 0) / historicalDateStats.length;
    const roundedAverage = Math.round(avgAbsentPercent);
    const delta = absentPercent - roundedAverage;

    if (delta >= 12) {
      insights.push(
        `Unusually low attendance today: ${absentPercent}% absent vs historical average ${roundedAverage}% absent.`
      );
    } else if (delta >= 5) {
      insights.push(
        `Attendance is lower than usual today: ${absentPercent}% absent vs historical average ${roundedAverage}% absent.`
      );
    } else if (delta <= -5) {
      insights.push(
        `Attendance is better than usual today: ${absentPercent}% absent vs historical average ${roundedAverage}% absent.`
      );
    } else {
      insights.push(
        `Attendance is close to normal today: ${absentPercent}% absent vs historical average ${roundedAverage}% absent.`
      );
    }
  } else if (absentPercent >= 35) {
    insights.push(
      `Unusually high absence today: ${absentCount} of ${totalStudents} students are absent (${absentPercent}%).`
    );
  } else if (absentPercent >= 20) {
    insights.push(
      `Moderate absence alert: ${absentCount} of ${totalStudents} students are absent (${absentPercent}%).`
    );
  } else {
    insights.push(`Attendance is stable today: ${presentCount} present, ${absentCount} absent.`);
  }

  const absentTodayStudentIds = absentEntries
    .map((entry) => String(entry.studentId))
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  let repeatedAbsentees = [];

  if (absentTodayStudentIds.length > 0) {
    const repeatedAbsentData = await Attendance.aggregate([
      {
        $match: {
          user: userId,
          group: groupId,
          student: { $in: absentTodayStudentIds.map((id) => id) },
          status: 'absent'
        }
      },
      {
        $group: {
          _id: '$student',
          studentName: { $last: '$studentName' },
          absentDays: { $sum: 1 }
        }
      },
      { $match: { absentDays: { $gte: 3 } } },
      { $sort: { absentDays: -1 } }
    ]);

    repeatedAbsentees = repeatedAbsentData.map((item) => ({
      studentId: item._id,
      studentName: item.studentName,
      absentDays: item.absentDays
    }));
  }

  const patternInsights = [];
  const absentTodayIdSet = new Set(absentTodayStudentIds.map((id) => String(id)));

  byStudentMap.forEach((value, studentId) => {
    if (!absentTodayIdSet.has(studentId)) {
      return;
    }

    const records = value.records;
    const todayIndex = records.findIndex((record) => record.dateKey === todayDateKey);
    if (todayIndex === -1 || records[todayIndex].status !== 'absent') {
      return;
    }

    const pastRecords = records.slice(0, todayIndex);
    const pastCount = pastRecords.length;
    const pastPresentCount = pastRecords.filter((record) => record.status === 'present').length;
    const totalAbsentCount = records.filter((record) => record.status === 'absent').length;

    let trailingAbsentStreak = 0;
    for (let i = records.length - 1; i >= 0; i -= 1) {
      if (records[i].status === 'absent') {
        trailingAbsentStreak += 1;
      } else {
        break;
      }
    }

    if (trailingAbsentStreak >= 2) {
      patternInsights.push(
        `${value.studentName} has been absent for the last ${trailingAbsentStreak} classes.`
      );
    }

    if (records.length >= 3 && totalAbsentCount === records.length) {
      patternInsights.push(`${value.studentName} has been consistently absent for all classes.`);
    }

    if (pastCount >= 2 && pastPresentCount === pastCount) {
      patternInsights.push(
        `${value.studentName} had been consistently present earlier but is absent today.`
      );
    }
  });

  patternInsights.slice(0, 5).forEach((message) => insights.push(message));

  if (repeatedAbsentees.length > 0) {
    const names = repeatedAbsentees.map((student) => student.studentName).join(', ');
    insights.push(`Needs attention: repeated absentees detected (${names}).`);
  }

  return {
    summary: {
      totalStudents,
      presentCount,
      absentCount,
      absentPercent
    },
    repeatedAbsentees,
    insights
  };
};

router.post('/', async (req, res) => {
  try {
    const name = req.body.name?.trim();

    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const group = await Group.create({ user: req.userId, name });
    return res.status(201).json(group);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Group name already exists' });
    }

    return res.status(500).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const groups = await Group.find({ user: req.userId }).sort({ createdAt: -1 });
    return res.status(200).json(groups);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/:groupId', async (req, res) => {
  try {
    const group = await getOwnedGroup(req.userId, req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    return res.status(200).json(group);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete('/:groupId', async (req, res) => {
  try {
    const group = await getOwnedGroup(req.userId, req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    await Attendance.deleteMany({ user: req.userId, group: group._id });
    await Student.deleteMany({ user: req.userId, group: group._id });
    await Group.deleteOne({ _id: group._id, user: req.userId });

    return res.status(200).json({ message: 'Group deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/:groupId/students', async (req, res) => {
  try {
    const group = await getOwnedGroup(req.userId, req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const validationError = validateStudentPayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const normalizedRollNo = normalizeRollNo(req.body.rollNo);
    const existingRollNo = await Student.findOne({
      user: req.userId,
      rollNo: normalizedRollNo
    }).select('_id');
    if (existingRollNo) {
      return res.status(400).json({ message: 'Roll no. already exists in another group/student' });
    }

    const student = await Student.create({
      ...req.body,
      rollNo: normalizedRollNo,
      user: req.userId,
      group: group._id
    });
    return res.status(201).json(student);
  } catch (error) {
    if (error.code === 11000) {
      if (String(error.message).includes('rollNo')) {
        return res.status(400).json({ message: 'Roll no. already exists in this group' });
      }
      return res.status(400).json({ message: 'Student email already exists in this group' });
    }

    return res.status(500).json({ message: error.message });
  }
});

router.get('/:groupId/students', async (req, res) => {
  try {
    const group = await getOwnedGroup(req.userId, req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const students = await Student.find({ user: req.userId, group: group._id }).sort({ createdAt: -1 });
    return res.status(200).json(students);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/:groupId/students/import', upload.single('file'), async (req, res) => {
  try {
    const group = await getOwnedGroup(req.userId, req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'Please upload a CSV or Excel file' });
    }

    let rows = [];
    try {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames?.[0];
      if (!firstSheetName) {
        return res.status(400).json({ message: 'Uploaded file has no sheet data' });
      }
      const worksheet = workbook.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    } catch (parseError) {
      return res.status(400).json({ message: 'Unable to parse uploaded file' });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'No student rows found in the uploaded file' });
    }

    const existingStudents = await Student.find({ user: req.userId }).select('rollNo email group');
    const existingRollNoSet = new Set(
      existingStudents.map((student) => normalizeRollNo(student.rollNo))
    );
    const existingGroupEmailSet = new Set(
      existingStudents
        .filter((student) => String(student.group) === String(group._id))
        .map((student) => String(student.email).trim().toLowerCase())
    );

    const stagedRollNos = new Set();
    const stagedGroupEmails = new Set();
    const errors = [];
    let importedCount = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const rowNumber = index + 2;
      const parsed = normalizeImportedRow(rows[index]);
      const validationError = validateStudentPayload(parsed);

      if (validationError) {
        errors.push(`Row ${rowNumber}: ${validationError}`);
        continue;
      }

      const normalizedRollNo = normalizeRollNo(parsed.rollNo);
      const normalizedEmail = String(parsed.email).trim().toLowerCase();

      if (existingRollNoSet.has(normalizedRollNo) || stagedRollNos.has(normalizedRollNo)) {
        errors.push(`Row ${rowNumber}: Roll no. ${normalizedRollNo} already exists`);
        continue;
      }

      if (existingGroupEmailSet.has(normalizedEmail) || stagedGroupEmails.has(normalizedEmail)) {
        errors.push(`Row ${rowNumber}: Email ${normalizedEmail} already exists in this group`);
        continue;
      }

      try {
        await Student.create({
          name: parsed.name,
          email: normalizedEmail,
          rollNo: normalizedRollNo,
          user: req.userId,
          group: group._id
        });
        importedCount += 1;
        stagedRollNos.add(normalizedRollNo);
        stagedGroupEmails.add(normalizedEmail);
      } catch (insertError) {
        if (insertError.code === 11000) {
          errors.push(`Row ${rowNumber}: duplicate value conflict`);
        } else {
          errors.push(`Row ${rowNumber}: failed to import`);
        }
      }
    }

    return res.status(200).json({
      message: 'Import completed',
      totalRows: rows.length,
      importedCount,
      skippedCount: rows.length - importedCount,
      errors
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/:groupId/attendance', async (req, res) => {
  try {
    const group = await getOwnedGroup(req.userId, req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const attendanceDate = getDayStartUTC(req.body.date);
    if (!attendanceDate) {
      return res.status(400).json({ message: 'Invalid date' });
    }

    const entries = req.body.entries;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: 'Attendance entries are required' });
    }

    const invalidStatus = entries.find(
      (entry) => entry.status !== 'present' && entry.status !== 'absent'
    );
    if (invalidStatus) {
      return res.status(400).json({ message: 'Attendance status must be present or absent' });
    }

    const studentIds = [...new Set(entries.map((entry) => String(entry.studentId)))];
    const students = await Student.find({
      _id: { $in: studentIds },
      user: req.userId,
      group: group._id
    }).select('_id name rollNo');

    if (students.length !== studentIds.length) {
      return res
        .status(400)
        .json({ message: 'Some students are invalid for this group' });
    }

    const studentMap = new Map(
      students.map((student) => [
        String(student._id),
        { name: student.name, rollNo: student.rollNo }
      ])
    );
    const bulkOps = entries.map((entry) => ({
      updateOne: {
        filter: {
          user: req.userId,
          group: group._id,
          student: entry.studentId,
          date: attendanceDate
        },
        update: {
          $set: {
            status: entry.status,
            user: req.userId,
            group: group._id,
            student: entry.studentId,
            studentName: studentMap.get(String(entry.studentId))?.name,
            studentRollNo: studentMap.get(String(entry.studentId))?.rollNo,
            date: attendanceDate
          }
        },
        upsert: true
      }
    }));

    if (bulkOps.some((op) => !studentMap.has(String(op.updateOne.filter.student)))) {
      return res.status(400).json({ message: 'Invalid student in attendance entries' });
    }

    await Attendance.bulkWrite(bulkOps);
    const analysis = await buildAttendanceInsights({
      userId: req.userId,
      groupId: group._id,
      date: attendanceDate,
      entries
    });

    return res.status(200).json({
      message: 'Attendance saved successfully',
      date: attendanceDate.toISOString().split('T')[0],
      aiAssistant: analysis
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/:groupId/attendance', async (req, res) => {
  try {
    const group = await getOwnedGroup(req.userId, req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const attendanceRecords = await Attendance.find({
      user: req.userId,
      group: group._id
    }).sort({ date: -1, createdAt: -1 });

    const groupedByDate = new Map();
    attendanceRecords.forEach((record) => {
      const dateKey = record.date.toISOString().split('T')[0];
      if (!groupedByDate.has(dateKey)) {
        groupedByDate.set(dateKey, []);
      }

      groupedByDate.get(dateKey).push({
        studentId: record.student,
        studentName: record.studentName || 'Unknown Student',
        studentRollNo: record.studentRollNo || '-',
        status: record.status
      });
    });

    const result = Array.from(groupedByDate.entries()).map(([date, entries]) => ({
      date,
      entries
    }));

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put('/:groupId/students/:studentId', async (req, res) => {
  try {
    const group = await getOwnedGroup(req.userId, req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const validationError = validateStudentPayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const normalizedRollNo = normalizeRollNo(req.body.rollNo);
    const existingRollNo = await Student.findOne({
      user: req.userId,
      rollNo: normalizedRollNo,
      _id: { $ne: req.params.studentId }
    }).select('_id');
    if (existingRollNo) {
      return res.status(400).json({ message: 'Roll no. already exists in another group/student' });
    }

    const student = await Student.findOneAndUpdate(
      { _id: req.params.studentId, user: req.userId, group: group._id },
      { ...req.body, rollNo: normalizedRollNo },
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.status(200).json(student);
  } catch (error) {
    if (error.code === 11000) {
      if (String(error.message).includes('rollNo')) {
        return res.status(400).json({ message: 'Roll no. already exists in this group' });
      }
      return res.status(400).json({ message: 'Student email already exists in this group' });
    }

    return res.status(500).json({ message: error.message });
  }
});

router.delete('/:groupId/students/:studentId', async (req, res) => {
  try {
    const group = await getOwnedGroup(req.userId, req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const student = await Student.findOneAndDelete({
      _id: req.params.studentId,
      user: req.userId,
      group: group._id
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await Attendance.deleteMany({
      user: req.userId,
      group: group._id,
      student: student._id
    });

    return res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
