import * as chai from "chai";
import { graphql } from "graphql";
import { startup, TestHelpers } from "./util/testStartup";
import { Author } from "./entity";

const deepEqualInAnyOrder = require("deep-equal-in-any-order");

chai.use(deepEqualInAnyOrder);
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

  it("can query multiple embedded fields on a nested entity", async () => {
    const { connection, schema, loader } = helpers;
    const author = await connection
      .getRepository(Author)
      .findOne({ relations: ["books", "books.publisher"] });

    const query = `
      query booksByAuthorId($id: Int!) {
        booksByAuthorId(authorId: $id) {
          id
          publisher {
            address {
              street
              city
              state
            }
            poBox {
              street
              zip
            }
          }
        }
      }
    `;

    const vars = { id: author?.id };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = author?.books
      .filter(book => book.isPublished)
      .map(book => ({
        id: book.id,
        publisher: {
          address: {
            street: book.publisher.address.street,
            city: book.publisher.address.city,
            state: book.publisher.address.state
          },
          poBox: {
            street: book.publisher.poBox.street,
            zip: book.publisher.poBox.zip
          }
        }
      }));

    expect(result).to.not.have.key("errors");
    // Can't be bothered to overwrite the module and get it working with mocha
    // @ts-ignore
    expect(result.data!.booksByAuthorId).to.deep.equalInAnyOrder(expected);
  });
});
