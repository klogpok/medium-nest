import config from '@app/typeOrm.config';

const seedConfig = {
  ...config,
  migrations: ['src/seeds/*.ts'],
};

export default seedConfig;
