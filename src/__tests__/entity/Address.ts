import { Column } from "typeorm";
import { Field, ObjectType } from "type-graphql";
import { ConfigureLoader } from "../../ConfigureLoader";

@ObjectType()
export class Address {
  @Field()
  @Column()
  street!: string;

  @Column()
  @ConfigureLoader({ graphQLName: "unitNumber" })
  street2!: string;

  @Field()
  @Column()
  city!: string;

  @Field()
  @Column()
  state!: string;

  // testing custom column names
  @Field()
  @Column({ name: "postCode" })
  zip!: string;
}
