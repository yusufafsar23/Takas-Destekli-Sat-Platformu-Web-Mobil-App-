const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger tanımı
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Takas Platformu API',
      version: '1.0.0',
      description: 'Takas Destekli Satış Platformu için RESTful API Dokümantasyonu',
      contact: {
        name: 'API Destek'
      },
      servers: [
        {
          url: 'http://localhost:5000'
        }
      ]
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js', './models/*.js', './docs/swagger/*.yaml'] // Rota ve model dosyalarını belirtin
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

const swaggerDocs = (app) => {
  // Swagger API dokümantasyonu endpoint'i
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // Swagger JSON endpointi
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log('Swagger API dokümantasyonu şu adreste kullanılabilir: /api-docs');
};

module.exports = { swaggerDocs }; 