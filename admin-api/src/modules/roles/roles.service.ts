// src/modules/roles/roles.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto) {
    return this.prisma.role.create({
      data: {
        name: createRoleDto.name,
        description: createRoleDto.description,
        permissions: {
          connect: createRoleDto.permissionIds.map(id => ({ id })),
        },
      },
      include: {
        permissions: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        permissions: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    await this.findOne(id); // Check if role exists

    return this.prisma.role.update({
      where: { id },
      data: {
        name: updateRoleDto.name,
        description: updateRoleDto.description,
        permissions: updateRoleDto.permissionIds ? {
          set: updateRoleDto.permissionIds.map(id => ({ id })),
        } : undefined,
      },
      include: {
        permissions: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id); // Check if role exists

    // Check if role has users
    const roleWithUsers = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (roleWithUsers._count.users > 0) {
      throw new NotFoundException('Cannot delete role with assigned users');
    }

    return this.prisma.role.delete({
      where: { id },
    });
  }
}