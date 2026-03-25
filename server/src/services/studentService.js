const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../middlewares/errorHandler');
const { calculateGradeScore, calculateInterestScore, calculateLocationScore } = require('../utils');

const prisma = new PrismaClient();

class StudentService {
  // Get student profile
  async getProfile(userId) {
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true
          }
        },
        documents: true,
        applications: {
          include: {
            program: {
              include: {
                school: {
                  select: {
                    id: true,
                    name: true,
                    city: true,
                    district: true
                  }
                }
              }
            }
          },
          orderBy: { submittedAt: 'desc' }
        },
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    return student;
  }

  // Update student profile
  async updateProfile(userId, profileData) {
    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const updatedStudent = await prisma.student.update({
      where: { userId },
      data: profileData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      }
    });

    return updatedStudent;
  }

  // Get recommended programs for student
  async getRecommendations(userId) {
    const student = await prisma.student.findUnique({
      where: { userId },
      include: {
        user: true
      }
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    // Get all active programs
    const programs = await prisma.program.findMany({
      where: {
        applicationDeadline: {
          gt: new Date()
        }
      },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            city: true,
            district: true,
            latitude: true,
            longitude: true,
            acceptanceRate: true
          }
        },
        applications: {
          select: {
            status: true
          }
        }
      }
    });

    // Calculate recommendations
    const recommendations = programs.map(program => {
      const gradeScore = calculateGradeScore(
        {
          mathGrade: student.mathGrade,
          biologyGrade: student.biologyGrade,
          englishGrade: student.englishGrade
        },
        {
          minMathGrade: program.minMathGrade,
          minBiologyGrade: program.minBiologyGrade,
          minEnglishGrade: program.minEnglishGrade
        }
      );

      const interestScore = calculateInterestScore(
        student.interests || [],
        program.field
      );

      const locationScore = calculateLocationScore(
        student.latitude && student.longitude ? {
          latitude: student.latitude,
          longitude: student.longitude
        } : null,
        program.school.latitude && program.school.longitude ? {
          latitude: program.school.latitude,
          longitude: program.school.longitude
        } : null
      );

      const totalScore = (gradeScore * 0.6) + (interestScore * 0.3) + (locationScore * 0.1);

      // Generate explanation
      let explanation = [];
      if (gradeScore >= 70) explanation.push('Strong academic performance');
      if (interestScore > 0) explanation.push(`Interest match in ${program.field}`);
      if (locationScore > 0) explanation.push('Located nearby');

      return {
        program: {
          id: program.id,
          name: program.name,
          field: program.field,
          duration: program.duration,
          tuitionFee: program.tuitionFee,
          school: program.school,
          applicationDeadline: program.applicationDeadline,
          capacity: program.capacity,
          currentApplications: program.applications.length
        },
        score: Math.round(totalScore),
        explanation: explanation.length > 0 ? explanation.join(', ') : 'General recommendation'
      };
    });

    // Sort by score descending and return top recommendations
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }

  // Upload document
  async uploadDocument(userId, fileData) {
    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const document = await prisma.document.create({
      data: {
        studentId: student.id,
        fileName: fileData.fileName,
        fileUrl: fileData.fileUrl,
        fileType: fileData.fileType
      }
    });

    return document;
  }

  // Delete document
  async deleteDocument(userId, documentId) {
    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document || document.studentId !== student.id) {
      throw new AppError('Document not found', 404);
    }

    await prisma.document.delete({
      where: { id: documentId }
    });

    return { message: 'Document deleted successfully' };
  }

  // Get student applications
  async getApplications(userId) {
    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const applications = await prisma.application.findMany({
      where: { studentId: student.id },
      include: {
        program: {
          include: {
            school: {
              select: {
                id: true,
                name: true,
                city: true,
                district: true
              }
            }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    return applications;
  }

  // Mark notification as read
  async markNotificationRead(userId, notificationId) {
    const student = await prisma.student.findUnique({
      where: { userId }
    });

    if (!student) {
      throw new AppError('Student profile not found', 404);
    }

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification || notification.studentId !== student.id) {
      throw new AppError('Notification not found', 404);
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    return { message: 'Notification marked as read' };
  }
}

module.exports = new StudentService();