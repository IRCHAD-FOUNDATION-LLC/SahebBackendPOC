import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as mysql from 'mysql2/promise'; // Using mysql2/promise for async/await support

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbService.name);
  private pool: mysql.Pool;

  constructor() {
    // The connection pool will be initialized in onModuleInit
  }

  async onModuleInit() {
    try {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'my_athan',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      this.logger.log('MySQL connection pool initialized successfully.');

      // Optional: Test the connection
      const connection = await this.pool.getConnection();
      await connection.query('SELECT 1');
      connection.release();
      this.logger.log('Successfully connected to MySQL database.');

      // Optional: Ensure table exists (for demonstration purposes)
     // await this.createPrayerTimesTable();
      //await this.createPrayerMethodsTable();
    } catch (error) {
      this.logger.error('Failed to initialize MySQL connection pool:', error.message);
      // Depending on your application's needs, you might want to throw the error
      // or handle it gracefully (e.g., retry logic).
      throw new Error('Database connection failed');
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('MySQL connection pool closed.');
    }
  }

  private async createPrayerTimesTable() {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS prayer_times (
        id INT AUTO_INCREMENT PRIMARY KEY,
        prayer_date DATE NOT NULL,
        fajr_time VARCHAR(10) NOT NULL,
        shurooq_time VARCHAR(10) NOT NULL,
        dhuhr_time VARCHAR(10) NOT NULL,
        asr_time VARCHAR(10) NOT NULL,
        maghrib_time VARCHAR(10) NOT NULL,
        isha_time VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    try {
      await this.pool.execute(createTableSql);
      this.logger.log('Ensured "prayer_times" table exists.');
    } catch (error) {
      this.logger.error('Error creating "prayer_times" table:', error.message);
      throw error;
    }
  }

  private async createPrayerMethodsTable() {
    const createTableSql = `
        CREATE TABLE IF NOT EXISTS athan_school (
        'id' int NOT NULL AUTO_INCREMENT,
        'name' varchar(50) NOT NULL,
        'startegy_name' varchar(50) NOT NULL,
        'description' text NOT NULL,
        PRIMARY KEY ('id')
        ) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `;
    try {
      await this.pool.execute(createTableSql);
      this.logger.log('Ensured "athan_school" table exists.');
    } catch (error) {
      this.logger.error('Error creating "athan_school" table:', error.message);
      throw error;
    }
  }

  /**
   * Fetches prayer calculation methods from the PrayerService and saves them to the database.
   * This method assumes that PrayerService has been injected into DbService's constructor.
   * (e.g., `constructor(..., private readonly prayerService: PrayerService)`)
   * It also assumes `createPrayerMethodsTable()` is called during `onModuleInit`.
   *
   * @param prayerService An instance of PrayerService to fetch methods.
   * @returns A promise that resolves when all methods have been processed.
   */
  async savePrayerCalculationMethods(prayerService: any): Promise<void> {
    this.logger.log('Attempting to fetch and save prayer calculation methods.');

    if (!this.pool) {
      this.logger.error('Database pool not initialized.');
      throw new Error('Database service not ready.');
    }

    if (!prayerService || typeof prayerService.getMethods !== 'function') {
      this.logger.error('PrayerService is not provided or does not have a getMethods function.');
      throw new Error('Invalid PrayerService dependency.');
    }

    try {
      const methods = await prayerService.getMethods();
      let insertedCount = 0;
      let updatedCount = 0;
        console.log(methods);
      const sql = `
        INSERT INTO athan_school (name, startegy_name,description)
        VALUES (?, ?, ?);`;

      for (const methodId in methods) {
        if (methods.hasOwnProperty(methodId)) {
          const method = methods[methodId];
          if(undefined === method.name){
            continue;
          }
          console.log(methodId,`athan-api-${method['id']}`,method.name);
          const [result] = await this.pool.execute(sql, [methodId,`athan-api-${method['id']}`,method.name]);

          // Check if a row was inserted or updated
          if ((result as mysql.ResultSetHeader).affectedRows === 1) {
            insertedCount++;
          } else if ((result as mysql.ResultSetHeader).affectedRows === 2) {
            // For ON DUPLICATE KEY UPDATE, affectedRows can be 2 if a row was updated
            // (1 for delete, 1 for insert, or 2 for update depending on driver/version)
            // Or 1 if no change was made but it matched.
            // A more robust check might involve selecting before updating, but this is generally sufficient.
            updatedCount++;
          }
        }
      }
      this.logger.log(`Successfully processed prayer methods. Inserted: ${insertedCount}, Updated: ${updatedCount}.`);
    } catch (error) {
      this.logger.error('Error saving prayer calculation methods:', error.message);
      throw error;
    }
  }
  /**
   * Inserts prayer time data into the database.
   *
   * @param data The data object to be inserted, expected to have 'date' and 'timings' properties.
   *             Example: { date: "25-07-2024", timings: { Fajr: "04:00", Shurooq: "05:30", ... } }
   * @returns A promise that resolves with the result of the insertion.
   */
  async insertData(athan_school_id:number,city_id:number,data: any): Promise<any> {
    this.logger.log('Attempting to insert data:', data);

    if (!this.pool) {
      this.logger.error('Database pool not initialized.');
      throw new Error('Database service not ready.');
    }



    const sql = `
      INSERT INTO athan_calendar (athan_school_id, city_id, date, data)
      VALUES (?, ?, ?, ?)
    `;
    let toInsert;
    for (const dataId in data) {
        try {
            const {date, timings } = data[dataId];

            // Assuming date is in "DD-MM-YYYY" format and needs to be converted to "YYYY-MM-DD" for MySQL DATE type
            const [day, month, year] = date.split('-');
            const formattedDate = `${year}-${month}-${day}`;
            toInsert = [
                athan_school_id,
                city_id,
                formattedDate,
                JSON.stringify(timings)
            ];
            const [result] = await this.pool.execute(sql, toInsert);
            this.logger.log('Data inserted successfully:', result);
            //return { id: (result as mysql.ResultSetHeader).insertId, ...data };
          } catch (error) {
            this.logger.error('Error inserting data into database:', error.message);
            throw error; // Re-throw the error for the caller to handle
          }
      }

  }


  async findCityIdByName(
    city: string,
    country: string
  ): Promise<number | null> {
    if (!this.pool) {
      this.logger.error('Database pool not initialized.');
      throw new Error('Database service not ready.');
    }

    try {
      const sql = `SELECT id FROM city WHERE country_name like ? and name like ? LIMIT 1;`;
      const [rows] = await this.pool.execute(sql, [country,city]);

      if (Array.isArray(rows) && rows.length > 0) {
        return (rows[0] as any).id;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Error searching ID in table "city"`,
        error.message,
      );
      throw error;
    }
  }

  async findStrategyIdByName(
    startegy_name: string
  ): Promise<number | null> {
    if (!this.pool) {
      this.logger.error('Database pool not initialized.');
      throw new Error('Database service not ready.');
    }

    try {
      const sql = `SELECT id FROM athan_school WHERE startegy_name  = ? LIMIT 1;`;
      const [rows] = await this.pool.execute(sql, [startegy_name]);

      if (Array.isArray(rows) && rows.length > 0) {
        return (rows[0] as any).id;
      }

      return null;
    } catch (error) {
      this.logger.error(
        `Error searching ID in table "city"`,
        error.message,
      );
      throw error;
    }
  }

}
