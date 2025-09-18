import { ObjectId, InsertOneResult, UpdateResult, DeleteResult } from 'mongodb';
import { getCollection, COLLECTIONS } from '../db';
import { EmailCampaign, EmailSequence } from '@/types';

export interface EmailCampaignDocument extends Omit<EmailCampaign, '_id'> {
  _id?: ObjectId;
}

export class EmailCampaignModel {
  static async create(
    campaignData: Omit<EmailCampaign, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<InsertOneResult<EmailCampaignDocument>> {
    const collection = await getCollection<EmailCampaignDocument>(COLLECTIONS.EMAIL_CAMPAIGNS);
    const now = new Date();

    const campaign: EmailCampaignDocument = {
      ...campaignData,
      createdAt: now,
      updatedAt: now,
    };

    return await collection.insertOne(campaign);
  }

  static async findById(id: string | ObjectId): Promise<EmailCampaign | null> {
    const collection = await getCollection<EmailCampaignDocument>(COLLECTIONS.EMAIL_CAMPAIGNS);
    const campaign = await collection.findOne({ _id: new ObjectId(id) });

    if (!campaign) return null;

    return {
      ...campaign,
      _id: campaign._id!.toString(),
    };
  }

  static async findByCompany(companyName: string): Promise<EmailCampaign[]> {
    const collection = await getCollection<EmailCampaignDocument>(COLLECTIONS.EMAIL_CAMPAIGNS);
    const campaigns = await collection.find({ companyName }).toArray();

    return campaigns.map(campaign => ({
      ...campaign,
      _id: campaign._id!.toString(),
    }));
  }

  static async findByAssignee(assignedTo: string): Promise<EmailCampaign[]> {
    const collection = await getCollection<EmailCampaignDocument>(COLLECTIONS.EMAIL_CAMPAIGNS);
    const campaigns = await collection.find({ assignedTo }).toArray();

    return campaigns.map(campaign => ({
      ...campaign,
      _id: campaign._id!.toString(),
    }));
  }

  static async findByStatus(status: EmailCampaign['status']): Promise<EmailCampaign[]> {
    const collection = await getCollection<EmailCampaignDocument>(COLLECTIONS.EMAIL_CAMPAIGNS);
    const campaigns = await collection.find({ status }).toArray();

    return campaigns.map(campaign => ({
      ...campaign,
      _id: campaign._id!.toString(),
    }));
  }

  static async findAll(filter: Partial<EmailCampaign> = {}): Promise<EmailCampaign[]> {
    const collection = await getCollection<EmailCampaignDocument>(COLLECTIONS.EMAIL_CAMPAIGNS);
    const campaigns = await collection.find(filter).sort({ createdAt: -1 }).toArray();

    return campaigns.map(campaign => ({
      ...campaign,
      _id: campaign._id!.toString(),
    }));
  }

  static async update(
    id: string | ObjectId,
    updates: Partial<Omit<EmailCampaign, '_id' | 'createdAt'>>
  ): Promise<UpdateResult> {
    const collection = await getCollection<EmailCampaignDocument>(COLLECTIONS.EMAIL_CAMPAIGNS);

    const updateDoc = {
      ...updates,
      updatedAt: new Date(),
    };

    return await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );
  }

  static async updateEmailStatus(
    campaignId: string | ObjectId,
    emailNumber: number,
    updates: Partial<EmailSequence>
  ): Promise<UpdateResult> {
    const collection = await getCollection<EmailCampaignDocument>(COLLECTIONS.EMAIL_CAMPAIGNS);

    const updateDoc: Record<string, unknown> = {};
    Object.keys(updates).forEach(key => {
      updateDoc[`emails.${emailNumber - 1}.${key}`] = updates[key as keyof EmailSequence];
    });

    updateDoc.updatedAt = new Date();

    return await collection.updateOne(
      { _id: new ObjectId(campaignId) },
      { $set: updateDoc }
    );
  }

  static async delete(id: string | ObjectId): Promise<DeleteResult> {
    const collection = await getCollection<EmailCampaignDocument>(COLLECTIONS.EMAIL_CAMPAIGNS);
    return await collection.deleteOne({ _id: new ObjectId(id) });
  }

  static async getEmailsDueToday(): Promise<EmailCampaign[]> {
    const collection = await getCollection<EmailCampaignDocument>(COLLECTIONS.EMAIL_CAMPAIGNS);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const campaigns = await collection.find({
      'emails.scheduledDate': {
        $gte: today,
        $lt: tomorrow,
      },
      'emails.status': { $in: ['scheduled', 'approved'] },
    }).toArray();

    return campaigns.map(campaign => ({
      ...campaign,
      _id: campaign._id!.toString(),
    }));
  }

  static async getPendingApprovals(): Promise<EmailCampaign[]> {
    const collection = await getCollection<EmailCampaignDocument>(COLLECTIONS.EMAIL_CAMPAIGNS);
    const campaigns = await collection.find({
      'emails.status': 'pending_approval',
    }).toArray();

    return campaigns.map(campaign => ({
      ...campaign,
      _id: campaign._id!.toString(),
    }));
  }
}