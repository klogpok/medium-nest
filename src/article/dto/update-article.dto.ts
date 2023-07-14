import { IsNotEmpty } from 'class-validator';

export class UpdateArticleDto {
  @IsNotEmpty()
  readonly title: string;

  readonly description: string;

  @IsNotEmpty()
  readonly body: string;

  readonly tagList?: string[];
}
