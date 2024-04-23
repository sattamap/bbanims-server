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
            console.log("user mail is:",email);
      
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
  