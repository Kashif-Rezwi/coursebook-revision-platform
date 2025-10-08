import fs from 'fs';
import { logger } from './logger';
import { ApiError } from './apiError';

/**
 * Delete file from filesystem
 * @param filePath - Path to the file to delete
 * @returns boolean - True if file was deleted, false if file didn't exist
 */
export const deleteFile = (filePath: string): boolean => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`File deleted: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    logger.error('File deletion failed:', error);
    throw ApiError.internal('Failed to delete file', 'FILE_DELETE_ERROR');
  }
};

/**
 * Get file size in bytes
 * @param filePath - Path to the file
 * @returns number - File size in bytes, 0 if file doesn't exist
 */
export const getFileSize = (filePath: string): number => {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    logger.error('Failed to get file size:', error);
    return 0;
  }
};

/**
 * Check if file exists
 * @param filePath - Path to the file
 * @returns boolean - True if file exists, false otherwise
 */
export const fileExists = (filePath: string): boolean => {
  return fs.existsSync(filePath);
};

/**
 * Create directory if it doesn't exist
 * @param dirPath - Path to the directory
 */
export const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`Directory created: ${dirPath}`);
  }
};
