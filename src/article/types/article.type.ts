import { ArticleEntity } from '../article.entity';

export type ArticleType = Pick<
  ArticleEntity,
  Exclude<keyof ArticleEntity, 'updateTimestamp'>
>;
