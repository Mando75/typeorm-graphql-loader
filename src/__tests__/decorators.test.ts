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
          requiredField
          ignoredField
        }
      }
    `;
    const vars = { dtId: dt?.id };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id,
      requiredField: dt?.requiredField,
      ignoredField: null
    };

    expect(result).to.not.have.key("errors");
    expect(result.data?.decoratorTests).to.deep.equal(expected);
  });

  it("loads a required field even when not requested", async () => {
    const { schema, loader } = helpers;

    const query = `
      query DecoratorTest($dtId: Int!, $validateRequired: Boolean) {
        decoratorTests(dtId: $dtId, validateRequiredField: $validateRequired) {
          id
          ignoredField
        }
      }
    `;
    const vars = { dtId: dt?.id, validateRequired: true };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id,
      ignoredField: null
    };

    expect(result).to.not.have.key("errors");
    expect(result.data?.decoratorTests).to.deep.equal(expected);
  });

  it("loads a required relation even when not requested", async () => {
    const { schema, loader } = helpers;

    const query = `
      query DecoratorTest($dtId: Int!, $validateRequiredRelation: Boolean) {
        decoratorTests(dtId: $dtId, validateRequiredRelation: $validateRequiredRelation) {
          id
        }
      }
    `;

    const vars = { dtId: dt?.id, validateRequiredRelation: true };

    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id
    };

    expect(result).to.not.have.key("errors");
    expect(result.data?.decoratorTests).to.deep.equal(expected);
  });

  it("ignores fields correctly", async () => {
    const { schema, loader } = helpers;

    const query = `
      query DecoratorTest($dtId: Int!, $validateIgnore: Boolean) {
        decoratorTests(dtId: $dtId, validateIgnoreField: $validateIgnore) {
          id
          requiredField
          ignoredField
        }
      }
    `;
    const vars = { dtId: dt?.id, validateIgnore: true };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id,
      requiredField: dt?.requiredField,
      // Ignored is a non-nullable column on the db.
      // even so, the field should be ignored in the query
      // and return null.
      ignoredField: null
    };

    expect(result).to.not.have.key("errors");
    expect(result.data?.decoratorTests).to.deep.equal(expected);
  });

  it("ignores relations correctly", async () => {
    const { schema, loader } = helpers;

    const query = `
      query DecoratorTest($dtId: Int!, $validateIgnore: Boolean) {
        decoratorTests(dtId: $dtId, validateIgnoreRelation: $validateIgnore) {
          id
          ignoredRelation {
            id
          }
        }
      }
    `;
    const vars = { dtId: dt?.id, validateIgnore: true };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id,
      // Ignored is a non-nullable column on the db.
      // even so, the field should be ignored in the query
      // and return null.
      ignoredRelation: null
    };

    expect(result).to.not.have.key("errors");
    expect(result.data?.decoratorTests).to.deep.equal(expected);
  });

  it("requires embedded fields correctly", async () => {
    const { schema, loader } = helpers;

    const query = `
      query DecoratorTest($dtId: Int!, $validateRequired: Boolean) {
        decoratorTests(dtId: $dtId, validateRequiredEmbed: $validateRequired) {
          id
          requiredField
        }
      } 
    `;

    const vars = { dtId: dt?.id, validateRequired: true };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id,
      requiredField: dt?.requiredField
    };

    expect(result).to.not.have.key("errors");
    expect(result.data?.decoratorTests).to.deep.equal(expected);
  });

  it("ignores embedded fields correctly", async () => {
    const { schema, loader } = helpers;

    const query = `
      query DecoratorTest($dtId: Int!, $validateIgnore: Boolean) {
        decoratorTests(dtId: $dtId, validateIgnoreEmbed: $validateIgnore) {
          id
          requiredEmbed {
            street
            city
          }
          ignoredEmbed {
            street 
            city
          }
        }
      }
    `;
    const vars = { dtId: dt?.id, validateIgnore: true };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id,
      // Ignored is a non-nullable column on the db.
      // even so, the field should be ignored in the query
      // and return null.
      ignoredEmbed: null,
      requiredEmbed: {
        city: dt?.requiredEmbed.city,
        street: dt?.requiredEmbed.street
      }
    };

    expect(result).to.not.have.key("errors");
    expect(result.data?.decoratorTests).to.deep.equal(expected);
  });
});
