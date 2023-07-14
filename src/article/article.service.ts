import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { ArticleEntity } from './article.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeleteResult, Repository } from 'typeorm';
import slugify from 'slugify';

import { UserEntity } from '@app/user/user.entity';
import { IArticleResponse } from './types/article-response.interface';
import { UpdateArticleDto } from './dto/update-article.dto';
import { IArticlesResponse } from './types/articles-response.interface';
import { FollowEntity } from '@app/profile/follow.entity';

@Injectable()
export class ArticleService {
  constructor(
    @InjectRepository(ArticleEntity)
    private readonly articleRepository: Repository<ArticleEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(FollowEntity)
    private readonly followsRepository: Repository<FollowEntity>,
    private dataSource: DataSource,
  ) {}

  async createArticle(
    currentUser: UserEntity,
    createArticleDto: CreateArticleDto,
  ): Promise<ArticleEntity> {
    const newArticle = new ArticleEntity();
    Object.assign(newArticle, createArticleDto);

    if (!newArticle.tagList) {
      newArticle.tagList = [];
    }

    newArticle.slug = this.getSlug(createArticleDto.title);
    newArticle.author = currentUser;

    return await this.articleRepository.save(newArticle);
  }

  async getArticleBySlug(slug: string): Promise<ArticleEntity> {
    return await this.articleRepository.findOne({ where: { slug } });
  }

  async findAll(currentUserId: number, query: any): Promise<IArticlesResponse> {
    const queryBuilder = this.dataSource
      .getRepository(ArticleEntity)
      .createQueryBuilder('articles')
      .leftJoinAndSelect('articles.author', 'author');

    const articlesCount = await queryBuilder.getCount();

    if (query.tag) {
      queryBuilder.andWhere('articles.tagList LIKE :tag', {
        tag: `%${query.tag}%`,
      });
    }

    if (query.author) {
      const author = await this.userRepository.findOne({
        where: { username: query.author },
      });

      queryBuilder.andWhere('articles.authorId = :id', {
        id: author.id,
      });
    }

    if (query.favorited) {
      const author = await this.userRepository.findOne({
        where: { username: query.favorited },
        relations: ['favorites'],
      });

      const ids = author.favorites.map((el) => el.id);

      if (ids) {
        queryBuilder.andWhere('articles.id IN (:...ids)', {
          ids,
        });
      } else {
        queryBuilder.andWhere('1=0');
      }
    }

    queryBuilder.orderBy('articles.createdAt', 'DESC');

    if (query.limit) {
      queryBuilder.limit(query.limit);
    }

    if (query.offset) {
      queryBuilder.offset(query.offset);
    }

    let favoritedIds = [];

    if (currentUserId) {
      const currentUser = await this.userRepository.findOne({
        where: { id: currentUserId },
        relations: ['favorites'],
      });

      favoritedIds = currentUser.favorites.map((favorite) => favorite.id);
    }

    const articles = await queryBuilder.getMany();

    const articlesWithFavorited = articles.map((article: ArticleEntity) => {
      const favorited = favoritedIds.includes(article.id);
      return { ...article, favorited };
    });

    return {
      articles: articlesWithFavorited,
      articlesCount,
    };
  }

  async getFeed(currentUserId: number, query: any): Promise<IArticlesResponse> {
    const follows = await this.followsRepository.find({
      where: {
        followerId: currentUserId,
      },
    });

    if (!follows.length) {
      return {
        articles: [],
        articlesCount: 0,
      };
    }

    const followingUserIds = follows.map((follow) => follow.followingId);

    const queryBuilder = this.dataSource
      .getRepository(ArticleEntity)
      .createQueryBuilder('articles')
      .leftJoinAndSelect('articles.author', 'author')
      .where(`articles.authorId IN (:...ids)`, { ids: followingUserIds });

    queryBuilder.orderBy('articles.createdAt', 'DESC');

    if (query) {
      if (query.limit) {
        queryBuilder.limit(query.limit);
      }

      if (query.offset) {
        queryBuilder.offset(query.offset);
      }
    }

    const articles = await queryBuilder.getMany();

    return {
      articles,
      articlesCount: articles.length,
    };
  }

  async updateArticle(
    currentUserId: number,
    slug: string,
    updateArticleDto: UpdateArticleDto,
  ): Promise<ArticleEntity> {
    const article = await this.getArticleBySlug(slug);

    if (!article) {
      throw new HttpException('Article does not exists', HttpStatus.NOT_FOUND);
    }

    if (article.author.id !== currentUserId) {
      throw new HttpException('You are not an author', HttpStatus.FORBIDDEN);
    }

    if (updateArticleDto.title && article.title !== updateArticleDto.title) {
      article.slug = this.getSlug(article.title);
    }

    Object.assign(article, updateArticleDto);

    return await this.articleRepository.save(article);
  }

  async deleteArticle(
    currentUserId: number,
    slug: string,
  ): Promise<DeleteResult> {
    const article = await this.getArticleBySlug(slug);

    if (!article) {
      throw new HttpException('Article does not exists', HttpStatus.NOT_FOUND);
    }

    if (article.author.id !== currentUserId) {
      throw new HttpException('You are not an author', HttpStatus.FORBIDDEN);
    }

    return await this.articleRepository.delete({ slug });
  }

  buildArticleResponse(article: ArticleEntity): IArticleResponse {
    return { article };
  }

  async addArticleToFavorites(
    currentUserId: number,
    slug: string,
  ): Promise<ArticleEntity> {
    const article = await this.getArticleBySlug(slug);

    if (!article) {
      throw new HttpException('Article does not exists', HttpStatus.NOT_FOUND);
    }

    const user = await this.userRepository.findOne({
      where: { id: currentUserId },
      relations: ['favorites'],
    });

    const isNotFavorited =
      user.favorites.findIndex(
        (articleInFavorites) => articleInFavorites.id === article.id,
      ) === -1;

    if (isNotFavorited) {
      user.favorites.push(article);
      article.favoritesCount++;
      await this.userRepository.save(user);
      await this.articleRepository.save(article);
    }

    return article;
  }

  async removeArticleFromFavorites(
    currentUserId: number,
    slug: string,
  ): Promise<ArticleEntity> {
    const article = await this.getArticleBySlug(slug);

    if (!article) {
      throw new HttpException('Article does not exists', HttpStatus.NOT_FOUND);
    }

    const user = await this.userRepository.findOne({
      where: { id: currentUserId },
      relations: ['favorites'],
    });

    const isFavoritedIndex = user.favorites.findIndex(
      (articleInFavorites) => articleInFavorites.id === article.id,
    );

    if (isFavoritedIndex >= 0) {
      user.favorites.splice(isFavoritedIndex, 1);
      article.favoritesCount--;
      await this.userRepository.save(user);
      await this.articleRepository.save(article);
    }

    return article;
  }

  private getSlug(title: string): string {
    return (
      slugify(title, { lower: true }) +
      '-' +
      ((Math.random() * Math.pow(36, 6)) | 0).toString(36)
    );
  }
}
