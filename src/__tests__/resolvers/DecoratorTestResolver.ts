import { Arg, Ctx, Info, Int, Query, Resolver } from "type-graphql";
import { DecoratorTest } from "../entity/DecoratorTest";
import { GraphQLDatabaseLoader } from "../../GraphQLDatabaseLoader";
import { GraphQLResolveInfo } from "graphql";

@Resolver(DecoratorTest)
export class DecoratorTestResolver {
  @Query((returns) => DecoratorTest)
  async decoratorTests(
    @Arg("dtId", (type) => Int) dtId: number,
    @Arg("validateIgnore", { nullable: true, defaultValue: false })
    validateIgnore: boolean,
    @Arg("validateRequired", { nullable: true, defaultValue: false })
    validateRequired: boolean,
    @Ctx("loader") loader: GraphQLDatabaseLoader,
    @Info() info: GraphQLResolveInfo
  ) {
    const record = await loader
      .loadEntity(DecoratorTest, "dt")
      .info(info)
      .where("dt.id = :id", { id: dtId })
      .loadOne();

    if (validateIgnore && record?.ignoredField) {
      throw new Error(
        "Validation Failed: Ignored Field is present in response"
      );
    }

    if (validateRequired && !record?.requiredField) {
      throw new Error(
        "Validation Failed: Required Field is missing in response"
      );
    }

    return record;
  }
}
