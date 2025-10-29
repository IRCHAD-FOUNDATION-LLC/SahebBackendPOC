import { Controller, Get, Query } from '@nestjs/common';
import { PrayerService } from './prayer.service';
import { AthanService } from './athan.service';
import { DbService } from './db.service';

@Controller('prayer')
export class PrayerController {
  constructor(private readonly prayerService: PrayerService, private readonly dbService: DbService, private readonly athanService: AthanService) { }

  @Get('by-coordinates')
  async getByCoordinates(
    @Query('lat') lat: string,
    @Query('lon') lon: string,
    @Query('method') method = '2', // Default: Muslim World League
  ) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    const calcMethod = parseInt(method, 10);

    if (isNaN(latitude) || isNaN(longitude)) {
      return { error: 'Invalid latitude or longitude' };
    }

    return this.prayerService.getByCoordinates(latitude, longitude, calcMethod);
  }

  @Get('by-city')
  async getByCity(
    @Query('city') city: string,
    @Query('country') country: string,
    @Query('method') method = '2', // Default: Muslim World League
  ) {
    if (!city || !country) {
      return { error: 'City and country are required' };
    }

    const calcMethod = parseInt(method, 10);
    return this.prayerService.getByCity(city, country, calcMethod);
  }

  @Get('init-methods')
  async initMethods() {
    // NOTE: For this method to function correctly, DbService must be injected into
    // PrayerController's constructor (e.g., `private readonly dbService: DbService`)
    // and imported (e.g., `import { DbService } from './db.service';`).
    try {
      // Assuming DbService is injected as 'this.dbService'
      await this.dbService.savePrayerCalculationMethods(this.prayerService);
      return { message: 'Prayer calculation methods initialized and saved successfully.' };
    } catch (error) {
      console.error('Error initializing prayer methods:', error.message);
      return { error: 'Failed to initialize prayer calculation methods.', details: error.message };
    }
  }


  @Get('execute-strategy')
  async executeStrategy(
    @Query('strategy') strategy: string,
    @Query('params') params: string,
  ) {
    const data = JSON.parse(params);
    const strategy_id = await this.dbService.findStrategyIdByName(strategy);
    const city_id = await this.dbService.findCityIdByName(data['city'], data['country'],);
    const calendar = await this.athanService.executeStrategyByName(strategy, data);
    console.log('strategy_id',strategy_id);
    console.log('city_id',city_id);
    if (strategy_id !== null && city_id !== null && calendar.length > 0) {
      this.dbService.insertData(strategy_id, city_id, calendar)
    }
    return calendar;
  }
}
