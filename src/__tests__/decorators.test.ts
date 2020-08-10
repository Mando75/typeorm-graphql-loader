import * as chai from "chai";
import { startup, TestHelpers } from "./util/testStartup";
import { Author } from "./entity";
import "reflect-metadata";

const { expect } = chai;
describe("Decorators", () => {
  let helpers: TestHelpers;

  before(async () => {
    helpers = await startup("decorators", { logging: false });
  });
  it("logs stuff out", async () => {
    const author = await helpers.connection.getRepository(Author).findOne();
    expect(true).to.be.true;
  });
});
