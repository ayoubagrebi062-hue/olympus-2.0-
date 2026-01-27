import { NextResponse } from 'next/server';
import { z } from 'zod';

const dashboardStatsSchema = z.object({
  totalUsers: z.number(),
  activeUsers: z.number(),
  totalRevenue: z.number(),
  totalOrders: z.number(),
  growthRate: z.number(),
});

type DashboardStats = z.infer<typeof dashboardStatsSchema>;

export async function GET() {
  try {
    // Mock dashboard stats
    const stats: DashboardStats = {
      totalUsers: 1250,
      activeUsers: 847,
      totalRevenue: 125000,
      totalOrders: 3420,
      growthRate: 12.5,
    };

    // Validate the response
    const validatedStats = dashboardStatsSchema.parse(stats);

    return NextResponse.json({
      data: validatedStats,
      success: true,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to fetch dashboard stats' } },
      { status: 500 }
    );
  }
}
