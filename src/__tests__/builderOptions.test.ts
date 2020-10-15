import * as chai from "chai";
import { graphql } from "graphql";
import { startup, TestHelpers } from "./util/testStartup";
import { Author, Book, Publisher, Review } from "./entity";

chai.use(require("deep-equal-in-any-order"));
const { expect } = chai;

describe("Query Builder options", () => {
  let helpers: TestHelpers;

  before(async () => {
    helpers = await startup("options", { logging: false });
  });

  it("caches the same query to prevent duplicate calls", async () => {
    const { loader, connection, schema } = helpers;
    const author = await connection.getRepository(Author).findOne();
    const query = `
      query authorById($id: Int!) {
        first: authorById(id: $id) {
          id
          firstName
          lastName
        }
        second: authorById(id: $id) {
          id
          firstName
          lastName
        }
      }
    `;
    const vars = { id: author?.id };
    // Enable logging
    // Check that only a single database call happens between the
    // two console.warns
    console.warn("START GQL QUERY");
    const result = await graphql(schema, query, {}, { loader }, vars);
    console.warn("END GQL QUERY");

    const expectedAuthor = {
      id: author?.id,
      firstName: author?.firstName,
      lastName: author?.lastName
    };
    const expected = {
      first: expectedAuthor,
      second: expectedAuthor
    };

    expect(result).to.not.have.key("errors");
    expect(result.data).to.deep.equal(expected);
  });

  it("respects the selectFields option", async () => {
    const { schema, loader, connection } = helpers;
    const query = `
      query getPaginatedReviews($offset: Int!, $limit: Int!) {
        paginatedReviews(offset: $offset, limit: $limit) {
          reviews {
            id
            title
            body
            reviewDate
            reviewerName
          }
          offset
          hasMore
          maxRating
          minRating
        }
      }
    `;

    const vars = { offset: 0, limit: 10 };
    const result = await graphql(schema, query, {}, { loader }, vars);
    const reviews = await connection
      .getRepository(Review)
      .createQueryBuilder("review")
      .orderBy({ rating: "DESC" })
      .limit(10)
      .getMany();

    const expected = {
      hasMore: true,
      offset: 10,
      minRating: Math.min(...reviews.map(review => review.rating)),
      maxRating: Math.max(...reviews.map(review => review.rating)),
      reviews: reviews.map(({ id, title, body, reviewDate, reviewerName }) => ({
        id,
        title,
        body,
        reviewDate,
        reviewerName
      }))
    };

    expect(result).to.not.have.key("errors");
    expect(result.data?.paginatedReviews).to.deep.equal(expected);
  });

  it("can apply OR WHERE conditions with strings", async () => {
    const { connection, schema, loader } = helpers;
    const query = `
     query orWhere($authorId: Int!, $publisherId: Int!) {
       booksByAuthorOrPublisher(authorId: $authorId, publisherId: $publisherId) {
         id
         title
       }
     }
    `;
    const author = await connection.getRepository(Author).findOne();
    const publisher = await connection.getRepository(Publisher).findOne();
    const books = await connection
      .getRepository(Book)
      .createQueryBuilder("book")
      .where("book.authorId = :authorId", { authorId: author?.id })
      .orWhere("book.publisherId = :publisherId", {
        publisherId: publisher?.id
      })
      .getMany();

    const vars = { authorId: author?.id, publisherId: publisher?.id };

    const result = await graphql(schema, query, {}, { loader }, vars);
    const expected = books.map(({ id, title }) => ({ id, title }));
    expect(result).to.not.have.key("errors");
    expect(result.data?.booksByAuthorOrPublisher).to.deep.equal(expected);
  });

  it("can apply OR WHERE conditions with brackets", async () => {
    const { connection, schema, loader } = helpers;
    const query = `
     query orWhere($authorId: Int!, $publisherId: Int!) {
       booksByAuthorOrPublisher(authorId: $authorId, publisherId: $publisherId, useBrackets: true) {
         id
         title
       }
     }
    `;
    const author = await connection.getRepository(Author).findOne();
    const publisher = await connection.getRepository(Publisher).findOne();
    const books = await connection
      .getRepository(Book)
      .createQueryBuilder("book")
      .where("book.authorId = :authorId", { authorId: author?.id })
      .orWhere("book.publisherId = :publisherId", {
        publisherId: publisher?.id
      })
      .getMany();

    const vars = { authorId: author?.id, publisherId: publisher?.id };

    const result = await graphql(schema, query, {}, { loader }, vars);
    const expected = books.map(({ id, title }) => ({ id, title }));
    expect(result).to.not.have.key("errors");
    expect(result.data?.booksByAuthorOrPublisher).to.deep.equal(expected);
  });
});

describe("Depth limiting", () => {
  let helpers: TestHelpers;
  before(async () => {
    helpers = await startup("max_depth", {
      logging: false,
      loaderOptions: { maxQueryDepth: 2 }
    });
  });

  it("does not load relations more than max depth", async () => {
    const { loader, connection, schema } = helpers;
    const author = await connection.getRepository(Author).findOne();
    const query = `
      query authorById($id: Int!) {
        authorById(id: $id) {
          id
          firstName
          lastName
          books {
            id
            publisher {
              id
              books {
               id
              }
            }
          }
        }
      }
    `;
    const vars = { id: author?.id };
    const result = await graphql(schema, query, {}, { loader }, vars);

    expect(result).to.not.have.key("errors");
    expect(result.data?.authorById?.books?.publisher?.books).to.not.be.ok;
  });
});

describe("Primary Key Backwards compatibility", () => {
  let helpers: TestHelpers;

  before(async () => {
    helpers = await startup("deprecated_primary_key", {
      logging: false,
      loaderOptions: { primaryKeyColumn: "rating" }
    });
  });

  it("is backwards compatible with primary key option", async () => {
    const { schema, loader, connection } = helpers;
    const query = `
      query getPaginatedReviews($offset: Int!, $limit: Int!) {
        deprecatedPrimaryKey(offset: $offset, limit: $limit) {
          reviews {
            id
            title
            body
            reviewDate
            reviewerName
          }
          offset
          hasMore
          maxRating
          minRating
        }
      }
    `;

    const vars = { offset: 0, limit: 10 };
    const result = await graphql(
      schema,
      query,
      {},
      { loader, connection },
      vars
    );
    const reviews = await helpers.connection
      .getRepository(Review)
      .createQueryBuilder("review")
      .orderBy({ rating: "DESC" })
      .limit(10)
      .getMany();

    const expected = {
      hasMore: true,
      offset: 10,
      minRating: Math.min(...reviews.map(review => review.rating)),
      maxRating: Math.max(...reviews.map(review => review.rating)),
      reviews: reviews.map(({ id, title, body, reviewDate, reviewerName }) => ({
        id,
        title,
        body,
        reviewDate,
        reviewerName
      }))
    };

    expect(result).to.not.have.key("errors");
    expect(result.data?.deprecatedPrimaryKey).to.deep.equal(expected);
  });
});

describe("ejectQueryBuilder", () => {
  let helpers: TestHelpers;

  before(async () => {
    helpers = await startup("eject_builder", {
      logging: false,
    });
  });

  it("can successfully execute a query that had a custom eject callback", async () => {
    const { connection, schema, loader } = helpers;
    const publisher = await connection.getRepository(Publisher).findOne({ relations: ["books"] });

    const query = `
    query publisherByBookTitle($bookTitle: String!) {
      publisherByBookTitle(bookTitle: $bookTitle) {
        id
        name
        books {
          id
          title
        }
      }
    }
    `;
    const vars = { bookTitle: publisher?.books?.[0].title };

    const result = await graphql(
      schema,
      query,
      {},
      { loader },
      vars
    );

    const expected = {
      id: publisher?.id,
      name: publisher?.name,
      books: publisher?.books.map(({ id, title }) => ({ id, title }))
    };

    expect(result).to.not.have.key("errors");
    // @ts-ignore
    expect(result.data!.publisherByBookTitle).to.deep.equalInAnyOrder(expected);

  });
});
