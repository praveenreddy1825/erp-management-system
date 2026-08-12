import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Import Models
import User from '../models/User.js';
import Product from '../models/Product.js';
import Contact from '../models/Contact.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import SalesOrder from '../models/SalesOrder.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import GRN from '../models/GRN.js';
import Invoice from '../models/Invoice.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to database
    await connectDB();

    console.log('Clearing database tables...');
    await Product.deleteMany();
    await Contact.deleteMany();
    await Customer.deleteMany();
    await Supplier.deleteMany();
    await SalesOrder.deleteMany();
    await PurchaseOrder.deleteMany();
    await GRN.deleteMany();
    await Invoice.deleteMany();

    console.log('Seeding user accounts...');
    await User.deleteMany();
    const users = await User.insertMany([
      {
        name: 'System Admin',
        email: 'admin@erp.com',
        password: 'Welcome@123',
        phone_number: '1234567890',
        role: 'Admin',
      },
      {
        name: 'Sales Manager',
        email: 'sales@erp.com',
        password: 'Welcome@123',
        phone_number: '2345678901',
        role: 'Sales_Manager',
      },
      {
        name: 'Purchase Manager',
        email: 'purchase@erp.com',
        password: 'Welcome@123',
        phone_number: '3456789012',
        role: 'Purchase_Manager',
      },
      {
        name: 'Inventory Manager',
        email: 'inventory@erp.com',
        password: 'Welcome@123',
        phone_number: '4567890123',
        role: 'Inventory_Manager',
      },
      {
        name: 'Praveen Kumar (Customer)',
        email: 'praveen@gmail.com',
        password: 'Welcome@123',
        phone_number: '9876543210',
        role: 'Customer',
      },
      {
        name: 'Neha Sharma (Customer)',
        email: 'neha@gmail.com',
        password: 'Welcome@123',
        phone_number: '8765432109',
        role: 'Customer',
      },
      {
        name: 'Amit Patel (Customer)',
        email: 'amit@gmail.com',
        password: 'Welcome@123',
        phone_number: '7654321098',
        role: 'Customer',
      },
      {
        name: 'Kirana Supplier',
        email: 'wholesale@kirana.com',
        password: 'Welcome@123',
        phone_number: '9988776655',
        role: 'Supplier',
      },
    ]);
    const adminUser = users[0];
    console.log('User accounts seeded successfully.');

    console.log('Seeding products...');
    const products = await Product.insertMany([
      {
        name: 'Fortune Soya Oil 1L',
        SKU: 'FSO101',
        category: 'Grocery',
        price: 120,
        stock: 8, // Low stock (Limit is 15)
        reorderLevel: 15,
      },
      {
        name: 'Maggi Noodles 12-pack',
        SKU: 'MAG202',
        category: 'Packaged Food',
        price: 168,
        stock: 50,
        reorderLevel: 10,
      },
      {
        name: 'Aashirvaad Atta 5kg',
        SKU: 'AAS303',
        category: 'Grocery',
        price: 290,
        stock: 3, // Low stock (Limit is 10)
        reorderLevel: 10,
      },
      {
        name: 'Tata Salt 1kg',
        SKU: 'TAT404',
        category: 'Grocery',
        price: 28,
        stock: 90,
        reorderLevel: 20,
      },
      {
        name: 'Surf Excel Wash 1kg',
        SKU: 'SUR505',
        category: 'Household',
        price: 140,
        stock: 2, // Low stock (Limit is 8)
        reorderLevel: 8,
      },
      {
        name: 'Amul Butter 500g',
        SKU: 'AMU606',
        category: 'Dairy',
        price: 275,
        stock: 45,
        reorderLevel: 12,
      },
    ]);

    console.log('Seeding customer contacts...');
    const customerContacts = await Contact.insertMany([
      {
        email: 'praveen@gmail.com',
        phone_number: '9876543210',
        address: { street: '123 Green Valley Road, Delhi', city: 'New Delhi', state: 'Delhi', zip: '110001', country: 'India' },
      },
      {
        email: 'neha@gmail.com',
        phone_number: '8765432109',
        address: { street: '456 Lotus Marg, Mumbai', city: 'Mumbai', state: 'Maharashtra', zip: '400001', country: 'India' },
      },
      {
        email: 'amit@gmail.com',
        phone_number: '7654321098',
        address: { street: '789 Royal Residency, Bangalore', city: 'Bangalore', state: 'Karnataka', zip: '560001', country: 'India' },
      },
    ]);

    const customers = await Customer.insertMany([
      { name: 'Praveen Kumar', contactInfo: customerContacts[0]._id },
      { name: 'Neha Sharma', contactInfo: customerContacts[1]._id },
      { name: 'Amit Patel', contactInfo: customerContacts[2]._id },
    ]);

    console.log('Seeding supplier contacts...');
    const supplierContacts = await Contact.insertMany([
      {
        email: 'wholesale@kirana.com',
        phone_number: '9988776655',
        address: { street: 'A-5 Warehousing Complex, Delhi', city: 'New Delhi', state: 'Delhi', zip: '110005', country: 'India' },
      },
      {
        email: 'sales@nestle.in',
        phone_number: '8877665544',
        address: { street: 'Plot 101, Industrial Area, Noida', city: 'Noida', state: 'Uttar Pradesh', zip: '201301', country: 'India' },
      },
    ]);

    const suppliers = await Supplier.insertMany([
      { name: 'Kirana Distributors Ltd', contactInfo: supplierContacts[0]._id },
      { name: 'Nestle India Foods', contactInfo: supplierContacts[1]._id },
    ]);

    console.log('Seeding Sales Orders...');
    const salesOrders = await SalesOrder.insertMany([
      {
        customer: customers[0]._id,
        products: [
          { product: products[3]._id, quantity: 15, price: 28 }, // Tata Salt
        ],
        remarks: 'Deliver by Friday morning',
        status: 'Pending',
        paymentStatus: 'unpaid',
        TotalAmount: 15 * 28,
        createdBy: adminUser._id,
      },
      {
        customer: customers[1]._id,
        products: [
          { product: products[1]._id, quantity: 10, price: 168 }, // Maggi Noodles
          { product: products[5]._id, quantity: 4, price: 275 }, // Amul Butter
        ],
        remarks: 'Premium gift packing requested',
        status: 'Delivered',
        paymentStatus: 'Paid',
        TotalAmount: 10 * 168 + 4 * 275,
        createdBy: adminUser._id,
      },
    ]);

    console.log('Seeding Purchase Orders...');
    const purchaseOrders = await PurchaseOrder.insertMany([
      {
        supplier: suppliers[0]._id,
        products: [
          { product: products[2]._id, quantity: 30, price: 290 }, // Aashirvaad Atta
        ],
        remarks: 'Replenishing critical low stock levels',
        status: 'Pending',
        TotalAmount: 30 * 290,
        createdBy: adminUser._id,
      },
      {
        supplier: suppliers[1]._id,
        products: [
          { product: products[4]._id, quantity: 50, price: 140 }, // Surf Excel
        ],
        remarks: 'Rush shipping service requested',
        status: 'Shipped',
        TotalAmount: 50 * 140,
        createdBy: adminUser._id,
      },
    ]);

    console.log('Seeding Invoices...');
    await Invoice.create({
      salesOrder: salesOrders[1]._id,
      remarks: 'Thank you for your business. Payment received successfully.',
    });

    console.log('Seeding Goods Receipt Notes...');
    await GRN.create({
      purchaseOrder: purchaseOrders[1]._id,
      productsReceived: [
        { product: products[4]._id, quantity: 50 },
      ],
      remarks: 'Delivered in perfect condition. All 50 units received and logged.',
      receivedBy: adminUser._id,
    });

    console.log('----------------------------------------------------');
    console.log('Database successfully seeded with realistic ERP data!');
    console.log('----------------------------------------------------');
    process.exit(0);
  } catch (error) {
    console.error('Seeding process failed:', error);
    process.exit(1);
  }
};

seedDatabase();
