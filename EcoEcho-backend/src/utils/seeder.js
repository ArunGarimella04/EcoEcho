// src/utils/seeder.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/userModel');
const WasteItem = require('../models/wasteItemModel');

// Load env vars
dotenv.config();

// Connect to DB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Sample data
const users = [
  {
    name: 'Admin User',
    email: 'admin@ecoecho.com',
    password: 'password123',
    role: 'admin'
  },
  {
    name: 'Test User',
    email: 'user@ecoecho.com',
    password: 'password123',
    role: 'user'
  }
];

const wasteItems = [
  {
    itemName: 'Plastic Bottle',
    category: 'Plastic',
    type: 'PET',
    weightInGrams: 20,
    isRecyclable: true,
    carbonFootprint: 80,
    disposalMethod: 'Recycled'
  },
  {
    itemName: 'Cardboard Box',
    category: 'Paper',
    type: 'Cardboard',
    weightInGrams: 150,
    isRecyclable: true,
    carbonFootprint: 30,
    disposalMethod: 'Recycled'
  },
  {
    itemName: 'Glass Jar',
    category: 'Glass',
    type: 'Container',
    weightInGrams: 200,
    isRecyclable: true,
    carbonFootprint: 40,
    disposalMethod: 'Recycled'
  },
  {
    itemName: 'Food Waste',
    category: 'Organic',
    type: 'Food',
    weightInGrams: 100,
    isRecyclable: true,
    carbonFootprint: 20,
    disposalMethod: 'Composted'
  }
];

// Import data
const importData = async () => {
  try {
    // Clear existing data
    await User.deleteMany();
    await WasteItem.deleteMany();

    // Create users
    const createdUsers = await User.create(users);
    
    // Add user reference to waste items
    const sampleWasteItems = wasteItems.map(item => {
      return { ...item, user: createdUsers[1]._id };
    });

    // Create waste items
    await WasteItem.create(sampleWasteItems);

    console.log('Data Imported!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Delete data
const deleteData = async () => {
  try {
    await User.deleteMany();
    await WasteItem.deleteMany();

    console.log('Data Destroyed!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Check command line args
if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
} else {
  console.log('Please add proper argument: -i (import) or -d (destroy)');
  process.exit();
}
