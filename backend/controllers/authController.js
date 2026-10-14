import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import Contact from '../models/Contact.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
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
// @desc    Auth user/login and set token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        supplierProfile: user.supplierProfile || null,
        mustChangePassword: Boolean(user.mustChangePassword),
        token: generateToken(user._id, user.role),
      });
    } else {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/auth/users
// @access  Private (Admin)
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}, '-password').populate('supplierProfile', 'name');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin creates internal manager/staff account
// @route   POST /api/auth/users
// @access  Private (Admin)
export const createInternalUser = async (req, res) => {
  try {
    const { name, email, password, phone_number, role } = req.body;

    const allowedRoles = ['Purchase_Manager', 'Sales_Manager', 'Admin', 'Inventory_Manager'];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({
        message: `Invalid role. Allowed roles are: ${allowedRoles.join(', ')}`,
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: 'A user with this email address already exists' });
    }

    const tempPassword = password || 'TempPass@2026';
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: tempPassword,
      phone_number: phone_number?.trim() || '+910000000000',
      role,
      mustChangePassword: true,
    });

    res.status(201).json({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      mustChangePassword: newUser.mustChangePassword,
      message: 'Internal user account provisioned successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to create internal user' });
  }
};

// @desc    Admin provisions linked supplier login account
// @route   POST /api/auth/supplier-account
// @access  Private (Admin)
export const createSupplierAccount = async (req, res) => {
  try {
    const { supplierId, email, password, name, phone_number } = req.body;
    if (!supplierId) {
      return res.status(400).json({ message: 'Supplier business record ID is required' });
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier business record not found' });
    }

    if (supplier.userAccount) {
      const existingUser = await User.findById(supplier.userAccount);
      if (existingUser) {
        return res.status(400).json({
          message: `Supplier "${supplier.name}" already has a linked login account (${existingUser.email})`,
        });
      }
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingAccount = await User.findOne({ email: normalizedEmail });
    if (existingAccount) {
      return res.status(400).json({ message: 'An account with this email address already exists' });
    }

    const tempPassword = password || 'SupplierPass@2026';
    const supplierUser = await User.create({
      name: (name || supplier.name).trim(),
      email: normalizedEmail,
      password: tempPassword,
      phone_number: phone_number?.trim() || '+910000000000',
      role: 'Supplier',
      supplierProfile: supplier._id,
      mustChangePassword: true,
    });

    supplier.userAccount = supplierUser._id;
    await supplier.save();

    res.status(201).json({
      _id: supplierUser._id,
      name: supplierUser.name,
      email: supplierUser.email,
      role: supplierUser.role,
      supplierProfile: supplier._id,
      message: `Supplier portal account successfully provisioned for ${supplier.name}`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to provision supplier account' });
  }
};

// @desc    User changes their own password
// @route   PUT /api/auth/change-password
// @access  Private (All authenticated roles)
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current password and new password are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password does not match' });
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.status(200).json({
      message: 'Password changed successfully',
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to change password' });
  }
};