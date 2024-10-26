import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redisClient: Redis;

  constructor(private configService: ConfigService) { }

  async onModuleInit() {
    const redisOptions: RedisOptions = {
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      retryStrategy: (times: number) => {
        if (times > 3) {
          this.logger.error('Redis connection failed multiple times');
          return null;
        }
        return Math.min(times * 200, 1000);
      },
    };

    this.redisClient = new Redis(redisOptions);

    this.redisClient.on('connect', () => {
      this.logger.log('Successfully connected to Redis');
    });

    this.redisClient.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.logger.log('Redis connection closed');
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.redisClient.get(key);
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.redisClient.set(key, value, 'EX', ttl);
      } else {
        await this.redisClient.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
    }
  }

  async setHash(key: string, field: string, value: string): Promise<void> {
    try {
      await this.redisClient.hset(key, field, value);
    } catch (error) {
      this.logger.error(`Error setting hash ${key}:${field}:`, error);
    }
  }

  async getHash(key: string, field: string): Promise<string | null> {
    try {
      return await this.redisClient.hget(key, field);
    } catch (error) {
      this.logger.error(`Error getting hash ${key}:${field}:`, error);
      return null;
    }
  }

  async delHash(key: string, field: string): Promise<void> {
    try {
      await this.redisClient.hdel(key, field);
    } catch (error) {
      this.logger.error(`Error deleting hash ${key}:${field}:`, error);
    }
  }

  async setWithExpiry(
    key: string,
    value: string,
    expirySeconds: number,
  ): Promise<void> {
    try {
      await this.redisClient.set(key, value, 'EX', expirySeconds);
    } catch (error) {
      this.logger.error(`Error setting key ${key} with expiry:`, error);
    }
  }

  async getKeysByPattern(pattern: string): Promise<string[]> {
    try {
      return await this.redisClient.keys(pattern);
    } catch (error) {
      this.logger.error(`Error getting keys by pattern ${pattern}:`, error);
      return [];
    }
  }

  async deleteKeysByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch (error) {
      this.logger.error(`Error deleting keys by pattern ${pattern}:`, error);
    }
  }


  private async connectToRedis() {
    const redisOptions: RedisOptions = {
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      retryStrategy: (times: number) => {
        if (times > 3) {
          this.logger.error('Redis connection failed multiple times');
          return null;
        }
        const delay = Math.min(times * 1000, 3000);
        this.logger.log(`Retrying Redis connection in ${delay}ms...`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      reconnectOnError: (err) => {
        this.logger.error('Redis reconnectOnError:', err);
        return true;
      },
    };

    this.redisClient = new Redis(redisOptions);

    this.redisClient.on('connect', () => {
      this.logger.log('Successfully connected to Redis');
    });

    this.redisClient.on('ready', () => {
      this.logger.log('Redis client is ready');
    });

    this.redisClient.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    this.redisClient.on('close', () => {
      this.logger.warn('Redis connection closed');
    });

    this.redisClient.on('reconnecting', () => {
      this.logger.log('Reconnecting to Redis...');
    });

    // Test the connection
    try {
      await this.redisClient.ping();
      this.logger.log('Redis connection test successful');
    } catch (error) {
      this.logger.error('Redis connection test failed:', error);
    }
  }


}
