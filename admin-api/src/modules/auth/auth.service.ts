import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type SafeUser = {
  id: number;
  email: string;
  name: string;
  role?: { id?: number; name?: string } | string | null;
  roleId?: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwt: JwtService,
  ) {}

  private async validateUserOrThrow(email: string, password: string): Promise<SafeUser> {
    const user = await this.usersService.findByEmail(email); // include role: true
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _omit, ...safe } = user;
    return safe as SafeUser;
  }

  private async buildAccessToken(user: SafeUser) {
    const roleName =
      typeof user.role === 'string' ? user.role : (user.role as any)?.name;

    const payload = {
      sub: user.id,
      email: user.email,
      role: roleName,
    };

    const access_token = await this.jwt.signAsync(payload, { expiresIn: '7d' });
    return { access_token };
  }

  async login({ email, password }: LoginDto) {
    const user = await this.validateUserOrThrow(email, password);
    const token = await this.buildAccessToken(user);
    return {
      ...token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: typeof user.role === 'string' ? user.role : (user.role as any)?.name,
      },
    };
  }

  async register(dto: RegisterDto) {
    const exists = await this.usersService.findByEmail(dto.email);
    if (exists) throw new BadRequestException('User already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const created = await this.usersService.create({
      ...dto,
      password: hashedPassword,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _omit, ...safe } = created;

    const token = await this.buildAccessToken(safe as SafeUser);
    return {
      ...token,
      user: {
        id: created.id,
        email: created.email,
        name: created.name,
        role:
          typeof created.role === 'string'
            ? created.role
            : (created as any).role?.name,
      },
    };
  }
}
