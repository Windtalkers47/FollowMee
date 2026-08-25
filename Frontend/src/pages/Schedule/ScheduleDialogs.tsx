import type { CreateTaskData, Task, UpdateTaskData } from '../../api/task.api';
import type { User } from '../../api/user.api';
import { TaskForm } from '../../components/TaskForm/TaskForm';
import DuplicateTaskDialog from '../../components/DuplicateTaskDialog';
import { getBookedDates } from '../../utils/dateUtils';
import { scheduleTaskFormPayload } from './schedule.contracts';

export const ScheduleDialogs = ({
  open, editingTask, duplicateTask, users, onClose, onDuplicateClose, onCreate, onUpdate,
}: {
  open: boolean; editingTask?: Task; duplicateTask: Task | null; users: User[]; onClose: () => void; onDuplicateClose: () => void;
  onCreate: (data: CreateTaskData) => Promise<unknown>; onUpdate: (taskId: string, data: UpdateTaskData) => Promise<unknown>;
}) => <>
  <TaskForm
    open={open} task={editingTask} users={users} bookedDates={getBookedDates(editingTask)} onClose={onClose}
    onSave={async (taskData: CreateTaskData, intent) => {
      try {
        const dataToSave = scheduleTaskFormPayload(taskData, intent);
        if (editingTask) {
          const editableData = { ...dataToSave };
          delete editableData.status;
          const updateData = intent === 'publish' && editingTask.status === 'draft' ? dataToSave : editableData;
          await onUpdate(editingTask.taskId, updateData as UpdateTaskData);
        } else {
          await onCreate(dataToSave as CreateTaskData);
        }
        onClose();
      } catch (error) {
        console.error('Error saving task:', error);
        throw error;
      }
    }}
  />
  <DuplicateTaskDialog task={duplicateTask} open={Boolean(duplicateTask)} onClose={onDuplicateClose} />
</>;
