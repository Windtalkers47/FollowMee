export class StatusResponseDto {
  value: string = '';
  label: string = '';

  constructor(partial: Partial<StatusResponseDto> = {}) {
    Object.assign(this, partial);
  }
}
