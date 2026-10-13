import { LogType } from '@complyfood/shared';

export function logTypeFromSearch(search: string): LogType | null {
  const type = new URLSearchParams(search).get('type');
  return Object.values(LogType).includes(type as LogType) ? type as LogType : null;
}
