const { User } = require('../models');
const { generateToken } = require('../utils/jwt.util');

const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, biometricConsentGiven } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      biometricConsentGiven: biometricConsentGiven || false,
      biometricConsentGivenAt: biometricConsentGiven ? new Date() : null
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    // Generate token
    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    res.json({
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, confidenceThreshold, privacyMode } = req.body;

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (confidenceThreshold !== undefined) updateData.confidenceThreshold = confidenceThreshold;
    if (privacyMode !== undefined) updateData.privacyMode = privacyMode;

    await req.user.update(updateData);

    res.json({
      message: 'Profile updated successfully',
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

const giveBiometricConsent = async (req, res) => {
  try {
    await req.user.update({
      biometricConsentGiven: true,
      biometricConsentDate: new Date()
    });

    res.json({
      message: 'Biometric consent recorded',
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Biometric consent error:', error);
    res.status(500).json({ error: 'Failed to record consent' });
  }
};

const revokeBiometricConsent = async (req, res) => {
  try {
    await req.user.update({
      biometricConsentGiven: false,
      biometricConsentDate: null
    });

    res.json({
      message: 'Biometric consent revoked',
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Revoke consent error:', error);
    res.status(500).json({ error: 'Failed to revoke consent' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate current password
    const isValidPassword = await req.user.validatePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    await req.user.update({ password: newPassword });

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  giveBiometricConsent,
  revokeBiometricConsent,
  changePassword
};
