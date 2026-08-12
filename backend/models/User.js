import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:[true,'please provide your name']
    },
    email:{
        type:String,
        required:[true,'please provide your email'],
        unique:true,
        trim:true,
        lowercase:true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'please provide a valid email address'
        ]

    },
    password:{
        type:String,
        required:[true,'please provide your password'],
        validate:{
            validator: function(pass) {
                // Must contain: 1 letter, 1 number, 1 special character, and min 8 characters
                return /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pass);
            },
            message: 'password must be at least 8 characters long and contain at least one letter, one number, and one special character'
        }
    },
        phone_number:{
        type:String,
        required:[true,'please provide your phone number'],
        match: [
            /^\+?[1-9]\d{1,14}$/,
            'please provide a valid phone number'
        ]
    },
    role:{
        type:String,
        enum:['Admin','Customer','Purchase_Manager','Sales_Manager','Inventory_Manager','Supplier'],
        default:'Customer'
    }
},
 {
    timestamps: true 
});
//Hashing password before saving.
userSchema.pre('save',async function(){
    if(!this.isModified('password')){
        return;
    }try{
        const salt=await bcrypt.genSalt(10);
        this.password=await bcrypt.hash(this.password,salt);
    }catch(error){
        console.error(error);
        throw error;    
    }
});
userSchema.methods.matchPassword=async function(enteredPassword){
    return await bcrypt.compare(enteredPassword,this.password);
}   


const User=mongoose.model('User',userSchema);
export default User