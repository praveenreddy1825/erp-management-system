import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
    email: {
        type: String,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'please provide a valid email address'
        ]
    },
    phone_number: {
        type: String,
        trim: true,
        match: [
            /^\+?[1-9]\d{1,14}$/,
            'please provide a valid phone number'
        ]
    },
    address: {
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        zip: { type: String },
        country: { type: String, trim: true }
    }
}, {
    timestamps: true
});

const Contact = mongoose.model('Contact', contactSchema);
export default Contact;
