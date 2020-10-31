import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Field, Int, ObjectType } from "type-graphql";
import { ConfigureLoader } from "../../";
import { Author } from "./Author";
import { Address } from "./Address";
import { DecoratorContext } from "../util/DecoratorContext";

@ObjectType()
@Entity()
export class DecoratorTest extends BaseEntity {
  @Field((type) => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field({ nullable: true })
  @Column("varchar", { nullable: false })
  @ConfigureLoader({
    ignore: (context: DecoratorContext) => context.ignoreField,
    required: (context: DecoratorContext) => context.requireField,
  })
  testField?: string;

  @Column("varchar", { nullable: false })
  @ConfigureLoader({
    graphQLName: "remappedField",
  })
  testRemappedField!: string;

  @Field((type) => Address, { nullable: true })
  @Column((type) => Address)
  @ConfigureLoader({
    ignore: (context: DecoratorContext) => context.ignoreEmbed,
    required: (context: DecoratorContext) => context.requireEmbed,
  })
  testEmbed!: Address;

  @Column((type) => Address)
  @ConfigureLoader({
    graphQLName: "remappedEmbed",
  })
  testRemappedEmbed!: Address;

  @OneToOne((type) => Author)
  @JoinColumn()
  @Field((type) => Author, { nullable: true })
  @ConfigureLoader({
    ignore: (context: DecoratorContext) => context.ignoreRelation,
    required: (context: DecoratorContext) => context.requireRelation,
    sqlJoinAlias: "user_named_alias",
  })
  testRelation!: Author;

  @OneToOne((type) => Author)
  @JoinColumn()
  @ConfigureLoader({
    graphQLName: "remappedRelation",
  })
  testRemappedRelation!: Author;

  @Field()
  @CreateDateColumn()
  createdAt!: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt!: Date;
}
