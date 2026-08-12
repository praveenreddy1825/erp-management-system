import mongoose from 'mongoose'
const supplierSchema=new mongoose.Schema({
    name:{
        type:String,
        required:[true,'Please add supplier company name'],
        trim:true   ,
    },
    contactInfo: { // Reference to the Contact model
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact',
        required:[true,'Please enter contact info'] // Optional for Customer
    }

},
{
    timestamps:true,
});
const Supplier=mongoose.model('Supplier',supplierSchema);
export default Supplier;
