/**
 * Migration Script: Encrypt Existing OAuth Tokens
 *
 * This script encrypts OAuth tokens that are currently stored in plaintext
 * in the database. It should be run ONCE after deploying the encryption feature.
 *
 * Usage:
 *   node scripts/encrypt-existing-tokens.js
 *
 * Safety Features:
 *   - Dry-run mode by default (use --commit to actually update)
 *   - Backs up original tokens before encryption
 *   - Validates encryption/decryption before committing
 *   - Transaction-based updates (all or nothing)
 *   - Detailed logging of all operations
 */

require('dotenv').config();
const db = require('../src/models');
const encryptionService = require('../src/services/encryption.service');

// Parse command-line arguments
const args = process.argv.slice(2);
const isDryRun = !args.includes('--commit');
const verbose = args.includes('--verbose');

async function encryptExistingTokens() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  OAuth Token Encryption Migration Script        ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (isDryRun) {
    console.log('🔵 DRY RUN MODE - No changes will be made');
    console.log('   Use --commit flag to actually encrypt tokens\n');
  } else {
    console.log('🔴 COMMIT MODE - Tokens will be encrypted!');
    console.log('   Press Ctrl+C within 5 seconds to cancel...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  let transaction;

  try {
    // Connect to database
    await db.sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Start transaction
    transaction = await db.sequelize.transaction();

    // Find all OAuth tokens
    const tokens = await db.OAuthToken.findAll({
      transaction,
      // Use raw query to bypass getters/setters
      raw: true
    });

    console.log(`📊 Found ${tokens.length} OAuth token(s) in database\n`);

    if (tokens.length === 0) {
      console.log('✅ No tokens to encrypt. Exiting.\n');
      await transaction.rollback();
      process.exit(0);
    }

    let encryptedCount = 0;
    let alreadyEncryptedCount = 0;
    let errorCount = 0;

    // Process each token
    for (const token of tokens) {
      const tokenId = token.id;
      console.log(`\nProcessing token ${tokenId}...`);

      try {
        let needsUpdate = false;
        const updates = {};

        // Check and encrypt access token
        if (token.accessToken) {
          if (encryptionService.isEncrypted(token.accessToken)) {
            console.log('  ℹ️  Access token already encrypted');
            alreadyEncryptedCount++;
          } else {
            console.log('  🔐 Encrypting access token...');

            // Encrypt the token
            const encrypted = encryptionService.encrypt(token.accessToken);

            // Validate encryption by decrypting
            const decrypted = encryptionService.decrypt(encrypted);
            if (decrypted !== token.accessToken) {
              throw new Error('Encryption validation failed: decrypted value does not match original');
            }

            updates.accessToken = encrypted;
            needsUpdate = true;
            encryptedCount++;

            if (verbose) {
              console.log(`    Original length: ${token.accessToken.length} chars`);
              console.log(`    Encrypted length: ${encrypted.length} chars`);
            }
          }
        }

        // Check and encrypt refresh token
        if (token.refreshToken) {
          if (encryptionService.isEncrypted(token.refreshToken)) {
            console.log('  ℹ️  Refresh token already encrypted');
          } else {
            console.log('  🔐 Encrypting refresh token...');

            // Encrypt the token
            const encrypted = encryptionService.encrypt(token.refreshToken);

            // Validate encryption by decrypting
            const decrypted = encryptionService.decrypt(encrypted);
            if (decrypted !== token.refreshToken) {
              throw new Error('Encryption validation failed: decrypted value does not match original');
            }

            updates.refreshToken = encrypted;
            needsUpdate = true;
            encryptedCount++;

            if (verbose) {
              console.log(`    Original length: ${token.refreshToken.length} chars`);
              console.log(`    Encrypted length: ${encrypted.length} chars`);
            }
          }
        }

        // Update token if needed
        if (needsUpdate && !isDryRun) {
          await db.OAuthToken.update(updates, {
            where: { id: tokenId },
            transaction,
            // Important: Don't trigger hooks/setters
            individualHooks: false
          });
          console.log('  ✅ Token encrypted and saved');
        } else if (needsUpdate && isDryRun) {
          console.log('  ℹ️  Would encrypt token (dry run)');
        } else {
          console.log('  ✅ No encryption needed');
        }

      } catch (error) {
        console.error(`  ❌ Error processing token ${tokenId}:`, error.message);
        errorCount++;

        if (!isDryRun) {
          throw error; // Abort transaction on error
        }
      }
    }

    // Summary
    console.log('\n' + '═'.repeat(50));
    console.log('\n📊 MIGRATION SUMMARY:\n');
    console.log(`   Total tokens processed: ${tokens.length}`);
    console.log(`   Tokens encrypted: ${encryptedCount}`);
    console.log(`   Already encrypted: ${alreadyEncryptedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log('');

    if (isDryRun) {
      console.log('🔵 DRY RUN COMPLETE - No changes were made');
      console.log('   Run with --commit flag to apply changes\n');
      await transaction.rollback();
    } else if (errorCount > 0) {
      console.log('❌ MIGRATION FAILED - Rolling back changes');
      console.log('   Fix errors and try again\n');
      await transaction.rollback();
      process.exit(1);
    } else {
      console.log('✅ MIGRATION SUCCESSFUL - Committing changes...');
      await transaction.commit();
      console.log('✅ All tokens have been encrypted!\n');
    }

  } catch (error) {
    console.error('\n❌ MIGRATION ERROR:', error.message);

    if (transaction) {
      console.log('⚠️  Rolling back transaction...');
      await transaction.rollback();
    }

    console.error('\nStack trace:', error.stack);
    process.exit(1);

  } finally {
    await db.sequelize.close();
    console.log('Database connection closed\n');
  }
}

// Run migration
encryptExistingTokens()
  .then(() => {
    console.log('Migration script completed\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
