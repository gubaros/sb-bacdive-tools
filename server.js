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

// Configuración de Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Taxonomía Bacteriana',
      version: '1.0.0',
      description: 'API REST para consultar información taxonómica de bacterias',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Servidor de desarrollo',
      },
    ],
  },
  apis: ['./server.js'], // archivos que contienen anotaciones
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/bacteria:
 *   get:
 *     summary: Obtiene lista paginada de bacterias
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Cantidad de registros por página
 *     responses:
 *       200:
 *         description: Lista de bacterias
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
 *     summary: Obtiene información detallada de una bacteria
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identificador de la bacteria
 *     responses:
 *       200:
 *         description: Detalles de la bacteria
 *       404:
 *         description: Bacteria no encontrada
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
 *     summary: Busca bacterias por género y/o especie
 *     parameters:
 *       - in: query
 *         name: genus
 *         schema:
 *           type: string
 *         description: Nombre del género
 *       - in: query
 *         name: species
 *         schema:
 *           type: string
 *         description: Nombre de la especie
 *     responses:
 *       200:
 *         description: Resultados de la búsqueda
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
 *     summary: Obtiene estadísticas del conjunto de datos
 *     responses:
 *       200:
 *         description: Estadísticas generales
 */
app.get('/api/stats', (req, res) => {
  const stats = {
    totalRecords: bacteriaData.length,
    uniqueGenera: new Set(bacteriaData.map(b => b.taxonomy?.genus)).size,
    uniqueSpecies: new Set(bacteriaData.map(b => b.taxonomy?.species)).size,
  };
  res.json(stats);
});

export default app;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Total records loaded: ${bacteriaData.length}`);
}); 
