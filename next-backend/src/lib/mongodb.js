
import dns from "node:dns";
import { MongoClient } from "mongodb";

// Use Google's DNS for MongoDB Atlas SRV lookup
dns.setServers(["8.8.8.8"]);

const options = {};
let globalClientPromise;

export function getClientPromise() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Please set MONGODB_URI in .env.local");
  }

  if (process.env.NODE_ENV === "development") {
    if (!globalClientPromise) {
      const client = new MongoClient(uri, options);
      globalClientPromise = client.connect();
    }
    return globalClientPromise;
  } else {
    const client = new MongoClient(uri, options);
    return client.connect();
  }
}
