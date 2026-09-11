import { BadRequestException } from '@nestjs/common';

export function parseDateBoundary(value: string, endOfDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('Dates must use YYYY-MM-DD format');
  }

  const date = new Date(`${value}${endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'}`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Invalid date value');
  }

  return date;
}
