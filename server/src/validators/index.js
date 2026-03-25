const { z } = require('zod');

// User registration schema
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().optional(),
  role: z.enum(['STUDENT', 'SCHOOL_ADMIN']).optional().default('STUDENT')
});

// Login schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// Password reset schema
const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email format')
});

// New password schema
const newPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
});

// Student profile schema
const studentProfileSchema = z.object({
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  mathGrade: z.number().min(0).max(100).optional(),
  biologyGrade: z.number().min(0).max(100).optional(),
  englishGrade: z.number().min(0).max(100).optional(),
  interests: z.array(z.string()).optional(),
  bio: z.string().optional()
});

// School registration schema
const schoolRegisterSchema = z.object({
  name: z.string().min(2, 'School name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  district: z.string().min(2, 'District must be at least 2 characters'),
  province: z.string().min(2, 'Province must be at least 2 characters'),
  latitude: z.number(),
  longitude: z.number(),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional()
});

// School verification schema
const schoolVerificationSchema = z.object({
  verificationCode: z.string().min(6, 'Verification code must be 6 characters').max(6)
});

// Program creation schema
const programSchema = z.object({
  name: z.string().min(2, 'Program name must be at least 2 characters'),
  description: z.string().optional(),
  field: z.string().min(2, 'Field must be at least 2 characters'),
  duration: z.number().min(1, 'Duration must be at least 1 month'),
  capacity: z.number().min(1, 'Capacity must be at least 1'),
  minMathGrade: z.number().min(0).max(100).optional(),
  minBiologyGrade: z.number().min(0).max(100).optional(),
  minEnglishGrade: z.number().min(0).max(100).optional(),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date format'),
  applicationDeadline: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date format'),
  tuitionFee: z.number().min(0).optional()
});

// Application schema
const applicationSchema = z.object({
  programId: z.string().min(1, 'Program ID is required')
});

// Application review schema
const applicationReviewSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
  rejectionReason: z.string().optional()
});

// Notification schema
const notificationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  type: z.enum(['info', 'warning', 'success', 'error']).default('info')
});

// Admin school approval schema
const schoolApprovalSchema = z.object({
  status: z.enum(['ACTIVE', 'REJECTED']),
  rejectionReason: z.string().optional()
});

module.exports = {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  newPasswordSchema,
  studentProfileSchema,
  schoolRegisterSchema,
  schoolVerificationSchema,
  programSchema,
  applicationSchema,
  applicationReviewSchema,
  notificationSchema,
  schoolApprovalSchema
};