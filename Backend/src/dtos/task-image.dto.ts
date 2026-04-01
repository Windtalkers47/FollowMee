import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateTaskImageDto {
  @IsNotEmpty()
  @IsString()
  imageUrl!: string;

  @IsOptional()
  @IsNumber()
  imageOrder?: number;
}

export class UpdateTaskImageDto {
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  imageOrder?: number;
}

export class TaskImageResponseDto {
  imageId!: number;
  taskId!: string;
  imageUrl!: string;
  imageOrder!: number;
  uploadedBy!: number;
  createdAt!: Date;
  isActive!: boolean;
  deletedAt?: Date;

  uploadedByUser?: {
    userId: number;
    userName: string;
    userLastName: string;
    userImageUrl?: string;
  };
}
