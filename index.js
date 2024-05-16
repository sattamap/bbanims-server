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
    // await client.connect();


    const usersCollection = client.db('ims').collection('users');
    const itemsCollection = client.db('ims').collection('items');

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
      console.log(status);

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

    app.get('/item/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await itemsCollection.findOne(query);
      res.send(result);
    })


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


    //PATCH endpoint to update item

    app.patch('/items/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          itemName: item.itemName,
          category: item.category,
          model: item.category,
          origin: item.origin,
          condition: item.condition,
          location: item.location,
          quantity: item.quantity,
          date: item.date,
          detail: item.detail,
          image: item.image,
        }
      }

      const result = await itemsCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })



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
