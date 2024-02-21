import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const dbInstance = await mongoose.connect(
            `${process.env.MONGO_URL}/${DB_NAME}`
        );
        console.log(
            `\n MongoDB connected !! DB Host: ${dbInstance.connection.host}`
        );
    } catch (error) {
        console.log("MongoDB connection failed!!", error);
        process.exit(1);
    }
};

export default connectDB;
