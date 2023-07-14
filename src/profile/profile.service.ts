import { UserEntity } from '@app/user/user.entity';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IProfileResponse } from './types/profile-response.interface';
import { ProfileType } from './types/profile.type';
import { FollowEntity } from './follow.entity';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(FollowEntity)
    private readonly followsRepository: Repository<FollowEntity>,
  ) {}

  async getProfile(
    currentUserId: number,
    profileUsername: string,
  ): Promise<ProfileType> {
    const user = await this.userRepository.findOne({
      where: {
        username: profileUsername,
      },
    });

    if (!user) {
      throw new HttpException(
        'User does not exists',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const follow = await this.getFollow(currentUserId, user.id);

    return {
      ...user,
      following: Boolean(follow),
    };
  }

  async followProfile(
    currentUserId: number,
    profileUsername: string,
  ): Promise<ProfileType> {
    const user = await this.userRepository.findOne({
      where: {
        username: profileUsername,
      },
    });

    if (!user) {
      throw new HttpException(
        'User does not exists',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (currentUserId === user.id) {
      throw new HttpException(
        'Follower and following cant be equal',
        HttpStatus.BAD_REQUEST,
      );
    }

    const follow = await this.getFollow(currentUserId, user.id);

    if (!follow) {
      const followToCreate = new FollowEntity();
      followToCreate.followerId = currentUserId;
      followToCreate.followingId = user.id;
      await this.followsRepository.save(followToCreate);
    }

    return {
      ...user,
      following: true,
    };
  }

  async unfollowProfile(
    currentUserId: number,
    profileUsername: string,
  ): Promise<ProfileType> {
    const user = await this.userRepository.findOne({
      where: {
        username: profileUsername,
      },
    });

    if (!user) {
      throw new HttpException(
        'User does not exists',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (currentUserId === user.id) {
      throw new HttpException(
        'Follower and following cant be equal',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.followsRepository.delete({
      followerId: currentUserId,
      followingId: user.id,
    });

    return {
      ...user,
      following: false,
    };
  }

  private async getFollow(
    currentUserId: number,
    userId: number,
  ): Promise<FollowEntity> {
    return await this.followsRepository.findOne({
      where: {
        followerId: currentUserId,
        followingId: userId,
      },
    });
  }

  buildProfileResponse(profile: ProfileType): IProfileResponse {
    delete profile.email;
    return { profile };
  }
}
