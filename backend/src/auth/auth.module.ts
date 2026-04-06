import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: 'chave-secreta-spa-temporaria', // Em prod, usaremos variável de ambiente
      signOptions: { expiresIn: '7d' }, // O login dura 7 dias
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}