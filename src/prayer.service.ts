import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PrayerService {
  constructor(private readonly httpService: HttpService) {}

  private async fetchData(url: string) {
    const response = await firstValueFrom(this.httpService.get(url));
    const data = response.data.data;
  
    const today = new Date();
    const next7Days = data.slice(today.getDate() - 1, today.getDate() + 6);
  
    return data.map((d) => ({
      date: d.date.gregorian.date,
      timings: {
        Fajr: d.timings.Fajr,
        Shurooq: d.timings.Sunrise, // Aladhan API uses "Sunrise"
        Dhuhr: d.timings.Dhuhr,
        Asr: d.timings.Asr,
        Maghrib: d.timings.Maghrib,
        Isha: d.timings.Isha,
      },
    }));
  }

  
  async getMethods() {
    const url = `http://api.aladhan.com/v1/methods`;
    const response = await firstValueFrom(this.httpService.get(url));
    return response.data.data;
  }

  async getByCoordinates(lat: number, lon: number, method: number) {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const url = `http://api.aladhan.com/v1/calendar?latitude=${lat}&longitude=${lon}&method=${method}&month=${month}&year=${year}`;
    return this.fetchData(url);
  }

  async getByCity(city: string, country: string, method: number) {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const url = `http://api.aladhan.com/v1/calendarByCity?city=${encodeURIComponent(
      city,
    )}&country=${encodeURIComponent(
      country,
    )}&method=${method}&month=${month}&year=${year}`;
    return this.fetchData(url);
  }
}
