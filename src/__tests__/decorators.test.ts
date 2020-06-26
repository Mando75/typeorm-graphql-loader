import * as chai from "chai";
import { startup, TestHelpers } from "./util/testStartup";
import { Author } from "./entity";
import { getMetadata } from "../decorator";

const { expect } = chai;
describe("Decorators", () => {
  let helpers: TestHelpers;

  before(async () => {
    helpers = await startup("decorators", { logging: false });
  });
  it("logs stuff out", async () => {
    const author = await helpers.connection.getRepository(Author).findOne();
    console.log(getMetadata(author, "firstName"));
    expect(true).to.be.true;
  });
});
