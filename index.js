require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const urlparser = require('urlparser');
const dns = require('dns');
const shortid = require('shortid');
const mongoose = require('mongoose');


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL)
.then(() => console.log('Connected to MongoDB'))
.catch((err) => {
  console.error('Error connecting to MongoDB:', err);
  process.exit(1);
});

// Define the URL schema and model
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: String,
});
const UrlModel = mongoose.model('Url', urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

// body parser middleware
let bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.post('/api/shorturl', function(req, res) {
  const originalURL = req.body.url;
  const parsedURL = urlparser.parse(originalURL);
  const hostname = parsedURL.host.hostname;

  dns.lookup(hostname, async (err, address) => {
    if (!address) {
        res.json({ 
          error: 'invalid url'
         });
    } else if (address) {
      try {
        const existingURL = await UrlModel.findOne({ original_url: originalURL });
        if (!existingURL) {
          const shortURL = shortid.generate();
          const urlDoc = {
            original_url: originalURL,
            short_url: shortURL,
          };
          const addUrlDoc = await UrlModel.create(urlDoc);
          console.log('addUrlDoc', addUrlDoc);
          res.json({ 
            original_url: originalURL,
            short_url: shortURL,
          });
        } else {
          console.log('url exists in db');
          res.json({ 
            original_url: existingURL.original_url,
            short_url: existingURL.short_url,
          });
        }
        
      } catch (error) {
        console.error(error);
      }
    } else {
      console.log("error dns look up", err)
    }
  });
});

app.get('/api/shorturl/:short_url', async(req, res) => {
  const shortURL = req.params.short_url;
  try {
    const urlDoc = await UrlModel.findOne({ short_url: shortURL });
    if (urlDoc) {
      console.log("url found");
      res.redirect(urlDoc.original_url)
    } else {
      console.log("no url found");
    }
  } catch (error) {
    console.error("error get shorturl", err);
  }
});
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
