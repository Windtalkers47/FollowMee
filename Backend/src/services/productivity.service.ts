import crypto from 'crypto';
import AppDataSource from '../config/database';
import { Task } from '../entities/Task';
import { TaskImage } from '../entities/TaskImage';
import { ApplicationError } from '../errors/application.error';
import { taskAccessService } from './task-access.service';
import { outboxService } from './outbox.service';
import { CloudinaryUtil } from '../utils/cloudinary.util';
import { webSocketService } from './websocket.service';

type ChecklistInput = { label: string; isRequired?: boolean };

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return value as T;
};

export class ProductivityService {
  private recurrenceTimer: NodeJS.Timeout | null = null;

  constructor() {
    outboxService.register('task.attachments.copy', async payload => {
      const sourceTaskId = String(payload.sourceTaskId || '');
      const targetTaskId = String(payload.targetTaskId || '');
      const uploadedBy = Number(payload.userId || 0);
      const images = await AppDataSource.getRepository(TaskImage).find({ where: { taskId: sourceTaskId, isActive: true }, order: { imageOrder: 'ASC' } });
      for (const image of images) {
        const imageUrl = await CloudinaryUtil.copyImage(image.imageUrl);
        await AppDataSource.getRepository(TaskImage).save(AppDataSource.getRepository(TaskImage).create({ taskId: targetTaskId, imageUrl, imageOrder: image.imageOrder, uploadedBy, isActive: true }));
      }
    });
  }

  startRecurrenceWorker(): void {
    if (this.recurrenceTimer) return;
    void this.generateDueOccurrences();
    this.recurrenceTimer = setInterval(() => void this.generateDueOccurrences(), 60_000);
    this.recurrenceTimer.unref?.();
  }

  stopRecurrenceWorker(): void {
    if (this.recurrenceTimer) clearInterval(this.recurrenceTimer);
    this.recurrenceTimer = null;
  }

  async duplicateTask(taskId: string, userId: number, includeAttachments = false) {
    const source = await AppDataSource.getRepository(Task).findOne({ where: { taskId, isActive: true } });
    if (!source) throw new ApplicationError('Task not found', 'TASK_NOT_FOUND', 404);
    taskAccessService.assertManage(source, await taskAccessService.context(userId));
    const newTaskId = crypto.randomUUID();
    await AppDataSource.transaction(async manager => {
      await manager.query(`
        INSERT INTO tasks(taskId,title,description,createdBy,priority,status,isActive,duplicatedFromTaskId)
        VALUES (?,?,?,?,?,'draft',1,?)
      `, [newTaskId, `Copy of ${source.title}`.slice(0, 255), source.description || null, userId, source.priority, source.taskId]);
      await manager.query(`
        INSERT INTO task_checklist_items(taskId,label,isRequired,isCompleted,sortOrder)
        SELECT ?,label,isRequired,0,sortOrder FROM task_checklist_items WHERE taskId=? ORDER BY sortOrder
      `, [newTaskId, source.taskId]);
      await manager.query(`INSERT INTO task_activities(taskId,actorUserId,action,metadata) VALUES (?,?,?,?)`, [newTaskId, userId, 'duplicated', JSON.stringify({ sourceTaskId: source.taskId })]);
      if (includeAttachments) {
        await outboxService.enqueue({
          eventType: 'task.attachments.copy', aggregateType: 'task', aggregateId: newTaskId,
          payload: { sourceTaskId: source.taskId, targetTaskId: newTaskId, userId },
          idempotencyKey: `task:${newTaskId}:attachments-copy`,
        }, manager);
      }
    });
    return { taskId: newTaskId, attachmentCopyStatus: includeAttachments ? 'pending' : 'not_requested' };
  }

  async checklist(taskId: string, viewerUserId: number) {
    const task = await AppDataSource.getRepository(Task).findOne({ where: { taskId, isActive: true } });
    if (!task) throw new ApplicationError('Task not found', 'TASK_NOT_FOUND', 404);
    taskAccessService.assertView(task, await taskAccessService.context(viewerUserId));
    return AppDataSource.query(`SELECT * FROM task_checklist_items WHERE taskId=? ORDER BY sortOrder,checklistItemId`, [taskId]);
  }

  async replaceChecklist(taskId: string, userId: number, items: ChecklistInput[]) {
    const task = await AppDataSource.getRepository(Task).findOne({ where: { taskId, isActive: true } });
    if (!task) throw new ApplicationError('Task not found', 'TASK_NOT_FOUND', 404);
    taskAccessService.assertManage(task, await taskAccessService.context(userId));
    const clean = items.slice(0, 50).map(item => ({ label: String(item.label || '').trim().slice(0, 255), isRequired: Boolean(item.isRequired) })).filter(item => item.label);
    await AppDataSource.transaction(async manager => {
      await manager.query('DELETE FROM task_checklist_items WHERE taskId=?', [taskId]);
      for (let index = 0; index < clean.length; index += 1) {
        await manager.query('INSERT INTO task_checklist_items(taskId,label,isRequired,sortOrder) VALUES (?,?,?,?)', [taskId, clean[index].label, clean[index].isRequired ? 1 : 0, index]);
      }
      await manager.query(`INSERT INTO task_activities(taskId,actorUserId,action,metadata) VALUES (?,?,?,?)`, [taskId, userId, 'checklist_updated', JSON.stringify({ count: clean.length })]);
    });
    return this.checklist(taskId, userId);
  }

  async toggleChecklist(taskId: string, itemId: number, userId: number, completed: boolean) {
    const task = await AppDataSource.getRepository(Task).findOne({ where: { taskId, isActive: true } });
    if (!task) throw new ApplicationError('Task not found', 'TASK_NOT_FOUND', 404);
    const access = await taskAccessService.context(userId);
    if (!taskAccessService.canManage(task, access) && task.assignedTo !== userId) throw new ApplicationError('Checklist action is not allowed', 'TASK_ACTION_FORBIDDEN', 403);
    const result = await AppDataSource.query(`UPDATE task_checklist_items SET isCompleted=?,completedBy=?,completedAt=? WHERE checklistItemId=? AND taskId=?`, [completed ? 1 : 0, completed ? userId : null, completed ? new Date() : null, itemId, taskId]);
    if (!Number(result.affectedRows || 0)) throw new ApplicationError('Checklist item not found', 'CHECKLIST_ITEM_NOT_FOUND', 404);
    await AppDataSource.query(`INSERT INTO task_activities(taskId,actorUserId,action,metadata) VALUES (?,?,?,?)`, [taskId, userId, completed ? 'checklist_completed' : 'checklist_reopened', JSON.stringify({ checklistItemId: itemId })]);
    return this.checklist(taskId, userId);
  }

  async setBlocked(taskId: string, userId: number, blocked: boolean, reason: string, expectedVersion?: number) {
    const task = await AppDataSource.getRepository(Task).findOne({ where: { taskId, isActive: true } });
    if (!task) throw new ApplicationError('Task not found', 'TASK_NOT_FOUND', 404);
    const access = await taskAccessService.context(userId);
    if (!taskAccessService.canManage(task, access) && task.assignedTo !== userId) throw new ApplicationError('Blocked state is not allowed', 'TASK_ACTION_FORBIDDEN', 403);
    if (expectedVersion !== undefined && task.version !== expectedVersion) throw Object.assign(new Error('This task was changed by another user'), { statusCode: 409, code: 'TASK_VERSION_CONFLICT', currentVersion: task.version });
    if (blocked && !reason.trim()) throw new ApplicationError('A blocked reason is required', 'TASK_BLOCK_REASON_REQUIRED', 400);
    await AppDataSource.query(`UPDATE tasks SET blockedReason=?,blockedAt=?,blockedBy=?,version=version+1 WHERE taskId=?`, [blocked ? reason.trim().slice(0, 500) : null, blocked ? new Date() : null, blocked ? userId : null, taskId]);
    await AppDataSource.query(`INSERT INTO task_activities(taskId,actorUserId,action,metadata) VALUES (?,?,?,?)`, [taskId, userId, blocked ? 'blocked' : 'unblocked', JSON.stringify(blocked ? { reason: reason.trim() } : {})]);
    webSocketService.emitDomainEvent('task:updated', { taskId, actorUserId: userId, blocked, revision: new Date().toISOString() }, [task.createdBy, task.assignedTo, userId].filter((id): id is number => Boolean(id)));
  }

  async savedViews(userId: number, pageKey?: string) {
    return AppDataSource.query(`SELECT * FROM user_saved_views WHERE userId=? ${pageKey ? 'AND pageKey=?' : ''} ORDER BY isDefault DESC,name`, pageKey ? [userId, pageKey] : [userId]);
  }

  async saveView(userId: number, input: any) {
    const pageKey = String(input.pageKey || '').trim().slice(0, 40);
    const name = String(input.name || '').trim().slice(0, 80);
    if (!pageKey || !name || !input.filters || typeof input.filters !== 'object') throw new ApplicationError('A name, page and filters are required', 'SAVED_VIEW_INVALID', 400);
    return AppDataSource.transaction(async manager => {
      if (input.isDefault) await manager.query('UPDATE user_saved_views SET isDefault=0 WHERE userId=? AND pageKey=?', [userId, pageKey]);
      await manager.query(`INSERT INTO user_saved_views(userId,pageKey,name,filters,isDefault) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE filters=VALUES(filters),isDefault=VALUES(isDefault)`, [userId, pageKey, name, JSON.stringify(input.filters), input.isDefault ? 1 : 0]);
      const rows = await manager.query('SELECT * FROM user_saved_views WHERE userId=? AND pageKey=? AND name=? LIMIT 1', [userId, pageKey, name]);
      return rows[0];
    });
  }

  async deleteView(userId: number, viewId: number) {
    await AppDataSource.query('DELETE FROM user_saved_views WHERE viewId=? AND userId=?', [viewId, userId]);
  }

  async templates(userId: number) {
    return AppDataSource.query(`SELECT * FROM task_templates WHERE isActive=1 AND (createdBy=? OR visibility='organization') ORDER BY visibility DESC,updatedAt DESC`, [userId]);
  }

  async createTemplate(userId: number, input: any) {
    const visibility = input.visibility === 'organization' ? 'organization' : 'private';
    const result = await AppDataSource.query(`INSERT INTO task_templates(name,title,description,priority,defaultAssigneeId,watcherIds,checklist,visibility,createdBy) VALUES (?,?,?,?,?,?,?,?,?)`, [String(input.name || '').trim().slice(0, 100), String(input.title || '').trim().slice(0, 255), input.description || null, input.priority || 'normal', input.defaultAssigneeId || null, JSON.stringify(input.watcherIds || []), JSON.stringify(input.checklist || []), visibility, userId]);
    return (await AppDataSource.query('SELECT * FROM task_templates WHERE templateId=?', [result.insertId]))[0];
  }

  async createRecurrence(userId: number, input: any) {
    const templates = await AppDataSource.query(`SELECT * FROM task_templates WHERE templateId=? AND isActive=1 AND (createdBy=? OR visibility='organization') LIMIT 1`, [Number(input.templateId), userId]);
    if (!templates[0]) throw new ApplicationError('Template not found', 'TASK_TEMPLATE_NOT_FOUND', 404);
    const nextRunAt = new Date(input.nextRunAt || `${input.startsOn}T${input.localTime || '09:00'}:00+07:00`);
    const result = await AppDataSource.query(`INSERT INTO task_recurrence_rules(templateId,cadence,intervalValue,weekdays,dayOfMonth,\`localTime\`,timezone,startsOn,endsOn,nextRunAt,createdBy) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [Number(input.templateId), input.cadence, Math.max(1, Number(input.intervalValue || 1)), JSON.stringify(input.weekdays || []), input.dayOfMonth || null, input.localTime || '09:00', 'Asia/Bangkok', input.startsOn, input.endsOn || null, nextRunAt, userId]);
    return (await AppDataSource.query('SELECT * FROM task_recurrence_rules WHERE recurrenceRuleId=?', [result.insertId]))[0];
  }

  private nextOccurrence(current: Date, rule: any): Date {
    const next = new Date(current);
    const interval = Math.max(1, Number(rule.intervalValue || 1));
    if (rule.cadence === 'daily') next.setUTCDate(next.getUTCDate() + interval);
    else if (rule.cadence === 'weekly') {
      const weekdays = parseJson<number[]>(rule.weekdays, []);
      if (!weekdays.length) next.setUTCDate(next.getUTCDate() + interval * 7);
      else {
        const start = new Date(`${String(rule.startsOn).slice(0, 10)}T00:00:00+07:00`);
        do {
          next.setUTCDate(next.getUTCDate() + 1);
          const bangkok = new Date(next.getTime() + 7 * 3600000);
          const weekday = bangkok.getUTCDay();
          const weekIndex = Math.floor((next.getTime() - start.getTime()) / (7 * 86400000));
          if (weekdays.includes(weekday) && Math.max(0, weekIndex) % interval === 0) break;
        } while (next.getTime() < current.getTime() + 370 * 86400000);
      }
    } else {
      const targetDay = Math.min(28, Math.max(1, Number(rule.dayOfMonth || 1)));
      next.setUTCMonth(next.getUTCMonth() + interval, targetDay);
    }
    return next;
  }

  async generateDueOccurrences(limit = 20): Promise<void> {
    const rules = await AppDataSource.query(`SELECT rr.*,tt.*,rr.createdBy AS ruleCreator FROM task_recurrence_rules rr INNER JOIN task_templates tt ON tt.templateId=rr.templateId WHERE rr.status='active' AND rr.nextRunAt<=NOW() ORDER BY rr.nextRunAt LIMIT ?`, [limit]);
    for (const rule of rules) {
      const creator = await AppDataSource.query('SELECT isActive FROM users WHERE userId=? LIMIT 1', [rule.ruleCreator]);
      if (!creator[0]?.isActive) {
        await AppDataSource.query(`UPDATE task_recurrence_rules SET status='paused' WHERE recurrenceRuleId=?`, [rule.recurrenceRuleId]);
        continue;
      }
      const occurrenceKey = `recurrence:${rule.recurrenceRuleId}:${new Date(rule.nextRunAt).toISOString()}`;
      const assignee = rule.defaultAssigneeId ? await AppDataSource.query('SELECT isActive FROM users WHERE userId=? LIMIT 1', [rule.defaultAssigneeId]) : [];
      const ready = Boolean(rule.defaultAssigneeId && assignee[0]?.isActive);
      const taskId = crypto.randomUUID();
      const nextRunAt = this.nextOccurrence(new Date(rule.nextRunAt), rule);
      await AppDataSource.transaction(async manager => {
        const inserted = await manager.query(`INSERT IGNORE INTO tasks(taskId,title,description,assignedTo,createdBy,priority,status,isActive,templateId,recurrenceRuleId,scheduledFor,occurrenceKey) VALUES (?,?,?,?,?,?,?,1,?,?,?,?)`, [taskId, rule.title, rule.description || null, ready ? rule.defaultAssigneeId : null, rule.ruleCreator, rule.priority, ready ? 'todo' : 'draft', rule.templateId, rule.recurrenceRuleId, rule.nextRunAt, occurrenceKey]);
        if (Number(inserted.affectedRows || 0) > 0) {
          const checklist = parseJson<ChecklistInput[]>(rule.checklist, []);
          for (let index = 0; index < checklist.length; index += 1) await manager.query('INSERT INTO task_checklist_items(taskId,label,isRequired,sortOrder) VALUES (?,?,?,?)', [taskId, checklist[index].label, checklist[index].isRequired ? 1 : 0, index]);
        }
        await manager.query(`UPDATE task_recurrence_rules SET lastGeneratedAt=nextRunAt,nextRunAt=?,status=CASE WHEN endsOn IS NOT NULL AND DATE(?)>endsOn THEN 'completed' ELSE status END WHERE recurrenceRuleId=?`, [nextRunAt, nextRunAt, rule.recurrenceRuleId]);
      });
    }
  }
}

export const productivityService = new ProductivityService();
