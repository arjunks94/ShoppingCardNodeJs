const { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017';
const dbName = 'Shopping';

let db;

const connectToDatabase = async (done) => {
  if (db) {
    return done(null, db);
  }

  try {
    const client = await MongoClient.connect(url);
    db = client.db(dbName);
    done(null, db);
  } catch (err) {
    done(err);
  }
};

module.exports = { connectToDatabase, get: () => db };
