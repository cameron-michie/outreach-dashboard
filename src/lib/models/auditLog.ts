import { ObjectId, InsertOneResult } from 'mongodb';
import { getCollection, COLLECTIONS } from '../db';
import { AuditLog } from '@/types';

export interface AuditLogDocument extends Omit<AuditLog, '_id'> {
  _id?: ObjectId;
}

export class AuditLogModel {
  static async create(
    logData: Omit<AuditLog, '_id' | 'timestamp'>
  ): Promise<InsertOneResult<AuditLogDocument>> {
    const collection = await getCollection<AuditLogDocument>(COLLECTIONS.AUDIT_LOGS);

    const log: AuditLogDocument = {
      ...logData,
      timestamp: new Date(),
    };

    return await collection.insertOne(log);
  }

  static async findByUser(userId: string, limit = 100): Promise<AuditLog[]> {
    const collection = await getCollection<AuditLogDocument>(COLLECTIONS.AUDIT_LOGS);
    const logs = await collection
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return logs.map(log => ({
      ...log,
      _id: log._id!.toString(),
    }));
  }

  static async findByEntity(
    entityType: AuditLog['entityType'],
    entityId: string,
    limit = 50
  ): Promise<AuditLog[]> {
    const collection = await getCollection<AuditLogDocument>(COLLECTIONS.AUDIT_LOGS);
    const logs = await collection
      .find({ entityType, entityId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return logs.map(log => ({
      ...log,
      _id: log._id!.toString(),
    }));
  }

  static async findRecent(limit = 100): Promise<AuditLog[]> {
    const collection = await getCollection<AuditLogDocument>(COLLECTIONS.AUDIT_LOGS);
    const logs = await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return logs.map(log => ({
      ...log,
      _id: log._id!.toString(),
    }));
  }

  static async findByDateRange(
    startDate: Date,
    endDate: Date,
    limit = 1000
  ): Promise<AuditLog[]> {
    const collection = await getCollection<AuditLogDocument>(COLLECTIONS.AUDIT_LOGS);
    const logs = await collection
      .find({
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return logs.map(log => ({
      ...log,
      _id: log._id!.toString(),
    }));
  }

  // Helper method to log common actions
  static async logAction(
    userId: string,
    action: string,
    entityType: AuditLog['entityType'],
    entityId: string,
    details: Record<string, unknown> = {}
  ): Promise<InsertOneResult<AuditLogDocument>> {
    return await this.create({
      userId,
      action,
      entityType,
      entityId,
      details,
    });
  }

  // Common audit log actions
  static async logCampaignCreated(
    userId: string,
    campaignId: string,
    campaignData: Record<string, unknown>
  ): Promise<InsertOneResult<AuditLogDocument>> {
    return await this.logAction(
      userId,
      'campaign_created',
      'campaign',
      campaignId,
      campaignData
    );
  }

  static async logEmailSent(
    userId: string,
    campaignId: string,
    emailDetails: Record<string, unknown>
  ): Promise<InsertOneResult<AuditLogDocument>> {
    return await this.logAction(
      userId,
      'email_sent',
      'email',
      campaignId,
      emailDetails
    );
  }

  static async logEmailApproved(
    userId: string,
    campaignId: string,
    emailNumber: number
  ): Promise<InsertOneResult<AuditLogDocument>> {
    return await this.logAction(
      userId,
      'email_approved',
      'email',
      campaignId,
      { emailNumber }
    );
  }

  static async logTemplateCreated(
    userId: string,
    templateId: string,
    templateData: Record<string, unknown>
  ): Promise<InsertOneResult<AuditLogDocument>> {
    return await this.logAction(
      userId,
      'template_created',
      'template',
      templateId,
      templateData
    );
  }
}