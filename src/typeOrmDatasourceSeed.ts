import { DataSource } from 'typeorm';
import config from '@app/typeOrmSeed.config';

export default new DataSource(config);
