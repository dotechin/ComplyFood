import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Entries may contain `*` to match one DNS label segment, e.g.
// https://complyfood-*-photonics-power-labs.vercel.app for Vercel preview deployments.
function buildAllowedOrigins(value: string): (string | RegExp)[] {
  return value
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean)
    .map((url) => {
      if (!url.includes('*')) return url;
      const escaped = url
        .split('*')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('[a-z0-9-]+');
      return new RegExp(`^${escaped}$`);
    });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: buildAllowedOrigins(process.env.WEB_URL || 'http://localhost:3000'),
    credentials: true,
  });
  await app.listen(process.env.PORT || 4000);
}
bootstrap();
