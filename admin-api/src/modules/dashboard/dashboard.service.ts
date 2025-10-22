// src/modules/dashboard/dashboard.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      totalUsers,
      activeUsers,
      totalRoles,
      totalPermissions,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.role.count(),
      this.prisma.permission.count(),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { role: true },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalRoles,
      totalPermissions,
      recentUsers,
    };
  }
}