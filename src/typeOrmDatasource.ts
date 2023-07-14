import { DataSource } from 'typeorm';
import config from '@app/typeOrm.config';

export default new DataSource(config);
