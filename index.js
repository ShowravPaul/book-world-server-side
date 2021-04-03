const express = require('express');
const cors = require('cors');
const app = express();
const port = 5000;

require('dotenv').config()
app.use(cors());
app.use(express.json());
// app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.send('Hello World!')
})


// for firebase token
const admin = require("firebase-admin");

const serviceAccount = require(`${process.env.CONFIG}`);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// --------------------mongodb part started here--------------------

const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tnmnk.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect(err => {
  const bookCollection = client.db("bookWorld").collection("books");
  const userCollection = client.db("bookWorld").collection("users");

  // add an order to the user database for a specific user from checkout
  app.post('/addOrder', (req, res) => {
    const newOrder = req.body;
    userCollection.insertOne(newOrder)
      .then(result => {
        res.send(result.insertedCount > 0);
      })
  })

  // for adding a book to the book database from admin
  app.post('/addBook', (req, res) => {
    const newBook = req.body;
    bookCollection.insertOne(newBook)
      .then(result => {
        res.send(result.insertedCount > 0);
      })
  })

  // for getting all books from the book database to home
  app.get('/books', (req, res) => {
    bookCollection.find()
      .toArray((err, items) => {
        res.send(items);
      })
  })

  // for getting all orders of a specific user from orders
  app.get('/orders', (req, res) => {
    const bearer = req.headers.authorization;
    if (bearer && bearer.startsWith('Bearer ')) {
      const idToken = bearer.split(' ')[1];

      // idToken comes from the client app
      admin.auth().verifyIdToken(idToken)
        .then((decodedToken) => {
          const tokenEmail = decodedToken.email;
          const queryEmail = req.query.email;

          if (tokenEmail == queryEmail) {
            userCollection.find({ email: queryEmail })
              .toArray((error, documents) => {
                res.status(200).send(documents);
              })
          }
          else {
            res.status(401).send('un-authorized access');
          }
        })
        .catch((error) => {
          res.status(401).send('un-authorized access');
        });
    }
    else {
      res.status(401).send('un-authorized access');
    }

  })

});


app.listen(process.env.PORT || port);