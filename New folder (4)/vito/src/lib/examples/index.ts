/**
 * OLYMPUS 2.0 - Example Database Module
 *
 * Provides access to high-quality code examples for RAG-based generation.
 */

export {
  searchExamples,
  getExamplesByType,
  getExamplesByCategory,
  getHighQualityExamples,
  loadExamples,
  indexExamples,
  parseJSDocMetadata,
  COLLECTION_NAME,
} from '../../scripts/index-examples';

// Re-export types for convenience
export interface ExampleSearchOptions {
  limit?: number;
  fileType?: 'component' | 'schema' | 'api' | 'pattern';
  category?: string;
  minQuality?: number;
  tags?: string[];
}

export interface ExampleResult {
  name: string;
  description: string;
  filePath: string;
  fileType: string;
  category: string;
  quality: number;
  tags: string[];
  codePreview: string;
  similarity: number;
}
