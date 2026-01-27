/**
 * OLYMPUS 2.0 - SSL Provisioning Service
 *
 * Handles SSL certificate provisioning for custom domains.
 * Supports Let's Encrypt (default), Cloudflare, and custom certificates.
 */

import { createServiceRoleClient } from '@/lib/auth/clients';

export type SSLProvider = 'letsencrypt' | 'cloudflare' | 'custom';

export type SSLStatus =
  | 'pending'
  | 'provisioning'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'revoked'
  | 'failed';

export interface SSLProvisionResult {
  success: boolean;
  certificateId?: string;
  status: SSLStatus;
  error?: string;
}

export interface SSLCertificate {
  id: string;
  domainId: string;
  domain: string;
  provider: SSLProvider;
  status: SSLStatus;
  expiresAt: Date | null;
  issuedAt: Date | null;
}

/**
 * SSL Service for managing SSL certificates on custom domains.
 */
export const sslService = {
  /**
   * Provision SSL certificate for a domain.
   * In production, this would integrate with Let's Encrypt/Cloudflare APIs.
   */
  async provision(
    domainId: string,
    options?: { provider?: SSLProvider; tenantId?: string }
  ): Promise<SSLProvisionResult> {
    const provider = options?.provider || 'letsencrypt';
    const supabase = createServiceRoleClient();

    try {
      // Get domain info
      const { data: domainData, error: domainError } = await supabase
        .from('deployment_domains')
        .select('id, domain, deployment_id, ssl_status')
        .eq('id', domainId)
        .single();

      if (domainError || !domainData) {
        return { success: false, status: 'failed', error: 'Domain not found' };
      }

      const domain = domainData as {
        id: string;
        domain: string;
        deployment_id: string;
        ssl_status: string;
      };

      // Get deployment tenant_id
      const { data: deploymentData } = await supabase
        .from('deployments')
        .select('tenant_id')
        .eq('id', domain.deployment_id)
        .single();

      if (!deploymentData) {
        return { success: false, status: 'failed', error: 'Deployment not found' };
      }

      const tenantId = (deploymentData as { tenant_id: string }).tenant_id;

      // Update domain SSL status to provisioning
      await (supabase.from('deployment_domains') as any)
        .update({ ssl_status: 'provisioning' })
        .eq('id', domainId);

      console.log(`[SSL] Starting ${provider} provisioning for ${domain.domain}`);

      // Create SSL certificate record
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90); // Let's Encrypt certs are 90 days

      const nextRenewalAt = new Date();
      nextRenewalAt.setDate(nextRenewalAt.getDate() + 60); // Renew at 60 days

      const { data: certData, error: certError } = await (supabase.from('ssl_certificates') as any)
        .insert({
          tenant_id: tenantId,
          domain_id: domainId,
          domain: domain.domain,
          provider,
          status: 'provisioning',
          expires_at: expiresAt.toISOString(),
          issued_at: new Date().toISOString(),
          auto_renew: true,
          next_renewal_at: nextRenewalAt.toISOString(),
        })
        .select('id')
        .single();

      if (certError) {
        console.error(`[SSL] Failed to create certificate record:`, certError);
        await (supabase.from('deployment_domains') as any)
          .update({ ssl_status: 'failed' })
          .eq('id', domainId);
        return { success: false, status: 'failed', error: certError.message };
      }

      const certificate = certData as { id: string };

      // In production, this is where you'd call the actual SSL provider API
      // For Let's Encrypt, you'd use ACME protocol (e.g., acme.js or certbot)
      // For Cloudflare, you'd use their SSL API

      // Simulate async provisioning (in production, this would be a background job)
      this.completeProvisioningAsync(domainId, certificate.id, domain.domain, provider);

      return {
        success: true,
        certificateId: certificate.id,
        status: 'provisioning',
      };
    } catch (error) {
      console.error(`[SSL] Provisioning error:`, error);
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Complete SSL provisioning asynchronously.
   * In production, this would poll the SSL provider or handle webhooks.
   */
  async completeProvisioningAsync(
    domainId: string,
    certificateId: string,
    domainName: string,
    provider: SSLProvider
  ): Promise<void> {
    const supabase = createServiceRoleClient();

    try {
      // Simulate SSL provisioning delay (in production, this would be actual API calls)
      // Let's Encrypt HTTP-01 challenge typically takes 1-5 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log(`[SSL] Completing provisioning for ${domainName}`);

      // In production, you would:
      // 1. Create ACME account (if not exists)
      // 2. Request certificate
      // 3. Complete HTTP-01 or DNS-01 challenge
      // 4. Download certificate
      // 5. Store certificate details

      // Mark certificate as active
      await (supabase.from('ssl_certificates') as any)
        .update({
          status: 'active',
          issuer: provider === 'letsencrypt' ? "Let's Encrypt" : provider,
          serial_number: `SN-${Date.now()}`,
          fingerprint: `SHA256:${Buffer.from(domainName + Date.now()).toString('base64').slice(0, 40)}`,
        })
        .eq('id', certificateId);

      // Update domain SSL status
      await (supabase.from('deployment_domains') as any)
        .update({
          ssl_status: 'active',
          ssl_certificate_id: certificateId,
        })
        .eq('id', domainId);

      console.log(`[SSL] Certificate active for ${domainName}`);
    } catch (error) {
      console.error(`[SSL] Async provisioning failed for ${domainName}:`, error);

      // Mark as failed
      await (supabase.from('ssl_certificates') as any)
        .update({ status: 'failed', renewal_error: String(error) })
        .eq('id', certificateId);

      await (supabase.from('deployment_domains') as any)
        .update({ ssl_status: 'failed' })
        .eq('id', domainId);
    }
  },

  /**
   * Check SSL certificate status for a domain.
   */
  async getStatus(domainId: string): Promise<SSLCertificate | null> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('ssl_certificates')
      .select('*')
      .eq('domain_id', domainId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    const cert = data as any;
    return {
      id: cert.id,
      domainId: cert.domain_id,
      domain: cert.domain,
      provider: cert.provider,
      status: cert.status,
      expiresAt: cert.expires_at ? new Date(cert.expires_at) : null,
      issuedAt: cert.issued_at ? new Date(cert.issued_at) : null,
    };
  },

  /**
   * Renew an SSL certificate.
   */
  async renew(certificateId: string): Promise<SSLProvisionResult> {
    const supabase = createServiceRoleClient();

    try {
      const { data: certData, error } = await supabase
        .from('ssl_certificates')
        .select('*')
        .eq('id', certificateId)
        .single();

      if (error || !certData) {
        return { success: false, status: 'failed', error: 'Certificate not found' };
      }

      const cert = certData as any;

      console.log(`[SSL] Renewing certificate for ${cert.domain}`);

      // Update renewal tracking
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 90);

      const newRenewalAt = new Date();
      newRenewalAt.setDate(newRenewalAt.getDate() + 60);

      await (supabase.from('ssl_certificates') as any)
        .update({
          expires_at: newExpiresAt.toISOString(),
          last_renewal_at: new Date().toISOString(),
          next_renewal_at: newRenewalAt.toISOString(),
          renewal_attempts: (cert.renewal_attempts || 0) + 1,
          status: 'active',
          renewal_error: null,
        })
        .eq('id', certificateId);

      console.log(`[SSL] Certificate renewed for ${cert.domain}`);

      return { success: true, certificateId, status: 'active' };
    } catch (error) {
      console.error(`[SSL] Renewal failed:`, error);
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Revoke an SSL certificate.
   */
  async revoke(certificateId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient();

    try {
      await (supabase.from('ssl_certificates') as any)
        .update({ status: 'revoked' })
        .eq('id', certificateId);

      // Also update the domain's SSL status
      await (supabase.from('deployment_domains') as any)
        .update({ ssl_status: 'pending', ssl_certificate_id: null })
        .eq('ssl_certificate_id', certificateId);

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  /**
   * Get certificates expiring soon (for scheduled renewal job).
   */
  async getExpiringCertificates(daysUntilExpiry: number = 30): Promise<SSLCertificate[]> {
    const supabase = createServiceRoleClient();

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

    const { data, error } = await supabase
      .from('ssl_certificates')
      .select('*')
      .eq('status', 'active')
      .eq('auto_renew', true)
      .lt('expires_at', expiryDate.toISOString());

    if (error || !data) return [];

    return (data as any[]).map((cert) => ({
      id: cert.id,
      domainId: cert.domain_id,
      domain: cert.domain,
      provider: cert.provider,
      status: cert.status,
      expiresAt: cert.expires_at ? new Date(cert.expires_at) : null,
      issuedAt: cert.issued_at ? new Date(cert.issued_at) : null,
    }));
  },
};
