
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  exercises: [{
    description: String,
    duration: Number,
    date: Date,
    _id: false
  }]
});

const User = mongoose.model('User', userSchema);

// Home route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// 1. Create User
app.post('/api/users', async (req, res) => {
  try {
    const username = req.body.username;

    if (!username) {
      return res.json({ error: 'Username is required' });
    }

    const user = await User.create({ username });

    res.json({
      username: user.username,
      _id: user._id
    });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Get All Users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username');

    res.json(users.map(user => ({
      username: user.username,
      _id: user._id
    })));

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. Add Exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, duration, date } = req.body;

    const user = await User.findById(req.params._id);

    if (!user) {
      return res.json({ error: 'User not found' });
    }

    const exerciseDate = date ? new Date(date) : new Date();
    const exerciseDuration = Number(duration);

    if (
      !description ||
      !Number.isFinite(exerciseDuration) ||
      exerciseDuration <= 0 ||
      isNaN(exerciseDate.getTime())
    ) {
      return res.json({ error: 'Invalid exercise data' });
    }

    user.exercises.push({
      description,
      duration: exerciseDuration,
      date: exerciseDate
    });

    await user.save();

    res.json({
      username: user.username,
      description,
      duration: exerciseDuration,
      date: exerciseDate.toDateString(),
      _id: user._id
    });

  } catch (err) {
    res.status(400).json({ error: 'Invalid user ID or request' });
  }
});

// 4. Get Exercise Logs
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);

    if (!user) {
      return res.json({ error: 'User not found' });
    }

    let logs = user.exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }));

    // Date filtering
    if (req.query.from) {
      const from = new Date(req.query.from);

      if (isNaN(from.getTime())) {
        return res.json({ error: 'Invalid from date' });
      }

      logs = logs.filter(
        log => new Date(log.date) >= from
      );
    }

    if (req.query.to) {
      const to = new Date(req.query.to);

      if (isNaN(to.getTime())) {
        return res.json({ error: 'Invalid to date' });
      }

      logs = logs.filter(
        log => new Date(log.date) <= to
      );
    }

    // Limit results
    if (req.query.limit !== undefined) {
      const limit = Number(req.query.limit);

      if (!Number.isInteger(limit) || limit < 0) {
        return res.json({ error: 'Invalid limit' });
      }

      logs = logs.slice(0, limit);
    }

    res.json({
      username: user.username,
      count: logs.length,
      _id: user._id,
      log: logs
    });

  } catch (err) {
    res.status(400).json({ error: 'Invalid user ID or request' });
  }
});

// Start server
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
