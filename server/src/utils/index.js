const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// JWT utilities
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  } catch (error) {
    throw error;
  }
};

// Password utilities
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Token utilities
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Date utilities
const isExpired = (date) => {
  return new Date() > new Date(date);
};

// Location utilities
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Recommendation utilities
const calculateGradeScore = (studentGrades, programRequirements) => {
  const { mathGrade, biologyGrade, englishGrade } = studentGrades;
  const { minMathGrade, minBiologyGrade, minEnglishGrade } = programRequirements;

  let totalScore = 0;
  let totalWeight = 0;

  if (minMathGrade !== null && minMathGrade !== undefined) {
    const mathScore = mathGrade >= minMathGrade ? mathGrade : 0;
    totalScore += mathScore;
    totalWeight += 100;
  }

  if (minBiologyGrade !== null && minBiologyGrade !== undefined) {
    const biologyScore = biologyGrade >= minBiologyGrade ? biologyGrade : 0;
    totalScore += biologyScore;
    totalWeight += 100;
  }

  if (minEnglishGrade !== null && minEnglishGrade !== undefined) {
    const englishScore = englishGrade >= minEnglishGrade ? englishGrade : 0;
    totalScore += englishScore;
    totalWeight += 100;
  }

  return totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
};

const calculateInterestScore = (studentInterests, programField) => {
  // This is a simplified version. In a real app, you'd have a mapping of interests to program fields
  const interestMapping = {
    'Mathematics': ['IT', 'Engineering', 'Science'],
    'Biology': ['Health', 'Science', 'Agriculture'],
    'English': ['Business', 'Communication', 'Education'],
    'Computer Science': ['IT', 'Engineering'],
    'Physics': ['Engineering', 'Science'],
    'Chemistry': ['Science', 'Health'],
    'Business': ['Business', 'Management'],
    'Art': ['Design', 'Communication']
  };

  const relevantFields = interestMapping[programField] || [];
  const matchingInterests = studentInterests.filter(interest =>
    relevantFields.some(field => programField.toLowerCase().includes(field.toLowerCase()))
  );

  return matchingInterests.length > 0 ? 100 : 0;
};

const calculateLocationScore = (studentLocation, schoolLocation, maxDistance = 50) => {
  if (!studentLocation || !schoolLocation) return 0;

  const distance = calculateDistance(
    studentLocation.latitude, studentLocation.longitude,
    schoolLocation.latitude, schoolLocation.longitude
  );

  if (distance <= maxDistance) {
    return Math.max(0, 100 - (distance / maxDistance) * 100);
  }

  return 0;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
  generateVerificationToken,
  generateVerificationCode,
  isExpired,
  calculateDistance,
  calculateGradeScore,
  calculateInterestScore,
  calculateLocationScore
};