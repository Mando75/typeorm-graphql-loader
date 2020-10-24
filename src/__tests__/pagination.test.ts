import * as chai from "chai";
import { graphql } from "graphql";
import { startup, TestHelpers } from "./util/testStartup";
import { Review } from "./entity";
import { ReviewConnection } from "./entity/PaginatedReviews";

chai.use(require("deep-equal-in-any-order"));
const { expect } = chai;

describe("Pagination", () => {
  let helpers: TestHelpers;
  let reviews: Review[];

  before(async () => {
    helpers = await startup("pagination", { logging: false });
    reviews = await helpers.connection
      .getRepository(Review)
      .createQueryBuilder("review")
      .leftJoinAndSelect("review.book", "book")
      .orderBy({ rating: "DESC" })
      .getMany();
  });

  it("can perform a simple paginated query", async () => {
    const { schema, loader } = helpers;
    const query = `
      query getPaginatedReviews($offset: Int!, $limit: Int!) {
        paginatedReviews(offset: $offset, limit: $limit) {
          reviews {
            id
            title
            body
            reviewDate
            rating
            reviewerName
          }
          offset
          hasMore
        }
      }
    `;

    const vars = { offset: 0, limit: 10 };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const firstTenReviews = reviews.slice(0, 10);

    const expected = {
      hasMore: true,
      offset: 10,
      reviews: firstTenReviews.map(
        ({ id, title, body, reviewDate, rating, reviewerName }) => ({
          id,
          title,
          body,
          reviewDate,
          rating,
          reviewerName,
        })
      ),
    };

    expect(result).to.not.have.key("errors");
    expect(result.data?.paginatedReviews).to.deep.equal(expected);
  });

  it("can perform a simple paginated query while selecting relations", async () => {
    const { schema, loader } = helpers;
    const query = `
      query getPaginatedReviews($offset: Int!, $limit: Int!) {
        paginatedReviews(offset: $offset, limit: $limit) {
          reviews {
            id
            title
            body
            reviewDate
            rating
            reviewerName
            book {
              id
              title
            }
          }
          offset
          hasMore
        }
      }
    `;

    const vars = { offset: 0, limit: 10 };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const firstTenReviews = reviews.slice(0, 10);

    const expected = {
      hasMore: true,
      offset: 10,
      reviews: firstTenReviews.map(
        ({ id, title, body, reviewDate, rating, reviewerName, book }) => ({
          id,
          title,
          body,
          reviewDate,
          rating,
          reviewerName,
          book: {
            id: book.id,
            title: book.title,
          },
        })
      ),
    };

    expect(result).to.not.have.key("errors");
    expect(result.data?.paginatedReviews).to.deep.equal(expected);
  });

  it("can paginate through an entire record base", async () => {
    const { schema, loader } = helpers;
    const query = `
      query getPaginatedReviews($offset: Int!, $limit: Int!) {
        paginatedReviews(offset: $offset, limit: $limit) {
          reviews {
            id
            title
            body
            reviewDate
            rating
            reviewerName
            book {
              id
              title
            }
          }
          offset
          hasMore
        }
      }
    `;
    let hasMore = true;
    let vars = { offset: 0, limit: 10 };
    let queriedReviews: Array<any> = [];
    while (hasMore) {
      const result = await graphql(schema, query, {}, { loader }, vars);
      expect(result).to.not.have.key("errors");
      expect(result.data).to.have.key("paginatedReviews");
      hasMore = result.data?.paginatedReviews?.hasMore;
      vars = { ...vars, offset: result.data?.paginatedReviews?.offset };
      queriedReviews = queriedReviews.concat(
        result.data?.paginatedReviews?.reviews
      );
    }

    const expected = reviews.map(
      ({ id, title, body, reviewDate, rating, reviewerName, book }) => ({
        id,
        title,
        body,
        reviewDate,
        rating,
        reviewerName,
        book: {
          id: book.id,
          title: book.title,
        },
      })
    );

    expect(queriedReviews).to.deep.equal(expected);
  });

  it("can query nested items from the info object", async () => {
    const { connection, schema, loader } = helpers;
    const query = `
      query nestedInfoFields {
        reviewConnection {
          totalCount
          edges {
            cursor
            node {
              id
              title
              body
              reviewerName
              rating
              reviewDate
            }
          }        
        }
      }   
    `;

    const result = await graphql(schema, query, {}, { loader });
    const [reviews, count] = await connection
      .getRepository(Review)
      .createQueryBuilder("review")
      .limit(15)
      .getManyAndCount();
    const expected = new ReviewConnection(count, reviews);

    expect(result).to.not.have.key("errors");
    expect(result.data).to.have.key("reviewConnection");
    // @ts-ignore
    expect(result.data!.reviewConnection).to.deep.equalInAnyOrder(expected);
  });
});
