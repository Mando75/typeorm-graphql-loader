import * as chai from "chai";
import { graphql } from "graphql";
import { startup, TestHelpers } from "./util/testStartup";
import { Author, Review } from "./entity";

chai.use(require("deep-equal-in-any-order"));
const { expect } = chai;

describe("Query Builder options", () => {
  let helpers: TestHelpers;

  before(async () => {
    helpers = await startup("options", { logging: true });
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
    expect(result.data?.paginatedReviews).to.deep.equal(expected);
  });
});
