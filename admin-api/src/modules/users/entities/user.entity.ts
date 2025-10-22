// src/modules/users/entities/user.entity.ts
export class User {
  id: number;
  email: string;
  name: string;
  roleId: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}