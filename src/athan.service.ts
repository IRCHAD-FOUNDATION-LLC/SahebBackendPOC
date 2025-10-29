import { Injectable, Logger } from '@nestjs/common';
import { PrayerService } from './prayer.service'; // Assuming prayer.service.ts is in the same directory

// Define common parameter interfaces for better type safety
interface BasePrayerTimeParams {
    method: number;
    duration: number; // New parameter: number of days for which to fetch prayer times
}

interface CoordinatesPrayerTimeParams extends BasePrayerTimeParams {
  lat: number;
  lon: number;
}

interface CityPrayerTimeParams extends BasePrayerTimeParams {
  city: string;
  country: string;
}

// Union type for all possible prayer time parameters
type PrayerTimeParams = CoordinatesPrayerTimeParams | CityPrayerTimeParams;

// 1. Strategy Interface
interface IPrayerTimeStrategy {
  /**
   * Fetches prayer times based on the provided parameters.
   * @param params An object containing parameters specific to the strategy (e.g., {lat, lon, method, duration} or {city, country, method, duration}).
   * @returns A promise that resolves to an array of prayer time data.
   */
  getPrayerTimes(params: PrayerTimeParams): Promise<any[]>;

  /**
   * Determines if this strategy can handle the given parameters.
   * This allows the context to dynamically select the appropriate strategy.
   * @param params The parameters to check.
   * @returns True if the strategy can handle the parameters, false otherwise.
   */
  canHandle(params: any): boolean; // Keep 'any' here for initial parameter checking flexibility
}


// 2. Concrete Strategy: Fetch by City
@Injectable()
export class CityPrayerTimeByAthanStrategy implements IPrayerTimeStrategy {
  private readonly logger = new Logger(CityPrayerTimeByAthanStrategy.name);

  constructor(private readonly prayerService: PrayerService) {}

  canHandle(params: any): boolean {
    // Check if parameters contain city, country, method, and a positive duration
    return true;
  }

  async getPrayerTimes(params: CityPrayerTimeParams): Promise<any[]> {
    this.logger.debug(`Executing CityPrayerTimeStrategy for city=${params.city}, country=${params.country}, method=${params.method}, duration=${params.duration}`);
    // Assuming prayerService.getByCity now accepts a duration parameter
    return this.prayerService.getByCity(params.city, params.country, params.method);
  }
}
// 2. Concrete Strategy: Fetch by Coordinates
@Injectable()
export class CoordinatesPrayerTimeByAthanStrategy implements IPrayerTimeStrategy {
  private readonly logger = new Logger(CoordinatesPrayerTimeByAthanStrategy.name);

  constructor(private readonly prayerService: PrayerService) {}

  canHandle(params: any): boolean {
    // Check if parameters contain lat, lon, method, and a positive duration
    return typeof params.lat === 'number' &&
           typeof params.lon === 'number' &&
           typeof params.method === 'number' &&
           typeof params.duration === 'number' && params.duration > 0;
  }

  async getPrayerTimes(params: CoordinatesPrayerTimeParams): Promise<any[]> {
    this.logger.debug(`Executing CoordinatesPrayerTimeStrategy for lat=${params.lat}, lon=${params.lon}, method=${params.method}, duration=${params.duration}`);
    // The prayerService.getByCoordinates method currently fetches for the current month and returns 7 days.
    // The 'duration' parameter from the strategy interface is not directly used by the underlying PrayerService method yet.
    return this.prayerService.getByCoordinates(params.lat, params.lon, params.method);
  }
}

// 3. Context: AthanService
@Injectable()
export class AthanService {
  private readonly logger = new Logger(AthanService.name);
  private strategies: IPrayerTimeStrategy[];

  constructor(

    private readonly coordinatesPrayerTimeByAthanStrategy: CoordinatesPrayerTimeByAthanStrategy,
    private readonly CityPrayerTimeByAthanStrategy:CityPrayerTimeByAthanStrategy,
    // Inject PrayerService directly if AthanService needs to use its methods that are not part of the strategy (e.g., getMethods)
    private readonly prayerService: PrayerService,
  ) {
    // Store all available strategies
    this.strategies = [coordinatesPrayerTimeByAthanStrategy,CityPrayerTimeByAthanStrategy];
  }

  /**
   * Fetches prayer times by dynamically selecting the appropriate strategy
   * based on the provided parameters.
   * @param params An object containing parameters for fetching prayer times.
   *               Expected to be either { lat: number, lon: number, method: number, duration: number }
   *               or { city: string, country: string, method: number, duration: number }.
   * @returns A promise that resolves to an array of prayer time data.
   * @throws Error if no suitable strategy is found for the given parameters.
   */
  async getPrayerTimes(params: PrayerTimeParams): Promise<any[]> {
    this.logger.log('Attempting to get prayer times with parameters:', params);

    // Find the first strategy that can handle the given parameters
    const strategy = this.strategies.find(s => s.canHandle(params));

    if (!strategy) {
      this.logger.error('No suitable strategy found for the given parameters.', params);
      throw new Error('Invalid parameters for fetching prayer times. Please provide either coordinates (lat, lon, method, duration) or city (city, country, method, duration).');
    }

    // Delegate the call to the selected strategy
    return strategy.getPrayerTimes(params);
  }

  /**
   * Retrieves available prayer calculation methods from the external API.
   * This method is not part of the strategy pattern, but a direct utility from PrayerService.
   * @returns A promise that resolves to an object containing prayer calculation methods.
   */
  async getMethods() {
    this.logger.log('Fetching available prayer calculation methods.');
    return this.prayerService.getMethods();
  }

  /**
   * Executes a specific prayer time strategy by its conceptual name.
   * This allows for explicit selection of a strategy, bypassing the automatic `canHandle` detection.
   * @param strategyName The name of the strategy to execute (e.g., 'city', 'coordinates').
   * @param params An object containing parameters required by the selected strategy.
   *               The structure of params must match the requirements of the chosen strategy.
   * @returns A promise that resolves to an array of prayer time data.
   * @throws Error if the strategyName is not recognized or if the selected strategy cannot handle the provided parameters.
   */
  async executeStrategyByName(strategyName: string, params: PrayerTimeParams): Promise<any[]> {
    this.logger.log(`Attempting to execute strategy "${strategyName}" with parameters:`, params,strategyName.toLowerCase().indexOf('athan-api-'));

    let selectedStrategy: IPrayerTimeStrategy | undefined;


    if(strategyName.toLowerCase().indexOf('athan-api-') == 0){
      selectedStrategy = this.CityPrayerTimeByAthanStrategy;
      params['method'] = parseInt(strategyName.charAt(strategyName.length-1));
      console.log('methode', params['method'],strategyName);
    }else{
        this.logger.error(`Unknown strategy name: "${strategyName}"`);
        throw new Error(`Strategy "${strategyName}" not found. Available strategies: 'athan'.`);
    }

    console.log('params',params);
    // Before executing, ensure the selected strategy can actually handle the provided parameters.
    // This adds a layer of validation even when a strategy is explicitly chosen.
    if (!selectedStrategy.canHandle(params)) {
      this.logger.error(`Selected strategy "${strategyName}" cannot handle the provided parameters.`, params);
      throw new Error(`Parameters are not valid for the "${strategyName}" strategy. Please check the required parameters for this strategy.`);
    }

    // Delegate the call to the explicitly selected strategy
    return selectedStrategy.getPrayerTimes(params);
  }
}
