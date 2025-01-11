import axios from 'axios';
import dotenv from 'dotenv';
import { writeFileSync } from 'fs';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

dotenv.config();

const TAXON_BASE_URL = 'https://api.bacdive.dsmz.de/taxon';
const FETCH_BASE_URL = 'https://api.bacdive.dsmz.de/fetch';
const SESSION_COOKIE = process.env.SESSION_COOKIE;

if (!SESSION_COOKIE) {
  console.error("Error: SESSION_COOKIE environment variable is required");
  process.exit(1);
}

/**
 * @swagger
 * components:
 *   schemas:
 *     BacteriaDetail:
 *       type: object
 *       properties:
 *         identifier:
 *           type: string
 *           description: BacDive ID único de la bacteria
 *         general:
 *           type: object
 *           properties:
 *             description:
 *               type: string
 *             DSM_Number:
 *               type: string
 *             NCBI_tax_id:
 *               type: string
 *             keywords:
 *               type: array
 *               items:
 *                 type: string
 *         taxonomy:
 *           type: object
 *           properties:
 *             genus:
 *               type: string
 *             species:
 *               type: string
 *             strain_designation:
 *               type: string
 *             type_strain:
 *               type: boolean
 *             full_scientific_name:
 *               type: string
 */

/**
 * @swagger
 * /fetch/{id}:
 *   get:
 *     summary: Obtiene detalles de una bacteria por su ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: BacDive ID de la bacteria
 *     responses:
 *       200:
 *         description: Detalles de la bacteria
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BacteriaDetail'
 *       404:
 *         description: Bacteria no encontrada
 *       401:
 *         description: No autorizado - Se requiere SESSION_COOKIE válida
 */
const fetchDetailsForId = async (id) => {
  if (!id || id === "0") {
    console.error(`Skipping invalid ID: ${id}`);
    return null;
  }

  try {
    const url = `${FETCH_BASE_URL}/${id}`;
    console.log(`Fetching details for ID: ${id} from ${url}`);
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'Cookie': `bacdive_api_session=${SESSION_COOKIE}`
      }
    });

    const results = response.data.results;
    if (!results || !results[id]) {
      console.error(`No details found for ID ${id}`);
      return null;
    }

    const detail = results[id];
    if (!detail["General"]) {
      detail["General"] = {};
    }
    detail["General"]["BacDive-ID"] = id;
    
    console.log(`Successfully fetched and processed ID: ${id}`);
    return detail;
  } catch (error) {
    console.error(`Error fetching details for ID ${id}: ${error.response?.status || error.message}`);
    return null;
  }
};

/**
 * @swagger
 * /taxon/{genus}:
 *   get:
 *     summary: Obtiene todos los IDs de bacterias para un género específico
 *     parameters:
 *       - in: path
 *         name: genus
 *         required: true
 *         schema:
 *           type: string
 *         description: Nombre del género bacteriano
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página para la paginación
 *     responses:
 *       200:
 *         description: Lista de IDs de bacterias
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: string
 *                 count:
 *                   type: integer
 *                 next:
 *                   type: string
 *       401:
 *         description: No autorizado - Se requiere SESSION_COOKIE válida
 */
const fetchIdsForGenus = async (genus) => {
  let page = 0;
  let allIds = [];
  console.log(`Fetching IDs for genus: ${genus}`);

  try {
    while (true) {
      page++;
      const url = `${TAXON_BASE_URL}/${genus}?page=${page}`;
      console.log(`Fetching page ${page} from: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json',
          'Cookie': `bacdive_api_session=${SESSION_COOKIE}`
        }
      });

      const { results, next, count } = response.data;
      const newIds = Object.keys(results);
      console.log(`Retrieved ${newIds.length} IDs on page ${page}. Total expected: ${count}`);
      
      allIds = allIds.concat(newIds);

      if (!next) break;

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error(`Error fetching IDs for genus ${genus}:`, error.response?.data || error.message);
  }

  console.log(`Total pages fetched: ${page}`);
  console.log(`Total IDs collected: ${allIds.length}`);
  return allIds;
};

/**
 * @swagger
 * components:
 *   schemas:
 *     TransformedBacteria:
 *       type: object
 *       properties:
 *         identifier:
 *           type: string
 *         general:
 *           type: object
 *         taxonomy:
 *           type: object
 *         culture_conditions:
 *           type: object
 *         physiology_and_metabolism:
 *           type: object
 *         biosafety:
 *           type: object
 *         sequence_information:
 *           type: object
 *         external_links:
 *           type: object
 */
const transformDetails = (rawData) => {
  try {
    const identifier = rawData["General"]["BacDive-ID"];
    if (!identifier) {
      console.error("BacDive-ID not found in data");
      return null;
    }

    console.log(`Transforming data for BacDive-ID: ${identifier}`);

    return {
      identifier,
      general: {
        description: rawData["General"]?.["description"] || null,
        DSM_Number: rawData["General"]?.["DSM-Number"] || null,
        NCBI_tax_id: rawData["General"]?.["NCBI tax id"]?.["NCBI tax id"] || null,
        keywords: rawData["General"]?.["keywords"] || []
      },
      taxonomy: {
        genus: rawData["Name and taxonomic classification"]?.["genus"] || null,
        species: rawData["Name and taxonomic classification"]?.["species"] || null,
        strain_designation: rawData["Name and taxonomic classification"]?.["strain designation"] || null,
        type_strain: rawData["Name and taxonomic classification"]?.["type strain"] || null,
        full_scientific_name: rawData["Name and taxonomic classification"]?.["full scientific name"] || null
      },
      LPSN: rawData["Name and taxonomic classification"]?.["LPSN"] || null,
      culture_conditions: {
        medium: rawData["Culture and growth conditions"]?.["culture medium"] || null,
        temperatures: rawData["Culture and growth conditions"]?.["culture temp"] || null
      },
      physiology_and_metabolism: {
        compound_production: rawData["Physiology and metabolism"]?.["compound production"] || null,
        enzymes: rawData["Physiology and metabolism"]?.["enzymes"] || null
      },
      biosafety: {
        level: rawData["Safety information"]?.["risk assessment"]?.["biosafety level"] || null,
        comment: rawData["Safety information"]?.["risk assessment"]?.["biosafety level comment"] || null
      },
      sequence_information: rawData["Sequence information"]?.["GC content"] || null,
      external_links: {
        culture_collections: rawData["External links"]?.["culture collection no."] || null,
        literature: rawData["External links"]?.["literature"] || null
      }
    };
  } catch (error) {
    console.error(`Error transforming data: ${error.message}`);
    return null;
  }
};

const main = async () => {
  const START_ID = 1;
  const END_ID = 27000;
  const DELAY_MS = 5;
  const results = [];

  console.log(`Starting fetch for IDs ${START_ID} to ${END_ID}`);

  for (let id = START_ID; id <= END_ID; id++) {
    try {
      const detail = await fetchDetailsForId(id);
      if (detail) {
        results.push(transformDetails(detail));
      }
      
      if (id % 1000 === 0) {
        writeFileSync(`details_transformed_${id}.json`, JSON.stringify(results, null, 2));
        console.log(`Checkpoint save at ID ${id}. Found ${results.length} valid entries so far.`);
      }

      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    } catch (error) {
      console.error(`Failed processing ID ${id}: ${error.message}`);
    }
  }

  writeFileSync('details_transformed_final.json', JSON.stringify(results, null, 2));
  console.log(`Process completed. Total valid entries: ${results.length}`);
};

main();

