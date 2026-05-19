import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DocMaster API Documentation',
      version: '1.0.0',
      description: 'Documentation officielle et interactive de l\'API DocMaster.',
      contact: {
        name: 'Support DocMaster',
        url: 'https://docmaster.cm',
        email: 'support@docmaster.cm',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Serveur de Développement Local',
      },
      {
        url: 'http://217.154.126.24:5000/api',
        description: 'Serveur de Production',
      },
      {
        url: 'https://217.154.126.24:5000/api',
        description: 'Production (HTTPS)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // On scanne les fichiers de routes pour les annotations JSDoc
  apis: [
    './index.ts',
    './server/index.ts',
    './src/routes/*.ts',
    './server/src/routes/*.ts'
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
