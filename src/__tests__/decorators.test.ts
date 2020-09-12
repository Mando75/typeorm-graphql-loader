import * as chai from "chai";
import { startup, TestHelpers } from "./util/testStartup";
import "reflect-metadata";
import { DecoratorTest } from "./entity";
import { graphql } from "graphql";

const { expect } = chai;
describe("Decorators", () => {
  let helpers: TestHelpers;
  let dt: DecoratorTest | undefined;

  before(async () => {
    helpers = await startup("decorators", { logging: false });
    dt = await helpers.connection.getRepository(DecoratorTest).findOne();
  });

  it("Can successfully execute a query against an entity with decorators", async () => {
    const { schema, loader } = helpers;

    const query = `
      query DecoratorTest($dtId: Int!) {
        decoratorTests(dtId: $dtId) {
          id
          testField
        }
      }
    `;
    const vars = { dtId: dt?.id };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id,
      testField: dt?.testField
    };

    expect(result.errors).to.be.undefined;
    expect(result.data?.decoratorTests).to.deep.equal(expected);
  });

  it("loads a required field even when not requested", async () => {
    const { schema, loader } = helpers;

    const query = `
      query DecoratorTest($dtId: Int!, $requireField: Boolean) {
        decoratorTests(dtId: $dtId, requireField: $requireField) {
          id
        }
      }
    `;
    const vars = { dtId: dt?.id, requireField: true };
    // The resolver will throw an error if a required field is missing
    // in the record response
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id
    };

    expect(result.errors).to.be.undefined;
    expect(result.data?.decoratorTests).to.deep.equal(expected);
  });

  it("loads a required relation even when not requested", async () => {
    const { schema, loader } = helpers;

    const query = `
      query DecoratorTest($dtId: Int!, $requireRelation: Boolean) {
        decoratorTests(dtId: $dtId, requireRelation: $requireRelation) {
          id
        }
      }
    `;

    const vars = { dtId: dt?.id, requireRelation: true };

    // The resolver will throw an error if a required relation is missing
    // in the record response
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id
    };

    expect(result.errors).to.be.undefined;
    expect(result.data?.decoratorTests).to.deep.equal(expected);
  });

  it("loads a required embedded field even when not requested", async () => {
    const { schema, loader } = helpers;

    const query = `
      query DecoratorTest($dtId: Int!, $requireEmbed: Boolean) {
        decoratorTests(dtId: $dtId, requireEmbed: $requireEmbed) {
          id
        }
      } 
    `;

    const vars = { dtId: dt?.id, requireEmbed: true };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id
    };

    expect(result.errors).to.be.undefined;
    expect(result.data?.decoratorTests).to.deep.equal(expected);
  });

  it("ignores fields correctly", async () => {
    const { schema, loader } = helpers;

    const query = `
      query DecoratorTest($dtId: Int!, $ignoreField: Boolean) {
        decoratorTests(dtId: $dtId, ignoreField: $ignoreField) {
          id
          testField
        }
      }
    `;
    const vars = { dtId: dt?.id, ignoreField: true };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id,
      testField: null
    };
    expect(result.errors).to.be.undefined;
    expect(result.data?.decoratorTests).to.deep.equal(expected);
  });

  it("ignores relations correctly", async () => {
    const { schema, loader } = helpers;

    const query = `
      query DecoratorTest($dtId: Int!, $ignoreRelation: Boolean) {
        decoratorTests(dtId: $dtId, ignoreRelation: $ignoreRelation) {
          id
          testRelation {
            id
          }
        }
      }
    `;
    const vars = { dtId: dt?.id, ignoreRelation: true };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id,
      // Ignored is a non-nullable column on the db.
      // even so, the field should be ignored in the query
      // and return null.
      testRelation: null
    };

    expect(result.errors).to.be.undefined;
    expect(result.data?.decoratorTests).to.deep.equal(expected);
  });

  it("ignores embedded fields correctly", async () => {
    const { schema, loader } = helpers;

    const query = `
      query DecoratorTest($dtId: Int!, $ignoreEmbed: Boolean) {
        decoratorTests(dtId: $dtId, ignoreEmbed: $ignoreEmbed) {
          id
          testEmbed {
            street
            city
          }
        }
      }
    `;
    const vars = { dtId: dt?.id, ignoreEmbed: true };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id,
      // Ignored is a non-nullable column on the db.
      // even so, the field should be ignored in the query
      // and return null.
      testEmbed: null
    };

    expect(result.errors).to.be.undefined;
    expect(result.data?.decoratorTests).to.deep.equal(expected);
  });
});
