import { MongoClient, type Collection } from 'mongodb';

type ChatMessageDocument = {
  conversationId: string;
  visitorEmail: string | null;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
};

const RETENTION_SECONDS = 180 * 24 * 60 * 60;

let clientPromise: Promise<{ client: MongoClient; databaseName: string }> | null = null;
let indexesPromise: Promise<void> | null = null;

export function getMongoUriDatabaseName(uri: string, parsedDatabaseName: string): string | undefined {
  let hasDatabasePath: boolean;
  try {
    hasDatabasePath = new URL(uri).pathname.replace(/^\/+/, '').length > 0;
  } catch {
    throw new Error('MONGODB_URI is invalid; check its format and database path.');
  }
  return hasDatabasePath ? parsedDatabaseName : undefined;
}

export function resolveMongoDatabaseName(configuredName?: string, uriDatabaseName?: string): string {
  const databaseName = configuredName?.trim() || uriDatabaseName?.trim() || 'portfolio';
  if (databaseName.includes('.')) {
    throw new Error('Invalid MongoDB database name: the selected name contains ".". Check MONGODB_DATABASE or the database path in MONGODB_URI.');
  }
  return databaseName;
}

async function getChatCollection(): Promise<Collection<ChatMessageDocument>> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error('MONGODB_URI is not configured');

  if (!clientPromise) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    const uriDatabaseName = getMongoUriDatabaseName(uri, client.options.dbName);
    const databaseName = resolveMongoDatabaseName(process.env.MONGODB_DATABASE, uriDatabaseName);
    clientPromise = client.connect().then(() => ({ client, databaseName })).catch((error) => {
      clientPromise = null;
      throw error;
    });
  }

  const { client, databaseName } = await clientPromise;
  const collectionName = process.env.MONGODB_CHAT_COLLECTION?.trim() || 'chats';
  return client.db(databaseName).collection<ChatMessageDocument>(collectionName);
}

async function ensureChatIndexes(collection: Collection<ChatMessageDocument>) {
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      collection.createIndex(
        { conversationId: 1, createdAt: 1, _id: 1 },
        { name: 'chat_conversation_order' },
      ),
      collection.createIndex(
        { visitorEmail: 1, createdAt: -1 },
        { name: 'chat_visitor_email' },
      ),
      collection.createIndex(
        { createdAt: 1 },
        { name: 'chat_expire_after_180_days', expireAfterSeconds: RETENTION_SECONDS },
      ),
    ]).then(() => undefined).catch((error) => {
      indexesPromise = null;
      throw error;
    });
  }
  await indexesPromise;
}

export async function storeChatTurn(
  conversationId: string,
  visitorEmail: string | null,
  userMessage: string,
  assistantReply: string,
) {
  const collection = await getChatCollection();
  await ensureChatIndexes(collection);

  await collection.insertMany([
    {
      conversationId,
      visitorEmail,
      role: 'user',
      content: userMessage,
      createdAt: new Date(),
    },
    {
      conversationId,
      visitorEmail,
      role: 'assistant',
      content: assistantReply,
      createdAt: new Date(),
    },
  ]);
}
