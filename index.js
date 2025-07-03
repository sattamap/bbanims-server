
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin:['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).send({ message: 'Unauthorized' });

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).send({ message: 'Forbidden' });
    req.user = decoded;
    next();
  });
};


// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jckxuzy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

let dbMap = {};

async function connectDatabases() {
  await client.connect();
  dbMap['head'] = client.db("ims-head");
  dbMap['local'] = client.db("ims-local");
  dbMap['main'] = client.db("ims-main"); // <-- users DB
  console.log("✅ Connected to ims-head, ims-local, and ims-main databases");
}

function getDB(block) {
  return dbMap[block];
}

function createRoutesForBlock(block) {
  const db = getDB(block);
  const prefix = `/${block}`;

  const itemsCollection = db.collection("items");
  const recordsCollection = db.collection("records");

  // Generate JWT token
  app.post('/jwt', (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: false
    }).send({ success: true });
  });

  // Clear JWT cookie
  app.post('/logout', (req, res) => {
    res.clearCookie('token', {
      httpOnly: true,
      secure: false,
      path: '/',
    }).send({ success: true });
  });

  // 🔒 GET all items (protected)
  app.get(`${prefix}/items`, verifyToken, async (req, res) => {
    const result = await itemsCollection.find().toArray();
    res.send(result);
  });

  // 🔒 GET item by ID (protected)
  app.get(`${prefix}/items/:id`, verifyToken, async (req, res) => {
    const result = await itemsCollection.findOne({ _id: new ObjectId(req.params.id) });
    res.send(result);
  });

  // 🔒 GET item by model (protected)
  app.get(`${prefix}/items/model/:model`, verifyToken, async (req, res) => {
    const result = await itemsCollection.findOne({ model: req.params.model });
    res.send(result);
  });

  // 🔒 Create a new item (POST)
  app.post(`${prefix}/item`, verifyToken, async (req, res) => {
    const newItem = req.body;
    const existing = await itemsCollection.findOne({ model: newItem.model });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Model already exists.' });
    }

    const result = await itemsCollection.insertOne(newItem);
    res.json({ success: true, insertedId: result.insertedId });
  });

  // 🔒 Update item (PATCH)
  app.patch(`${prefix}/items/:id`, verifyToken, async (req, res) => {
    const result = await itemsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );
    res.send(result);
  });

  // 🔒 Delete item (DELETE)
  app.delete(`${prefix}/item/:itemId`, verifyToken, async (req, res) => {
    const result = await itemsCollection.deleteOne({ _id: new ObjectId(req.params.itemId) });
    res.send(result);
  });

  // 🔒 GET records
  app.get(`${prefix}/records`, verifyToken, async (req, res) => {
    const result = await recordsCollection.find().toArray();
    res.send(result);
  });

  // 🔒 Create a new record
 // 🔒 Create a new record
app.post(`${prefix}/records`, verifyToken, async (req, res) => {
  try {
    const {
      itemName,
      model,
      category,
      date,
      status,
      itemId,
      items_quantity = {},
      purpose,
      locationGood,
    } = req.body;

    const item = await itemsCollection.findOne({ _id: new ObjectId(itemId) });
    if (!item) return res.status(404).send({ message: 'Item not found' });

    const {
      item_store = 0,
      item_use = 0,
      item_faulty_store = 0,
      item_faulty_use = 0,
      item_transfer = 0, // ✅ Support transfer
    } = items_quantity;

    const newRecord = {
      itemName,
      model,
      category,
      date,
      status,
      itemId: item._id,
      items_quantity: {
        item_store: parseInt(item_store) || 0,
        item_use: parseInt(item_use) || 0,
        item_faulty_store: parseInt(item_faulty_store) || 0,
        item_faulty_use: parseInt(item_faulty_use) || 0,
        item_transfer: parseInt(item_transfer) || 0, // ✅ New field
      },
      purpose,
      locationGood,
    };

    const result = await recordsCollection.insertOne(newRecord);
    res.status(200).send(result);
  } catch (err) {
    console.error("Error creating record:", err);
    res.status(500).send({ message: "Failed to create record" });
  }
});


  // 🔒 Delete record
  app.delete(`${prefix}/records/:id`, verifyToken, async (req, res) => {
    const result = await recordsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.send(result);
  });

  // 🔒 Approve record (and update item quantities)
// 🔒 Approve record (and update item quantities)
app.patch(`${prefix}/records/approve/:id`, verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const record = await recordsCollection.findOne({ _id: new ObjectId(id) });
    if (!record) return res.status(404).send({ message: 'Record not found' });

    const item = await itemsCollection.findOne({ _id: new ObjectId(record.itemId) });
    if (!item) return res.status(404).send({ message: 'Item not found' });

    let {
      item_store = 0,
      item_use = 0,
      item_faulty_store = 0,
      item_faulty_use = 0,
      item_transfer = 0, // ✅ Support transfer in item
    } = item.items_quantity || {};

    let totalQuantity = parseInt(item.totalQuantity || 0);

    const rq = record.items_quantity || {};
    const storeQty = parseInt(rq.item_store || 0);
    const useQty = parseInt(rq.item_use || 0);
    const faultyStoreQty = parseInt(rq.item_faulty_store || 0);
    const faultyUseQty = parseInt(rq.item_faulty_use || 0);
    const transferQty = parseInt(rq.item_transfer || 0); // ✅ Read transfer qty

    const rawStatus = (record.status || '').trim().toLowerCase();

    if (rawStatus === "pending(add)") {
      item_store += storeQty;
      totalQuantity += storeQty;
    } else if (rawStatus === "pending(remove)") {
      item_store -= useQty;
      item_use += useQty;
    } else if (rawStatus === "pending(remove_fault_store)") {
      item_store -= faultyStoreQty;
      item_faulty_store += faultyStoreQty;
    } else if (rawStatus === "pending(remove_fault_use)") {
      item_use -= faultyUseQty;
      item_faulty_use += faultyUseQty;
    } else if (rawStatus === "pending(transfer)") {
      item_store -= transferQty;
      item_transfer += transferQty;
    }

    await itemsCollection.updateOne(
      { _id: item._id },
      {
        $set: {
          'items_quantity.item_store': Math.max(0, item_store),
          'items_quantity.item_use': Math.max(0, item_use),
          'items_quantity.item_faulty_store': Math.max(0, item_faulty_store),
          'items_quantity.item_faulty_use': Math.max(0, item_faulty_use),
          'items_quantity.item_transfer': Math.max(0, item_transfer), // ✅ Add update
          totalQuantity,
        },
      }
    );

    const updateResult = await recordsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "approved" } }
    );

    res.send({ message: "Approved", updateResult });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).send({ message: 'Failed to approve record' });
  }
});

}

// Centralized users routes (only in ims-main)
function createUserRoutes() { 
  const db = getDB('main'); // ims-main database
  const usersCollection = db.collection("users");

  // 🔐 GET all users
  app.get('/users', verifyToken, async (req, res) => {
    const result = await usersCollection.find().toArray();
    res.send(result);
  });

  // 🔐 Create a user (recommended protected, or use public with caution)
  app.post('/user', verifyToken, async (req, res) => {
    const result = await usersCollection.insertOne(req.body);
    res.send(result);
  });

  // 🔐 Get user by email
  app.get('/user/:email', verifyToken, async (req, res) => {
    const result = await usersCollection.findOne({ email: req.params.email });
    if (!result) return res.status(404).send({ message: "User not found" });
    res.send(result);
  });

  // 🔐 Update user status
  app.patch('/users/status/:id', verifyToken, async (req, res) => {
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: req.body.status } }
    );
    res.send(result);
  });

  // 🔐 Update access block
  app.patch('/users/accessBlock/:id', verifyToken, async (req, res) => {
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { accessBlock: req.body.accessBlock } }
    );
    res.send(result);
  });

  // 🔐 Delete user
  app.delete('/users/:id', verifyToken, async (req, res) => {
    const result = await usersCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.send(result);
  });
}

// Start the server
connectDatabases().then(() => {
  createRoutesForBlock("head");
  createRoutesForBlock("local");
  createUserRoutes();

  app.get("/", (req, res) => res.send("✅ IMS backend running"));
  app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
});
