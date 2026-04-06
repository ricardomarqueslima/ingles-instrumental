import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: 'chave-secreta-spa-temporaria',
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}