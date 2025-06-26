const express = require('express');
require('dotenv').config();
const cors = require('cors');

const app = express();

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jckxuzy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },

});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();
    //console.log("✅ Connected to MongoDB");


    const usersCollection = client.db('ims').collection('users');
    const itemsCollection = client.db('ims').collection('items');
    const recordsCollection = client.db('ims').collection('records');

    // Existing code for other endpoints...
    
    // Add endpoint to retrieve all records
app.get('/records', async (req, res) => {
  try {
    const result = await recordsCollection.find().toArray();
    res.json(result);
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
    // Add endpoint to submit records
    // app.post('/records', async (req, res) => {
    //   try {
    //     const recordData = req.body;
        
        // Insert the record into the database
    //     const result = await recordsCollection.insertOne({
    //       ...recordData,
    //       status: "pending" // Set the default status to "pending"
    //     });

    //     // Respond with success message
    //     res.status(200).json({ success: true, message: "Record submitted for approval" });
    //   } catch (error) {
    //     // Handle errors
    //     console.error("Error submitting record:", error);
    //     res.status(500).json({ success: false, error: "Internal Server Error" });
    //   }
    // });
app.post('/records', async (req, res) => {
  try {
    const {
      itemName,
      model,
      date,
      status,
      itemId,
      items_quantity = {}, // new structure
      purpose,
      locationGood
    } = req.body;

    console.log('Received data from frontend:', req.body);

    const item = await itemsCollection.findOne({ _id: new ObjectId(itemId) });
    if (!item) {
      return res.status(404).send({ message: 'Item not found' });
    }

    // Safely extract and parse each quantity from items_quantity object
    const {
      item_store = 0,
      item_use = 0,
      item_faulty_store = 0,
      item_faulty_use = 0
    } = items_quantity;

    // Build the new record object
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
        item_faulty_use: parseInt(item_faulty_use) || 0
      },
      purpose,
      locationGood
    };

    const result = await recordsCollection.insertOne(newRecord);
    res.status(200).send(result);

  } catch (error) {
    console.error('❌ Error creating record:', error);
    res.status(500).send({ message: 'Failed to create record' });
  }
});


  


    // Add endpoint to update the status of a record to "Approved"
// app.patch('/records/approve/:id', async (req, res) => {
//   const id = req.params.id;
//   console.log(id);
//   const filter = { _id: new ObjectId(id) };
//   try {
//     const result = await recordsCollection.updateOne(filter, { $set: { status: 'approved' } });
//     res.json(result);
//   } catch (error) {
//     console.error('Error approving record:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });


app.patch('/records/approve/:id', async (req, res) => {
  const id = req.params.id;
  console.log('Approving record:', id);

  try {
    const recordId = new ObjectId(String(id));
    const record = await recordsCollection.findOne({ _id: recordId });
    if (!record) return res.status(404).json({ message: "Record not found" });
    console.log('Record fetched:', record);

    const itemObjectId = new ObjectId(String(record.itemId));
    const item = await itemsCollection.findOne({ _id: itemObjectId });
    if (!item) return res.status(404).json({ message: "Item not found" });
    console.log('Item before update:', JSON.stringify(item));

    // Normalize item quantities (new structure)
    let {
      item_store = 0,
      item_use = 0,
      item_faulty_store = 0,
      item_faulty_use = 0
    } = item.items_quantity || {};

    let totalQuantity = parseInt(item.totalQuantity || 0);

    // Record quantities
    const rq = record.items_quantity || {};
    const storeQty = parseInt(rq.item_store || 0);
    const useQty = parseInt(rq.item_use || 0);
    const faultyStoreQty = parseInt(rq.item_faulty_store || 0);
    const faultyUseQty = parseInt(rq.item_faulty_use || 0);

    const rawStatus = (record.status || '').trim().toLowerCase();
    console.log('Raw status:', rawStatus);

    // ✅ Action handling
    if (rawStatus === "pending(add)") {
      console.log("🟢 Action: ADD to store");
      item_store += storeQty;
      totalQuantity += storeQty;

    } else if (rawStatus === "pending(remove)") {
      console.log("🟡 Action: USE from store");
      item_store -= useQty;
      item_use += useQty;

    } else if (rawStatus === "pending(remove_fault_store)") {
      console.log("🔴 Action: FAULTY from STORE");
      item_store -= faultyStoreQty;
      item_faulty_store += faultyStoreQty;

    } else if (rawStatus === "pending(remove_fault_use)") {
      console.log("🔴 Action: FAULTY from USE");
      item_use -= faultyUseQty;
      item_faulty_use += faultyUseQty;

    } else {
      console.log("❌ Status not recognized, skipping quantity update");
      const updatedRecord = await recordsCollection.updateOne(
        { _id: recordId },
        { $set: { status: "approved" } }
      );
      return res.json({
        message: "Record approved without quantity update",
        updatedRecord,
      });
    }

    // Prevent negative values
    item_store = Math.max(0, item_store);
    item_use = Math.max(0, item_use);
    item_faulty_store = Math.max(0, item_faulty_store);
    item_faulty_use = Math.max(0, item_faulty_use);

    // Update item document
    const updateItem = await itemsCollection.updateOne(
      { _id: itemObjectId },
      {
        $set: {
          'items_quantity.item_store': item_store,
          'items_quantity.item_use': item_use,
          'items_quantity.item_faulty_store': item_faulty_store,
          'items_quantity.item_faulty_use': item_faulty_use,
          totalQuantity,
        },
      }
    );
    console.log('✅ Item update result:', updateItem);

    // Update record status to approved
    const updatedRecord = await recordsCollection.updateOne(
      { _id: recordId },
      { $set: { status: "approved" } }
    );
    console.log('✅ Record status update result:', updatedRecord);

    res.json({
      message: "✅ Record approved and item quantities updated",
      updatedRecord,
      updateItem,
    });
  } catch (error) {
    console.error("❌ Error approving record:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});












// Express route (backend)
// app.patch('/records/:id', async (req, res) => {
//   const { id } = req.params;
//   const { status } = req.body;

//   try {
//     const updated = await Record.findByIdAndUpdate(id, { status }, { new: true });
//     res.send(updated);
//   } catch (err) {
//     res.status(500).json({ message: "Failed to update record status" });
//   }
// });


// Add endpoint to delete a record
app.delete('/records/:id', async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  try {
    const result = await recordsCollection.deleteOne(filter);
    res.json(result);
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

    //Add endpoint to retrieve all users
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });


    // Add endpoint to add a new user
    app.post('/user', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });


    //Endpoint to update user status by ID
    app.patch('/users/status/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const { status } = req.body;
    

      // Allow 'none' as a valid status for "No Role"
      if (['admin', 'monitor', 'coordinator', 'none'].includes(status)) {
        const updatedDoc = {
          $set: {
            status: status,
          },
        };

        try {
          const result = await usersCollection.updateOne(filter, updatedDoc);
          res.json(result);
        } catch (error) {
          console.error('Error updating user status:', error);
          res.status(500).json({ error: 'Internal Server Error' });
        }
      } else {
        res.status(400).json({ error: 'Invalid status value' });
      }
    });



    // API endpoint to get a user by email
    app.get('/user/:email', async (req, res) => {
      const email = req.params.email;
      // console.log("user mail is:",email);

      try {
        const result = await usersCollection.findOne({ email: email });
        res.json(result);
      } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });




    //Add endpoint to delete user by ID
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })


    //Add endpoint to retrieve all items
    app.get('/items', async (req, res) => {
      const result = await itemsCollection.find().toArray();
      res.json(result);
    });

    //Add endpoint to retrieve item by id

    app.get('/items/:id', async (req, res) => {
      const id = req.params.id;
      console.log("Received item id:", id);
  
      try {
          const item = await itemsCollection.findOne({ _id: new ObjectId(id) });
          if (!item) {
              console.error(`No item found with id: ${id}`);
              return res.status(404).send({ message: 'Item not found' });
          }
          res.send(item);
      } catch (error) {
          console.error('Error fetching item:', error);
          res.status(500).send({ message: 'Failed to fetch item' });
      }
  });
  


    // Add endpoint to retrieve item by model
    app.get('/items/model/:model', async (req, res) => {
      const model = req.params.model;

      try {
        const result = await itemsCollection.findOne({ model: model });
        res.json(result);
      } catch (error) {
        console.error('Error fetching item data by model:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });



    // POST endpoint to add item with duplicate check
    app.post('/item', async (req, res) => {
      const newItem = req.body;

      // Check if an item with the same model already exists
      const existingItem = await itemsCollection.findOne({ model: newItem.model });

      if (existingItem) {
        // Item with the same model already exists, return an error response
        return res.status(400).json({ success: false, message: 'An item with the same model already exists.' });
      }

      // No duplicate item found, proceed with adding the new item
      const result = await itemsCollection.insertOne(newItem);

      res.json({ success: true, message: 'Item added successfully.', insertedId: result.insertedId });
    });

// PATCH endpoint to update item
app.patch('/items/:id', async (req, res) => {
  const id = req.params.id;
  console.log("Received item id:", id);
  const updateFields = req.body;
  const filter = { _id: new ObjectId(id) };

  const updatedDoc = {
      $set: updateFields
  };

  try {
      const result = await itemsCollection.updateOne(filter, updatedDoc);
      if (result.matchedCount === 0) {
          console.error(`No item found with id: ${id}`);
          return res.status(404).send({ message: 'Item not found' });
      }
      res.send(result);
  } catch (error) {
      console.error('Error updating item:', error);
      res.status(500).send({ message: 'Failed to update item' });
  }
});





    // Delete a item by ID
    app.delete('/item/:itemId', async (req, res) => {
      const itemId = req.params.itemId;

      try {
        const result = await itemsCollection.deleteOne({ _id: new ObjectId(itemId) });
        if (result.deletedCount === 1) {
          res.json({ success: true, message: 'Item deleted successfully.' });
        } else {
          res.status(404).json({ success: false, message: 'Item not found.' });
        }
      } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
      }
    });






    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('ims is sitting');
});

app.listen(port, () => {
  console.log(`ims is sitting on port ${port}`);
});
