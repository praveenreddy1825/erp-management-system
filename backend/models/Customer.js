import mongoose from 'mongoose';
const customerSchema=new mongoose.Schema({
name:{
   type:String,
   required:[true,'please provide your name'],
   trim:true, 
},
contactInfo: { // Reference to the Contact model
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact',
        required: false // Optional for Customer
    }

},
{
    timestamps:true,
});
 
const Customer=mongoose.model('Customer',customerSchema);
export default Customer;