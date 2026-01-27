/**
 * OLYMPUS 2.0 - OpenAPI Specification
 */

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'OLYMPUS 2.0 API',
    version: '1.0.0',
    description: 'Multi-agent SaaS application generator API',
    contact: { name: 'OLYMPUS Support', email: 'support@olympus.dev' },
  },
  servers: [
    { url: 'https://api.olympus.dev', description: 'Production' },
    { url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001', description: 'Development' },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Tenants', description: 'Tenant management' },
    { name: 'Projects', description: 'Project management' },
    { name: 'Builds', description: 'Build orchestration' },
    { name: 'Deployments', description: 'Deployment management' },
    { name: 'Health', description: 'Health checks' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'], summary: 'Health check', operationId: 'healthCheck',
        parameters: [{ name: 'detailed', in: 'query', schema: { type: 'boolean' } }],
        responses: { 200: { description: 'Healthy', content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } } } },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Login', operationId: 'login',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } } },
      },
    },
    '/api/projects': {
      get: {
        tags: ['Projects'], summary: 'List projects', operationId: 'listProjects', security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Success', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectListResponse' } } } } },
      },
      post: {
        tags: ['Projects'], summary: 'Create project', operationId: 'createProject', security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProjectRequest' } } } },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProjectResponse' } } } } },
      },
    },
    '/api/builds': {
      post: {
        tags: ['Builds'], summary: 'Start build', operationId: 'startBuild', security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/StartBuildRequest' } } } },
        responses: { 201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/BuildResponse' } } } } },
      },
    },
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      HealthResponse: { type: 'object', properties: { status: { type: 'string' }, timestamp: { type: 'string' }, version: { type: 'string' } } },
      LoginRequest: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } },
      LoginResponse: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' } } },
      CreateProjectRequest: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, description: { type: 'string' }, visibility: { type: 'string', enum: ['private', 'team', 'public'] } } },
      ProjectResponse: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' } } },
      ProjectListResponse: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'array' }, meta: { type: 'object' } } },
      StartBuildRequest: { type: 'object', required: ['projectId', 'description', 'tier'], properties: { projectId: { type: 'string', format: 'uuid' }, description: { type: 'string' }, tier: { type: 'string', enum: ['starter', 'professional', 'ultimate', 'enterprise'] } } },
      BuildResponse: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object' } } },
      ApiError: { type: 'object', properties: { success: { type: 'boolean', enum: [false] }, error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, requestId: { type: 'string' } } } } },
    },
  },
};

export function getOpenApiSpec() { return openApiSpec; }
