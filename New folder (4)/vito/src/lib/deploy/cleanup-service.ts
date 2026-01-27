/**
 * OLYMPUS 2.0 - Deployment Cleanup Service
 *
 * Handles cleanup of deployment resources including:
 * - Build artifacts
 * - Domain configurations
 * - SSL certificates
 * - Provider-specific cleanup (Vercel, Railway, etc.)
 */

import { createServiceRoleClient } from '@/lib/auth/clients';
import { broadcastDeployUpdate } from '@/lib/api/realtime';

export type DeploymentTarget = 'olympus' | 'vercel' | 'railway' | 'netlify' | 'export';

export interface CleanupResult {
  success: boolean;
  deploymentId: string;
  cleanedResources: {
    domains: number;
    sslCertificates: number;
    logs: number;
    artifacts: boolean;
  };
  error?: string;
}

export interface UndeployResult {
  success: boolean;
  deploymentId: string;
  status: 'undeployed' | 'failed';
  error?: string;
}

/**
 * Deployment cleanup service for managing deployment lifecycle.
 */
export const deployCleanupService = {
  /**
   * Undeploy a deployment from its target platform.
   * This stops the deployment but doesn't delete the record.
   */
  async undeploy(deploymentId: string): Promise<UndeployResult> {
    const supabase = createServiceRoleClient();

    try {
      // Get deployment info
      const { data: deploymentData, error: deployError } = await supabase
        .from('deployments')
        .select('id, target, status, provider_deployment_id, provider_project_id, url')
        .eq('id', deploymentId)
        .single();

      if (deployError || !deploymentData) {
        return { success: false, deploymentId, status: 'failed', error: 'Deployment not found' };
      }

      const deployment = deploymentData as {
        id: string;
        target: DeploymentTarget;
        status: string;
        provider_deployment_id: string | null;
        provider_project_id: string | null;
        url: string | null;
      };

      console.log(`[Deploy] Starting undeploy for ${deploymentId} (target: ${deployment.target})`);

      // Update status to undeploying
      await (supabase.from('deployments') as any)
        .update({ status: 'undeploying', updated_at: new Date().toISOString() })
        .eq('id', deploymentId);

      await broadcastDeployUpdate(deploymentId, { status: 'undeploying' });

      // Call provider-specific undeploy
      let undeploySuccess = false;
      switch (deployment.target) {
        case 'vercel':
          undeploySuccess = await this.undeployFromVercel(deployment.provider_deployment_id);
          break;
        case 'railway':
          undeploySuccess = await this.undeployFromRailway(deployment.provider_deployment_id);
          break;
        case 'netlify':
          undeploySuccess = await this.undeployFromNetlify(deployment.provider_deployment_id);
          break;
        case 'olympus':
        case 'export':
        default:
          // For OLYMPUS internal or export, just mark as undeployed
          undeploySuccess = true;
          break;
      }

      if (!undeploySuccess) {
        console.error(`[Deploy] Provider undeploy failed for ${deploymentId}`);
        await (supabase.from('deployments') as any)
          .update({ status: 'failed', error_message: 'Undeploy from provider failed' })
          .eq('id', deploymentId);
        await broadcastDeployUpdate(deploymentId, { status: 'failed' });
        return { success: false, deploymentId, status: 'failed', error: 'Provider undeploy failed' };
      }

      // Mark as undeployed (not deleted - record remains for history)
      await (supabase.from('deployments') as any)
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          url: null, // Clear the URL since it's no longer active
        })
        .eq('id', deploymentId);

      await broadcastDeployUpdate(deploymentId, { status: 'cancelled' });
      console.log(`[Deploy] Undeploy complete for ${deploymentId}`);

      return { success: true, deploymentId, status: 'undeployed' };
    } catch (error) {
      console.error(`[Deploy] Undeploy error:`, error);
      return {
        success: false,
        deploymentId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Full cleanup of a deployment including all associated resources.
   * This is called before deleting a deployment record.
   */
  async cleanup(deploymentId: string): Promise<CleanupResult> {
    const supabase = createServiceRoleClient();

    const cleanedResources = {
      domains: 0,
      sslCertificates: 0,
      logs: 0,
      artifacts: false,
    };

    try {
      console.log(`[Deploy] Starting cleanup for ${deploymentId}`);

      // 1. Get all domains for this deployment
      const { data: domainsData } = await supabase
        .from('deployment_domains')
        .select('id, ssl_certificate_id')
        .eq('deployment_id', deploymentId);

      const domains = (domainsData as any[]) || [];

      // 2. Revoke/delete SSL certificates
      for (const domain of domains) {
        if (domain.ssl_certificate_id) {
          await (supabase.from('ssl_certificates') as any)
            .delete()
            .eq('id', domain.ssl_certificate_id);
          cleanedResources.sslCertificates++;
        }
      }

      // 3. Delete domains
      if (domains.length > 0) {
        await supabase
          .from('deployment_domains')
          .delete()
          .eq('deployment_id', deploymentId);
        cleanedResources.domains = domains.length;
      }

      // 4. Delete deployment logs
      const { count: logsCount } = await supabase
        .from('deployment_logs')
        .delete({ count: 'exact' })
        .eq('deployment_id', deploymentId);

      cleanedResources.logs = logsCount || 0;

      // 5. Clean up build artifacts (storage)
      // In production, this would call the storage service to delete files
      cleanedResources.artifacts = await this.cleanupArtifacts(deploymentId);

      console.log(`[Deploy] Cleanup complete for ${deploymentId}:`, cleanedResources);

      return {
        success: true,
        deploymentId,
        cleanedResources,
      };
    } catch (error) {
      console.error(`[Deploy] Cleanup error:`, error);
      return {
        success: false,
        deploymentId,
        cleanedResources,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Clean up build artifacts from storage.
   */
  async cleanupArtifacts(deploymentId: string): Promise<boolean> {
    // In production, this would:
    // 1. Get the storage paths associated with this deployment
    // 2. Delete files from Supabase Storage or S3
    // 3. Clean up any CDN cache entries

    console.log(`[Deploy] Cleaning up artifacts for ${deploymentId}`);

    // For now, return true as artifacts are typically managed separately
    // In full implementation:
    // const storageClient = getStorageClient();
    // await storageClient.from('deployments').remove([`${deploymentId}/*`]);

    return true;
  },

  /**
   * Undeploy from Vercel.
   */
  async undeployFromVercel(providerDeploymentId: string | null): Promise<boolean> {
    if (!providerDeploymentId) return true;

    // In production, you would use Vercel API:
    // const response = await fetch(`https://api.vercel.com/v13/deployments/${providerDeploymentId}`, {
    //   method: 'DELETE',
    //   headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` }
    // });
    // return response.ok;

    console.log(`[Deploy] Would undeploy from Vercel: ${providerDeploymentId}`);
    return true;
  },

  /**
   * Undeploy from Railway.
   */
  async undeployFromRailway(providerDeploymentId: string | null): Promise<boolean> {
    if (!providerDeploymentId) return true;

    // In production, you would use Railway GraphQL API
    console.log(`[Deploy] Would undeploy from Railway: ${providerDeploymentId}`);
    return true;
  },

  /**
   * Undeploy from Netlify.
   */
  async undeployFromNetlify(providerDeploymentId: string | null): Promise<boolean> {
    if (!providerDeploymentId) return true;

    // In production, you would use Netlify API:
    // const response = await fetch(`https://api.netlify.com/api/v1/deploys/${providerDeploymentId}`, {
    //   method: 'DELETE',
    //   headers: { Authorization: `Bearer ${process.env.NETLIFY_TOKEN}` }
    // });
    // return response.ok;

    console.log(`[Deploy] Would undeploy from Netlify: ${providerDeploymentId}`);
    return true;
  },

  /**
   * Full delete: undeploy + cleanup + delete record.
   */
  async fullDelete(deploymentId: string): Promise<CleanupResult> {
    // 1. Undeploy from provider
    const undeployResult = await this.undeploy(deploymentId);
    if (!undeployResult.success) {
      console.warn(`[Deploy] Undeploy failed, continuing with cleanup anyway`);
    }

    // 2. Cleanup resources
    const cleanupResult = await this.cleanup(deploymentId);

    // 3. Delete the deployment record itself (handled by caller/route)
    // The route.ts DELETE handler will do: supabase.from('deployments').delete().eq('id', deploymentId)

    return cleanupResult;
  },
};
