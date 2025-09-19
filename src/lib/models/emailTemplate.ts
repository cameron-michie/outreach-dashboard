import { ObjectId, InsertOneResult, UpdateResult, DeleteResult } from 'mongodb';
import { getCollection, COLLECTIONS } from '../db';
import { EmailTemplate } from '@/types';

export interface EmailTemplateDocument extends Omit<EmailTemplate, '_id'> {
  _id?: ObjectId;
}

export class EmailTemplateModel {
  static async create(
    templateData: Omit<EmailTemplate, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<InsertOneResult<EmailTemplateDocument>> {
    const collection = await getCollection<EmailTemplateDocument>(COLLECTIONS.EMAIL_TEMPLATES);
    const now = new Date();

    const template: EmailTemplateDocument = {
      ...templateData,
      createdAt: now,
      updatedAt: now,
    };

    return await collection.insertOne(template);
  }

  static async findById(id: string | ObjectId): Promise<EmailTemplate | null> {
    const collection = await getCollection<EmailTemplateDocument>(COLLECTIONS.EMAIL_TEMPLATES);
    const template = await collection.findOne({ _id: new ObjectId(id) });

    if (!template) return null;

    return {
      ...template,
      _id: template._id!.toString(),
    };
  }

  static async findByName(name: string): Promise<EmailTemplate | null> {
    const collection = await getCollection<EmailTemplateDocument>(COLLECTIONS.EMAIL_TEMPLATES);
    const template = await collection.findOne({ name });

    if (!template) return null;

    return {
      ...template,
      _id: template._id!.toString(),
    };
  }

  static async findDefault(): Promise<EmailTemplate | null> {
    const collection = await getCollection<EmailTemplateDocument>(COLLECTIONS.EMAIL_TEMPLATES);
    const template = await collection.findOne({ isDefault: true });

    if (!template) return null;

    return {
      ...template,
      _id: template._id!.toString(),
    };
  }

  static async findAll(filter: Partial<EmailTemplate> = {}): Promise<EmailTemplate[]> {
    const collection = await getCollection<EmailTemplateDocument>(COLLECTIONS.EMAIL_TEMPLATES);
    const templates = await collection.find(filter).sort({ isDefault: -1, name: 1 }).toArray();

    return templates.map(template => ({
      ...template,
      _id: template._id!.toString(),
    }));
  }

  static async update(
    id: string | ObjectId,
    updates: Partial<Omit<EmailTemplate, '_id' | 'createdAt'>>
  ): Promise<UpdateResult> {
    const collection = await getCollection<EmailTemplateDocument>(COLLECTIONS.EMAIL_TEMPLATES);

    const updateDoc = {
      ...updates,
      updatedAt: new Date(),
    };

    return await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );
  }

  static async setAsDefault(id: string | ObjectId): Promise<void> {
    const collection = await getCollection<EmailTemplateDocument>(COLLECTIONS.EMAIL_TEMPLATES);

    // First, unset all other templates as default
    await collection.updateMany(
      { _id: { $ne: new ObjectId(id) } },
      { $set: { isDefault: false, updatedAt: new Date() } }
    );

    // Then set this template as default
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isDefault: true, updatedAt: new Date() } }
    );
  }

  static async delete(id: string | ObjectId): Promise<DeleteResult> {
    const collection = await getCollection<EmailTemplateDocument>(COLLECTIONS.EMAIL_TEMPLATES);
    return await collection.deleteOne({ _id: new ObjectId(id) });
  }
}

export { EmailTemplateModel };