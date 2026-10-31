const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error("Error: MONGO_URI is not defined in environment variables!");
    process.exit(1);
  }

  const connectWithRetry = async (retryCount = 0) => {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 15000,
        tls: true,
        tlsAllowInvalidCertificates: true
      });
      console.log(`MongoDB Connected to Cloud Atlas: ${conn.connection.host}/${conn.connection.name}`);
    } catch (error) {
      console.error(`MongoDB Atlas Connection Error (attempt ${retryCount + 1}):`, error.message);
      if (retryCount < 5) {
        console.log("Retrying MongoDB connection in 3 seconds...");
        setTimeout(() => connectWithRetry(retryCount + 1), 3000);
      } else {
        console.error("MongoDB Atlas: Max retry attempts reached. Please verify internet and Atlas IP Whitelist (0.0.0.0/0).");
      }
    }
  };

  connectWithRetry();
};

module.exports = connectDB;
