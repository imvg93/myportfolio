import { MongoClient, type Collection } from 'mongodb';

type ChatMessageDocument = {
  conversationId: string;
  visitorEmail: string | null;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
};

const RETENTION_SECONDS = 180 * 24 * 60 * 60;

let clientPromise: Promise<MongoClient> | null = null;
let indexesPromise: Promise<void> | null = null;

async function getChatCollection(): Promise<Collection<ChatMessageDocument>> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error('MONGODB_URI is not configured');

  if (!clientPromise) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    clientPromise = client.connect().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }

  const client = await clientPromise;
  // The MongoDB driver reports "test" as dbName when the URI has no database
  // path. Detect an actual URI path so the app defaults to portfolio instead.
  const authorityStart = uri.indexOf('://') + 3;
  const pathStart = uri.indexOf('/', authorityStart);
  const uriDatabase = pathStart < 0
    ? ''
    : decodeURIComponent(uri.slice(pathStart + 1).split(/[/?]/, 1)[0] || '');
  const databaseName = process.env.MONGODB_DATABASE?.trim() || uriDatabase || 'portfolio';
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
