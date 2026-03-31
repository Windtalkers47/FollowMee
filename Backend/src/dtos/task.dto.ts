import { IsNotEmpty, IsOptional, IsString, IsDateString, IsEnum, IsBoolean, Length } from 'class-validator';

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
  @IsEnum(['draft', 'upcoming', 'past', 'done'])
  status?: 'draft' | 'upcoming' | 'past' | 'done';
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
  @IsEnum(['draft', 'upcoming', 'past', 'done'])
  status?: 'draft' | 'upcoming' | 'past' | 'done';

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
  @IsEnum(['draft', 'upcoming', 'past', 'done'])
  status?: 'draft' | 'upcoming' | 'past' | 'done';

  @IsOptional()
  assignedTo?: number;

  @IsOptional()
  createdBy?: number;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 30;
}
