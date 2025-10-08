import { Model, Document, FilterQuery } from 'mongoose';
import ApiError from '../utils/apiError';
import logger from '../utils/logger';

export interface PaginationOptions {
  limit?: number;
  skip?: number;
  sortBy?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  skip: number;
}

export interface DeleteResult {
  message: string;
  id: string;
}

export interface ServiceResult<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface QueryOptions {
  populate?: string | any;
  select?: string;
}

/**
 * Base service class providing common CRUD operations
 * Reduces code duplication across all services
 */
export abstract class BaseService<T extends Document> {
  protected model: Model<T>;
  protected modelName: string;

  constructor(model: Model<T>, modelName: string) {
    this.model = model;
    this.modelName = modelName;
  }

  /**
   * Find entity by ID with user ownership validation
   */
  async findById(id: string, userId: string): Promise<T> {
    try {
      const entity = await this.model.findOne({ _id: id, userId } as FilterQuery<T>);
      if (!entity) {
        throw ApiError.notFound(`${this.modelName} not found`, `${this.modelName.toUpperCase()}_NOT_FOUND`);
      }
      return entity as T;
    } catch (error: any) {
      if (error.name === 'CastError') {
        throw ApiError.badRequest(`Invalid ${this.modelName} ID`, 'INVALID_ID');
      }
      throw error;
    }
  }

  /**
   * Find multiple entities with pagination and filtering
   */
  async findMany(userId: string, filters: any = {}, options: QueryOptions = {}): Promise<PaginatedResult<T>> {
    try {
      const { limit = 50, skip = 0, sortBy = '-createdAt' } = filters;
      const { populate, select } = options;

      let query = this.model.find({ userId, ...filters } as FilterQuery<T>)
        .sort(sortBy)
        .limit(parseInt(limit.toString()))
        .skip(parseInt(skip.toString()));

      if (select) {
        query = query.select(select);
      }

      if (populate) {
        query = query.populate(populate);
      }

      const [items, total] = await Promise.all([
        query.exec(),
        this.model.countDocuments({ userId, ...filters } as FilterQuery<T>)
      ]);

      return {
        items: items as T[],
        total,
        limit: parseInt(limit.toString()),
        skip: parseInt(skip.toString())
      };
    } catch (error) {
      logger.error(`Failed to find ${this.modelName}s:`, error);
      throw ApiError.internal(`Failed to retrieve ${this.modelName}s`, 'RETRIEVAL_ERROR');
    }
  }

  /**
   * Create new entity
   */
  async create(data: any): Promise<T> {
    try {
      const entity = await this.model.create(data);
      logger.info(`${this.modelName} created: ${entity._id}`);
      return entity;
    } catch (error) {
      logger.error(`${this.modelName} creation failed:`, error);
      throw ApiError.internal(`Failed to create ${this.modelName}`, 'CREATE_ERROR');
    }
  }

  /**
   * Update entity by ID
   */
  async update(id: string, userId: string, updateData: any): Promise<T> {
    try {
      const entity = await this.model.findOneAndUpdate(
        { _id: id, userId } as FilterQuery<T>,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!entity) {
        throw ApiError.notFound(`${this.modelName} not found`, `${this.modelName.toUpperCase()}_NOT_FOUND`);
      }

      logger.info(`${this.modelName} updated: ${id}`);
      return entity as T;
    } catch (error: any) {
      if (error.name === 'CastError') {
        throw ApiError.badRequest(`Invalid ${this.modelName} ID`, 'INVALID_ID');
      }
      throw error;
    }
  }

  /**
   * Delete entity by ID
   */
  async remove(id: string, userId: string): Promise<DeleteResult> {
    try {
      const entity = await this.model.findOneAndDelete({ _id: id, userId } as FilterQuery<T>);

      if (!entity) {
        throw ApiError.notFound(`${this.modelName} not found`, `${this.modelName.toUpperCase()}_NOT_FOUND`);
      }

      logger.info(`${this.modelName} deleted: ${id} by user ${userId}`);
      return {
        message: `${this.modelName} deleted successfully`,
        id
      };
    } catch (error: any) {
      if (error.name === 'CastError') {
        throw ApiError.badRequest(`Invalid ${this.modelName} ID`, 'INVALID_ID');
      }
      throw error;
    }
  }

  /**
   * Check if entity exists
   */
  async exists(id: string, userId: string): Promise<boolean> {
    try {
      const count = await this.model.countDocuments({ _id: id, userId } as FilterQuery<T>);
      return count > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Count entities for user
   */
  async count(userId: string, filters: any = {}): Promise<number> {
    try {
      return await this.model.countDocuments({ userId, ...filters } as FilterQuery<T>);
    } catch (error) {
      logger.error(`Failed to count ${this.modelName}s:`, error);
      return 0;
    }
  }
}
