import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: 'chave-secreta-spa-temporaria',
    }),
  ],
  controllers: [ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}