
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

  app.post('/jwt',(req,res)=>{
    const user = req.body; 
    const token =  jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'});
    res.cookie('token',token,{
      httpOnly: true,
      secure: false
    })
    .send({success:true})
   
  });

  app.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: false, // true in production
   // sameSite: 'lax', // or 'none'
    path: '/',
  }).send({ success: true });
});


  // Items
app.get(`${prefix}/items`, verifyToken, async (req, res) => {
  console.log('Authenticated user:', req.user);
  if(req.user.email!==req.query.email){
    return res.status(403).send({message:'Forbiden'})
  }
  const result = await itemsCollection.find().toArray();
  res.send(result);
});


  app.get(`${prefix}/items/:id`, async (req, res) => {
    const result = await itemsCollection.findOne({ _id: new ObjectId(req.params.id) });
    res.send(result);
  });

  app.get(`${prefix}/items/model/:model`, async (req, res) => {
    const model = req.params.model;
    const result = await itemsCollection.findOne({ model });
    res.send(result);
  });

  app.post(`${prefix}/item`, async (req, res) => {
    const newItem = req.body;
    const existing = await itemsCollection.findOne({ model: newItem.model });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Model already exists.' });
    }

    const result = await itemsCollection.insertOne(newItem);
    res.json({ success: true, insertedId: result.insertedId });
  });

  app.patch(`${prefix}/items/:id`, async (req, res) => {
    const result = await itemsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );
    res.send(result);
  });

  app.delete(`${prefix}/item/:itemId`, async (req, res) => {
    const result = await itemsCollection.deleteOne({ _id: new ObjectId(req.params.itemId) });
    res.send(result);
  });

  // Records
  app.get(`${prefix}/records`, async (req, res) => {
    const result = await recordsCollection.find().toArray();
    res.send(result);
  });

  app.post(`${prefix}/records`, async (req, res) => {
    try {
      const {
        itemName,
        model,
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
      } = items_quantity;

      const newRecord = {
        itemName,
        model,
        date,
        status,
        itemId: item._id,
        items_quantity: {
          item_store: parseInt(item_store) || 0,
          item_use: parseInt(item_use) || 0,
          item_faulty_store: parseInt(item_faulty_store) || 0,
          item_faulty_use: parseInt(item_faulty_use) || 0,
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

  app.delete(`${prefix}/records/:id`, async (req, res) => {
    const result = await recordsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.send(result);
  });

  app.patch(`${prefix}/records/approve/:id`, async (req, res) => {
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
      } = item.items_quantity || {};

      let totalQuantity = parseInt(item.totalQuantity || 0);

      const rq = record.items_quantity || {};
      const storeQty = parseInt(rq.item_store || 0);
      const useQty = parseInt(rq.item_use || 0);
      const faultyStoreQty = parseInt(rq.item_faulty_store || 0);
      const faultyUseQty = parseInt(rq.item_faulty_use || 0);

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
      }

      // Update item document
      await itemsCollection.updateOne(
        { _id: item._id },
        {
          $set: {
            'items_quantity.item_store': Math.max(0, item_store),
            'items_quantity.item_use': Math.max(0, item_use),
            'items_quantity.item_faulty_store': Math.max(0, item_faulty_store),
            'items_quantity.item_faulty_use': Math.max(0, item_faulty_use),
            totalQuantity,
          },
        }
      );

      // Mark record approved
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

  app.get('/users', async (req, res) => {
    const result = await usersCollection.find().toArray();
    res.send(result);
  });

  app.post('/user', async (req, res) => {
    const result = await usersCollection.insertOne(req.body);
    res.send(result);
  });

  app.get('/user/:email', async (req, res) => {
    const result = await usersCollection.findOne({ email: req.params.email });
    if (!result) return res.status(404).send({ message: "User not found" });
    res.send(result);
  });

  app.patch('/users/status/:id', async (req, res) => {
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: req.body.status } }
    );
    res.send(result);
  });
  // PATCH access block
app.patch('/users/accessBlock/:id', async (req, res) => {
  const id = req.params.id;
  const { accessBlock } = req.body;
  const result = await usersCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { accessBlock } }
  );
  res.send(result);
});


  app.delete('/users/:id', async (req, res) => {
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
