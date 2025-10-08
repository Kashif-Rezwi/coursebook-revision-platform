import { Model, Document, FilterQuery } from 'mongoose';
import ApiError from '../utils/apiError';
import logger from '../utils/logger';

export interface RepositoryFilters {
  limit?: number;
  skip?: number;
  sortBy?: string;
  [key: string]: any;
}

export interface RepositoryResult<T> {
  items: T[];
  total: number;
  limit: number;
  skip: number;
}

/**
 * Base repository class for data access operations
 * Separates data access from business logic
 */
export abstract class BaseRepository<T extends Document> {
  protected model: Model<T>;
  protected modelName: string;

  constructor(model: Model<T>, modelName: string) {
    this.model = model;
    this.modelName = modelName;
  }

  /**
   * Find by ID with user ownership
   */
  async findById(id: string, userId: string): Promise<T | null> {
    try {
      return await this.model.findOne({ _id: id, userId } as FilterQuery<T>);
    } catch (error: any) {
      if (error.name === 'CastError') {
        throw ApiError.badRequest(`Invalid ${this.modelName} ID`, 'INVALID_ID');
      }
      throw error;
    }
  }

  /**
   * Find many with pagination
   */
  async findMany(userId: string, filters: RepositoryFilters = {}): Promise<RepositoryResult<T>> {
    try {
      const { limit = 50, skip = 0, sortBy = '-createdAt', ...queryFilters } = filters;

      const query = this.model.find({ userId, ...queryFilters } as FilterQuery<T>)
        .sort(sortBy)
        .limit(parseInt(limit.toString()))
        .skip(parseInt(skip.toString()));

      const [items, total] = await Promise.all([
        query.exec(),
        this.model.countDocuments({ userId, ...queryFilters } as FilterQuery<T>)
      ]);

      return {
        items: items as T[],
        total,
        limit: parseInt(limit.toString()),
        skip: parseInt(skip.toString())
      };
    } catch (error) {
      logger.error(`Repository findMany failed for ${this.modelName}:`, error);
      throw ApiError.internal(`Failed to retrieve ${this.modelName}s`, 'RETRIEVAL_ERROR');
    }
  }

  /**
   * Create new document
   */
  async create(data: any): Promise<T> {
    try {
      return await this.model.create(data);
    } catch (error) {
      logger.error(`Repository create failed for ${this.modelName}:`, error);
      throw ApiError.internal(`Failed to create ${this.modelName}`, 'CREATE_ERROR');
    }
  }

  /**
   * Update by ID
   */
  async updateById(id: string, userId: string, updateData: any): Promise<T | null> {
    try {
      return await this.model.findOneAndUpdate(
        { _id: id, userId } as FilterQuery<T>,
        { $set: updateData },
        { new: true, runValidators: true }
      );
    } catch (error: any) {
      if (error.name === 'CastError') {
        throw ApiError.badRequest(`Invalid ${this.modelName} ID`, 'INVALID_ID');
      }
      throw error;
    }
  }

  /**
   * Delete by ID
   */
  async deleteById(id: string, userId: string): Promise<T | null> {
    try {
      return await this.model.findOneAndDelete({ _id: id, userId } as FilterQuery<T>);
    } catch (error: any) {
      if (error.name === 'CastError') {
        throw ApiError.badRequest(`Invalid ${this.modelName} ID`, 'INVALID_ID');
      }
      throw error;
    }
  }

  /**
   * Count documents
   */
  async count(userId: string, filters: any = {}): Promise<number> {
    try {
      return await this.model.countDocuments({ userId, ...filters } as FilterQuery<T>);
    } catch (error) {
      logger.error(`Repository count failed for ${this.modelName}:`, error);
      return 0;
    }
  }

  /**
   * Check if document exists
   */
  async exists(id: string, userId: string): Promise<boolean> {
    try {
      const count = await this.model.countDocuments({ _id: id, userId } as FilterQuery<T>);
      return count > 0;
    } catch (error) {
      return false;
    }
  }
}
