import { createRequire } from 'module';
import { __dirname } from 'path';
const require = createRequire(import.meta.url)
const fs = require('fs');
const path = require('path');
const logFile = fs.createWriteStream(path.join(__dirname, 'app.log'), { flags: 'a' });

function log(...args) {
  logFile.write(new Date().toISOString() + ' ' + args.join(' ') + '\n');
}

// declaring installed frameworks
const express = require('express');
const bodyParser = require('body-parser');
const Redis = require('ioredis');
const prometheus = require('prom-client');
const app = express();

// redis connection
const redis = new Redis({
  host: 'redis',
  port: 6379,
});

// prometheus metrics
const collectDefaultMetrics = prometheus.collectDefaultMetrics;
const register = new prometheus.Registry();

// collect default metrics (like CPU, memory, etc.)
collectDefaultMetrics({ register });

// create custom metric to track notes count
const notesCount = new prometheus.Gauge({
  name: 'notes_count',
  help: 'Number of notes in the database',
  registers: [register],
});

// create counters for success and errors
const successfulRequests = new prometheus.Counter({
  name: 'successful_requests',
  help: 'Total number of 2XX responses',
  registers: [register],
});

const userErrors = new prometheus.Counter({
  name: 'user_failed_requests',
  help: 'Total number of 4XX responses',
  registers: [register],
});

const serverErrors = new prometheus.Counter({
  name: 'server_failed_requests',
  help: 'Total number of 5XX responses',
  registers: [register],
});

// create metric to measure API response times
const responseTimeHistogram = new prometheus.Histogram({
  name: 'api_response_time_seconds',
  help: 'Histogram of API response times in seconds',
  labelNames: ['route', 'method'],  // Add method to the labels for better granularity
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Middleware to measure response time
app.use((req, res, next) => {
  const end = responseTimeHistogram.startTimer();
  res.on('finish', () => {
    end({ route: req.path, method: req.method }); // Record the time taken for the route
  });
  next();
});

// Parses incoming request bodies
app.use(bodyParser.json());

app.set('views', './views');
// Set view engine to ejs
app.set('view engine', 'ejs');
// Serve static files (CSS, Bootstrap, etc.)
app.use(express.static('public'));

// Route to render the notes page
app.get('/', (req, res) => {
  log('Rendering note page');
  res.render('note');
});

// Endpoint to render all notes
app.get('/api/notes', async (req, res) => {
  // Get notes from redis cache
  try {
    const notes = await redis.lrange('notes', 0, -1);
    successfulRequests.inc();  // Increment successful requests counter
    res.json(notes);
  } catch (error) {
    log('Error getting notes:', error);
    serverErrors.inc();
    res.status(500).json({ message: 'Error getting notes' });
  }
});

// API endpoint to add note
app.post('/api/notes', async (req, res) => {
  const newNote = req.body.note;

  if (!newNote || newNote.trim() === '') {
    userErrors.inc(); // Increment user error counter
    return res.status(400).json({ message: 'Empty notes forbidden' }); // Return 400 Bad Request
  }

  // Add note to redis
  try {
    await redis.rpush('notes', newNote);
    notesCount.inc();
    successfulRequests.inc();
    res.status(201).json({ message: 'Successfully added note' });
  } catch (error) {
    log('Error adding note:', error);
    serverErrors.inc();
    res.status(500).json({ message: 'Error adding note' });
  }
});

// Endpoint to update a note
app.put('/api/notes/:index', async (req, res) => {
  const index = parseInt(req.params.index);
  const updatedNote = req.body.note;

  if (index >= 0 && updatedNote) {
    try {
      // Update note in redis
      const notes = await redis.lrange('notes', 0, -1);
      if (notes.length > index) {
        await redis.lset('notes', index, updatedNote);
        successfulRequests.inc();
        res.status(200).json({ message: 'Note updated successfully' });
      } else {
        log('Error: Invalid request');
        userErrors.inc();
        res.status(400).json({ message: 'Invalid Request' });
      }
    } catch (error) {
      log('Error updating note:', error);
      serverErrors.inc();
      res.status(500).json({ message: 'Error updating note' });
    }
  } else {
    log('Error: Invalid request');
    userErrors.inc();
    res.status(400).json({ message: 'Invalid Request' });
  }
});

// Endpoint to delete a note
app.delete('/api/notes/:index', async (req, res) => {
  log('Deleting note:', req.params.index);
  const index = parseInt(req.params.index);

  try {
    const notes = await redis.lrange('notes', 0, -1);
    if (index >= 0 && index < notes.length) {
      await redis.lrem('notes', 1, notes[index]);
      log('Deleted note:', notes[index]);
      notesCount.dec();
      successfulRequests.inc();
      res.status(200).json({ message: 'Note deleted successfully' });
    } else {
      log('Error: Note not found');
      userErrors.inc();
      res.status(404).json({ message: 'Note not found' });
    }
  } catch (error) {
    log('Error deleting note:', error);
    serverErrors.inc();
    res.status(500).json({ message: 'Error deleting note' });
  }
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  try {
    res.end(await register.metrics());
  } catch (error) {
    console.error('Error getting metrics:', error);
    serverErrors.inc();
    res.status(500).json({ message: 'Error getting metrics' });
  }
});

// Endpoint to check server health, using common healthz endpoint
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Endpoint to catch all undefined routes
app.use((req, res) => {
  res.status(403).json({ message: 'Forbidden: The requested route is not defined.' });
  userErrors.inc();
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
