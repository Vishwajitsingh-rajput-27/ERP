const express = require('express');
const jwt = require('jsonwebtoken');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const router = express.Router();

// Middleware to verify JWT
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Mark attendance (once per day)
router.post('/mark', auth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const date = new Date().setHours(0, 0, 0, 0);
    const dayOfMonth = new Date().getDate();

    // Check if already marked today
    const existing = await Attendance.findOne({
      userId: req.user.userId,
      date: date
    });

    if (existing) {
      return res.status(400).json({ message: 'Attendance already marked today' });
    }

    const attendance = new Attendance({
      userId: req.user.userId,
      date: date,
      status,
      notes,
      dayOfMonth
    });

    await attendance.save();
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get monthly attendance report (Admin only)
router.get('/monthly/:year/:month', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const { year, month } = req.params; // month 1-12
    const attendances = await Attendance.find({
      date: {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0)
      }
    }).populate('userId', 'name email');

    // Group by user for CSV export
    const monthlyReport = attendances.reduce((acc, att) => {
      const userId = att.userId._id.toString();
      if (!acc[userId]) {
        acc[userId] = {
          name: att.userId.name,
          email: att.userId.email,
          daysPresent: 0,
          totalDays: 0,
          attendanceRate: 0
        };
      }
      acc[userId].totalDays++;
      if (att.status === 'Present') acc[userId].daysPresent++;
      return acc;
    }, {});

    res.json({
      report: Object.values(monthlyReport),
      exportData: attendances
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user personal attendance
router.get('/my-attendance', auth, async (req, res) => {
  try {
    const attendances = await Attendance.find({ userId: req.user.userId })
      .sort({ date: -1 })
      .limit(30);
    res.json(attendances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
