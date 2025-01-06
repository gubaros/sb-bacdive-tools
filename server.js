import express from 'express';
import { readFileSync } from 'fs';

const test = 'test';
const app = express();
const PORT = process.env.PORT || 3000;

console.log('Loading data into memory...');
const bacteriaData = JSON.parse(readFileSync('details_transformed_final.json', 'utf8'));

const bacteriaIndex = new Map(
  bacteriaData.map(bacteria => [bacteria.identificador, bacteria])
);

app.use(express.json());

app.get('/api/bacteria', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const paginatedResults = bacteriaData.slice(startIndex, endIndex);
  
  res.json({
    total: bacteriaData.length,
    page,
    limit,
    data: paginatedResults
  });
});

app.get('/api/bacteria/:id', (req, res) => {
  const bacteria = bacteriaIndex.get(req.params.id);
  if (!bacteria) {
    return res.status(404).json({ error: 'Bacteria not found' });
  }
  res.json(bacteria);
});

app.get('/api/search', (req, res) => {
  const { genus, species } = req.query;
  
  let results = bacteriaData;
  
  if (genus) {
    results = results.filter(b => 
      b.taxonomy && b.taxonomy.genus?.toLowerCase().includes(genus.toLowerCase())
    );
  }
  
  if (species) {
    results = results.filter(b => 
      b.taxonomy?.species?.toLowerCase().includes(species.toLowerCase())
    );
  }

  res.json({
    total: results.length,
    data: results.slice(0, 100)
  });
});

app.get('/api/stats', (req, res) => {
  const stats = {
    totalRecords: bacteriaData.length,
    uniqueGenera: new Set(bacteriaData.map(b => b.taxonomy?.genus)).size,
    uniqueSpecies: new Set(bacteriaData.map(b => b.taxonomy?.species)).size,
  };
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Total records loaded: ${bacteriaData.length}`);
}); 
