import { Column } from "typeorm";
import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class Address {
  @Field()
  @Column()
  street!: string;

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
