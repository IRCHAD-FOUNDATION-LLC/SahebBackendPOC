import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrayerService } from './prayer.service';
import { PrayerController } from './prayer.controller';
import { CalendarController } from './calendar.controller';
import { AppService } from './app.service';
import { DbService } from './db.service';
import { AthanService, CoordinatesPrayerTimeByAthanStrategy, CityPrayerTimeByAthanStrategy } from './athan.service';
import { HijriService } from './calendar.service';

import { HttpModule } from '@nestjs/axios';
@Module({
  imports: [HttpModule],
  controllers: [PrayerController, AppController,CalendarController],
  providers: [PrayerService, AppService, DbService, AthanService, CoordinatesPrayerTimeByAthanStrategy, CityPrayerTimeByAthanStrategy, HijriService],
})
export class AppModule { }
