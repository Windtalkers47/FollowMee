import { Exclude, Expose } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  userId!: number;

  @Expose()
  userName!: string;

  @Expose()
  userLastName!: string;

  @Expose()
  userEmail!: string;

  @Expose()
  userPhone1: string | null = null;

  @Expose()
  userPhone2: string | null = null;

  @Expose()
  isActive!: boolean;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  get fullName(): string {
    return `${this.userName} ${this.userLastName}`.trim();
  }

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, {
      ...partial,
      userPhone1: partial.userPhone1 ?? null,
      userPhone2: partial.userPhone2 ?? null
    });
  }
}
