const { PrismaClient } = require('@prisma/client');
const {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  generateVerificationToken,
  generateVerificationCode,
  isExpired
} = require('../utils');
const { AppError } = require('../middlewares/errorHandler');

const prisma = new PrismaClient();

class AuthService {
  // Register a new user
  async register(userData) {
    const { email, password, firstName, lastName, phone, role } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role,
        verificationToken: generateVerificationToken()
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true
      }
    });

    // Create student profile if role is STUDENT
    if (role === 'STUDENT') {
      await prisma.student.create({
        data: {
          userId: user.id
        }
      });
    }

    // Log audit
    await this.logAudit(user.id, 'REGISTER', 'User', user.id);

    return user;
  }

  // Login user
  async login(email, password) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        student: true,
        schoolAdmin: {
          include: {
            school: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403);
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Update last login (optional)
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    });

    // Log audit
    await this.logAudit(user.id, 'LOGIN', 'User', user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        student: user.student,
        schoolAdmin: user.schoolAdmin
      },
      accessToken,
      refreshToken
    };
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    try {
      const decoded = require('../utils').verifyRefreshToken(refreshToken);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, isActive: true }
      });

      if (!user || !user.isActive) {
        throw new AppError('Invalid refresh token', 401);
      }

      const newAccessToken = generateAccessToken(user.id);
      const newRefreshToken = generateRefreshToken(user.id);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new AppError('Invalid refresh token', 401);
    }
  }

  // Request password reset
  async requestPasswordReset(email) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      // Don't reveal if email exists or not
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = generateVerificationToken();
    const resetExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpire: resetExpire
      }
    });

    // Log audit
    await this.logAudit(user.id, 'PASSWORD_RESET_REQUEST', 'User', user.id);

    // TODO: Send email with reset link
    // For now, just return the token (in production, send via email)
    return {
      message: 'Password reset link sent to your email',
      resetToken // Remove this in production
    };
  }

  // Reset password
  async resetPassword(token, newPassword) {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpire: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpire: null
      }
    });

    // Log audit
    await this.logAudit(user.id, 'PASSWORD_RESET', 'User', user.id);

    return { message: 'Password reset successfully' };
  }

  // Verify email (for future use)
  async verifyEmail(token) {
    const user = await prisma.user.findUnique({
      where: { verificationToken: token }
    });

    if (!user) {
      throw new AppError('Invalid verification token', 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null
      }
    });

    return { message: 'Email verified successfully' };
  }

  // Get current user profile
  async getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: true,
        schoolAdmin: {
          include: {
            school: true
          }
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  // Log audit action
  async logAudit(userId, action, resource, resourceId, changes = null) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          changes: changes ? JSON.stringify(changes) : null
        }
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
  }
}

module.exports = new AuthService();