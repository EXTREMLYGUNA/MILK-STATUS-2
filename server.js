require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit process with failure
  });

// Bill Model
const Bill = mongoose.model('Bill', new mongoose.Schema({
  Name: { type: String, required: true },
  Mobile: { 
    type: String, 
    required: true,
    validate: {
      validator: v => /^\d{10}$/.test(v),
      message: 'Mobile number must be 10 digits'
    }
  },
  Date: { 
    type: Date, 
    required: true,
    validate: {
      validator: v => !isNaN(new Date(v).getTime()),
      message: 'Invalid date'
    }
  },
  Morning: { 
    type: Number, 
    required: true,
    min: 0
  },
  Evening: { 
    type: Number, 
    required: true,
    min: 0
  },
  Rate: { 
    type: Number, 
    required: true,
    min: 0.01
  },
  TotalLiters: { type: Number, required: true },
  TotalAmount: { type: Number, required: true },
  CreatedAt: { type: Date, default: Date.now }
}));

// API Routes
app.post('/api/bills', async (req, res) => {
  try {
    
    // Directly access the raw body values first
    const rawBody = req.body;
    console.log('Raw body values:', {
      Name: rawBody.Name,
      Mobile: rawBody.Mobile,
      Date: rawBody.Date,
      Morning: rawBody.Morning,
      Evening: rawBody.Evening,
      Rate: rawBody.Rate
    });

    // Convert and validate with proper field names
    const name = String(rawBody.Name);
    const mobile = String(rawBody.Mobile);
    const date = new Date(rawBody.Date);
    const morning = parseFloat(rawBody.Morning);
    const evening = parseFloat(rawBody.Evening);
    const rate = parseFloat(rawBody.Rate);

    // Validate all required fields exist
    if (!name || !mobile || !date || isNaN(morning) || isNaN(evening) || isNaN(rate)) {
      return res.status(400).json({ 
        error: 'Missing or invalid required fields',
        received: {
          Name: name,
          Mobile: mobile,
          Date: date,
          Morning: morning,
          Evening: evening,
          Rate: rate
        }
      });
    }

    // Create bill with direct field assignment
    const bill = new Bill();
    bill.Name = name;
    bill.Mobile = mobile;
    bill.Date = date;
    bill.Morning = morning;
    bill.Evening = evening;
    bill.Rate = rate;
    bill.TotalLiters = morning + evening;
    bill.TotalAmount = (morning + evening) * rate;

    
    await bill.save();
    
    
    res.status(201).json(bill);
  } catch (err) {
    res.status(400).json({ 
      error: err.message.includes('validation failed') 
        ? err.message 
        : 'Failed to create bill',
      details: err
    });
  }
});

app.get('/api/bills', async (req, res) => {
  try {
    const { query } = req.query;
    const filter = query 
      ? {
          $or: [
            { Name: { $regex: query, $options: 'i' } },
            { Mobile: { $regex: query } }
          ]
        }
      : {};
    
    const bills = await Bill.find(filter).sort({ Date: -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

app.get('/api/bills/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const bills = await Bill.find({
      $or: [
        { Name: { $regex: query, $options: 'i' } },
        { Mobile: { $regex: query } }
      ]
    }).sort({ Date: -1 });

    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

app.delete('/api/bills/:id', async (req, res) => {
  try {
    const bill = await Bill.findByIdAndDelete(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

