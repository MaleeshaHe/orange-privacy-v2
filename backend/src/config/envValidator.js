/**
 * Environment Variable Validation
 * Validates required environment variables on application startup
 */

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate a required environment variable
   */
  required(varName, description) {
    if (!process.env[varName] || process.env[varName].trim() === '') {
      this.errors.push({
        variable: varName,
        description: description,
        severity: 'error'
      });
      return false;
    }
    return true;
  }

  /**
   * Validate an optional environment variable (warn if missing)
   */
  optional(varName, description, recommendation) {
    if (!process.env[varName] || process.env[varName].trim() === '') {
      this.warnings.push({
        variable: varName,
        description: description,
        recommendation: recommendation || 'Consider setting this variable for full functionality'
      });
      return false;
    }
    return true;
  }

  /**
   * Validate environment variable format (e.g., URL, email, number)
   */
  format(varName, pattern, errorMessage) {
    const value = process.env[varName];
    if (value && !pattern.test(value)) {
      this.errors.push({
        variable: varName,
        description: errorMessage,
        currentValue: value.substring(0, 20) + '...',
        severity: 'error'
      });
      return false;
    }
    return true;
  }

  /**
   * Validate number range
   */
  range(varName, min, max, description) {
    const value = parseInt(process.env[varName]);
    if (isNaN(value) || value < min || value > max) {
      this.errors.push({
        variable: varName,
        description: `${description} (must be between ${min} and ${max})`,
        currentValue: process.env[varName],
        severity: 'error'
      });
      return false;
    }
    return true;
  }

  /**
   * Validate and report results
   */
  validate() {
    // Reset errors and warnings
    this.errors = [];
    this.warnings = [];

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  Environment Configuration Validation ║');
    console.log('╚════════════════════════════════════════╝\n');

    // ===== CRITICAL REQUIRED VARIABLES =====
    console.log('🔴 CRITICAL CONFIGURATION:');

    this.required('NODE_ENV', 'Application environment (development/production)');
    this.required('PORT', 'Server port number');
    this.required('JWT_SECRET', 'Secret key for JWT token signing (MUST be changed in production)');
    this.required('ENCRYPTION_KEY', 'Encryption key for OAuth tokens (MUST be at least 32 characters)');

    // Database
    this.required('DB_HOST', 'Database host');
    this.required('DB_PORT', 'Database port');
    this.required('DB_NAME', 'Database name');
    this.required('DB_USER', 'Database username');
    this.required('DB_PASSWORD', 'Database password');

    // Frontend URL
    this.required('FRONTEND_URL', 'Frontend application URL for CORS');

    console.log('');

    // ===== IMPORTANT OPTIONAL VARIABLES =====
    console.log('🟡 IMPORTANT OPTIONAL CONFIGURATION:');

    // AWS (required for core features)
    const hasAWSKey = this.optional('AWS_ACCESS_KEY_ID', 'AWS access key for Rekognition and S3',
      'Required for face recognition features');
    const hasAWSSecret = this.optional('AWS_SECRET_ACCESS_KEY', 'AWS secret key',
      'Required for face recognition features');
    const hasAWSRegion = this.optional('AWS_REGION', 'AWS region (default: eu-west-1)',
      'Defaults to eu-west-1 if not set');
    const hasS3Bucket = this.optional('AWS_S3_BUCKET', 'S3 bucket for file storage',
      'Required for photo uploads');

    // Redis (required for background jobs)
    const hasRedisHost = this.optional('REDIS_HOST', 'Redis host for queue and state management',
      'Defaults to localhost - configure for production');
    this.optional('REDIS_PORT', 'Redis port (default: 6379)',
      'Defaults to 6379 if not set');

    // Google Custom Search API (optional for web scanning)
    const hasGoogleKey = this.optional('GOOGLE_API_KEY', 'Google Custom Search API key',
      'Required for web scanning - system uses demo mode without this');
    const hasGoogleCX = this.optional('GOOGLE_SEARCH_ENGINE_ID', 'Google Custom Search Engine ID',
      'Required for web scanning - system uses demo mode without this');

    // OAuth (optional for social media features)
    const hasFBAppId = this.optional('FACEBOOK_APP_ID', 'Facebook App ID for OAuth',
      'Required for Facebook integration');
    const hasFBSecret = this.optional('FACEBOOK_APP_SECRET', 'Facebook App Secret',
      'Required for Facebook integration');
    const hasIGClientId = this.optional('INSTAGRAM_CLIENT_ID', 'Instagram Client ID for OAuth',
      'Required for Instagram integration');
    const hasIGSecret = this.optional('INSTAGRAM_CLIENT_SECRET', 'Instagram Client Secret',
      'Required for Instagram integration');

    console.log('');

    // ===== VALIDATION CHECKS =====
    console.log('🔍 VALIDATION CHECKS:');

    // JWT Secret strength check (production only)
    if (process.env.NODE_ENV === 'production') {
      const jwtSecret = process.env.JWT_SECRET || '';
      if (jwtSecret.length < 32) {
        this.errors.push({
          variable: 'JWT_SECRET',
          description: 'JWT secret is too weak for production',
          severity: 'error',
          recommendation: 'Use at least 32 characters with mixed case, numbers, and symbols'
        });
      }
      if (jwtSecret.includes('super_secret') || jwtSecret.includes('change_in_production')) {
        this.errors.push({
          variable: 'JWT_SECRET',
          description: 'JWT_SECRET contains default/example value - SECURITY RISK!',
          severity: 'error',
          recommendation: 'Generate a new secure random secret immediately'
        });
      }
    }

    // Encryption Key strength check (production only)
    if (process.env.NODE_ENV === 'production') {
      const encryptionKey = process.env.ENCRYPTION_KEY || '';
      if (encryptionKey.length < 32) {
        this.errors.push({
          variable: 'ENCRYPTION_KEY',
          description: 'Encryption key is too weak for production',
          severity: 'error',
          recommendation: 'Use at least 32 characters with mixed case, numbers, and symbols'
        });
      }
      if (encryptionKey.includes('change_in_production') || encryptionKey === process.env.JWT_SECRET) {
        this.errors.push({
          variable: 'ENCRYPTION_KEY',
          description: 'ENCRYPTION_KEY contains default value or matches JWT_SECRET - SECURITY RISK!',
          severity: 'error',
          recommendation: 'Generate a unique secure random key immediately (different from JWT_SECRET)'
        });
      }
    }

    // URL format validation
    if (process.env.FRONTEND_URL) {
      this.format('FRONTEND_URL', /^https?:\/\/.+/,
        'FRONTEND_URL must be a valid URL (http:// or https://)');
    }

    // Port range validation
    if (process.env.PORT) {
      this.range('PORT', 1, 65535, 'Server port');
    }

    // Feature availability summary
    console.log('');
    console.log('📦 FEATURE AVAILABILITY:');
    console.log(`   Face Recognition: ${hasAWSKey && hasAWSSecret && hasS3Bucket ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`   Background Jobs: ${hasRedisHost ? '✅ Enabled' : '⚠️  Using localhost'}`);
    console.log(`   Web Scanning: ${hasGoogleKey && hasGoogleCX ? '✅ Enabled' : '🎭 Demo Mode'}`);
    console.log(`   Facebook OAuth: ${hasFBAppId && hasFBSecret ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`   Instagram OAuth: ${hasIGClientId && hasIGSecret ? '✅ Enabled' : '❌ Disabled'}`);

    // Print results
    console.log('');
    console.log('═══════════════════════════════════════');

    if (this.errors.length > 0) {
      console.error(`\n❌ VALIDATION FAILED: ${this.errors.length} error(s) found\n`);
      this.errors.forEach((error, index) => {
        console.error(`${index + 1}. ${error.variable}:`);
        console.error(`   ${error.description}`);
        if (error.currentValue) {
          console.error(`   Current value: ${error.currentValue}`);
        }
        if (error.recommendation) {
          console.error(`   💡 ${error.recommendation}`);
        }
        console.error('');
      });
      console.error('⚠️  Application cannot start with missing required variables');
      console.error('   Please configure the variables listed above in backend/.env file\n');
      return false;
    }

    if (this.warnings.length > 0) {
      console.warn(`\n⚠️  ${this.warnings.length} warning(s) - Some features may be limited\n`);
      this.warnings.forEach((warning, index) => {
        console.warn(`${index + 1}. ${warning.variable}:`);
        console.warn(`   ${warning.description}`);
        console.warn(`   💡 ${warning.recommendation}`);
        console.warn('');
      });
    }

    console.log('✅ Required environment variables validated successfully');
    console.log('═══════════════════════════════════════\n');

    return true;
  }

  /**
   * Get validation summary
   */
  getSummary() {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }
}

module.exports = new EnvironmentValidator();
