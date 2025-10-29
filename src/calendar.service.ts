import { Injectable, Logger } from '@nestjs/common';
import { DbService } from './db.service';
import axios from 'axios';
import moment from 'moment';

@Injectable()
export class HijriService {
  private readonly logger = new Logger(HijriService.name);

  constructor(private readonly dbService: DbService) { }

  formatDate(date:string):string{
    const parts = date.split('-');
    return [parts[2],parts[1],parts[0]].join('-');
  }
  /**
   * Fetch and update the official Moroccan Hijri calendar for a given Hijri year.
   */
  async updateOfficialHijriCalendar(gregoYear: number): Promise<any> {
    this.logger.log(`Updating official Hijri calendar for Morocco year ${gregoYear}`);

    const calendar = await this.fetchMonthlyAnnouncements(gregoYear);
    if (Object.keys(calendar).length === 0) {
      this.logger.warn('No calendar found for year ' + gregoYear);
      return;
    }
    let answer:any = [];
    console.log(calendar);
    for (const month in calendar) {
      let firstDay = calendar[month].first;
      let lastDay = calendar[month].last;
      let params = [
        this.formatDate(firstDay.gregorian.date), 
        this.formatDate(firstDay.hijri.date), 
        this.formatDate(lastDay.hijri.date)
      ];
      answer.push(params);
        
      await this.dbService['pool'].execute(
        `INSERT INTO hijri_calendar 
          ( month, hijri_first_day, hijri_last_day) 
         VALUES (?, ?, ?) on DUPLICATE KEY UPDATE hijri_first_day=hijri_first_day, hijri_last_day=hijri_last_day;`,
         params,
      );
    }

    this.logger.log(`Inserted/updated ${Object.keys(calendar).length} records for year ${gregoYear}`);
    return answer;
  }

  private async fetchMonthlyAnnouncements(GregoYear: number): Promise<object> {
    const results = {};

    // Example: you might scan known URLs or search the site for each month announcement
    // For brevity: assume you know the URL pattern or search endpoint
    for (let month = 1; month <= 12; month++) {
      let url = `https://api.aladhan.com/v1/gToHCalendar/${month}/${GregoYear}`;
      console.log(url);
      let resp = await axios.get(url);
      //const gregDate = moment(resp, 'D MMMM YYYY').format('YYYY-MM-DD');
      let days = resp.data.data
      results[month] = { first: days[0], last: days[days.length - 1] };
    }

    return results;
  }


  private hijriMonthName(month: number): string {
    const names = [
      '', 'Moharram', 'Safar', 'Rabi I', 'Rabi II', 'Joumada I', 'Joumada II', 'Rajab', 'Chaaban', 'Ramadan', 'Chawwal', 'Dhou al-Qi’dah', 'Dhou al-Hijjah'
    ];
    return names[month] || '';
  }
}
