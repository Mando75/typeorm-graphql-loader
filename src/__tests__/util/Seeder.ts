import { Connection, EntityManager } from "typeorm";
import { Author, Book, DecoratorTest, Publisher, Review } from "../entity";
import * as faker from "faker";

export class Seeder {
  private readonly NUM_AUTHORS = 10;
  private readonly NUM_PUBLISHERS = 3;
  private readonly NUM_BOOKS = 50;
  private readonly NUM_REVIEWS = 100;
  private readonly NUM_DECORATOR_TESTS = 10;

  constructor(private conn: Connection) {}

  public static addressFactory() {
    return {
      street: faker.address.streetAddress(),
      street2: faker.address.secondaryAddress(),
      city: faker.address.city(),
      state: faker.address.state(),
      zip: faker.address.zipCode(),
    };
  }

  async seed() {
    await this.conn.transaction(async (entityManager) => {
      const authors = await this.seedAuthors(entityManager);
      const publishers = await this.seedPublishers(entityManager);
      const books = await this.seedBooks(entityManager, authors, publishers);
      await this.seedReviews(entityManager, books);
      await this.seedDecoratorTests(entityManager, authors);
    });
  }

  private async seedAuthors(manager: EntityManager) {
    const authors: Array<Partial<Author>> = [];
    for (let i = 0; i < this.NUM_AUTHORS; i++) {
      const author: Partial<Author> = {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        email: faker.internet.email(),
        address: Seeder.addressFactory(),
        phone: faker.phone.phoneNumber(),
      };
      authors.push(author);
    }
    await manager
      .createQueryBuilder()
      .insert()
      .into(Author)
      .values(authors)
      .execute();

    return await manager.getRepository(Author).find();
  }

  private async seedPublishers(manager: EntityManager) {
    const publishers: Array<Partial<Publisher>> = [];
    for (let i = 0; i < this.NUM_PUBLISHERS; i++) {
      const publisher: Partial<Publisher> = {
        name: faker.company.companyName(),
        address: Seeder.addressFactory(),
        poBox: Seeder.addressFactory(),
      };
      publishers.push(publisher);
    }
    await manager
      .createQueryBuilder()
      .insert()
      .into(Publisher)
      .values(publishers)
      .execute();
    return await manager.getRepository(Publisher).find();
  }

  private async seedBooks(
    manager: EntityManager,
    authors: Author[],
    publishers: Publisher[]
  ) {
    const books: Array<Partial<Book>> = [];
    for (let i = 1; i <= this.NUM_BOOKS; i++) {
      const book: Partial<Book> = {
        title: faker.lorem.words(3),
        summary: faker.lorem.paragraph(2),
        publishedDate: faker.date.past(),
        author: authors[i % this.NUM_AUTHORS],
        isPublished: faker.datatype.number(10) <= 5,
        publisher: publishers[i % this.NUM_PUBLISHERS],
      };
      books.push(book);
    }

    await manager
      .createQueryBuilder()
      .insert()
      .into(Book)
      .values(books)
      .execute();
    return await manager.getRepository(Book).find();
  }

  private async seedReviews(manager: EntityManager, books: Book[]) {
    const reviews: Array<Partial<Review>> = [];
    for (let i = 1; i <= this.NUM_REVIEWS; i++) {
      const review: Partial<Review> = {
        title: faker.lorem.words(3),
        body: faker.lorem.paragraph(5),
        reviewDate: faker.date.past(),
        rating: faker.datatype.number({ min: 0, max: 10 }),
        reviewerName: faker.name.firstName() + " " + faker.name.lastName(),
        book: books[i % this.NUM_BOOKS],
      };
      reviews.push(review);
    }

    await manager
      .createQueryBuilder()
      .insert()
      .into(Review)
      .values(reviews)
      .execute();
  }

  private async seedDecoratorTests(
    manager: EntityManager,
    authors: Array<Author>
  ) {
    const decoratorTests: Array<Partial<DecoratorTest>> = [];
    for (let i = 1; i <= this.NUM_DECORATOR_TESTS; i++) {
      const dt: Partial<DecoratorTest> = {
        testField: faker.lorem.words(1),
        testRelation: authors[i % this.NUM_AUTHORS],
        testEmbed: Seeder.addressFactory(),
        testRemappedField: faker.lorem.words(1),
        testRemappedEmbed: Seeder.addressFactory(),
        testRemappedRelation: authors[i % this.NUM_AUTHORS],
      };
      decoratorTests.push(dt);
    }

    await manager
      .createQueryBuilder()
      .insert()
      .into(DecoratorTest)
      .values(decoratorTests)
      .execute();
  }
}
