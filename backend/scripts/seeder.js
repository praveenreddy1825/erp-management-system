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

    console.log('Clearing existing database collections...');
    await Product.deleteMany();
    await Contact.deleteMany();
    await Customer.deleteMany();
    await Supplier.deleteMany();
    await SalesOrder.deleteMany();
    await PurchaseOrder.deleteMany();
    await GRN.deleteMany();
    await Invoice.deleteMany();
    await User.deleteMany();

    console.log('Seeding Enterprise User Accounts with RBAC roles...');
    const users = await User.insertMany([
      // Administrative & Management Staff
      {
        name: 'System Admin',
        email: 'admin@erp.com',
        password: 'Welcome@123',
        phone_number: '9112345678',
        role: 'Admin',
      },
      {
        name: 'Vikram Malhotra',
        email: 'sales@erp.com',
        password: 'Welcome@123',
        phone_number: '9212345678',
        role: 'Sales_Manager',
      },
      {
        name: 'Priya Nair',
        email: 'purchase@erp.com',
        password: 'Welcome@123',
        phone_number: '9312345678',
        role: 'Purchase_Manager',
      },
      {
        name: 'Rajesh Verma',
        email: 'inventory@erp.com',
        password: 'Welcome@123',
        phone_number: '9412345678',
        role: 'Inventory_Manager',
      },

      // Customers (Credentials matching customer contact profiles)
      {
        name: 'Praveen Kumar',
        email: 'praveen@gmail.com',
        password: 'Welcome@123',
        phone_number: '9876543210',
        role: 'Customer',
      },
      {
        name: 'Neha Sharma',
        email: 'neha@gmail.com',
        password: 'Welcome@123',
        phone_number: '8765432109',
        role: 'Customer',
      },
      {
        name: 'Amit Patel',
        email: 'amit@gmail.com',
        password: 'Welcome@123',
        phone_number: '7654321098',
        role: 'Customer',
      },
      {
        name: 'Ananya Roy',
        email: 'ananya@gmail.com',
        password: 'Welcome@123',
        phone_number: '9811223344',
        role: 'Customer',
      },
      {
        name: 'Rohan Gupta',
        email: 'rohan@gmail.com',
        password: 'Welcome@123',
        phone_number: '9822334455',
        role: 'Customer',
      },
      {
        name: 'Kavita Joshi',
        email: 'kavita@gmail.com',
        password: 'Welcome@123',
        phone_number: '9833445566',
        role: 'Customer',
      },

      // Suppliers (Credentials matching supplier contact profiles)
      {
        name: 'Kirana Distributors Ltd',
        email: 'wholesale@kirana.com',
        password: 'Welcome@123',
        phone_number: '9988776655',
        role: 'Supplier',
      },
      {
        name: 'Nestle India Foods',
        email: 'sales@nestle.in',
        password: 'Welcome@123',
        phone_number: '8877665544',
        role: 'Supplier',
      },
      {
        name: 'ITC Supply Chain Corp',
        email: 'orders@itcportal.com',
        password: 'Welcome@123',
        phone_number: '7766554433',
        role: 'Supplier',
      },
      {
        name: 'Amul Gujarat Federation',
        email: 'supply@amuldairy.com',
        password: 'Welcome@123',
        phone_number: '6655443322',
        role: 'Supplier',
      },
      {
        name: 'Hindustan Unilever B2B',
        email: 'b2b@hindustanunilever.com',
        password: 'Welcome@123',
        phone_number: '9911223344',
        role: 'Supplier',
      },
    ]);

    const adminUser = users[0];
    const salesMgr = users[1];
    const purchaseMgr = users[2];
    const inventoryMgr = users[3];
    console.log(`Seeded ${users.length} user accounts with compliant credentials.`);

    console.log('Seeding enterprise Product catalog...');
    const products = await Product.insertMany([
      // Grocery
      {
        name: 'Fortune Soya Oil 1L',
        SKU: 'GRO-FSO-101',
        category: 'Grocery',
        price: 125,
        description: 'Refined soyabean cooking oil with omega-3 fatty acids',
        stock: 4, // CRITICAL LOW STOCK (reorderLevel: 15)
        reorderLevel: 15,
      },
      {
        name: 'Tata Salt 1kg',
        SKU: 'GRO-TAT-102',
        category: 'Grocery',
        price: 28,
        description: 'Vacuum evaporated iodized edible salt',
        stock: 95,
        reorderLevel: 20,
      },
      {
        name: 'Aashirvaad Shudh Chakki Atta 5kg',
        SKU: 'GRO-AAS-103',
        category: 'Grocery',
        price: 295,
        description: '100% whole wheat flour, fiber-rich traditional stone-ground',
        stock: 2, // CRITICAL LOW STOCK (reorderLevel: 10)
        reorderLevel: 10,
      },
      {
        name: 'Daawat Rozana Super Basmati Rice 5kg',
        SKU: 'GRO-DAA-104',
        category: 'Grocery',
        price: 440,
        description: 'Long grain aromatic basmati rice for daily cooking',
        stock: 40,
        reorderLevel: 10,
      },
      {
        name: 'Tata Sampann Toor Dal 1kg',
        SKU: 'GRO-SAM-105',
        category: 'Grocery',
        price: 165,
        description: 'Unpolished premium protein-rich pigeon peas',
        stock: 35,
        reorderLevel: 10,
      },
      {
        name: 'Everest Garam Masala 100g',
        SKU: 'GRO-EVE-106',
        category: 'Grocery',
        price: 88,
        description: 'Traditional blend of 13 authentic ground spices',
        stock: 65,
        reorderLevel: 15,
      },

      // Packaged Food & Snacks
      {
        name: 'Maggi 2-Minute Masala Noodles 12-pack',
        SKU: 'PKG-MAG-201',
        category: 'Packaged Food',
        price: 168,
        description: 'Instant noodles with authentic Indian spice mix',
        stock: 80,
        reorderLevel: 15,
      },
      {
        name: 'Britannia Good Day Butter Cookies 600g',
        SKU: 'PKG-BRI-202',
        category: 'Packaged Food',
        price: 130,
        description: 'Rich buttery cashewnut and butter biscuits pack',
        stock: 45,
        reorderLevel: 12,
      },
      {
        name: 'Haldirams Nagpur Aloo Bhujia 400g',
        SKU: 'PKG-HAL-203',
        category: 'Packaged Food',
        price: 110,
        description: 'Crispy fried spicy potato and gram flour noodles',
        stock: 55,
        reorderLevel: 15,
      },
      {
        name: 'Kelloggs Corn Flakes Original 875g',
        SKU: 'PKG-KEL-204',
        category: 'Packaged Food',
        price: 340,
        description: 'High in iron and vitamin B breakfast cereal',
        stock: 24,
        reorderLevel: 8,
      },

      // Dairy
      {
        name: 'Amul Pasteurized Butter 500g',
        SKU: 'DAI-AMU-301',
        category: 'Dairy',
        price: 275,
        description: 'Pure salted dairy butter made from fresh cream',
        stock: 50,
        reorderLevel: 12,
      },
      {
        name: 'Amul Taaza Homogenised Toned Milk 1L',
        SKU: 'DAI-AMU-302',
        category: 'Dairy',
        price: 72,
        description: 'Long life UHT treated toned milk pack',
        stock: 5, // CRITICAL LOW STOCK (reorderLevel: 20)
        reorderLevel: 20,
      },
      {
        name: 'Mother Dairy Pure Ghee 1L Tin',
        SKU: 'DAI-MOT-303',
        category: 'Dairy',
        price: 640,
        description: 'Traditional granular golden cow and buffalo ghee',
        stock: 18,
        reorderLevel: 6,
      },

      // Beverages
      {
        name: 'Brooke Bond Red Label Tea 1kg',
        SKU: 'BEV-BRO-401',
        category: 'Beverages',
        price: 490,
        description: 'Black CTC tea blend with natural taste and aroma',
        stock: 60,
        reorderLevel: 15,
      },
      {
        name: 'Nescafe Classic Instant Coffee 200g Jar',
        SKU: 'BEV-NES-402',
        category: 'Beverages',
        price: 610,
        description: '100% pure roasted robusta coffee granules',
        stock: 3, // CRITICAL LOW STOCK (reorderLevel: 10)
        reorderLevel: 10,
      },
      {
        name: 'Real Fruit Power Mixed Fruit Juice 1L',
        SKU: 'BEV-REA-403',
        category: 'Beverages',
        price: 120,
        description: 'Packed fruit beverage with no added preservatives',
        stock: 32,
        reorderLevel: 10,
      },

      // Household & Cleaning
      {
        name: 'Surf Excel Easy Wash Detergent Powder 1kg',
        SKU: 'HOU-SUR-501',
        category: 'Household',
        price: 145,
        description: 'Advanced stain removal enzyme formula detergent',
        stock: 3, // CRITICAL LOW STOCK (reorderLevel: 10)
        reorderLevel: 10,
      },
      {
        name: 'Vim Lemon Dishwash Gel 750ml Bottle',
        SKU: 'HOU-VIM-502',
        category: 'Household',
        price: 155,
        description: 'Concentrated grease-cutting liquid with real lemon juice',
        stock: 38,
        reorderLevel: 10,
      },
      {
        name: 'Lizol Disinfectant Surface Cleaner Citrus 2L',
        SKU: 'HOU-LIZ-503',
        category: 'Household',
        price: 360,
        description: 'Kills 99.9% germs, triple action floor cleaner',
        stock: 22,
        reorderLevel: 8,
      },

      // Personal Care
      {
        name: 'Dettol Original Germ Protection Liquid Handwash 750ml',
        SKU: 'PER-DET-601',
        category: 'Personal Care',
        price: 180,
        description: 'Antibacterial handwash refill pouch with pine fragrance',
        stock: 4, // CRITICAL LOW STOCK (reorderLevel: 12)
        reorderLevel: 12,
      },
      {
        name: 'Colgate Strong Teeth Dental Paste 300g (Pack of 2)',
        SKU: 'PER-COL-602',
        category: 'Personal Care',
        price: 215,
        description: 'Amino Shakti formula calcium toothpaste',
        stock: 58,
        reorderLevel: 15,
      },
      {
        name: 'Dove Cream Beauty Bathing Bar Soap 125g x 3',
        SKU: 'PER-DOV-603',
        category: 'Personal Care',
        price: 245,
        description: 'Mild moisturizing cream cleansing formula bar',
        stock: 42,
        reorderLevel: 12,
      },
    ]);
    console.log(`Seeded ${products.length} products across 6 major categories with realistic stock thresholds.`);

    console.log('Seeding Customer contacts & profiles...');
    const customerContacts = await Contact.insertMany([
      {
        email: 'praveen@gmail.com',
        phone_number: '9876543210',
        address: { street: '123 Green Valley Road, Sector 15', city: 'Gurgaon', state: 'Haryana', zip: '122001', country: 'India' },
      },
      {
        email: 'neha@gmail.com',
        phone_number: '8765432109',
        address: { street: '456 Lotus Marg, Bandra West', city: 'Mumbai', state: 'Maharashtra', zip: '400050', country: 'India' },
      },
      {
        email: 'amit@gmail.com',
        phone_number: '7654321098',
        address: { street: '789 Royal Residency, Koramangala', city: 'Bangalore', state: 'Karnataka', zip: '560034', country: 'India' },
      },
      {
        email: 'ananya@gmail.com',
        phone_number: '9811223344',
        address: { street: '14 Park Street, Park Circus', city: 'Kolkata', state: 'West Bengal', zip: '700016', country: 'India' },
      },
      {
        email: 'rohan@gmail.com',
        phone_number: '9822334455',
        address: { street: '22 Banjara Hills, Road No 12', city: 'Hyderabad', state: 'Telangana', zip: '500034', country: 'India' },
      },
      {
        email: 'kavita@gmail.com',
        phone_number: '9833445566',
        address: { street: '88 Ellis Bridge, Ashram Road', city: 'Ahmedabad', state: 'Gujarat', zip: '380006', country: 'India' },
      },
    ]);

    const customers = await Customer.insertMany([
      { name: 'Praveen Kumar', contactInfo: customerContacts[0]._id },
      { name: 'Neha Sharma', contactInfo: customerContacts[1]._id },
      { name: 'Amit Patel', contactInfo: customerContacts[2]._id },
      { name: 'Ananya Roy', contactInfo: customerContacts[3]._id },
      { name: 'Rohan Gupta', contactInfo: customerContacts[4]._id },
      { name: 'Kavita Joshi', contactInfo: customerContacts[5]._id },
    ]);
    console.log(`Seeded ${customers.length} verified Customer profiles linked to contact records.`);

    console.log('Seeding Supplier contacts & profiles...');
    const supplierContacts = await Contact.insertMany([
      {
        email: 'wholesale@kirana.com',
        phone_number: '9988776655',
        address: { street: 'A-5 Central Warehousing Complex, Okhla Ph-1', city: 'New Delhi', state: 'Delhi', zip: '110020', country: 'India' },
      },
      {
        email: 'sales@nestle.in',
        phone_number: '8877665544',
        address: { street: 'Plot 101, Industrial Area, Ecotech III', city: 'Greater Noida', state: 'Uttar Pradesh', zip: '201306', country: 'India' },
      },
      {
        email: 'orders@itcportal.com',
        phone_number: '7766554433',
        address: { street: 'ITC Centre, 37 J.L. Nehru Road', city: 'Kolkata', state: 'West Bengal', zip: '700071', country: 'India' },
      },
      {
        email: 'supply@amuldairy.com',
        phone_number: '6655443322',
        address: { street: 'Amul Dairy Road, Anand', city: 'Anand', state: 'Gujarat', zip: '388001', country: 'India' },
      },
      {
        email: 'b2b@hindustanunilever.com',
        phone_number: '9911223344',
        address: { street: 'Unilever House, B.D. Sawant Marg, Andheri East', city: 'Mumbai', state: 'Maharashtra', zip: '400099', country: 'India' },
      },
    ]);

    const suppliers = await Supplier.insertMany([
      { name: 'Kirana Distributors Ltd', contactInfo: supplierContacts[0]._id },
      { name: 'Nestle India Foods', contactInfo: supplierContacts[1]._id },
      { name: 'ITC Supply Chain Corp', contactInfo: supplierContacts[2]._id },
      { name: 'Amul Gujarat Federation', contactInfo: supplierContacts[3]._id },
      { name: 'Hindustan Unilever B2B', contactInfo: supplierContacts[4]._id },
    ]);
    console.log(`Seeded ${suppliers.length} Supplier distributor profiles.`);

    console.log('Seeding Sales Orders with diverse lifecycle statuses...');
    const now = new Date();
    const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const salesOrdersData = [
      {
        customer: customers[0]._id, // Praveen Kumar
        products: [
          { product: products[1]._id, quantity: 10, price: 28 },  // Tata Salt
          { product: products[6]._id, quantity: 5, price: 168 },  // Maggi Noodles
          { product: products[10]._id, quantity: 2, price: 275 }, // Amul Butter
        ],
        remarks: 'Recurring weekly grocery replenishment for retail store',
        status: 'Delivered',
        paymentStatus: 'Paid',
        DateOfOrder: daysAgo(14),
        createdBy: salesMgr._id,
      },
      {
        customer: customers[1]._id, // Neha Sharma
        products: [
          { product: products[3]._id, quantity: 4, price: 440 },  // Daawat Basmati Rice
          { product: products[4]._id, quantity: 6, price: 165 },  // Tata Toor Dal
          { product: products[13]._id, quantity: 3, price: 490 }, // Red Label Tea
        ],
        remarks: 'Corporate pantry monthly supplies',
        status: 'Delivered',
        paymentStatus: 'Paid',
        DateOfOrder: daysAgo(10),
        createdBy: salesMgr._id,
      },
      {
        customer: customers[2]._id, // Amit Patel
        products: [
          { product: products[7]._id, quantity: 15, price: 130 }, // Good Day Cookies
          { product: products[8]._id, quantity: 20, price: 110 }, // Haldiram Bhujia
          { product: products[15]._id, quantity: 8, price: 120 }, // Real Juice
        ],
        remarks: 'Catering event order - priority dispatch requested',
        status: 'Processing',
        paymentStatus: 'Paid',
        DateOfOrder: daysAgo(3),
        createdBy: salesMgr._id,
      },
      {
        customer: customers[3]._id, // Ananya Roy
        products: [
          { product: products[17]._id, quantity: 10, price: 155 }, // Vim Gel
          { product: products[18]._id, quantity: 5, price: 360 },  // Lizol Cleaner
          { product: products[20]._id, quantity: 12, price: 215 }, // Colgate Paste
        ],
        remarks: 'Facility hygiene restocking pack',
        status: 'Shipped',
        paymentStatus: 'partial',
        DateOfOrder: daysAgo(2),
        createdBy: adminUser._id,
      },
      {
        customer: customers[4]._id, // Rohan Gupta
        products: [
          { product: products[9]._id, quantity: 6, price: 340 },   // Kelloggs Corn Flakes
          { product: products[12]._id, quantity: 2, price: 640 },  // Mother Dairy Ghee
        ],
        remarks: 'Standard residential order; please call before delivery',
        status: 'Pending',
        paymentStatus: 'unpaid',
        DateOfOrder: daysAgo(1),
        createdBy: salesMgr._id,
      },
      {
        customer: customers[5]._id, // Kavita Joshi
        products: [
          { product: products[1]._id, quantity: 25, price: 28 },   // Tata Salt
          { product: products[5]._id, quantity: 10, price: 88 },   // Everest Masala
          { product: products[21]._id, quantity: 8, price: 245 },  // Dove Soap
        ],
        remarks: 'Fresh retail counter stocking order',
        status: 'Pending',
        paymentStatus: 'unpaid',
        DateOfOrder: now,
        createdBy: salesMgr._id,
      },
      {
        customer: customers[0]._id, // Praveen Kumar
        products: [
          { product: products[6]._id, quantity: 8, price: 168 },   // Maggi Noodles
          { product: products[7]._id, quantity: 12, price: 130 },  // Good Day Cookies
        ],
        remarks: 'Express dispatch order via courier',
        status: 'Shipped',
        paymentStatus: 'Paid',
        DateOfOrder: daysAgo(4),
        createdBy: adminUser._id,
      },
      {
        customer: customers[1]._id, // Neha Sharma
        products: [
          { product: products[12]._id, quantity: 3, price: 640 },  // Ghee
          { product: products[13]._id, quantity: 4, price: 490 },  // Tea
        ],
        remarks: 'Diwali festive pre-order allocation',
        status: 'Processing',
        paymentStatus: 'unpaid',
        DateOfOrder: daysAgo(2),
        createdBy: salesMgr._id,
      },
      {
        customer: customers[2]._id, // Amit Patel
        products: [
          { product: products[15]._id, quantity: 15, price: 120 }, // Real Juice
          { product: products[6]._id, quantity: 10, price: 168 },  // Maggi
        ],
        remarks: 'Cafeteria consignment #3',
        status: 'Delivered',
        paymentStatus: 'Paid',
        DateOfOrder: daysAgo(7),
        createdBy: salesMgr._id,
      },
      {
        customer: customers[4]._id, // Rohan Gupta
        products: [
          { product: products[0]._id, quantity: 5, price: 125 },   // Oil
        ],
        remarks: 'Customer requested cancellation due to change of delivery address',
        status: 'Cancelled',
        paymentStatus: 'unpaid',
        DateOfOrder: daysAgo(5),
        createdBy: salesMgr._id,
      },
    ];

    // Calculate TotalAmount manually for seed array
    const salesOrders = await SalesOrder.insertMany(
      salesOrdersData.map((order) => ({
        ...order,
        TotalAmount: order.products.reduce((acc, p) => acc + p.quantity * p.price, 0),
      }))
    );
    console.log(`Seeded ${salesOrders.length} Sales Orders across all operational statuses.`);

    console.log('Seeding Invoices for fulfilled and dispatched orders...');
    const invoices = await Invoice.insertMany([
      {
        invoiceNumber: 'INV-2026-001',
        salesOrder: salesOrders[0]._id, // Praveen Kumar Delivered
        remarks: 'Official Tax Invoice. Payment received via Bank Transfer.',
        createdAt: daysAgo(13),
      },
      {
        invoiceNumber: 'INV-2026-002',
        salesOrder: salesOrders[1]._id, // Neha Sharma Delivered
        remarks: 'B2B GST Invoice. Payment received via Corporate Net Banking.',
        createdAt: daysAgo(9),
      },
      {
        invoiceNumber: 'INV-2026-003',
        salesOrder: salesOrders[2]._id, // Amit Patel Processing
        remarks: 'Proforma Invoice generated. Advance payment received.',
        createdAt: daysAgo(3),
      },
      {
        invoiceNumber: 'INV-2026-004',
        salesOrder: salesOrders[3]._id, // Ananya Roy Shipped
        remarks: 'Commercial Invoice. 50% advance settled, remaining on delivery.',
        createdAt: daysAgo(2),
      },
      {
        invoiceNumber: 'INV-2026-005',
        salesOrder: salesOrders[6]._id, // Praveen Kumar Shipped
        remarks: 'Tax Invoice with express courier tracking #EX89201.',
        createdAt: daysAgo(4),
      },
      {
        invoiceNumber: 'INV-2026-006',
        salesOrder: salesOrders[8]._id, // Amit Patel Delivered
        remarks: 'Final settlement invoice. All dues cleared.',
        createdAt: daysAgo(6),
      },
    ]);
    console.log(`Seeded ${invoices.length} Invoices linked directly to sales orders.`);

    console.log('Seeding Purchase Orders to vendors/suppliers...');
    const purchaseOrdersData = [
      {
        supplier: suppliers[0]._id, // Kirana Distributors Ltd
        products: [
          { product: products[0]._id, quantity: 40, price: 110 }, // Fortune Oil
          { product: products[2]._id, quantity: 25, price: 260 }, // Aashirvaad Atta
        ],
        remarks: 'Emergency restock for low grocery inventory',
        status: 'Delivered',
        paymentStatus: 'Paid',
        DateOfOrder: daysAgo(12),
        createdBy: purchaseMgr._id,
      },
      {
        supplier: suppliers[1]._id, // Nestle India Foods
        products: [
          { product: products[6]._id, quantity: 100, price: 145 }, // Maggi Noodles
          { product: products[14]._id, quantity: 20, price: 540 }, // Nescafe Coffee
        ],
        remarks: 'Bulk distribution contract consignment',
        status: 'Delivered',
        paymentStatus: 'Paid',
        DateOfOrder: daysAgo(15),
        createdBy: purchaseMgr._id,
      },
      {
        supplier: suppliers[2]._id, // ITC Supply Chain Corp
        products: [
          { product: products[2]._id, quantity: 30, price: 260 },  // Atta
          { product: products[4]._id, quantity: 50, price: 140 },  // Toor Dal
        ],
        remarks: 'Quarterly direct farm-to-warehouse grain dispatch',
        status: 'Shipped',
        paymentStatus: 'partial',
        DateOfOrder: daysAgo(4),
        createdBy: purchaseMgr._id,
      },
      {
        supplier: suppliers[3]._id, // Amul Gujarat Federation
        products: [
          { product: products[10]._id, quantity: 60, price: 245 }, // Amul Butter
          { product: products[11]._id, quantity: 80, price: 62 },  // Taaza Milk
        ],
        remarks: 'Cold-chain dairy replenishment scheduled bi-weekly',
        status: 'Processing',
        paymentStatus: 'unpaid',
        DateOfOrder: daysAgo(2),
        createdBy: purchaseMgr._id,
      },
      {
        supplier: suppliers[4]._id, // Hindustan Unilever B2B
        products: [
          { product: products[16]._id, quantity: 50, price: 125 }, // Surf Excel
          { product: products[17]._id, quantity: 40, price: 135 }, // Vim Gel
          { product: products[21]._id, quantity: 30, price: 210 }, // Dove Soap
        ],
        remarks: 'FMCG household hygiene batch order',
        status: 'Pending',
        paymentStatus: 'unpaid',
        DateOfOrder: daysAgo(1),
        createdBy: purchaseMgr._id,
      },
      {
        supplier: suppliers[0]._id, // Kirana Distributors Ltd
        products: [
          { product: products[1]._id, quantity: 120, price: 24 }, // Tata Salt
          { product: products[3]._id, quantity: 20, price: 395 }, // Daawat Rice
        ],
        remarks: 'Bulk seasonal stock reservation',
        status: 'Pending',
        paymentStatus: 'unpaid',
        DateOfOrder: now,
        createdBy: adminUser._id,
      },
      {
        supplier: suppliers[1]._id, // Nestle India Foods
        products: [
          { product: products[14]._id, quantity: 15, price: 540 }, // Coffee
        ],
        remarks: 'Vendor price mismatch - re-quotation requested',
        status: 'Cancelled',
        paymentStatus: 'unpaid',
        DateOfOrder: daysAgo(8),
        createdBy: purchaseMgr._id,
      },
    ];

    const purchaseOrders = await PurchaseOrder.insertMany(
      purchaseOrdersData.map((po) => ({
        ...po,
        TotalAmount: po.products.reduce((acc, p) => acc + p.quantity * p.price, 0),
      }))
    );
    console.log(`Seeded ${purchaseOrders.length} Purchase Orders with vendor relationship linkages.`);

    console.log('Seeding Goods Receipt Notes (GRNs) verifying warehouse intake...');
    const grns = await GRN.insertMany([
      {
        grnNumber: 'GRN-2026-001',
        purchaseOrder: purchaseOrders[0]._id, // Kirana Distributors PO Delivered
        productsReceived: [
          { product: products[0]._id, quantity: 40, receivedDate: daysAgo(10) },
          { product: products[2]._id, quantity: 25, receivedDate: daysAgo(10) },
        ],
        remarks: 'Full consignment received at Dock #2. Pallets sealed and verified by warehouse lead.',
        receivedBy: inventoryMgr._id,
        status: 'Received',
      },
      {
        grnNumber: 'GRN-2026-002',
        purchaseOrder: purchaseOrders[1]._id, // Nestle India PO Delivered
        productsReceived: [
          { product: products[6]._id, quantity: 100, receivedDate: daysAgo(13) },
          { product: products[14]._id, quantity: 20, receivedDate: daysAgo(13) },
        ],
        remarks: 'Cartons intact, manufacturing dates within 30 days. Logged into Warehouse Section B.',
        receivedBy: inventoryMgr._id,
        status: 'Received',
      },
      {
        grnNumber: 'GRN-2026-003',
        purchaseOrder: purchaseOrders[3]._id, // Amul Dairy PO Processing (Partial intake)
        productsReceived: [
          { product: products[10]._id, quantity: 60, receivedDate: daysAgo(1) },
          // Milk delivery expected tomorrow in refrigerated vehicle
        ],
        remarks: 'Partial delivery received: 60 units Butter safely moved to cold storage. Milk crates pending next dispatch.',
        receivedBy: inventoryMgr._id,
        status: 'Received',
      },
    ]);
    console.log(`Seeded ${grns.length} Goods Receipt Notes demonstrating complete & partial inventory intake.`);

    console.log('====================================================');
    console.log(' DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('====================================================');
    console.log('Credentials Summary:');
    console.log(' - Admin:             admin@erp.com         / Welcome@123');
    console.log(' - Sales Manager:     sales@erp.com         / Welcome@123');
    console.log(' - Purchase Manager:  purchase@erp.com      / Welcome@123');
    console.log(' - Inventory Manager: inventory@erp.com     / Welcome@123');
    console.log(' - Customers:         praveen@gmail.com     / Welcome@123');
    console.log('                      neha@gmail.com        / Welcome@123');
    console.log('                      amit@gmail.com        / Welcome@123');
    console.log(' - Suppliers:         wholesale@kirana.com  / Welcome@123');
    console.log('                      sales@nestle.in       / Welcome@123');
    console.log('                      supply@amuldairy.com  / Welcome@123');
    console.log('====================================================');
    process.exit(0);
  } catch (error) {
    console.error('Seeding process failed:', error);
    process.exit(1);
  }
};

seedDatabase();
