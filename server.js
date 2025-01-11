import express from 'express';
import { readFileSync } from 'fs';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const test = 'test';
const app = express();
const PORT = process.env.PORT || 3000;

console.log('Loading data into memory...');
const bacteriaData = JSON.parse(readFileSync('details_transformed_final.json', 'utf8'));

const bacteriaIndex = new Map(
  bacteriaData.map(bacteria => [bacteria.identificador, bacteria])
);

app.use(express.json());

// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bacterial Taxonomy API',
      version: '1.0.0',
      description: 'REST API for querying bacterial taxonomic information',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./server.js'], // files containing annotations
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/bacteria:
 *   get:
 *     summary: Get paginated list of bacteria
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: List of bacteria
 */
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

/**
 * @swagger
 * /api/bacteria/{id}:
 *   get:
 *     summary: Get detailed information for a specific bacteria
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bacteria identifier
 *     responses:
 *       200:
 *         description: Bacteria details
 *       404:
 *         description: Bacteria not found
 */
app.get('/api/bacteria/:id', (req, res) => {
  const bacteria = bacteriaIndex.get(req.params.id);
  if (!bacteria) {
    return res.status(404).json({ error: 'Bacteria not found' });
  }
  res.json(bacteria);
});

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search bacteria by genus and/or species
 *     parameters:
 *       - in: query
 *         name: genus
 *         schema:
 *           type: string
 *         description: Genus name
 *       - in: query
 *         name: species
 *         schema:
 *           type: string
 *         description: Species name
 *     responses:
 *       200:
 *         description: Search results
 */
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

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Get dataset statistics
 *     responses:
 *       200:
 *         description: General statistics
 */
app.get('/api/stats', (req, res) => {
  const stats = {
    totalRecords: bacteriaData.length,
    uniqueGenera: new Set(bacteriaData.map(b => b.taxonomy?.genus)).size,
    uniqueSpecies: new Set(bacteriaData.map(b => b.taxonomy?.species)).size,
  };
  res.json(stats);
});

// Exportar el servidor para poder cerrarlo en las pruebas
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Total records loaded: ${bacteriaData.length}`);
});

export { app, server };  // Exportamos tanto app como server 
