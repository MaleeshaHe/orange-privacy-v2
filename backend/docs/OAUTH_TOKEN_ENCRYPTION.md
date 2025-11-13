# OAuth Token Encryption at Rest

## Overview

OrangePrivacy now implements **AES-256-GCM encryption** for all OAuth access and refresh tokens stored in the database. This security feature protects user tokens from unauthorized access in case of database compromise.

## Security Features

### Encryption Algorithm
- **AES-256-GCM** (Galois/Counter Mode)
- Authenticated encryption with 128-bit authentication tags
- Unique Initialization Vector (IV) for each encryption operation
- PBKDF2 key derivation from passphrase (100,000 iterations)

### Key Benefits
- ✅ **Confidentiality**: Tokens are unreadable without the encryption key
- ✅ **Integrity**: Authentication tags prevent tampering
- ✅ **Compliance**: Meets security requirements for storing sensitive credentials
- ✅ **Defense in Depth**: Additional layer beyond database access controls

## Configuration

### Required Environment Variables

Add these variables to your `.env` file:

```bash
# Encryption Key (REQUIRED)
# Must be at least 32 characters in production
# IMPORTANT: Must be different from JWT_SECRET
ENCRYPTION_KEY=your_secure_encryption_key_here_at_least_32_chars

# Encryption Salt (OPTIONAL but recommended)
# Used for key derivation - should be unique per installation
ENCRYPTION_SALT=orangeprivacy-unique-salt-change-in-production
```

### Generating Secure Keys

Use these commands to generate cryptographically secure keys:

```bash
# Generate ENCRYPTION_KEY (64 character hex string)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_SALT (random string)
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**IMPORTANT**:
- Never commit these keys to version control
- Use different keys for development and production
- Store production keys securely (e.g., AWS Secrets Manager, HashiCorp Vault)
- ENCRYPTION_KEY must be different from JWT_SECRET

## How It Works

### Automatic Encryption/Decryption

The OAuthToken model automatically handles encryption and decryption through Sequelize getters and setters:

```javascript
// When saving a token (automatic encryption)
await OAuthToken.create({
  socialAccountId: 'uuid',
  accessToken: 'plaintext_token_here',  // Automatically encrypted before saving
  refreshToken: 'plaintext_refresh',     // Automatically encrypted before saving
  expiresAt: new Date(),
  scope: 'user_media'
});

// When reading a token (automatic decryption)
const token = await OAuthToken.findOne({ where: { socialAccountId: 'uuid' } });
console.log(token.accessToken);  // Automatically decrypted when accessed
```

### Encryption Format

Encrypted tokens are stored in the format:

```
iv:authTag:encryptedData
```

All components are base64-encoded, separated by colons:
- **iv**: 16-byte Initialization Vector
- **authTag**: 16-byte authentication tag
- **encryptedData**: Encrypted token data

### Example

```javascript
// Plaintext token
ya29.a0AfH6SMBx...original_token...

// Encrypted token (stored in database)
Xy9z3K8qL...IV...:mN5pQ7rT...AuthTag...:9xF2wE...EncryptedData...
```

## Migration Guide

### For New Installations

No migration needed. All tokens will be automatically encrypted when created.

### For Existing Installations

If you have existing OAuth tokens in plaintext, run the migration script:

```bash
# Navigate to backend directory
cd backend

# Dry run (preview changes without modifying database)
node scripts/encrypt-existing-tokens.js

# Apply encryption (with 5-second safety delay)
node scripts/encrypt-existing-tokens.js --commit

# Verbose output
node scripts/encrypt-existing-tokens.js --commit --verbose
```

**Migration Features**:
- ✅ Dry-run mode by default (safe to test)
- ✅ Transaction-based (all-or-nothing)
- ✅ Validates encryption/decryption before committing
- ✅ Skips already-encrypted tokens
- ✅ Detailed logging and error reporting

**Example Output**:

```
╔══════════════════════════════════════════════════╗
║  OAuth Token Encryption Migration Script        ║
╚══════════════════════════════════════════════════╝

🔵 DRY RUN MODE - No changes will be made
   Use --commit flag to actually encrypt tokens

✅ Database connected

📊 Found 5 OAuth token(s) in database

Processing token abc-123...
  🔐 Encrypting access token...
  🔐 Encrypting refresh token...
  ℹ️  Would encrypt token (dry run)

...

📊 MIGRATION SUMMARY:

   Total tokens processed: 5
   Tokens encrypted: 10
   Already encrypted: 0
   Errors: 0

🔵 DRY RUN COMPLETE - No changes were made
   Run with --commit flag to apply changes
```

## API Usage

### Direct Encryption/Decryption

For advanced use cases, you can use the encryption service directly:

```javascript
const encryptionService = require('./services/encryption.service');

// Encrypt data
const encrypted = encryptionService.encrypt('sensitive_data');
console.log(encrypted);  // "iv:authTag:encryptedData"

// Decrypt data
const decrypted = encryptionService.decrypt(encrypted);
console.log(decrypted);  // "sensitive_data"

// Check if encrypted
const isEncrypted = encryptionService.isEncrypted('iv:tag:data');
console.log(isEncrypted);  // true

// Generate random token
const randomToken = encryptionService.generateRandomToken(32);

// Hash a value (one-way)
const hash = encryptionService.hash('value_to_hash');
```

## Security Best Practices

### Key Management

1. **Store Keys Securely**
   - Use environment variables (never hardcode)
   - Use secrets management services in production
   - Rotate keys periodically (with re-encryption)

2. **Access Control**
   - Limit access to `.env` files
   - Use IAM roles for cloud deployments
   - Audit key access logs

3. **Backup Strategy**
   - Back up encryption keys separately from database
   - Document key recovery procedures
   - Test disaster recovery process

### Production Deployment

```bash
# Example production .env (AWS Secrets Manager)
ENCRYPTION_KEY=${ORANGEPRIVACY_ENCRYPTION_KEY}
ENCRYPTION_SALT=${ORANGEPRIVACY_ENCRYPTION_SALT}

# OR use direct secrets in container/pod
kubectl create secret generic orangeprivacy-secrets \
  --from-literal=ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### Key Rotation

To rotate encryption keys:

1. Generate new key: `ENCRYPTION_KEY_NEW`
2. Decrypt all tokens with old key
3. Re-encrypt with new key
4. Update `ENCRYPTION_KEY` to new value
5. Delete old key securely

**Rotation Script** (future enhancement):
```bash
node scripts/rotate-encryption-key.js --old-key OLD_KEY --new-key NEW_KEY --commit
```

## Error Handling

### Decryption Failures

If a token cannot be decrypted:
- Returns `null` instead of throwing error
- Logs error to console
- User must re-authenticate to get new token

### Missing Encryption Key

If `ENCRYPTION_KEY` is not set:
- Server fails to start (caught by environment validator)
- Clear error message displayed
- Application exits with code 1

### Invalid Key Format

If encryption key is too weak (< 32 chars in production):
- Server fails to start
- Validation error shown
- Recommendation to generate new key

## Testing

### Manual Testing

```javascript
// Test encryption/decryption cycle
const encryptionService = require('./services/encryption.service');

const original = 'test_oauth_token_12345';
const encrypted = encryptionService.encrypt(original);
const decrypted = encryptionService.decrypt(encrypted);

console.assert(decrypted === original, 'Encryption/decryption failed');
console.log('✅ Encryption test passed');
```

### Unit Tests

```javascript
// tests/services/encryption.service.test.js
describe('EncryptionService', () => {
  it('should encrypt and decrypt tokens correctly', () => {
    const token = 'oauth_token_example';
    const encrypted = encryptionService.encrypt(token);
    const decrypted = encryptionService.decrypt(encrypted);

    expect(decrypted).toBe(token);
    expect(encrypted).not.toBe(token);
    expect(encryptionService.isEncrypted(encrypted)).toBe(true);
  });

  it('should use unique IVs for each encryption', () => {
    const token = 'same_token';
    const encrypted1 = encryptionService.encrypt(token);
    const encrypted2 = encryptionService.encrypt(token);

    expect(encrypted1).not.toBe(encrypted2);
  });
});
```

## Compliance

This implementation helps meet requirements for:

- **GDPR** (Article 32): Security of processing
- **PCI DSS** (Requirement 3): Protect stored cardholder data
- **HIPAA** (§164.312(a)(2)(iv)): Encryption and decryption
- **NIST SP 800-57**: Key management best practices
- **OWASP Top 10**: A02:2021 – Cryptographic Failures

## Performance

### Encryption Overhead

- Encryption time: ~1-2ms per token
- Decryption time: ~1-2ms per token
- Storage overhead: ~50-60 bytes per token

### Optimization

Encryption/decryption happens automatically via Sequelize getters/setters:
- Minimal performance impact
- No changes needed in controller code
- Caching can be added if needed

## Troubleshooting

### Common Issues

**Issue**: Server won't start - "ENCRYPTION_KEY environment variable is required"
```bash
# Solution: Add to .env file
ENCRYPTION_KEY=your_secure_key_here_at_least_32_chars
```

**Issue**: "Decryption error" in logs
```bash
# Possible causes:
# 1. ENCRYPTION_KEY changed after tokens were encrypted
# 2. Database corruption
# 3. Manual modification of encrypted data

# Solution: Users must re-authenticate to get new tokens
```

**Issue**: Migration script shows errors
```bash
# Check:
# 1. ENCRYPTION_KEY is set in .env
# 2. Database connection is working
# 3. Run in dry-run mode first: node scripts/encrypt-existing-tokens.js
```

## Support

For questions or issues related to OAuth token encryption:
1. Check this documentation
2. Review error logs in `console.error` output
3. Verify environment variables are set correctly
4. Test encryption service directly with manual test script

## Future Enhancements

- [ ] Key rotation script
- [ ] Encryption key versioning (support multiple keys)
- [ ] Hardware Security Module (HSM) integration
- [ ] Automated key backup to secrets manager
- [ ] Performance metrics and monitoring
- [ ] Field-level encryption for other sensitive data

## References

- [NIST AES-GCM Specification](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [Node.js Crypto Module Documentation](https://nodejs.org/api/crypto.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
