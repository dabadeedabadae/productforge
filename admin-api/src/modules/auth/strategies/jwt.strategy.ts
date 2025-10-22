import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

type JwtPayload = {
  sub: number;   // user id
  email: string;
  role: string;  // role name
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload) {
    // На каждый запрос подтягиваем пользователя + его роль + permissions
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: {
          include: { permissions: true },
        },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    // вернём компактный объект в req.user
    return {
      id: user.id,
      email: user.email,
      role: user.role?.name ?? null,
      permissions: (user.role?.permissions ?? []).map((p) => p.name),
    };
  }
}
