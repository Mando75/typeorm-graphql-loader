import * as chai from "chai";
import { startup, TestHelpers } from "./util/testStartup";
import "reflect-metadata";
import { DecoratorTest } from "./entity";
import { graphql } from "graphql";

const { expect } = chai;

describe("ConfigureLoader", () => {
  let helpers: TestHelpers;
  let dt: DecoratorTest | undefined;

  before(async () => {
    helpers = await startup("configure_loader", { logging: false });
    dt = await helpers.connection
      .getRepository(DecoratorTest)
      .findOne({ relations: ["testRelation"] });
  });

  it("Can successfully execute a query against an entity with decorators", async () => {
    const { schema, loader } = helpers;

    const query = `
      query DecoratorTest($dtId: Int!) {
        decoratorTests(dtId: $dtId) {
          id
          testField
          testRelation {
            id
          }
          testEmbed {
            street
          }
        }
      }
    `;
    const vars = { dtId: dt?.id };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id,
      testField: dt?.testField,
      testRelation: {
        id: dt?.testRelation.id
      },
      testEmbed: {
        street: dt?.testEmbed.street
      }
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
          testRelation {
            id
          }
          testEmbed {
            street
          }
        }
      }
    `;
    const vars = { dtId: dt?.id, requireField: true };
    // The resolver will throw an error if a required field is missing
    // in the record response
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id,
      testRelation: {
        id: dt?.testRelation.id
      },
      testEmbed: {
        street: dt?.testEmbed.street
      }
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
          testField
          testEmbed {
            street
          } 
        }
      }
    `;

    const vars = { dtId: dt?.id, requireRelation: true };

    // The resolver will throw an error if a required relation is missing
    // in the record response
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id,
      testField: dt?.testField,
      testEmbed: {
        street: dt?.testEmbed.street
      }
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
          testField
          testRelation {
            id
          }
        }
      } 
    `;

    const vars = { dtId: dt?.id, requireEmbed: true };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id,
      testField: dt?.testField,
      testRelation: {
        id: dt?.testRelation.id
      }
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
          testRelation {
            id
          }
          testEmbed {
            street
          }
        }
      }
    `;
    const vars = { dtId: dt?.id, ignoreField: true };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id,
      testField: null,
      testRelation: {
        id: dt?.testRelation.id
      },
      testEmbed: {
        street: dt?.testEmbed.street
      }
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
          testField
          testRelation {
            id
          }
          testEmbed {
            street
          }
        }
      }
    `;
    const vars = { dtId: dt?.id, ignoreRelation: true };
    const result = await graphql(schema, query, {}, { loader }, vars);

    const expected = {
      id: dt?.id,
      testField: dt?.testField,
      // Ignored is a non-nullable column on the db.
      // even so, the field should be ignored in the query
      // and return null.
      testRelation: null,
      testEmbed: {
        street: dt?.testEmbed.street
      }
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
          testField
          testRelation {
            id
          }
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
      testField: dt?.testField,
      testRelation: {
        id: dt?.testRelation.id
      },
      // Ignored is a non-nullable column on the db.
      // even so, the field should be ignored in the query
      // and return null.
      testEmbed: null
    };

    expect(result.errors).to.be.undefined;
    expect(result.data?.decoratorTests).to.deep.equal(expected);
  });
});
