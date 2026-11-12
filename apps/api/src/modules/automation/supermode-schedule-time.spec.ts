import { dueRunDates, followingWeekDates, localDateTime } from './supermode-schedule-time';

describe('Supermode schedule calendar', () => {
  it('uses the configured time zone across a daylight-saving transition', () => {
    expect(localDateTime(new Date('2026-03-29T00:30:00.000Z'), 'Europe/Rome')).toEqual({
      date: '2026-03-29',
      hour: 1,
      minute: 30,
    });
    expect(localDateTime(new Date('2026-03-29T01:30:00.000Z'), 'Europe/Rome')).toEqual({
      date: '2026-03-29',
      hour: 3,
      minute: 30,
    });
  });

  it('recovers every missed daily occurrence but waits for today’s configured time', () => {
    expect(dueRunDates('daily', '06:00', null, '2026-11-09', new Date('2026-11-12T05:59:00Z'), 'UTC'))
      .toEqual(['2026-11-10', '2026-11-11']);
    expect(dueRunDates('daily', '06:00', null, '2026-11-09', new Date('2026-11-12T06:00:00Z'), 'UTC'))
      .toEqual(['2026-11-10', '2026-11-11', '2026-11-12']);
  });

  it('recovers missed weekly run days and prepares the following local Monday through Sunday', () => {
    const runs = dueRunDates('weekly', '08:00', 1, '2026-10-26', new Date('2026-11-12T10:00:00Z'), 'UTC');
    expect(runs).toEqual(['2026-11-02', '2026-11-09']);
    expect(followingWeekDates(runs[1])).toEqual([
      '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19',
      '2026-11-20', '2026-11-21', '2026-11-22',
    ]);
  });

  it('does not run twice on the same local calendar date after a DST clock repeat', () => {
    const now = new Date('2026-10-25T01:30:00.000Z');
    expect(dueRunDates('daily', '02:30', null, '2026-10-24', now, 'Europe/Rome')).toEqual(['2026-10-25']);
    expect(dueRunDates('daily', '02:30', null, '2026-10-25', new Date('2026-10-25T02:30:00.000Z'), 'Europe/Rome')).toEqual([]);
  });
});
