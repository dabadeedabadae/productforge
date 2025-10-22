import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

function toSeconds(input?: string | null): number {
  if (!input) return 7 * 24 * 60 * 60; // 7d по умолчанию
  // если просто число — считаем секундами
  const n = Number(input);
  if (!Number.isNaN(n)) return n;

  // поддержим суффиксы: s, m, h, d
  const m = input.match(/^(\d+)\s*([smhd])$/i);
  if (!m) return 7 * 24 * 60 * 60;
  const value = Number(m[1]);
  const unit = m[2].toLowerCase();
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    default:  return 7 * 24 * 60 * 60;
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET')!;
        const expiresRaw = config.get<string>('JWT_EXPIRES_IN'); // например, "7d" или "604800"
        const expiresIn = toSeconds(expiresRaw);                 // <-- число секунд
        return {
          secret,
          signOptions: { expiresIn }, // тип: number — компилятору ок
        };
      },
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
