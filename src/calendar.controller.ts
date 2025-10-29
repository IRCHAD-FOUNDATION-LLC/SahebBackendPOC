import { Controller, Get, Param } from '@nestjs/common';
import { HijriService } from './calendar.service';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly hijriService: HijriService) {}

  @Get('/:year')
  async getNextYearCalendar(@Param('year') year: number) {
    return this.hijriService.updateOfficialHijriCalendar(year);
  }
}
