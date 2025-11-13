const { User, ScanJob, ScanResult, RefPhoto, SocialAccount } = require('../models');
const { Op } = require('sequelize');

// Get all users
const getUsers = async (req, res) => {
  try {
    const { search, role, isActive, limit = 50, offset = 0 } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const users = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password'] }
    });

    res.json({
      users: users.rows,
      total: users.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get user details
const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        { model: RefPhoto, as: 'refPhotos' },
        { model: SocialAccount, as: 'socialAccounts' },
        { model: ScanJob, as: 'scanJobs', limit: 10, order: [['createdAt', 'DESC']] }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: user.toJSON() });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, isActive } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    await user.update(updateData);

    res.json({
      message: 'User updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Get all scan jobs
const getAllScanJobs = async (req, res) => {
  try {
    const { status, userId, limit = 50, offset = 0 } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    const scanJobs = await ScanJob.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'firstName', 'lastName']
        }
      ]
    });

    res.json({
      scanJobs: scanJobs.rows,
      total: scanJobs.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get all scan jobs error:', error);
    res.status(500).json({ error: 'Failed to fetch scan jobs' });
  }
};

// Get system statistics
const getSystemStats = async (req, res) => {
  try {
    // User stats
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    const usersWithConsent = await User.count({ where: { biometricConsentGiven: true } });

    // Scan stats
    const totalScans = await ScanJob.count();
    const completedScans = await ScanJob.count({ where: { status: 'completed' } });
    const failedScans = await ScanJob.count({ where: { status: 'failed' } });

    // Result stats
    const totalResults = await ScanResult.count();
    const confirmedResults = await ScanResult.count({ where: { isConfirmedByUser: true } });

    // Photo stats
    const totalRefPhotos = await RefPhoto.count();
    const activeRefPhotos = await RefPhoto.count({ where: { isActive: true } });

    // Social media stats
    const totalSocialAccounts = await SocialAccount.count();
    const activeSocialAccounts = await SocialAccount.count({ where: { isActive: true } });

    // Recent activity
    const recentScans = await ScanJob.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email']
        }
      ]
    });

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        withConsent: usersWithConsent
      },
      scans: {
        total: totalScans,
        completed: completedScans,
        failed: failedScans
      },
      results: {
        total: totalResults,
        confirmed: confirmedResults
      },
      refPhotos: {
        total: totalRefPhotos,
        active: activeRefPhotos
      },
      socialAccounts: {
        total: totalSocialAccounts,
        active: activeSocialAccounts
      },
      recentActivity: recentScans
    });
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({ error: 'Failed to fetch system statistics' });
  }
};

// Get system logs (simplified for MVP)
const getSystemLogs = async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    // In production, you would fetch from a logging system
    // For MVP, we'll return recent scan jobs as a proxy for logs
    const logs = await ScanJob.findAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['updatedAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'email']
        }
      ]
    });

    res.json({
      logs: logs.map(job => ({
        timestamp: job.updatedAt,
        type: job.status === 'failed' ? 'error' : 'info',
        message: `Scan job ${job.id} - ${job.status}`,
        userId: job.userId,
        userEmail: job.user?.email,
        metadata: {
          scanJobId: job.id,
          status: job.status,
          errorMessage: job.errorMessage
        }
      })),
      total: logs.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get system logs error:', error);
    res.status(500).json({ error: 'Failed to fetch system logs' });
  }
};

module.exports = {
  getUsers,
  getUserDetails,
  updateUser,
  getAllScanJobs,
  getSystemStats,
  getSystemLogs
};
