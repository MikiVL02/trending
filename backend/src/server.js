require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const { getRepos, getRepo, getStats } = require('./routes/repos');
const { favorite, unfavorite } = require('./routes/favorites');
const { triggerScrape } = require('./routes/admin');
const { initScheduler } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/repos', getRepos);
app.get('/api/stats', getStats);
app.get('/api/repos/:id', getRepo);
app.post('/api/repos/:id/favorite', favorite);
app.delete('/api/repos/:id/favorite', unfavorite);
app.post('/api/scrape', triggerScrape);

const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
  initScheduler();
});
