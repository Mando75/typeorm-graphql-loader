import * as chai from "chai";
import { graphql } from "graphql";
import { startup, TestHelpers } from "./util/testStartup";
import { Author } from "./entity";
import { Seeder } from "./util/Seeder";

chai.should();
chai.use(require("chai-things"));
const { expect } = chai;

const TEST_AUTHOR_EMAIL = "testingsearchemail@testingsearch.com";
const TEST_AUTHOR_FIRST_NAME = "testingSearchFirstName";
const TEST_AUTHOR_LAST_NAME = "testingSearchLastName";
const TEST_AUTHOR_PHONE = "123-456-7890";

describe("Search queries", () => {
  let helpers: TestHelpers;
  let author: Author;

  before(async () => {
    helpers = await startup("searching", { logging: false });
    author = helpers.connection.getRepository(Author).create({
      email: TEST_AUTHOR_EMAIL,
      firstName: TEST_AUTHOR_FIRST_NAME,
      lastName: TEST_AUTHOR_LAST_NAME,
      address: Seeder.addressFactory(),
      phone: TEST_AUTHOR_PHONE
    });
    author = await helpers.connection.createEntityManager().save(author);
  });

  it("can perform a search with the default settings", async () => {
    const { schema, loader } = helpers;
    const query = `
      query searchAuthorsByEmail($email: String!) {
        searchAuthors(searchText: $email) {
          id
          firstName
          lastName
        }
      }
    `;
    const vars = { email: author.email.slice(0, 5) };

    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: author.id,
      firstName: author.firstName,
      lastName: author.lastName
    };

    expect(result).to.not.have.key("errors");
    result.data?.searchAuthors.should.include.something.that.deep.equals(
      expected
    );
  });

  it("can perform a STARTS_WITH search", async () => {
    const { schema, loader } = helpers;
    const query = `
      query searchAuthorsByFirstName($firstName: String!) {
        searchAuthors(searchText: $firstName, searchMethod: STARTS_WITH) {
          id
          firstName
          lastName
        }
      }      
    `;

    const vars = { firstName: author.firstName.slice(0, 3) };

    const expected = {
      id: author.id,
      firstName: author.firstName,
      lastName: author.lastName
    };

    const result = await graphql(schema, query, {}, { loader }, vars);

    expect(result).to.not.have.key("errors");
    result.data?.searchAuthors.should.include.something.that.deep.equals(
      expected
    );
  });

  it("can perform an ENDS_WITH search", async () => {
    const { schema, loader } = helpers;
    const query = `
      query searchAuthorsByFirstName($firstName: String!) {
        searchAuthors(searchText: $firstName, searchMethod: ENDS_WITH) {
          id
          firstName
          lastName
        }
      }      
    `;

    const vars = {
      firstName: author.firstName.slice(3, author.firstName.length)
    };

    const expected = {
      id: author.id,
      firstName: author.firstName,
      lastName: author.lastName
    };

    const result = await graphql(schema, query, {}, { loader }, vars);

    expect(result).to.not.have.key("errors");
    result.data?.searchAuthors.should.include.something.that.deep.equals(
      expected
    );
  });

  it("can perform a search on combined columns", async () => {
    const { schema, loader } = helpers;
    const query = `
      query searchAuthorsByFirstName($firstName: String!) {
        searchAuthors(searchText: $firstName, searchMethod: STARTS_WITH, searchCombinedName: true) {
          id
          firstName
          lastName
        }
      }      
    `;

    const vars = {
      firstName: author.firstName + " " + author.lastName.slice(0, 3)
    };

    const expected = {
      id: author.id,
      firstName: author.firstName,
      lastName: author.lastName
    };

    const result = await graphql(schema, query, {}, { loader }, vars);

    expect(result).to.not.have.key("errors");
    result.data?.searchAuthors.should.include.something.that.deep.equals(
      expected
    );
  });
});
