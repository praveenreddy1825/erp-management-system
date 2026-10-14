import User from '../models/User.js'
import generateToken from '../utils/generateToken.js';
import Contact from '../models/Contact.js';
import Customer from '../models/Customer.js';
export const registerUser=async(req,res)=>{
    try{
        const {name,email,password,phone_number,role}=req.body;
        // Public registration cannot grant privileged internal roles
        if (role && role !== 'Customer') {
            return res.status(403).json({ message: 'Public registration for privileged roles is not permitted' });
        }
        const assignedRole = 'Customer';

        //check for existing user
        const userExists=await User.findOne({email});
        if(userExists){
            return res.status(400).json({message:'User already exists'});
        }

        // If Customer is self-registering, check/prevent duplicate email in contact list
        const emailInContacts = await Contact.findOne({ email });
        if (emailInContacts) {
            return res.status(400).json({ message: 'Customer email already registered in system directory' });
        }

        const user=await User.create({
            name,
            email,
            password,
            phone_number,
            role: assignedRole
        });
        if(user){
            // If Customer role, auto-create Customer document and Contact record
            if (assignedRole === 'Customer') {
                const contact = await Contact.create({
                    email,
                    phone_number,
                    address: { street: 'Self-Registered Customer' }
                });
                await Customer.create({
                    name,
                    contactInfo: contact._id
                });
            }

            generateToken(user._id,user.role);
            return res.status(201).json({
                _id:user._id,
                name:user.name,
                email:user.email,
                role:user.role,
                phone_number:user.phone_number,
                token:generateToken(user._id,user.role)
            });
        }
        else{
            return res.status(400).json({message:'Invalid user data'});
        }
    }
    catch(error){
        res.status(500).json({message:error.message});
    }
};
// @descp    Auth user/login and set token
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req, res) => {
    try{
        const { email, password } = req.body;
        const user=await User.findOne({email});
        if(user&&(await user.matchPassword(password))){
            res.json({
                _id:user._id,
                name:user.name,
                email:user.email,
                role:user.role,
                token:generateToken(user._id,user.role)
            });
        }
        else{
            return res.status(401).json({message:'Invalid email or password'});
        }
    }
    catch(error){
        res.status(500).json({message:error.message});
    }
  
    
  };

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private (Admin)
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};