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
                    address: { street: 'No details' }
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

    const tempPassword = password || 'Welcome@123';
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

    const tempPassword = password || 'Welcome@123';
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

// @desc    Get role-specific support contact (Customer->SalesManager, Supplier->PurchaseManager, Managers->Admin, Admin->Hidden)
// @route   GET /api/auth/support-contact
// @access  Private (All authenticated roles)
export const getSupportContact = async (req, res) => {
  try {
    const userRole = req.user?.role;

    if (userRole === 'Admin') {
      return res.status(200).json({ hidden: true });
    }

    if (userRole === 'Customer') {
      const salesManager = await User.findOne({ role: 'Sales_Manager' }).select('name email phone_number role');
      return res.status(200).json({
        hidden: false,
        title: 'Sales Contact',
        name: salesManager?.name || 'Vikram Malhotra',
        email: salesManager?.email || 'sales@erp.com',
        phone_number: salesManager?.phone_number || '+91 92123 45678',
        role: 'Sales Manager',
      });
    }

    if (userRole === 'Supplier') {
      const purchaseManager = await User.findOne({ role: 'Purchase_Manager' }).select('name email phone_number role');
      return res.status(200).json({
        hidden: false,
        title: 'Procurement Contact',
        name: purchaseManager?.name || 'Priya Nair',
        email: purchaseManager?.email || 'purchase@erp.com',
        phone_number: purchaseManager?.phone_number || '+91 93123 45678',
        role: 'Purchase Manager',
      });
    }

    if (['Sales_Manager', 'Purchase_Manager', 'Inventory_Manager'].includes(userRole)) {
      const admin = await User.findOne({ role: 'Admin' }).select('name email phone_number role');
      return res.status(200).json({
        hidden: false,
        title: 'System Admin',
        name: admin?.name || 'System Administrator',
        email: admin?.email || 'admin@erp.com',
        phone_number: admin?.phone_number || '+91 91123 45678',
        role: 'System Administrator',
      });
    }

    return res.status(200).json({ hidden: true });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch support contact' });
  }
};

// Legacy alias maintained for existing integrations
export const getSalesContact = async (req, res) => {
  return getSupportContact(req, res);
};

// @desc    Get detailed profile of currently authenticated user with linked contact info
// @route   GET /api/auth/profile
// @access  Private (All authenticated roles)
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    let address = { street: '', city: '', state: '', zip: '', country: '' };
    let linkedBusiness = null;

    if (user.role === 'Customer') {
      const contact = await Contact.findOne({ email: user.email.toLowerCase().trim() });
      if (contact && contact.address) {
        address = {
          street: contact.address.street === 'No details' ? '' : (contact.address.street || ''),
          city: contact.address.city || '',
          state: contact.address.state || '',
          zip: contact.address.zip || '',
          country: contact.address.country || '',
        };
      }
    } else if (user.role === 'Supplier' && user.supplierProfile) {
      const supplier = await Supplier.findById(user.supplierProfile).populate('contactInfo');
      if (supplier) {
        linkedBusiness = supplier.name;
        if (supplier.contactInfo && supplier.contactInfo.address) {
          address = {
            street: supplier.contactInfo.address.street || '',
            city: supplier.contactInfo.address.city || '',
            state: supplier.contactInfo.address.state || '',
            zip: supplier.contactInfo.address.zip || '',
            country: supplier.contactInfo.address.country || '',
          };
        }
      }
    } else {
      // Internal staff / Admin / Managers
      const contact = await Contact.findOne({ email: user.email.toLowerCase().trim() });
      if (contact && contact.address) {
        address = {
          street: contact.address.street || '',
          city: contact.address.city || '',
          state: contact.address.state || '',
          zip: contact.address.zip || '',
          country: contact.address.country || '',
        };
      }
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone_number: user.phone_number || '',
      address,
      linkedBusiness,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch user profile' });
  }
};

// @desc    Update profile of currently authenticated user and synchronize linked contact details
// @route   PUT /api/auth/profile
// @access  Private (All authenticated roles)
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, phone_number, address } = req.body;

    if (name && name.trim()) {
      user.name = name.trim();
    }
    if (phone_number && phone_number.trim()) {
      user.phone_number = phone_number.trim();
    }

    await user.save();

    const normalizedEmail = user.email.toLowerCase().trim();

    // Format address payload
    let formattedAddress = null;
    if (address) {
      if (typeof address === 'string') {
        formattedAddress = { street: address.trim() };
      } else if (typeof address === 'object') {
        formattedAddress = {
          street: (address.street || '').trim(),
          city: (address.city || '').trim(),
          state: (address.state || '').trim(),
          zip: (address.zip || '').trim(),
          country: (address.country || '').trim(),
        };
      }
    }

    // Synchronize linked Customer / Contact record
    if (user.role === 'Customer') {
      let contact = await Contact.findOne({ email: normalizedEmail });
      if (!contact) {
        contact = await Contact.create({
          email: normalizedEmail,
          phone_number: user.phone_number,
          address: formattedAddress || { street: 'No details' },
        });
      } else {
        contact.phone_number = user.phone_number;
        if (formattedAddress) {
          contact.address = formattedAddress;
        }
        await contact.save();
      }

      let customerDoc = await Customer.findOne({ contactInfo: contact._id });
      if (!customerDoc) {
        await Customer.create({
          name: user.name,
          contactInfo: contact._id,
        });
      } else {
        customerDoc.name = user.name;
        await customerDoc.save();
      }
    } else if (user.role === 'Supplier' && user.supplierProfile) {
      // Synchronize linked Supplier contact
      const supplier = await Supplier.findById(user.supplierProfile);
      if (supplier && supplier.contactInfo) {
        const contact = await Contact.findById(supplier.contactInfo);
        if (contact) {
          contact.phone_number = user.phone_number;
          if (formattedAddress) {
            contact.address = formattedAddress;
          }
          await contact.save();
        }
      }
    } else {
      // Synchronize Contact record for Managers/Admin if one exists
      let contact = await Contact.findOne({ email: normalizedEmail });
      if (contact) {
        contact.phone_number = user.phone_number;
        if (formattedAddress) contact.address = formattedAddress;
        await contact.save();
      }
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone_number: user.phone_number,
      address: formattedAddress || { street: '' },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update profile' });
  }
};