import * as chai from "chai";
import { graphql } from "graphql";
import { startup, TestHelpers } from "./util/testStartup";
import { Author, Book } from "./entity";
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
