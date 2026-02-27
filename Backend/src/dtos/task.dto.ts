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
  @IsString()
  @Length(0, 512)
  imageUrl?: string;

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
  @IsString()
  @Length(0, 512)
  imageUrl?: string;

  @IsOptional()
  @IsEnum(['draft', 'upcoming', 'past', 'done'])
  status?: 'draft' | 'upcoming' | 'past' | 'done';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TaskQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

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
