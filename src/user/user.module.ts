import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from '@user/user.controller';
import { UserService } from '@user/user.service';
import { UserEntity } from '@user/user.entity';
import { AuthGuard } from './guards/auth.guard';

@Module({
  controllers: [UserController],
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [UserService, JwtService, AuthGuard],
  exports: [UserService],
})
export class UserModule {}
