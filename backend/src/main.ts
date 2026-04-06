import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilita o CORS para permitir que o seu HTML local acesse esta API
  app.enableCors();
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
