import { IsNotEmpty, IsOptional, IsString, IsDateString, IsEnum, IsBoolean, Length, IsArray, IsInt } from 'class-validator';

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  assignedTo?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @Length(0, 512)
  imageUrl?: string; // Backward compatibility - single image

  @IsOptional()
  images?: { imageUrl: string; imageOrder?: number }[]; // Multiple images

  @IsOptional()
  @IsEnum(['draft', 'todo', 'in_progress', 'review', 'done', 'cancelled'])
  status?: 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  assignedTo?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @Length(0, 512)
  imageUrl?: string; // Backward compatibility - single image

  @IsOptional()
  images?: { imageUrl: string; imageOrder?: number }[]; // Multiple images

  @IsOptional()
  @IsEnum(['draft', 'todo', 'in_progress', 'review', 'done', 'cancelled'])
  status?: 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class MarkTaskDoneDto {
  @IsOptional()
  @IsString()
  completionNote?: string;
}

export class TaskQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  clearSearch?: boolean; // Flag to clear search and fetch all

  @IsOptional()
  @IsBoolean()
  includeStats?: boolean; // Flag to include performance statistics

  @IsOptional()
  includeFocus?: boolean;

  @IsOptional()
  @IsEnum(['draft', 'todo', 'in_progress', 'review', 'done', 'cancelled'])
  status?: 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';

  @IsOptional()
  assignedTo?: number;

  @IsOptional()
  createdBy?: number;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 30;

  @IsOptional()
  @IsEnum(['all', 'overdue', 'today', 'week'])
  dueFilter?: 'all' | 'overdue' | 'today' | 'soon' | 'week';

  @IsOptional()
  @IsEnum(['updated_desc', 'due_asc', 'title_asc'])
  sort?: 'updated_desc' | 'due_asc' | 'title_asc';
}

// ==================== Bulk Action DTOs ====================

export class BulkUpdateStatusDto {
  @IsArray()
  @IsString({ each: true })
  taskIds!: string[];

  @IsNotEmpty()
  @IsEnum(['draft', 'todo', 'in_progress', 'review', 'done', 'cancelled'])
  status!: 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
}

export class BulkDeleteDto {
  @IsArray()
  @IsString({ each: true })
  taskIds!: string[];
}

export class BulkAssignDto {
  @IsArray()
  @IsString({ each: true })
  taskIds!: string[];

  @IsOptional()
  @IsInt()
  assignedTo?: number;
}

export class RequestTaskChangesDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 1000)
  reason!: string;
}

// ==================== Priority Summary DTO ====================

export class PrioritySummaryResponseDto {
  dueToday!: number;
  dueTomorrow!: number;
  overdue!: number;
  dueWithin3Days!: number;
  totalTasks!: number;
  suggestedAction?: string;
  suggestions!: PrioritySuggestionDto[];
}

export class PrioritySuggestionDto {
  id!: string;
  translationKey!: 'overdue' | 'today' | 'tomorrow' | 'soon';
  title!: string;
  type!: 'due-today' | 'due-tomorrow' | 'overdue' | 'due-within-3-days';
  taskIds!: string[];
  count!: number;
  priority!: number; // Higher = more urgent
  message!: string;
  actions!: SuggestionActionDto[];
}

export class SuggestionActionDto {
  id!: string;
  label!: string;
  type!: 'mark-done' | 'start-all' | 'reschedule' | 'review';
  icon?: string;
  color?: string;
}
