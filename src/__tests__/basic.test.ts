import * as chai from "chai";
import { graphql } from "graphql";
import { startup, TestHelpers } from "./util/testStartup";
import { Author, Book, Publisher } from "./entity";

const deepEqualInAnyOrder = require("deep-equal-in-any-order");

chai.use(deepEqualInAnyOrder);
const { expect } = chai;

describe("Basic GraphQL queries", () => {
  let helpers: TestHelpers;

  before(async () => {
    helpers = await startup("basic", { logging: false });
  });

  describe("querying a single entity", () => {
    it("can query a single entity one layer deep", async () => {
      const { connection, schema, loader } = helpers;
      const author = await connection.getRepository(Author).findOne();
      const query = `
        query authorById($id: Int!) {
          authorById(id: $id) {
            id
            firstName
            lastName
            email
          }
        }
      `;
      const vars = { id: author?.id };

      const result = await graphql(
        schema,
        query,
        {},
        {
          loader
        },
        vars
      );

      const expected = {
        id: author?.id,
        firstName: author?.firstName,
        lastName: author?.lastName,
        email: author?.email
      };
      expect(result).to.not.have.key("errors");
      expect(result.data!.authorById).to.deep.equal(expected);
    });

    it("can query fields that have custom column names", async () => {
      const { connection, schema, loader } = helpers;
      const author = await connection.getRepository(Author).findOne();
      const query = `
        query authorById($id: Int!) {
          authorById(id: $id) {
            id
            firstName
            lastName
            email
            phone
          }
        }
      `;
      const vars = { id: author?.id };

      const result = await graphql(
        schema,
        query,
        {},
        {
          loader
        },
        vars
      );

      const expected = {
        id: author?.id,
        firstName: author?.firstName,
        lastName: author?.lastName,
        email: author?.email,
        phone: author?.phone
      };
      expect(result).to.not.have.key("errors");
      expect(result.data!.authorById).to.deep.equal(expected);
    });

    it("can query a single entity multiple layers deep", async () => {
      const { connection, schema, loader } = helpers;
      const author = await connection
        .getRepository(Author)
        .findOne({ relations: ["books", "books.publisher"] });
      const query = `
        query authorById($id: Int!) {
          authorById(id: $id) {
            id
            firstName
            lastName
            email
            books {
              id
              title
              summary
              publisher {
                id
              }
            }
          }
        }
      `;
      const vars = { id: author?.id };

      const result = await graphql(
        schema,
        query,
        {},
        {
          loader
        },
        vars
      );

      const expected = {
        id: author?.id,
        firstName: author?.firstName,
        lastName: author?.lastName,
        email: author?.email,
        books: author?.books.map(book => ({
          id: book.id,
          title: book.title,
          summary: book.summary,
          publisher: {
            id: book.publisher.id
          }
        }))
      };
      expect(result).to.not.have.key("errors");
      expect(result.data!.authorById).to.deep.equal(expected);
    });

    it("can resolve a query that contains fragments", async () => {
      const { connection, schema, loader } = helpers;
      const author = await connection
        .getRepository(Author)
        .findOne({ relations: ["books", "books.publisher"] });
      const query = `
        fragment bookFragment on Book {
          title
          summary
          publisher {
            id
          }
        }
        fragment authorFragment on Author {
          firstName
          lastName
          email
          books {
            ...bookFragment
          }
        }
        query authorById($id: Int!) {
          authorById(id: $id) {
           ...authorFragment
          }
        }
      `;
      const vars = { id: author?.id };

      const result = await graphql(
        schema,
        query,
        {},
        {
          loader
        },
        vars
      );

      const expected = {
        firstName: author?.firstName,
        lastName: author?.lastName,
        email: author?.email,
        books: author?.books.map(book => ({
          title: book.title,
          summary: book.summary,
          publisher: {
            id: book.publisher.id
          }
        }))
      };
      expect(result).to.not.have.key("errors");
      expect(result.data!.authorById).to.deep.equal(expected);
    });

    it("can resolve a query that contains fields with arguments", async () => {
      const { connection, schema, loader } = helpers;
      const author = await connection
        .getRepository(Author)
        .findOne({ relations: ["books", "books.publisher"] });

      const query = `
        query booksByAuthorId($id: Int!) {
          booksByAuthorId(authorId: $id) {
            id
            title
            transformedTitle(transform: "UPPERCASE")
          }
        }
      `;
      const vars = { id: author?.id };

      const result = await graphql(
        schema,
        query,
        {},
        {
          loader
        },
        vars
      );

      const expected = author!.books
        .filter(book => book.isPublished)
        .map(book => ({
          id: book.id,
          title: book.title,
          transformedTitle: book.title.toUpperCase()
        }));
      expect(result).to.not.have.key("errors");
      expect(result.data!.booksByAuthorId).to.deep.equal(expected);
    });

    it("can resolve a mutation that contains multiple return types (union)", async () => {
      const { connection, schema, loader } = helpers;
      const bookCount = await connection.getRepository(Book).count();
      const author = await connection.getRepository(Author).findOne();
      const publisher = await connection.getRepository(Publisher).findOne();

      const query = `
        fragment bookFragment on Book {
          title
          summary
          publisher {
            id
          }
          author {
            id
          }
        }
        mutation createBook($authorId: Int!, $publisherId: Int!, $summary: String!, $title: String!) {
          createBook(authorId: $authorId, publisherId: $publisherId, summary: $summary, title: $title) {
           ... on BookCreateSuccess {
             data {
               ...bookFragment
             }
           }
           ... on BookCreateError {
             message
           }
          }
        }
      `;
      const vars = {
        authorId: author?.id,
        publisherId: publisher?.id,
        title: "Typescript Rules",
        summary:
          'A book of 300 pages only containing the phrase "Typescript Rules"'
      };

      const result = await graphql(
        schema,
        query,
        {},
        {
          loader,
          connection: helpers.connection
        },
        vars
      );

      const expected = {
        data: {
          title: vars.title,
          summary: vars.summary,
          author: {
            id: vars.authorId
          },
          publisher: {
            id: vars.publisherId
          }
        }
      };

      expect(result).to.not.have.key("errors");
      expect(bookCount + 1).to.be.equal(
        await connection.getRepository(Book).count()
      );
      expect(result.data!.createBook).to.deep.equal(expected);
    });

    it("can resolve a mutation that contains multiple return types (union) and nested fragments", async () => {
      const { connection, schema, loader } = helpers;
      const bookCount = await connection.getRepository(Book).count();
      const author = await connection.getRepository(Author).findOne();
      const publisher = await connection.getRepository(Publisher).findOne();

      const query = `
        fragment bookFragment on Book {
          title
          summary
          publisher {
            id
          }
          author {
            id
          }
        }
        fragment bookCreateSuccess on BookCreateSuccess {
          data {
            ...bookFragment
          }
        }
        mutation createBook($authorId: Int!, $publisherId: Int!, $summary: String!, $title: String!) {
          createBook(authorId: $authorId, publisherId: $publisherId, summary: $summary, title: $title) {
           ... on BookCreateSuccess {
             ...bookCreateSuccess
           }
           ... on BookCreateError {
             message
           }
          }
        }
      `;
      const vars = {
        authorId: author?.id,
        publisherId: publisher?.id,
        title: "Typescript Rules",
        summary:
          'A book of 300 pages only containing the phrase "Typescript Rules"'
      };

      const result = await graphql(
        schema,
        query,
        {},
        {
          loader,
          connection: helpers.connection
        },
        vars
      );

      const expected = {
        data: {
          title: vars.title,
          summary: vars.summary,
          author: {
            id: vars.authorId
          },
          publisher: {
            id: vars.publisherId
          }
        }
      };

      expect(result).to.not.have.key("errors");
      expect(bookCount + 1).to.be.equal(
        await connection.getRepository(Book).count()
      );
      expect(result.data!.createBook).to.deep.equal(expected);
    });
  });

  describe("querying multiple entities", () => {
    it("can query a single level on multiple entities", async () => {
      const { connection, schema, loader } = helpers;
      const books = await connection
        .getRepository(Book)
        .find({ where: { author: { id: 1 }, isPublished: true } });

      const query = `
        query booksByAuthorId($authorId: Int!) {
          booksByAuthorId(authorId: $authorId) {
            id
            title
            summary
          }
        }
      `;

      const vars = { authorId: 1 };
      const result = await graphql(schema, query, {}, { loader }, vars);

      const expected: Array<Partial<
        Book
      >> = books.map(({ id, title, summary }) => ({ id, title, summary }));

      expect(result).to.not.have.key("errors");
      expect(result.data!.booksByAuthorId).to.deep.equal(expected);
    });

    it("can query multiple levels on multiple entities", async () => {
      const { connection, schema, loader } = helpers;
      const books = await connection.getRepository(Book).find({
        where: { author: { id: 1 }, isPublished: true },
        relations: ["author", "publisher", "reviews"]
      });

      const query = `
        query booksByAuthorId($authorId: Int!) {
          booksByAuthorId(authorId: $authorId) {
            id
            title
            summary 
            author {
              id
              firstName
              lastName
            }
            publisher {
              name
            }
            reviews {
              rating
            }
          }
        }
      `;

      const vars = { authorId: 1 };
      const result = await graphql(schema, query, {}, { loader }, vars);

      const expected = books.map(
        ({ id, title, summary, author, publisher, reviews }) => ({
          id,
          title,
          summary,
          author: {
            id: 1,
            firstName: author.firstName,
            lastName: author.lastName
          },
          publisher: {
            name: publisher.name
          },
          reviews: reviews.map(review => ({ rating: review.rating }))
        })
      );

      expect(result).to.not.have.key("errors");
      // Can't be bothered to overwrite the module and get it working with mocha
      // @ts-ignore
      expect(result.data!.booksByAuthorId).to.deep.equalInAnyOrder(expected);
    });
  });
});
