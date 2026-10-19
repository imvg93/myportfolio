/** @jest-environment node */

import { MongoClient } from 'mongodb';
import { getMongoUriDatabaseName, resolveMongoDatabaseName } from './mongodb';

describe('MongoDB database name selection', () => {
  it('uses a valid explicit MONGODB_DATABASE override', () => {
    expect(resolveMongoDatabaseName('portfolio', 'from-uri')).toBe('portfolio');
  });

  it('uses the MongoDB driver parsed URI database when no override is set', () => {
    const uri = 'mongodb+srv://user:password@cluster.example.net/portfolio?retryWrites=true&authSource=admin';
    const client = new MongoClient(uri);

    expect(getMongoUriDatabaseName(uri, client.options.dbName)).toBe('portfolio');
    expect(resolveMongoDatabaseName(undefined, client.options.dbName)).toBe('portfolio');
  });

  it('uses the existing portfolio default when URI has no database path', () => {
    const uri = 'mongodb://cluster.example.net/?retryWrites=true';
    const client = new MongoClient(uri);
    const uriDatabase = getMongoUriDatabaseName(uri, client.options.dbName);

    expect(uriDatabase).toBeUndefined();
    expect(resolveMongoDatabaseName(undefined, uriDatabase)).toBe('portfolio');
  });

  it('rejects a dotted configured database name with a safe error', () => {
    expect(() => resolveMongoDatabaseName('cluster0.example.mongodb.net')).toThrow(
      'Invalid MongoDB database name: the selected name contains ".". Check MONGODB_DATABASE or the database path in MONGODB_URI.',
    );
  });

  it('rejects a dotted database name parsed from the URI', () => {
    expect(() => resolveMongoDatabaseName(undefined, 'portfolio.backup')).toThrow(/contains "."/);
  });
});
