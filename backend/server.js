import dotenv from 'dotenv';
import connectDB from './config/db.js';
import app from './app.js';

// Configure dotenv variables
dotenv.config();

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 9999;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Database connected to ${process.env.MONGO_URI}`);
});
