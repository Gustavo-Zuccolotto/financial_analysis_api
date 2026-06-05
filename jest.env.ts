// This file runs before test framework setup and before any test file imports.
// Setting NODE_ENV here prevents src/index.ts from binding an HTTP server.
process.env.NODE_ENV = 'test'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
