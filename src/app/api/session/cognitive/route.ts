import { NextRequest, NextResponse } from 'next/server';
import { cognitiveSessionManager } from '@/lib/agents/session/cognitive/manager';
import { getSmartSuggestions, getPrefilledConfig } from '@/lib/agents/session/cognitive/integration';
import { trackError } from '@/lib/observability/error-tracker';

export const dynamic = 'force-dynamic';

/**
 * GET /api/session/cognitive
 *
 * Required headers:
 * - x-user-id: User identifier
 * - authorization: Bearer token (required in production)
 *
 * Query params:
 * - action: 'dashboard' | 'suggestions' | 'context' | 'prefill' (optional)
 *
 * Returns cognitive session data based on action
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '');

  // PATCH 1: Require user ID
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'User ID required in x-user-id header' },
      { status: 401 }
    );
  }

  // PATCH 1: Require authorization token
  // In production, validate authToken against your auth system (JWT, session, etc.)
  if (!authToken) {
    return NextResponse.json(
      { success: false, error: 'Authorization token required' },
      { status: 401 }
    );
  }

  // Validate token format (basic check - in production, verify JWT signature)
  if (authToken.length < 10) {
    return NextResponse.json(
      { success: false, error: 'Invalid authorization token' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'dashboard': {
        const dashboard = await cognitiveSessionManager.getDashboard(userId);
        return NextResponse.json({
          success: true,
          data: dashboard,
          timestamp: Date.now(),
        });
      }

      case 'suggestions': {
        const suggestions = await getSmartSuggestions(userId);
        return NextResponse.json({
          success: true,
          data: suggestions,
          timestamp: Date.now(),
        });
      }

      case 'context': {
        const context = await cognitiveSessionManager.getAgentContext(userId);
        return NextResponse.json({
          success: true,
          data: context,
          timestamp: Date.now(),
        });
      }

      case 'prefill': {
        const buildType = searchParams.get('buildType') ?? undefined;
        const prefill = await getPrefilledConfig(userId, buildType);
        return NextResponse.json({
          success: true,
          data: prefill,
          timestamp: Date.now(),
        });
      }

      case 'prompt': {
        const prompt = await cognitiveSessionManager.getPersonalizedPrompt(userId);
        return NextResponse.json({
          success: true,
          data: { prompt },
          timestamp: Date.now(),
        });
      }

      default: {
        // Return session overview
        const { session } = await cognitiveSessionManager.getSession(userId);
        return NextResponse.json({
          success: true,
          data: {
            identity: {
              userId: session.identity.userId,
              expertiseLevel: session.identity.expertiseLevel,
              expertiseConfidence: session.identity.expertiseConfidence,
              totalBuilds: session.identity.totalBuilds,
              totalSessions: session.identity.totalSessions,
              firstSeen: session.identity.firstSeen,
              lastSeen: session.identity.lastSeen,
            },
            stats: {
              totalBuilds: session.builds.length,
              totalLearnings: session.learnings.length,
              activePredictions: session.predictions.filter(p => p.expiresAt > new Date()).length,
              evolutionCount: session.evolution.length,
            },
            version: session.version,
            lastUpdated: session.lastUpdated,
          },
          timestamp: Date.now(),
        });
      }
    }
  } catch (error) {
    trackError(error instanceof Error ? error : new Error(String(error)), {
      type: 'api',
      metadata: { operation: 'GET /api/session/cognitive', action, userId },
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cognitive session data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/session/cognitive
 *
 * Required headers:
 * - x-user-id: User identifier
 * - authorization: Bearer token
 *
 * Body:
 * - action: 'feedback' | 'preference' | 'maintenance' | 'communication' | 'domain' | 'verify'
 * - ...action-specific fields
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '');

  // PATCH 1: Require user ID
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'User ID required in x-user-id header' },
      { status: 401 }
    );
  }

  // PATCH 1: Require authorization token
  if (!authToken || authToken.length < 10) {
    return NextResponse.json(
      { success: false, error: 'Valid authorization token required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'feedback': {
        const { buildId, rating, feedback } = body;
        if (!buildId || rating === undefined) {
          return NextResponse.json(
            { success: false, error: 'buildId and rating are required' },
            { status: 400 }
          );
        }
        await cognitiveSessionManager.recordFeedback(userId, buildId, rating, feedback);
        return NextResponse.json({ success: true, message: 'Feedback recorded' });
      }

      case 'preference': {
        const { category, key, value } = body;
        if (!category || !key || value === undefined) {
          return NextResponse.json(
            { success: false, error: 'category, key, and value are required' },
            { status: 400 }
          );
        }
        await cognitiveSessionManager.setPreference(userId, category, key, value);
        return NextResponse.json({ success: true, message: 'Preference saved' });
      }

      case 'maintenance': {
        await cognitiveSessionManager.maintenance(userId);
        return NextResponse.json({ success: true, message: 'Maintenance completed' });
      }

      case 'communication': {
        const { style } = body;
        if (!style) {
          return NextResponse.json(
            { success: false, error: 'style object is required' },
            { status: 400 }
          );
        }
        await cognitiveSessionManager.updateCommunicationStyle(userId, style);
        return NextResponse.json({ success: true, message: 'Communication style updated' });
      }

      case 'domain': {
        const { domain, proficiency } = body;
        if (!domain || proficiency === undefined) {
          return NextResponse.json(
            { success: false, error: 'domain and proficiency are required' },
            { status: 400 }
          );
        }
        await cognitiveSessionManager.addDomainExpertise(userId, domain, proficiency);
        return NextResponse.json({ success: true, message: 'Domain expertise added' });
      }

      case 'verify': {
        const { predictionId, wasCorrect } = body;
        if (!predictionId || wasCorrect === undefined) {
          return NextResponse.json(
            { success: false, error: 'predictionId and wasCorrect are required' },
            { status: 400 }
          );
        }
        await cognitiveSessionManager.verifyPrediction(userId, predictionId, wasCorrect);
        return NextResponse.json({ success: true, message: 'Prediction verified' });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    trackError(error instanceof Error ? error : new Error(String(error)), {
      type: 'api',
      metadata: { operation: 'POST /api/session/cognitive', userId },
    });
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/session/cognitive
 *
 * Required headers:
 * - x-user-id: User identifier
 * - authorization: Bearer token
 *
 * Clears the cognitive session for the user
 */
export async function DELETE(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '');

  // PATCH 1: Require user ID
  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'User ID required in x-user-id header' },
      { status: 401 }
    );
  }

  // PATCH 1: Require authorization token
  if (!authToken || authToken.length < 10) {
    return NextResponse.json(
      { success: false, error: 'Valid authorization token required' },
      { status: 401 }
    );
  }

  try {
    const deleted = await cognitiveSessionManager.clearSession(userId);
    return NextResponse.json({
      success: true,
      message: deleted ? 'Session cleared' : 'No session found',
    });
  } catch (error) {
    trackError(error instanceof Error ? error : new Error(String(error)), {
      type: 'api',
      metadata: { operation: 'DELETE /api/session/cognitive', userId },
    });
    return NextResponse.json(
      { success: false, error: 'Failed to clear session' },
      { status: 500 }
    );
  }
}
