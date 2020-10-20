import {
  Arg,
  Ctx,
  FieldResolver,
  Info,
  Int,
  Query,
  Resolver,
  Root
} from "type-graphql";
import { Author, DecoratorTest } from "../entity";
import { GraphQLDatabaseLoader } from "../../GraphQLDatabaseLoader";
import { GraphQLResolveInfo } from "graphql";
import { DecoratorContext } from "../util/DecoratorContext";
import { Address } from "../entity/Address";

@Resolver(DecoratorTest)
export class DecoratorTestResolver {
  @Query(returns => DecoratorTest)
  async decoratorTests(
    @Arg("dtId", type => Int) dtId: number,
    @Arg("ignoreField", { nullable: true, defaultValue: false })
    ignoreField: boolean,
    @Arg("requireField", { nullable: true, defaultValue: false })
    requireField: boolean,
    @Arg("ignoreRelation", { nullable: true, defaultValue: false })
    ignoreRelation: boolean,
    @Arg("requireRelation", { nullable: true, defaultValue: false })
    requireRelation: boolean,
    @Arg("requireEmbed", { nullable: true, defaultValue: false })
    requireEmbed: boolean,
    @Arg("ignoreEmbed", { nullable: true, defaultValue: false })
    ignoreEmbed: boolean,
    @Ctx("loader") loader: GraphQLDatabaseLoader,
    @Info() info: GraphQLResolveInfo
  ) {
    const record = await loader
      .loadEntity(DecoratorTest, "dt")
      .info(info)
      .context<DecoratorContext>({
        ignoreRelation,
        ignoreEmbed,
        ignoreField,
        requireRelation,
        requireField,
        requireEmbed
      })
      .where("dt.id = :id", { id: dtId })
      .loadOne();

    if (ignoreField && record?.testField) {
      throw new Error(
        "Validation Failed: Ignored Field is present in response"
      );
    }

    if (ignoreRelation && record?.testRelation) {
      throw new Error(
        "Validation Failed: Ignored Relation is present in response"
      );
    }

    if (requireField && !record?.testField) {
      throw new Error(
        "Validation Failed: Required Field is missing in response"
      );
    }

    if (requireRelation && !record?.testRelation) {
      throw new Error(
        "Validation Failed: Required Relation is missing in response"
      );
    }

    if (requireEmbed && !record?.testEmbed) {
      throw new Error(
        "Validation Failed: Required Embed is missing in response"
      );
    }

    if (ignoreEmbed && record?.testEmbed) {
      throw new Error(
        "Validation Failed: Ignored embed is present in response"
      );
    }

    return record;
  }

  @FieldResolver()
  remappedField(@Root() parent: DecoratorTest): string {
    return parent.testRemappedField;
  }

  @FieldResolver()
  remappedEmbed(@Root() parent: DecoratorTest): Address {
    return parent.testRemappedEmbed;
  }

  @FieldResolver()
  remappedRelation(@Root() parent: DecoratorTest): Author {
    return parent.testRemappedRelation;
  }
}
