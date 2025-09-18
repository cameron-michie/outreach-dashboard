import { MongoClient, Db, Collection } from 'mongodb';
import { env } from './env';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(env.mongodb.uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(env.mongodb.uri);
  clientPromise = client.connect();
}

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db(env.mongodb.dbName);
}

export async function getCollection<T = Document>(
  collectionName: string
): Promise<Collection<T>> {
  const db = await getDatabase();
  return db.collection<T>(collectionName);
}

// Collection name constants
export const COLLECTIONS = {
  USERS: 'users',
  EMAIL_CAMPAIGNS: 'email_campaigns',
  EMAIL_TEMPLATES: 'email_templates',
  AUDIT_LOGS: 'audit_logs',
} as const;

export default clientPromise;