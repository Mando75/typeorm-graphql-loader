import { Arg, Ctx, Info, Int, Query, Resolver } from "type-graphql";
import { DecoratorTest } from "../entity/DecoratorTest";
import { GraphQLDatabaseLoader } from "../../GraphQLDatabaseLoader";
import { GraphQLResolveInfo } from "graphql";

@Resolver(DecoratorTest)
export class DecoratorTestResolver {
  @Query(returns => DecoratorTest)
  async decoratorTests(
    @Arg("dtId", type => Int) dtId: number,
    @Arg("validateIgnoreField", { nullable: true, defaultValue: false })
    validateIgnoreField: boolean,
    @Arg("validateRequiredField", { nullable: true, defaultValue: false })
    validateRequiredField: boolean,
    @Arg("validateIgnoreRelation", { nullable: true, defaultValue: false })
    validateIgnoreRelation: boolean,
    @Arg("validateRequiredRelation", { nullable: true, defaultValue: false })
    validateRequiredRelation: boolean,
    @Arg("validateRequiredEmbed", { nullable: true, defaultValue: false })
    validateRequiredEmbed: boolean,
    @Arg("validateIgnoreEmbed", { nullable: true, defaultValue: false })
    validateIgnoreEmbed: boolean,
    @Ctx("loader") loader: GraphQLDatabaseLoader,
    @Info() info: GraphQLResolveInfo
  ) {
    const record = await loader
      .loadEntity(DecoratorTest, "dt")
      .info(info)
      .where("dt.id = :id", { id: dtId })
      .loadOne();

    if (validateIgnoreField && record?.ignoredField) {
      throw new Error(
        "Validation Failed: Ignored Field is present in response"
      );
    }

    if (validateIgnoreRelation && record?.ignoredRelation) {
      throw new Error(
        "Validation Failed: Ignored Relation is present in response"
      );
    }

    if (validateRequiredField && !record?.requiredField) {
      throw new Error(
        "Validation Failed: Required Field is missing in response"
      );
    }

    if (validateRequiredRelation && !record?.requiredRelation) {
      throw new Error(
        "Validation Failed: Required Relation is missing in response"
      );
    }

    if (validateRequiredEmbed && !record?.requiredEmbed) {
      throw new Error(
        "Validation Failed: Required Embed is missing in response"
      );
    }

    if (validateIgnoreEmbed && record?.ignoredEmbed) {
      throw new Error(
        "Validation Failed: Ignored embed is present in response"
      );
    }

    return record;
  }
}
