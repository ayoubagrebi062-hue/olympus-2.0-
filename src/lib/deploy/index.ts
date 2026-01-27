/**
 * OLYMPUS 2.0 - Deploy Module
 * ===========================
 * Complete deployment lifecycle management.
 *
 * Usage:
 * ```typescript
 * import { sslService, deployCleanupService } from '@/lib/deploy';
 *
 * // Provision SSL for a domain
 * const result = await sslService.provision(domainId);
 *
 * // Cleanup a deployment
 * const cleanup = await deployCleanupService.fullDelete(deploymentId);
 * ```
 */

// SSL Service
export {
  sslService,
  type SSLProvider,
  type SSLStatus,
  type SSLProvisionResult,
  type SSLCertificate,
} from './ssl-service';

// Deployment Cleanup Service
export {
  deployCleanupService,
  type DeploymentTarget,
  type CleanupResult,
  type UndeployResult,
} from './cleanup-service';
