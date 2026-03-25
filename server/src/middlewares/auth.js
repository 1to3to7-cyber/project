const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};

// Middleware to check if user has required role
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Middleware to check if user owns the resource or is admin
const requireOwnershipOrAdmin = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id || req.params.studentId || req.params.schoolId;

      if (req.user.role === 'ADMIN') {
        return next();
      }

      let isOwner = false;

      switch (resourceType) {
        case 'student':
          if (req.user.role === 'STUDENT') {
            const student = await prisma.student.findUnique({
              where: { userId: req.user.id }
            });
            isOwner = student && student.id === resourceId;
          }
          break;

        case 'school':
          if (req.user.role === 'SCHOOL_ADMIN') {
            const schoolAdmin = await prisma.schoolAdmin.findUnique({
              where: { userId: req.user.id }
            });
            isOwner = schoolAdmin && schoolAdmin.schoolId === resourceId;
          }
          break;

        case 'application':
          if (req.user.role === 'STUDENT') {
            const application = await prisma.application.findUnique({
              where: { id: resourceId },
              include: { student: true }
            });
            isOwner = application && application.student.userId === req.user.id;
          } else if (req.user.role === 'SCHOOL_ADMIN') {
            const application = await prisma.application.findUnique({
              where: { id: resourceId },
              include: { program: { include: { school: true } } }
            });
            if (application) {
              const schoolAdmin = await prisma.schoolAdmin.findUnique({
                where: { userId: req.user.id }
              });
              isOwner = schoolAdmin && schoolAdmin.schoolId === application.program.school.id;
            }
          }
          break;
      }

      if (!isOwner) {
        return res.status(403).json({ message: 'Access denied' });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({ message: 'Authorization error' });
    }
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnershipOrAdmin
};