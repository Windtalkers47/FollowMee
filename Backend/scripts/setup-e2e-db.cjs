const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const database = process.env.E2E_DB_NAME || 'followmee_e2e';
if (!database.endsWith('_e2e')) {
  throw new Error(`Refusing to reset database "${database}". E2E database names must end with "_e2e".`);
}

const qaPassword = process.env.E2E_QA_PASSWORD || 'FollowMee-QA-2026!';
const users = [
  ['QA', 'Creator', 'qa-creator@example.test', 'Superadmin'],
  ['QA', 'Assignee', 'qa-assignee@example.test', 'Admin'],
  ['QA', 'Reviewer', 'qa-reviewer@example.test', 'Admin'],
  ['QA', 'Unrelated', 'qa-unrelated@example.test', 'Customer'],
];
const fixtureIds = {
  customer: 'e2e00000-0000-4000-8000-000000000001',
  task: 'e2e00000-0000-4000-8000-000000000002',
  profile: 'e2e00000-0000-4000-8000-000000000003',
};

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    const schemaPath = path.resolve(__dirname, '..', '..', 'database', 'followmee-clean-schema.sql');
    const source = fs.readFileSync(schemaPath, 'utf8');
    const schema = source.replaceAll('`followmee`', `\`${database}\``);
    await connection.query(schema);
    await connection.query(`USE \`${database}\``);

    const passwordHash = await bcrypt.hash(qaPassword, 10);
    const userIds = {};
    for (const [firstName, lastName, email, roleName] of users) {
      const [result] = await connection.execute(
        `INSERT INTO users
          (userName, userLastName, userEmail, userPassword, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
        [firstName, lastName, email, passwordHash],
      );
      await connection.execute(
        `INSERT INTO user_roles (userId, roleId)
         SELECT ?, roleId FROM roles WHERE roleName = ?`,
        [result.insertId, roleName],
      );
      userIds[email] = result.insertId;
    }

    await connection.execute(
      `INSERT INTO customers
        (customerId, userId, customerName, customerLastName, customerEmail, status, isActive)
       VALUES (?, ?, 'E2E', 'Customer', 'fixture-customer@example.test', 'active', 1)`,
      [fixtureIds.customer, userIds['qa-creator@example.test']],
    );

    await connection.execute(
      `INSERT INTO public_profiles
        (profileId, userId, customerId, slug, displayName, headline, bio, templateKey,
         status, visibility, primaryCtaLabel, primaryCtaUrl, seoTitle, seoDescription, publishedAt)
       VALUES (?, ?, ?, 'e2e-profile', 'FollowMee Studio', 'A calmer way to share your story',
         'A deterministic pastel profile used only for visual and public-page quality assurance.',
         'soft-mint', 'published', 'public', 'Start a conversation', 'https://example.com/contact',
         'FollowMee Studio', 'A deterministic FollowMee public profile fixture.', NOW())`,
      [fixtureIds.profile, userIds['qa-creator@example.test'], fixtureIds.customer],
    );
    await connection.execute(
      `INSERT INTO public_profile_links (profileId, platform, label, url, sortOrder)
       VALUES (?, 'website', 'Visit our website', 'https://example.com', 0)`,
      [fixtureIds.profile],
    );

    await connection.execute(
      `INSERT INTO tasks
        (taskId, title, description, assignedTo, createdBy, dueDate, status, isActive)
       VALUES (?, 'E2E seeded task', 'Deterministic fixture for browser and integration tests.',
         ?, ?, DATE_ADD(NOW(), INTERVAL 2 DAY), 'todo', 1)`,
      [
        fixtureIds.task,
        userIds['qa-assignee@example.test'],
        userIds['qa-creator@example.test'],
      ],
    );

    const [commentResult] = await connection.execute(
      `INSERT INTO task_comments (taskId, userId, comment)
       VALUES (?, ?, 'E2E seeded comment')`,
      [fixtureIds.task, userIds['qa-creator@example.test']],
    );
    await connection.execute(
      `INSERT INTO task_comments (taskId, userId, parentCommentId, comment)
       VALUES (?, ?, ?, 'E2E seeded reply')`,
      [fixtureIds.task, userIds['qa-assignee@example.test'], commentResult.insertId],
    );

    const [notificationResult] = await connection.execute(
      `INSERT INTO notifications
        (notificationType, actorUserId, entityType, entityId, title, message, actionUrl)
       VALUES ('task_assigned', ?, 'task', ?, 'E2E task assigned',
         'You were assigned a deterministic QA task.', ?)`,
      [
        userIds['qa-creator@example.test'],
        fixtureIds.task,
        `/posts/${fixtureIds.task}`,
      ],
    );
    await connection.execute(
      `INSERT INTO notification_recipients (notificationId, userId)
       VALUES (?, ?)`,
      [notificationResult.insertId, userIds['qa-assignee@example.test']],
    );
  } finally {
    await connection.end();
  }

  console.log(`E2E database "${database}" was reset with four isolated QA users.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
