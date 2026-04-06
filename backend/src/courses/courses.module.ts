import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule.register({ secret: 'chave-secreta-spa-temporaria' })],
  controllers: [CoursesController],
  providers: [CoursesService],
})
export class CoursesModule {}