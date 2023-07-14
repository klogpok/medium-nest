import { UserEntity } from '@user/user.entity';

export type UserType = Pick<
  UserEntity,
  Exclude<keyof UserEntity, 'hashPassword' | 'password'>
>;
