import * as chai from "chai";
import { graphql } from "graphql";
import { startup, TestHelpers } from "./testStartup";
import { Author } from "./entity";
const deepEqualInAnyOrder = require("deep-equal-in-any-order");

chai.use(deepEqualInAnyOrder);
const { expect } = chai;

describe("Basic GraphQL queries", () => {
  let helpers: TestHelpers;

  before(async () => {
    helpers = await startup("basic_queries");
  });

  it("can fetch an author by id", async () => {
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
      email: author?.email,
      createdAt: author?.createdAt,
      updatedAt: author?.updatedAt
    };
    expect(result).to.not.have.key("errors");
    expect(result.data!.authorById).to.deep.equal(expected);
  });
});
