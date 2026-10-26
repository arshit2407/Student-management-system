const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const Student = require('../models/student.model');

const router = express.Router();

router.use(authMiddleware);

const validateStudentPayload = (data) => {
  const namePattern = /^[A-Za-z ]+$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const rollNoPattern = /^\d+$/;

  if (!data.name || !data.name.trim() || !namePattern.test(data.name)) {
    return 'Student name should contain only alphabets and spaces';
  }

  if (!data.email || !emailPattern.test(data.email.trim())) {
    return 'Please enter a valid email';
  }

  if (!data.rollNo || !rollNoPattern.test(String(data.rollNo).trim())) {
    return 'Roll no. must contain digits only';
  }

  return null;
};

const normalizeRollNo = (rollNo) => String(rollNo).trim();

router.post('/', async (req, res) => {
  try {
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

    const student = await Student.create({ ...req.body, rollNo: normalizedRollNo, user: req.userId });
    return res.status(201).json(student);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const students = await Student.find({ user: req.userId });
    return res.status(200).json(students);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const validationError = validateStudentPayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const normalizedRollNo = normalizeRollNo(req.body.rollNo);
    const existingRollNo = await Student.findOne({
      user: req.userId,
      rollNo: normalizedRollNo,
      _id: { $ne: req.params.id }
    }).select('_id');
    if (existingRollNo) {
      return res.status(400).json({ message: 'Roll no. already exists in another group/student' });
    }

    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { ...req.body, rollNo: normalizedRollNo },
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.status(200).json(student);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findOneAndDelete({ _id: req.params.id, user: req.userId });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    return res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;

