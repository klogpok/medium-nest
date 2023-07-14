import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '@user/user.entity';
import { CreateUserDto } from '@user/dto/createUser.dto';
import { LoginUserDto } from '@user/dto/loginUser.dto';
import { JWT_SECRET } from '@app/constrants';
import { IUserResponse } from '@user/types/userResponse.interface';
import { compare } from 'bcrypt';
import { UpdateUserDto } from './dto/updateUser.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private jwtService: JwtService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserEntity> {
    const errorsResponse = { errors: {} };

    const userByEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    const userByUsername = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });

    if (userByEmail) {
      errorsResponse.errors['email'] = 'has already beeb taken';
    }

    if (userByUsername) {
      errorsResponse.errors['username'] = 'has already beeb taken';
    }

    if (userByEmail || userByUsername) {
      throw new HttpException(errorsResponse, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    const newUser = new UserEntity();
    Object.assign(newUser, createUserDto);
    return await this.userRepository.save(newUser);
  }

  async loginUser(loginUserDto: LoginUserDto): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { email: loginUserDto.email },
      select: ['id', 'username', 'email', 'bio', 'image', 'password'],
    });

    const isValidUser =
      !!user && (await compare(loginUserDto.password, user.password));

    if (!isValidUser) {
      const errorsResponse = {
        errors: { 'email or password': 'Credentials are not valid' },
      };

      throw new HttpException(errorsResponse, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    return user;
  }

  async updateUser(
    currentUserId: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UserEntity> {
    const user = await this.findById(currentUserId);
    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async findById(id: number): Promise<UserEntity> {
    return await this.userRepository.findOne({ where: { id } });
  }

  async getCurrentUser() {
    return await this.userRepository.find();
  }

  generateJwt(user: UserEntity): string {
    return this.jwtService.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      {
        secret: JWT_SECRET,
      },
    );
  }

  async isExistentUser(createUserDto: CreateUserDto): Promise<boolean> {
    const userByEmail = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    const userByUsername = await this.userRepository.findOne({
      where: { username: createUserDto.username },
    });

    return Boolean(userByEmail || userByUsername);
  }

  buildUserResponse(user: UserEntity): IUserResponse {
    delete user.password;

    return {
      user: {
        ...user,
        token: this.generateJwt(user),
      },
    };
  }
}
