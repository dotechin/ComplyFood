import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: any) => {
          const cookieHeader = request?.headers?.cookie;
          if (!cookieHeader) return null;
          const token = cookieHeader
            .split(';')
            .map((part: string) => part.trim())
            .find((part: string) => part.startsWith('auth_token='));
          return token ? decodeURIComponent(token.split('=').slice(1).join('=')) : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, email: payload.email, role: payload.role, orgId: payload.orgId };
  }
}
