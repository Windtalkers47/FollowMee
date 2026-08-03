import AppDataSource from '../src/config/database';

const emailEqualsArg = process.argv.find((value) => value.startsWith('--email='));
const emailFlagIndex = process.argv.indexOf('--email');
const email = (emailEqualsArg?.slice('--email='.length) || (emailFlagIndex >= 0 ? process.argv[emailFlagIndex + 1] : ''))
  ?.trim().toLowerCase();

if (!email) {
  console.error('Usage: npm run owner:transfer -- --email user@example.com');
  process.exit(1);
}

const run = async () => {
  await AppDataSource.initialize();
  const targetRows = await AppDataSource.query(
    'SELECT userId, userEmail FROM users WHERE LOWER(userEmail) = ? AND isActive = 1 LIMIT 1',
    [email],
  );
  if (!targetRows[0]) throw new Error('Active target user was not found');
  const targetUserId = Number(targetRows[0].userId);
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const roles = await queryRunner.query(`SELECT roleId, roleName FROM roles WHERE roleName IN ('Owner','Admin') AND isActive = 1 FOR UPDATE`);
    const ownerRoleId = Number(roles.find((role: any) => role.roleName === 'Owner')?.roleId);
    const adminRoleId = Number(roles.find((role: any) => role.roleName === 'Admin')?.roleId);
    if (!ownerRoleId || !adminRoleId) throw new Error('Owner/Admin roles are not configured');
    const previousRows = await queryRunner.query('SELECT userId FROM system_owner WHERE singletonId = 1 FOR UPDATE');
    const previousOwnerId = Number(previousRows[0]?.userId || 0);
    if (previousOwnerId && previousOwnerId !== targetUserId) {
      await queryRunner.query('DELETE FROM user_roles WHERE userId = ?', [previousOwnerId]);
      await queryRunner.query('INSERT INTO user_roles (userId, roleId) VALUES (?, ?)', [previousOwnerId, adminRoleId]);
    }
    await queryRunner.query('DELETE FROM user_roles WHERE userId = ?', [targetUserId]);
    await queryRunner.query('INSERT INTO user_roles (userId, roleId) VALUES (?, ?)', [targetUserId, ownerRoleId]);
    await queryRunner.query(`INSERT INTO system_owner (singletonId, userId) VALUES (1, ?) ON DUPLICATE KEY UPDATE userId = VALUES(userId)`, [targetUserId]);
    await queryRunner.query(`
      INSERT INTO user_audit_logs (userId, entityType, entityId, action, status, details, oldValue, newValue)
      VALUES (?, 'system_owner', '1', 'CLI_TRANSFER_OWNER', 'success', ?, ?, ?)
    `, [targetUserId, JSON.stringify({ email }), previousOwnerId ? String(previousOwnerId) : null, String(targetUserId)]);
    await queryRunner.commitTransaction();
    console.log(`Owner is now ${targetRows[0].userEmail} (userId ${targetUserId}). Existing sessions must sign in again.`);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
};

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });
