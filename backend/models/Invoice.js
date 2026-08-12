import mongoose from 'mongoose'
const invoiceSchema=new mongoose.Schema({
     invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      default: function () {
        return `INV-${Date.now()}`;
      },
    },
    salesOrder:{
      type:mongoose.Schema.Types.ObjectId,
      ref:'SalesOrder',
      required:[true,'please provide sales order']
    },
    remarks: {
      type: String,
      trim: true,
    }
},
{
    timestamps: true, // This automatically provides 'createdAt' as the invoice issuance date
  })
const Invoice=mongoose.model('Invoice',invoiceSchema)
export default Invoice