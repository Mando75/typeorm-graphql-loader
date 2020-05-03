import * as chai from "chai";
import { graphql } from "graphql";
import { startup, TestHelpers } from "./util/testStartup";
import { Author } from "./entity";

const { expect } = chai;

describe("Querying embedded entities", () => {
  let helpers: TestHelpers;

  before(async () => {
    helpers = await startup("embedded_entities", { logging: true });
  });

  it("can query embedded fields on an entity", async () => {
    const { connection, schema, loader } = helpers;
    const author = await connection.getRepository(Author).findOne();

    const query = `
      query authorById($id: Int!) {
        authorById(id: $id) {
          id
          firstName
          lastName
          email
          address {
            street
            city
            state
            zip
          }        
        }
      }
    `;

    const vars = { id: author?.id };

    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: author?.id,
      firstName: author?.firstName,
      lastName: author?.lastName,
      email: author?.email,
      address: {
        ...author?.address
      }
    };

    expect(result).to.not.have.key("errors");
    expect(result.data!.authorById).to.deep.equal(expected);
  });
});
