import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CoursesModule } from './courses/courses.module';
import { AuthModule } from './auth/auth.module';
import { ExamsModule } from './exams/exams.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [PrismaModule, CoursesModule, AuthModule, ExamsModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
