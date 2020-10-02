import * as chai from "chai";
import { startup, TestHelpers } from "./util/testStartup";
import { DecoratorTest } from "./entity";
import {
  getLoaderIgnoredFields,
  getLoaderRequiredFields,
  resolvePredicate
} from "../ConfigureLoader";
import { GraphQLEntityFields } from "../types";

const spies = require("chai-spies");
chai.use(spies);

const { expect } = chai;

describe("Decorator Utilities", () => {
  let helpers: TestHelpers;
  const customizedFields = ["testField", "testRelation", "testEmbed"];
  const untouchedFields = ["id", "createdAt", "updatedAt"];

  before(async () => {
    helpers = await startup("decorator_utils", { logging: false });
  });

  describe("getLoaderRequiredFields", () => {
    it("returns all the fields that have custom require logic", () => {
      const meta = helpers.connection.getMetadata(DecoratorTest);
      getLoaderRequiredFields(meta.target).forEach((_, key) => {
        expect(customizedFields).to.include(key);
      });
    });

    it("excludes all the fields that have no custom require logic", () => {
      const meta = helpers.connection.getMetadata(DecoratorTest);
      getLoaderRequiredFields(meta.target).forEach((_, key) => {
        expect(untouchedFields).to.not.include(key);
      });
    });
  });

  describe("getLoaderIgnoredFields", () => {
    it("returns all the fields that have custom ignore logic", () => {
      const meta = helpers.connection.getMetadata(DecoratorTest);
      getLoaderIgnoredFields(meta.target).forEach((_, key) => {
        expect(customizedFields).to.include(key);
      });
    });

    it("excludes all the fields that have no custom ignore logic", () => {
      const meta = helpers.connection.getMetadata(DecoratorTest);
      getLoaderIgnoredFields(meta.target).forEach((_, key) => {
        expect(untouchedFields).to.not.include(key);
      });
    });
  });

  describe("resolvePredicate", () => {
    type TestContext = { key: boolean };
    const context: TestContext = { key: true };
    const selection: GraphQLEntityFields = { testChild: { children: {} } };
    const queriedFields = ["testChild"];

    it("correctly calls a predicate function", () => {
      const spy = chai.spy(() => true);
      const resolved = resolvePredicate(spy, context, selection);
      expect(spy).to.have.been.called();
      expect(resolved).to.be.true;
    });

    it("correctly returns just a boolean", () => {
      expect(resolvePredicate(true, context, selection)).to.be.true;
      expect(resolvePredicate(false, context, selection)).to.be.false;
    });

    it("calls the predicate function with the correct params", () => {
      const spy = chai.spy(() => false);
      const resolved = resolvePredicate(spy, context, selection);
      expect(spy).to.have.been.called.with(context, queriedFields, selection);
      expect(resolved).to.be.false;
    });
  });
});
