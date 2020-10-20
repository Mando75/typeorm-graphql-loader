import { FieldResolver, Resolver, Root } from "type-graphql";
import { Address } from "../entity/Address";

@Resolver(Address)
export class AddressResolver {
  @FieldResolver()
  unitNumber(@Root() parent: Address): string {
    return parent.street2;
  }
}
