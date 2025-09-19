import { ObjectId, InsertOneResult, UpdateResult, DeleteResult } from 'mongodb';
import { getCollection, COLLECTIONS } from '../db';
import { User } from '@/types';
import { isAblyEmail } from '../utils';

export interface UserDocument extends Omit<User, '_id'> {
  _id?: ObjectId;
}

export class UserModel {
  static async create(userData: Omit<User, '_id' | 'createdAt' | 'updatedAt'>): Promise<InsertOneResult<UserDocument>> {
    if (!isAblyEmail(userData.email)) {
      throw new Error('Email must be from @ably.com domain');
    }

    const collection = await getCollection<UserDocument>(COLLECTIONS.USERS);
    const now = new Date();

    const user: UserDocument = {
      ...userData,
      createdAt: now,
      updatedAt: now,
    };

    return await collection.insertOne(user);
  }

  static async findById(id: string | ObjectId): Promise<User | null> {
    const collection = await getCollection<UserDocument>(COLLECTIONS.USERS);
    const user = await collection.findOne({ _id: new ObjectId(id) });

    if (!user) return null;

    return {
      ...user,
      _id: user._id!.toString(),
    };
  }

  static async findByEmail(email: string): Promise<User | null> {
    const collection = await getCollection<UserDocument>(COLLECTIONS.USERS);
    const user = await collection.findOne({ email });

    if (!user) return null;

    return {
      ...user,
      _id: user._id!.toString(),
    };
  }

  static async findByGoogleId(googleId: string): Promise<User | null> {
    const collection = await getCollection<UserDocument>(COLLECTIONS.USERS);
    const user = await collection.findOne({ googleId });

    if (!user) return null;

    return {
      ...user,
      _id: user._id!.toString(),
    };
  }

  static async findAll(filter: Partial<User> = {}): Promise<User[]> {
    const collection = await getCollection<UserDocument>(COLLECTIONS.USERS);
    const users = await collection.find(filter).toArray();

    return users.map(user => ({
      ...user,
      _id: user._id!.toString(),
    }));
  }

  static async update(id: string | ObjectId, updates: Partial<Omit<User, '_id' | 'createdAt'>>): Promise<UpdateResult> {
    const collection = await getCollection<UserDocument>(COLLECTIONS.USERS);

    const updateDoc = {
      ...updates,
      updatedAt: new Date(),
    };

    return await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );
  }

  static async delete(id: string | ObjectId): Promise<DeleteResult> {
    const collection = await getCollection<UserDocument>(COLLECTIONS.USERS);
    return await collection.deleteOne({ _id: new ObjectId(id) });
  }

  static async isAdmin(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user?.role === 'admin';
  }
}

export { UserModel };