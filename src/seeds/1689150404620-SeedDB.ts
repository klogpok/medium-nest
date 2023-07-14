import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTags1689150404620 implements MigrationInterface {
  name = 'CreateTags1689150404620';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO tags (name) VALUES ('dragons'), ('eggs'), ('nestjs')`,
    );

    // password is 'test'
    await queryRunner.query(
      `INSERT INTO users (email, username, password) VALUES ('test@gmail.com', 'test', '$2b$10$noXukWaVlqa1U90mL5bX.OCzK4x6h.mE0OaVcQ4aDl7ExRTLqesnG')`,
    );

    await queryRunner.query(
      `INSERT INTO articles(
        slug, title, description, body, "tagList", "authorId")
        VALUES ('first-article', 'First article title', 'First article description' , 'First article body', 'egges', 1), ('second-article', 'Second article title', 'Second article description' , 'Second article body', 'dragons', 1)`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public async down(): Promise<void> {}
}
