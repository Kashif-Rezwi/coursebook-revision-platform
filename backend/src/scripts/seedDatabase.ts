import path from 'path';
import fs from 'fs';
import { connectDB, disconnectDB } from '../config/database';
import { User, PDF, Progress } from '../models';
import { logger } from '../utils/logger';

const seedDatabase = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDB();

    // Create admin user if not exists
    let adminUser = await User.findOne({ email: 'admin@example.com' });
    
    if (!adminUser) {
      adminUser = await User.create({
        email: 'admin@example.com',
        password: 'Admin@123',
        name: 'Admin User',
        role: 'admin'
      });
      logger.info('Admin user created successfully');
    } else {
      logger.info('Admin user already exists');
    }

    // Load seed data
    const seedDataPath = path.join(__dirname, '../../seeds/ncert-pdfs.json');
    const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));

    // Insert PDFs
    let insertedCount = 0;
    let skippedCount = 0;

    for (const pdfData of seedData) {
      const existingPDF = await PDF.findOne({ filename: pdfData.filename });

      if (!existingPDF) {
        await PDF.create({
          userId: adminUser._id,
          ...pdfData,
          status: 'ready',
          isSeeded: true
        });
        insertedCount++;
        logger.info(`Inserted PDF: ${pdfData.originalName}`);
      } else {
        skippedCount++;
        logger.info(`Skipped existing PDF: ${pdfData.originalName}`);
      }
    }

    // Create or update Progress for admin user
    let progress = await Progress.findOne({ userId: adminUser._id });
    
    if (!progress) {
      progress = await Progress.create({
        userId: adminUser._id,
        recentActivity: [{
          type: 'pdf_uploaded',
          description: 'Seeded NCERT Physics PDFs',
          timestamp: new Date()
        }]
      });
      logger.info('Progress document created for admin user');
    } else {
      logger.info('Progress document already exists for admin user');
    }

    logger.info(`\n=== Seed Summary ===`);
    logger.info(`Inserted: ${insertedCount} PDFs`);
    logger.info(`Skipped: ${skippedCount} PDFs`);
    logger.info(`Admin User: ${adminUser.email}`);
    logger.info(`====================\n`);

  } catch (error) {
    logger.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

// Run seed
seedDatabase();
