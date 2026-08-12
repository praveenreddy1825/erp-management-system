import mongoose from 'mongoose';
import Customer from './Customer.js';
const salesOrderSchema=new mongoose.Schema({
    customer:{
        //Customer name referencing from customer model
        type:mongoose.Schema.Types.ObjectId,
        ref:'Customer',
        required:[true,'Please Provide Customer Name']
    },
    //storing products inthe form of array of objects.
    // for a customer as per his sales order.
    products:[{
        //products refering from products model.
        product:{
                    type:mongoose.Schema.Types.ObjectId,
                    ref:'Product',
                },
        quantity:{
            type:Number,
            required:true,
            min:[1,"Enter Valid quantity"]
                },
                price:{//it is good to enter sale
                    type:Number,
                    required:true,
                    min:[0,"Enter Valid price"] 
                }
}],
TotalAmount:{
    type:Number,
    required:true,
    default:0,
},  
status:{
        type:String,
        enum:['Pending','Processing','Shipped','Delivered','Cancelled'],
        default:'Pending'
    },
    paymentStatus:{
        //status of payment
        type:String,
        enum:['Paid','unpaid','partial'],
        default:'unpaid'
    },
        DateOfOrder:{
            type:Date,
            default:Date.now,
        },
        remarks: { // Added remarks for bill/order notes
        type: String,
        trim: true
    },
        createdBy:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'User',
            required:true,
        }   
},
{
    timestamps:true
})
salesOrderSchema.pre('save', async function() {
    this.TotalAmount = this.products.reduce((total, item) => {
        return total + (item.quantity * item.price);
    }, 0);
});
    const SalesOrder=mongoose.model('SalesOrder',salesOrderSchema);
    export default SalesOrder;